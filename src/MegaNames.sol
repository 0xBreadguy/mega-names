// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Base64} from "solady/utils/Base64.sol";
import {ERC721} from "solady/tokens/ERC721.sol";
import {Ownable} from "solady/auth/Ownable.sol";
import {LibString} from "solady/utils/LibString.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";
import {ReentrancyGuard} from "soledge/utils/ReentrancyGuard.sol";
import {WarrenLib} from "./WarrenLib.sol";
import {MegaNamesSVG} from "./MegaNamesSVG.sol";

/// @title MegaNames
/// @notice ENS-style naming system for .mega TLD on MegaETH
/// @dev Fork of wei-names/NameNFT.sol adapted for MegaETH with USDM payments
/// @author MegaETH Labs (fork of z0r0z/wei-names)
///
/// Features:
/// - ERC-721 name ownership with commit-reveal registration
/// - USDM stablecoin payments (stable USD pricing)
/// - Address resolution (forward + reverse)
/// - Contenthash for IPFS/Warren on-chain websites
/// - Free subdomains (parent-controlled)
/// - ERC-7828 cross-chain interop ready
/// - 100% of fees go to Warren protocol
contract MegaNames is ERC721, Ownable, ReentrancyGuard {
    using LibString for uint256;
    using EnumerableSetLib for EnumerableSetLib.Uint256Set;

    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/

    error Expired();
    error TooDeep();
    error EmptyLabel();
    error InvalidName();
    error InvalidLength();
    error LengthMismatch();
    error NotParentOwner();
    error PremiumTooHigh();
    error InsufficientFee();
    error AlreadyRegistered();
    error DecayPeriodTooLong();
    error InvalidPaymentToken();
    error InvalidYears();
    error InvalidAddress();
    error RegistrationClosed();

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    event NameRegistered(
        uint256 indexed tokenId, string label, address indexed owner, uint256 expiresAt
    );
    event SubdomainRegistered(uint256 indexed tokenId, uint256 indexed parentId, string label);
    event SubdomainRevoked(uint256 indexed tokenId, uint256 indexed parentId);
    event NameRenewed(uint256 indexed tokenId, uint256 newExpiresAt);
    event PrimaryNameSet(address indexed addr, uint256 indexed tokenId);
    // ENS-compatible resolver events
    event AddrChanged(bytes32 indexed node, address addr);
    event ContenthashChanged(bytes32 indexed node, bytes contenthash);
    event AddressChanged(bytes32 indexed node, uint256 coinType, bytes addr);
    event TextChanged(bytes32 indexed node, string indexed key, string value);

    // Admin events
    event DefaultFeeChanged(uint256 fee);
    event LengthFeeChanged(uint256 indexed length, uint256 fee);
    event LengthFeeCleared(uint256 indexed length);
    event PremiumSettingsChanged(uint256 maxPremium, uint256 decayPeriod);
    event FeeRecipientChanged(address newRecipient);
    event PaymentTokenChanged(address newToken);
    event RegistrationOpenChanged(bool open);

    /*//////////////////////////////////////////////////////////////
                                CONSTANTS
    //////////////////////////////////////////////////////////////*/

    /// @dev Namehash of "mega" TLD
    /// keccak256(abi.encodePacked(bytes32(0), keccak256("mega")))
    bytes32 public constant MEGA_NODE =
        0x892fab39f6d2ae901009febba7dbdd0fd85e8a1651be6b8901774cdef395852f;

    uint256 constant MAX_LABEL_LENGTH = 255;
    uint256 constant MIN_LABEL_LENGTH = 1;
    uint256 constant REGISTRATION_PERIOD = 365 days;
    uint256 constant GRACE_PERIOD = 90 days;
    uint256 constant MAX_SUBDOMAIN_DEPTH = 10;
    uint256 constant COIN_TYPE_ETH = 60;
    uint256 constant MAX_PREMIUM_CAP = 100_000e18; // 100k USDM
    uint256 constant MAX_DECAY_PERIOD = 3650 days;
    uint256 constant MIN_YEARS = 1;
    uint256 constant MAX_YEARS = 10;
    
    // Multi-year discount basis points (100 = 1%)
    uint256 constant DISCOUNT_2Y = 500;   // 5%
    uint256 constant DISCOUNT_3Y = 1000;  // 10%
    uint256 constant DISCOUNT_5Y = 1500;  // 15%
    uint256 constant DISCOUNT_10Y = 2500; // 25%
    
    // Default fees in USDM (18 decimals)
    uint256 constant DEFAULT_FEE = 1e18; // $1 for 5+ chars

    /*//////////////////////////////////////////////////////////////
                                 STORAGE
    //////////////////////////////////////////////////////////////*/

    struct NameRecord {
        string label;
        uint256 parent;
        uint64 expiresAt;
        uint64 epoch;
        uint64 parentEpoch;
    }

    /// @notice Payment token (USDM)
    address public paymentToken;

    /// @notice Fee recipient (Warren protocol safe)
    address public feeRecipient;

    uint256 public defaultFee;
    uint256 public maxPremium;
    uint256 public premiumDecayPeriod;

    mapping(uint256 => uint256) public lengthFees;
    mapping(uint256 => bool) public lengthFeeSet;
    mapping(uint256 => NameRecord) public records;
    mapping(uint256 => uint256) public recordVersion;
    mapping(address => uint256) public primaryName;

    /// @notice Total number of names registered
    uint256 public totalRegistrations;
    
    /// @notice Total number of renewals
    uint256 public totalRenewals;
    
    /// @notice Total number of subdomains created
    uint256 public totalSubdomains;
    
    /// @notice Total volume in USDM (18 decimals) from registrations + renewals
    uint256 public totalVolume;

    /// @notice Whether public registration is open (admin can always register)
    bool public registrationOpen;

    /// @notice Enumerable set of token IDs owned by each address
    mapping(address => EnumerableSetLib.Uint256Set) internal _ownedTokens;

    // Versioned resolver data
    mapping(uint256 => mapping(uint256 => address)) internal _resolvedAddress;
    mapping(uint256 => mapping(uint256 => bytes)) internal _contenthash;
    mapping(uint256 => mapping(uint256 => mapping(uint256 => bytes))) internal _coinAddr;
    mapping(uint256 => mapping(uint256 => mapping(string => string))) internal _text;

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /// @param _paymentToken USDM token address
    /// @param _feeRecipient Address to receive all registration fees (Warren safe)
    constructor(address _paymentToken, address _feeRecipient) payable {
        _initializeOwner(tx.origin);
        paymentToken = _paymentToken;
        feeRecipient = _feeRecipient;
        defaultFee = DEFAULT_FEE;
        maxPremium = 10_000e18; // 10k USDM max premium
        premiumDecayPeriod = 21 days;

        // Set length-based fees in USDM (18 decimals)
        // Pricing: premium short names, cheap long names
        lengthFees[1] = 1000e18;  // $1000/year for 1 char
        lengthFeeSet[1] = true;
        lengthFees[2] = 500e18;   // $500/year for 2 char
        lengthFeeSet[2] = true;
        lengthFees[3] = 100e18;   // $100/year for 3 char
        lengthFeeSet[3] = true;
        lengthFees[4] = 10e18;    // $10/year for 4 char
        lengthFeeSet[4] = true;
        // 5+ chars = $1/year (defaultFee)
    }

    /*//////////////////////////////////////////////////////////////
                             ERC721 METADATA
    //////////////////////////////////////////////////////////////*/

    function name() public pure override(ERC721) returns (string memory) {
        return "MegaNames";
    }

    function symbol() public pure override(ERC721) returns (string memory) {
        return "MEGA";
    }

    /// @dev Blocks transfers of inactive tokens and maintains enumerable ownership
    function _beforeTokenTransfer(address from, address to, uint256 tokenId)
        internal
        virtual
        override(ERC721)
    {
        if (from != address(0) && to != address(0)) {
            if (!_isActive(tokenId)) revert Expired();
        }
        // Maintain enumerable set
        if (from != address(0)) {
            _ownedTokens[from].remove(tokenId);
        }
        if (to != address(0)) {
            _ownedTokens[to].add(tokenId);
        }
    }

    /// @notice Get all token IDs owned by an address
    /// @param owner Address to query
    /// @return tokenIds Array of token IDs owned by the address
    function tokensOfOwner(address owner) external view returns (uint256[] memory) {
        return _ownedTokens[owner].values();
    }

    /// @notice Get number of unique tokens owned by an address
    /// @dev More gas-efficient than tokensOfOwner().length for just the count
    function tokensOfOwnerCount(address owner) external view returns (uint256) {
        return _ownedTokens[owner].length();
    }

    function tokenURI(uint256 tokenId) public view override(ERC721) returns (string memory) {
        if (!_recordExists(tokenId)) revert TokenDoesNotExist();

        NameRecord storage record = records[tokenId];

        // Check for stale subdomain
        if (record.parent != 0) {
            NameRecord storage parentRecord = records[record.parent];
            if (record.parentEpoch != parentRecord.epoch) {
                return MegaNamesSVG.invalidMetadata();
            }
        }

        if (!_isActive(tokenId)) {
            return MegaNamesSVG.expiredMetadata();
        }

        string memory fullName = _buildFullName(tokenId);
        fullName = string.concat(fullName, ".mega");
        string memory displayName = bytes(fullName).length <= 20
            ? MegaNamesSVG.toUpperCase(fullName)
            : MegaNamesSVG.toUpperCase(string.concat(_truncateUTF8(fullName, 17), "..."));

        string memory attributes;
        if (record.parent == 0) {
            attributes = string.concat(
                ',"attributes":[{"trait_type":"Expires","display_type":"date","value":',
                uint256(record.expiresAt).toString(),
                "}]"
            );
        } else {
            attributes = ',"attributes":[{"trait_type":"Type","value":"Subdomain"}]';
        }

        string memory escapedName = MegaNamesSVG.escapeJSON(fullName);

        return string.concat(
            "data:application/json;base64,",
            Base64.encode(
                bytes(
                    string.concat(
                        '{"name":"',
                        escapedName,
                        '","description":"MegaNames: ',
                        escapedName,
                        '","image":"data:image/svg+xml;base64,',
                        Base64.encode(bytes(MegaNamesSVG.generateSVG(displayName))),
                        '"',
                        attributes,
                        "}"
                    )
                )
            )
        );
    }

    /*//////////////////////////////////////////////////////////////
                            REGISTRATION
    //////////////////////////////////////////////////////////////*/

    function registrationFee(uint256 labelLength) public view returns (uint256) {
        if (lengthFeeSet[labelLength]) {
            return lengthFees[labelLength];
        }
        return defaultFee;
    }

    /// @notice Calculate total fee with multi-year discount
    /// @param labelLength Length of the name label
    /// @param numYears Number of years (1-10)
    /// @return Total fee after discount
    function calculateFee(uint256 labelLength, uint256 numYears) public view returns (uint256) {
        uint256 yearlyFee = registrationFee(labelLength);
        uint256 baseFee = yearlyFee * numYears;
        
        uint256 discount;
        if (numYears >= 10) {
            discount = DISCOUNT_10Y;
        } else if (numYears >= 5) {
            discount = DISCOUNT_5Y;
        } else if (numYears >= 3) {
            discount = DISCOUNT_3Y;
        } else if (numYears >= 2) {
            discount = DISCOUNT_2Y;
        }
        
        return baseFee - (baseFee * discount / 10000);
    }

    /// @notice Calculate current premium for an expired name (Dutch auction after grace period)
    /// @param tokenId The name token ID
    /// @return premium The current premium in USDM (0 if not expired or fully decayed)
    function currentPremium(uint256 tokenId) public view returns (uint256 premium) {
        if (!_recordExists(tokenId)) return 0;
        if (_isActive(tokenId)) return 0;
        if (maxPremium == 0 || premiumDecayPeriod == 0) return 0;
        
        uint256 graceEnd = uint256(records[tokenId].expiresAt) + GRACE_PERIOD;
        if (block.timestamp <= graceEnd) return 0; // still in grace period
        
        uint256 elapsed = block.timestamp - graceEnd;
        if (elapsed >= premiumDecayPeriod) return 0; // fully decayed
        
        // Linear decay: maxPremium * (remaining / total)
        return maxPremium * (premiumDecayPeriod - elapsed) / premiumDecayPeriod;
    }

    /// @notice Register a name (must approve USDM first)
    /// @param label The name to register
    /// @param owner Address to own the name
    /// @param numYears Number of years to register (1-10)
    function register(string calldata label, address owner, uint256 numYears)
        public
        nonReentrant
        returns (uint256 tokenId)
    {
        if (!registrationOpen) revert RegistrationClosed();
        if (numYears < MIN_YEARS || numYears > MAX_YEARS) revert InvalidYears();
        
        bytes memory normalized = _validateAndNormalize(bytes(label));

        tokenId = uint256(keccak256(abi.encodePacked(MEGA_NODE, keccak256(normalized))));
        if (_recordExists(tokenId) && _isActive(tokenId)) revert AlreadyRegistered();

        uint256 fee = calculateFee(normalized.length, numYears) + currentPremium(tokenId);
        
        // Transfer USDM from caller
        if (fee > 0) {
            SafeTransferLib.safeTransferFrom(paymentToken, msg.sender, feeRecipient, fee);
        }

        // Update counters
        totalRegistrations++;
        totalVolume += fee;

        uint64 expiresAt = uint64(block.timestamp + REGISTRATION_PERIOD * numYears);

        // Increment epoch if re-registering expired name
        uint64 newEpoch = records[tokenId].epoch + 1;

        records[tokenId] = NameRecord({
            label: string(normalized),
            parent: 0,
            expiresAt: expiresAt,
            epoch: newEpoch,
            parentEpoch: 0
        });

        // Clear resolver data on new registration
        recordVersion[tokenId]++;

        // Burn expired token if re-registering, then mint to new owner
        if (_exists(tokenId)) {
            _burn(tokenId);
        }
        _mint(owner, tokenId);

        emit NameRegistered(tokenId, string(normalized), owner, expiresAt);
    }

    /// @notice Register a name with permit (single transaction - approve + register)
    /// @param label The name to register
    /// @param owner Address to own the name
    /// @param numYears Number of years to register (1-10)
    /// @param deadline Permit deadline timestamp
    /// @param v Permit signature v
    /// @param r Permit signature r
    /// @param s Permit signature s
    function registerWithPermit(
        string calldata label,
        address owner,
        uint256 numYears,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public nonReentrant returns (uint256 tokenId) {
        if (!registrationOpen) revert RegistrationClosed();
        if (numYears < MIN_YEARS || numYears > MAX_YEARS) revert InvalidYears();
        
        bytes memory normalized = _validateAndNormalize(bytes(label));

        tokenId = uint256(keccak256(abi.encodePacked(MEGA_NODE, keccak256(normalized))));
        if (_recordExists(tokenId) && _isActive(tokenId)) revert AlreadyRegistered();

        uint256 fee = calculateFee(normalized.length, numYears) + currentPremium(tokenId);
        
        // Execute permit to approve spending, then transfer
        if (fee > 0) {
            // Call permit on the USDM token (Solady ERC20 has permit built-in)
            (bool success,) = paymentToken.call(
                abi.encodeWithSignature(
                    "permit(address,address,uint256,uint256,uint8,bytes32,bytes32)",
                    msg.sender,
                    address(this),
                    fee,
                    deadline,
                    v,
                    r,
                    s
                )
            );
            // Permit can fail silently if already approved - that's OK
            // The transferFrom below will revert if not approved
            
            SafeTransferLib.safeTransferFrom(paymentToken, msg.sender, feeRecipient, fee);
        }

        // Update counters
        totalRegistrations++;
        totalVolume += fee;

        uint64 expiresAt = uint64(block.timestamp + REGISTRATION_PERIOD * numYears);
        uint64 newEpoch = records[tokenId].epoch + 1;

        records[tokenId] = NameRecord({
            label: string(normalized),
            parent: 0,
            expiresAt: expiresAt,
            epoch: newEpoch,
            parentEpoch: 0
        });

        recordVersion[tokenId]++;
        if (_exists(tokenId)) {
            _burn(tokenId);
        }
        _mint(owner, tokenId);

        emit NameRegistered(tokenId, string(normalized), owner, expiresAt);
    }

    /*//////////////////////////////////////////////////////////////
                           ADMIN REGISTRATION
    //////////////////////////////////////////////////////////////*/

    /// @notice Admin-only free registration (no payment, no commit-reveal)
    /// @param label The name to register
    /// @param owner Address to own the name
    /// @param numYears Number of years to register (1-10)
    function adminRegister(string calldata label, address owner, uint256 numYears)
        external
        onlyOwner
        returns (uint256 tokenId)
    {
        if (numYears < MIN_YEARS || numYears > MAX_YEARS) revert InvalidYears();

        bytes memory normalized = _validateAndNormalize(bytes(label));

        tokenId = uint256(keccak256(abi.encodePacked(MEGA_NODE, keccak256(normalized))));
        if (_recordExists(tokenId) && _isActive(tokenId)) revert AlreadyRegistered();

        totalRegistrations++;

        uint64 expiresAt = uint64(block.timestamp + REGISTRATION_PERIOD * numYears);
        uint64 newEpoch = records[tokenId].epoch + 1;

        records[tokenId] = NameRecord({
            label: string(normalized),
            parent: 0,
            expiresAt: expiresAt,
            epoch: newEpoch,
            parentEpoch: 0
        });

        recordVersion[tokenId]++;

        if (_exists(tokenId)) {
            _burn(tokenId);
        }
        _mint(owner, tokenId);

        emit NameRegistered(tokenId, string(normalized), owner, expiresAt);
    }

    /// @notice Batch admin registration
    /// @param labels Array of names to register
    /// @param owners Array of owner addresses
    /// @param numYears Number of years for all names
    function adminRegisterBatch(
        string[] calldata labels,
        address[] calldata owners,
        uint256 numYears
    ) external onlyOwner {
        if (labels.length != owners.length) revert LengthMismatch();
        if (numYears < MIN_YEARS || numYears > MAX_YEARS) revert InvalidYears();

        for (uint256 i; i < labels.length; ++i) {
            bytes memory normalized = _validateAndNormalize(bytes(labels[i]));

            uint256 tokenId = uint256(keccak256(abi.encodePacked(MEGA_NODE, keccak256(normalized))));
            if (_recordExists(tokenId) && _isActive(tokenId)) revert AlreadyRegistered();

            totalRegistrations++;

            uint64 expiresAt = uint64(block.timestamp + REGISTRATION_PERIOD * numYears);
            uint64 newEpoch = records[tokenId].epoch + 1;

            records[tokenId] = NameRecord({
                label: string(normalized),
                parent: 0,
                expiresAt: expiresAt,
                epoch: newEpoch,
                parentEpoch: 0
            });

            recordVersion[tokenId]++;

            if (_exists(tokenId)) {
                _burn(tokenId);
            }
            _mint(owners[i], tokenId);

            emit NameRegistered(tokenId, string(normalized), owners[i], expiresAt);
        }
    }

    /*//////////////////////////////////////////////////////////////
                              RENEWAL
    //////////////////////////////////////////////////////////////*/

    /// @notice Renew a name (must approve USDM first)
    /// @param tokenId The name token ID to renew
    /// @param numYears Number of years to renew (1-10)
    function renew(uint256 tokenId, uint256 numYears) public nonReentrant {
        if (numYears < MIN_YEARS || numYears > MAX_YEARS) revert InvalidYears();
        
        NameRecord storage record = records[tokenId];
        if (record.parent != 0) revert InvalidName();
        if (!_recordExists(tokenId)) revert InvalidName();

        uint256 labelLen = bytes(record.label).length;
        uint256 fee = calculateFee(labelLen, numYears);

        // Transfer USDM from caller
        if (fee > 0) {
            SafeTransferLib.safeTransferFrom(paymentToken, msg.sender, feeRecipient, fee);
        }

        // Update counters
        totalRenewals++;
        totalVolume += fee;

        uint64 currentExpiry = record.expiresAt;
        uint64 newExpiry;

        if (block.timestamp > currentExpiry + GRACE_PERIOD) {
            // Fully expired - must re-register
            revert Expired();
        } else if (block.timestamp > currentExpiry) {
            // In grace period - extend from now
            newExpiry = uint64(block.timestamp + REGISTRATION_PERIOD * numYears);
        } else {
            // Still active - extend from current expiry
            newExpiry = currentExpiry + uint64(REGISTRATION_PERIOD * numYears);
        }

        record.expiresAt = newExpiry;
        emit NameRenewed(tokenId, newExpiry);
    }

    /*//////////////////////////////////////////////////////////////
                             SUBDOMAINS
    //////////////////////////////////////////////////////////////*/

    function registerSubdomain(uint256 parentId, string calldata label)
        public
        returns (uint256 tokenId)
    {
        if (ownerOf(parentId) != msg.sender) revert NotParentOwner();
        if (!_isActive(parentId)) revert Expired();

        NameRecord storage parentRecord = records[parentId];
        uint256 depth = _getDepth(parentId);
        if (depth >= MAX_SUBDOMAIN_DEPTH) revert TooDeep();

        bytes memory normalized = _validateAndNormalize(bytes(label));

        tokenId = uint256(keccak256(abi.encodePacked(bytes32(parentId), keccak256(normalized))));
        if (_recordExists(tokenId) && _isSubdomainValid(tokenId)) revert AlreadyRegistered();

        // Update counter
        totalSubdomains++;

        uint64 newEpoch = records[tokenId].epoch + 1;

        records[tokenId] = NameRecord({
            label: string(normalized),
            parent: parentId,
            expiresAt: 0,
            epoch: newEpoch,
            parentEpoch: parentRecord.epoch
        });

        recordVersion[tokenId]++;

        // Burn stale subdomain token if re-registering after parent epoch change
        if (_exists(tokenId)) {
            _burn(tokenId);
        }
        _mint(msg.sender, tokenId);

        emit SubdomainRegistered(tokenId, parentId, string(normalized));
    }

    /// @notice Revoke a subdomain (parent owner only)
    /// @param tokenId The subdomain token ID to revoke
    function revokeSubdomain(uint256 tokenId) public {
        NameRecord storage record = records[tokenId];
        uint256 parentId = record.parent;
        if (parentId == 0) revert InvalidName(); // not a subdomain
        if (ownerOf(parentId) != msg.sender) revert NotParentOwner();
        if (!_isSubdomainValid(tokenId)) revert InvalidName(); // already invalid

        // Burn the subdomain token
        _burn(tokenId);

        // Delete record so subdomain can be re-registered
        delete records[tokenId];

        // Clear resolver data
        recordVersion[tokenId]++;

        emit SubdomainRevoked(tokenId, parentId);
    }

    /*//////////////////////////////////////////////////////////////
                              RESOLVER
    //////////////////////////////////////////////////////////////*/

    function setAddr(uint256 tokenId, address addr_) public {
        _requireOwner(tokenId);
        uint256 version = recordVersion[tokenId];
        _resolvedAddress[tokenId][version] = addr_;
        emit AddrChanged(bytes32(tokenId), addr_);
    }

    function setContenthash(uint256 tokenId, bytes calldata hash) public {
        _requireOwner(tokenId);
        uint256 version = recordVersion[tokenId];
        _contenthash[tokenId][version] = hash;
        emit ContenthashChanged(bytes32(tokenId), hash);
    }

    /// @notice Set contenthash to point to a Warren on-chain website
    /// @param tokenId The name token ID
    /// @param warrenTokenId The Warren NFT token ID
    /// @param isMaster True for Master NFT, false for Container NFT
    function setWarrenContenthash(uint256 tokenId, uint32 warrenTokenId, bool isMaster) public {
        _requireOwner(tokenId);
        bytes memory hash = WarrenLib.encode(warrenTokenId, isMaster);
        uint256 version = recordVersion[tokenId];
        _contenthash[tokenId][version] = hash;
        emit ContenthashChanged(bytes32(tokenId), hash);
    }

    function setText(uint256 tokenId, string calldata key, string calldata value) public {
        _requireOwner(tokenId);
        uint256 version = recordVersion[tokenId];
        _text[tokenId][version][key] = value;
        emit TextChanged(bytes32(tokenId), key, value);
    }

    function addr(uint256 tokenId) public view returns (address) {
        if (!_isActive(tokenId)) return address(0);
        return _resolvedAddress[tokenId][recordVersion[tokenId]];
    }

    function contenthash(uint256 tokenId) public view returns (bytes memory) {
        if (!_isActive(tokenId)) return "";
        return _contenthash[tokenId][recordVersion[tokenId]];
    }

    /// @notice Get ERC-7930 Interoperable Address for a name
    /// @dev Binary format: Version(2) | ChainType(2) | ChainRefLen(1) | ChainRef(var) | AddrLen(1) | Address(20)
    /// @param tokenId The name token ID
    /// @return The ERC-7930 encoded interoperable address (empty if unresolvable)
    function interopAddress(uint256 tokenId) public view returns (bytes memory) {
        address resolved = addr(tokenId);
        if (resolved == address(0)) return "";

        uint256 chainId = block.chainid;
        
        // Encode chain ID as minimal big-endian bytes
        uint8 chainRefLen;
        if (chainId <= 0xFF) chainRefLen = 1;
        else if (chainId <= 0xFFFF) chainRefLen = 2;
        else if (chainId <= 0xFFFFFF) chainRefLen = 3;
        else chainRefLen = 4;

        bytes memory result = new bytes(6 + chainRefLen + 20);
        
        // Version 1
        result[0] = 0x00;
        result[1] = 0x01;
        // ChainType 0x0000 (EVM/eip155)
        result[2] = 0x00;
        result[3] = 0x00;
        // ChainReferenceLength
        result[4] = bytes1(chainRefLen);
        // ChainReference (big-endian)
        for (uint8 i = 0; i < chainRefLen; i++) {
            result[5 + chainRefLen - 1 - i] = bytes1(uint8(chainId >> (8 * i)));
        }
        // AddressLength (20)
        result[5 + chainRefLen] = 0x14;
        // Address
        bytes20 addrBytes = bytes20(resolved);
        for (uint8 i = 0; i < 20; i++) {
            result[6 + chainRefLen + i] = addrBytes[i];
        }
        
        return result;
    }

    /// @notice Get Warren site info if contenthash points to Warren
    /// @param tokenId The name token ID
    /// @return warrenTokenId The Warren NFT token ID (0 if not Warren)
    /// @return isMaster True if Master NFT type
    /// @return isWarren True if contenthash is Warren format
    function warren(uint256 tokenId) public view returns (uint32 warrenTokenId, bool isMaster, bool isWarren) {
        bytes memory hash = contenthash(tokenId);
        if (hash.length == 0) return (0, false, false);
        
        isWarren = WarrenLib.isWarren(hash);
        if (!isWarren) return (0, false, false);
        
        (warrenTokenId, isMaster) = WarrenLib.decode(hash);
    }

    function text(uint256 tokenId, string calldata key) public view returns (string memory) {
        if (!_isActive(tokenId)) return "";
        return _text[tokenId][recordVersion[tokenId]][key];
    }

    /*//////////////////////////////////////////////////////////////
                           REVERSE RESOLUTION
    //////////////////////////////////////////////////////////////*/

    function setPrimaryName(uint256 tokenId) public {
        if (ownerOf(tokenId) != msg.sender) revert NotParentOwner();
        if (!_isActive(tokenId)) revert Expired();
        primaryName[msg.sender] = tokenId;
        emit PrimaryNameSet(msg.sender, tokenId);
    }

    function clearPrimaryName() public {
        primaryName[msg.sender] = 0;
        emit PrimaryNameSet(msg.sender, 0);
    }

    function getName(address addr_) public view returns (string memory) {
        uint256 tokenId = primaryName[addr_];
        if (tokenId == 0) return "";
        if (!_isActive(tokenId)) return "";
        if (ownerOf(tokenId) != addr_) return "";
        return string.concat(_buildFullName(tokenId), ".mega");
    }

    /*//////////////////////////////////////////////////////////////
                               ADMIN
    //////////////////////////////////////////////////////////////*/

    function setPaymentToken(address newToken) public onlyOwner {
        if (newToken == address(0)) revert InvalidPaymentToken();
        paymentToken = newToken;
        emit PaymentTokenChanged(newToken);
    }

    /// @notice Toggle public registration open/closed (admin can always register)
    function setRegistrationOpen(bool open) public onlyOwner {
        registrationOpen = open;
        emit RegistrationOpenChanged(open);
    }

    function setFeeRecipient(address newRecipient) public onlyOwner {
        if (newRecipient == address(0)) revert InvalidAddress();
        feeRecipient = newRecipient;
        emit FeeRecipientChanged(newRecipient);
    }

    function setDefaultFee(uint256 fee) public onlyOwner {
        defaultFee = fee;
        emit DefaultFeeChanged(fee);
    }

    function setLengthFee(uint256 length, uint256 fee) public onlyOwner {
        if (length == 0) revert InvalidLength();
        lengthFees[length] = fee;
        lengthFeeSet[length] = true;
        emit LengthFeeChanged(length, fee);
    }

    function clearLengthFee(uint256 length) public onlyOwner {
        lengthFeeSet[length] = false;
        emit LengthFeeCleared(length);
    }

    function setPremiumSettings(uint256 _maxPremium, uint256 _decayPeriod) public onlyOwner {
        if (_maxPremium > MAX_PREMIUM_CAP) revert PremiumTooHigh();
        if (_decayPeriod > MAX_DECAY_PERIOD) revert DecayPeriodTooLong();
        maxPremium = _maxPremium;
        premiumDecayPeriod = _decayPeriod;
        emit PremiumSettingsChanged(_maxPremium, _decayPeriod);
    }

    /*//////////////////////////////////////////////////////////////
                            INTERNAL HELPERS
    //////////////////////////////////////////////////////////////*/

    function _requireOwner(uint256 tokenId) internal view {
        if (ownerOf(tokenId) != msg.sender) revert NotParentOwner();
        if (!_isActive(tokenId)) revert Expired();
    }

    function _recordExists(uint256 tokenId) internal view returns (bool) {
        return bytes(records[tokenId].label).length > 0;
    }

    function _isActive(uint256 tokenId) internal view returns (bool) {
        NameRecord storage record = records[tokenId];
        if (!_recordExists(tokenId)) return false;

        if (record.parent == 0) {
            // Top-level: check expiry + grace
            return block.timestamp <= record.expiresAt + GRACE_PERIOD;
        } else {
            // Subdomain: check parent validity
            return _isSubdomainValid(tokenId);
        }
    }

    function _isSubdomainValid(uint256 tokenId) internal view returns (bool) {
        NameRecord storage record = records[tokenId];
        if (record.parent == 0) return false;

        NameRecord storage parentRecord = records[record.parent];
        if (record.parentEpoch != parentRecord.epoch) return false;

        return _isActive(record.parent);
    }

    function _getDepth(uint256 tokenId) internal view returns (uint256 depth) {
        uint256 current = tokenId;
        while (records[current].parent != 0) {
            current = records[current].parent;
            depth++;
        }
    }

    function _buildFullName(uint256 tokenId) internal view returns (string memory) {
        NameRecord storage record = records[tokenId];
        if (record.parent == 0) {
            return record.label;
        }
        return string.concat(record.label, ".", _buildFullName(record.parent));
    }

    function _validateAndNormalize(bytes memory label) internal pure returns (bytes memory) {
        uint256 len = label.length;
        if (len == 0) revert EmptyLabel();
        if (len > MAX_LABEL_LENGTH) revert InvalidLength();

        bytes memory result = new bytes(len);

        for (uint256 i = 0; i < len; i++) {
            uint8 b = uint8(label[i]);

            // Uppercase A-Z → lowercase a-z
            if (b >= 0x41 && b <= 0x5a) {
                result[i] = bytes1(b + 32);
                continue;
            }

            // Allow: a-z (0x61-0x7a), 0-9 (0x30-0x39), hyphen (0x2d)
            if ((b >= 0x61 && b <= 0x7a) || (b >= 0x30 && b <= 0x39) || b == 0x2d) {
                result[i] = label[i];
                continue;
            }

            // Everything else is rejected: dots, spaces, null bytes,
            // control chars, special chars, unicode/emoji, etc.
            revert InvalidName();
        }

        // No leading or trailing hyphens
        if (uint8(result[0]) == 0x2d || uint8(result[len - 1]) == 0x2d) revert InvalidName();

        return result;
    }

    function _truncateUTF8(string memory s, uint256 maxLen) internal pure returns (string memory) {
        bytes memory sb = bytes(s);
        if (sb.length <= maxLen) return s;

        uint256 i = 0;
        uint256 count = 0;
        while (i < sb.length && count < maxLen) {
            uint8 b = uint8(sb[i]);
            if (b < 0x80) i++;
            else if ((b & 0xe0) == 0xc0) i += 2;
            else if ((b & 0xf0) == 0xe0) i += 3;
            else if ((b & 0xf8) == 0xf0) i += 4;
            else i++;
            count++;
        }

        bytes memory result = new bytes(i);
        for (uint256 j = 0; j < i; j++) {
            result[j] = sb[j];
        }
        return string(result);
    }
}
