// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Base64} from "solady/utils/Base64.sol";
import {ERC721} from "solady/tokens/ERC721.sol";
import {Ownable} from "solady/auth/Ownable.sol";
import {LibString} from "solady/utils/LibString.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";
import {ReentrancyGuard} from "soledge/utils/ReentrancyGuard.sol";
import {WarrenLib} from "./WarrenLib.sol";

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
    error AlreadyCommitted();
    error CommitmentTooNew();
    error CommitmentTooOld();
    error AlreadyRegistered();
    error CommitmentNotFound();
    error DecayPeriodTooLong();
    error InvalidPaymentToken();
    error InvalidYears();

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    event NameRegistered(
        uint256 indexed tokenId, string label, address indexed owner, uint256 expiresAt
    );
    event SubdomainRegistered(uint256 indexed tokenId, uint256 indexed parentId, string label);
    event NameRenewed(uint256 indexed tokenId, uint256 newExpiresAt);
    event PrimaryNameSet(address indexed addr, uint256 indexed tokenId);
    event Committed(bytes32 indexed commitment, address indexed committer);

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

    /*//////////////////////////////////////////////////////////////
                                CONSTANTS
    //////////////////////////////////////////////////////////////*/

    /// @dev Namehash of "mega" TLD
    /// keccak256(abi.encodePacked(bytes32(0), keccak256("mega")))
    bytes32 public constant MEGA_NODE =
        0x892fab39f6d2ae901009febba7dbdd0fd85e8a1651be6b8901774cdef395852f;

    uint256 constant MAX_LABEL_LENGTH = 255;
    uint256 constant MIN_LABEL_LENGTH = 1;
    uint256 constant MIN_COMMITMENT_AGE = 60;
    uint256 constant MAX_COMMITMENT_AGE = 86400;
    uint256 constant REGISTRATION_PERIOD = 365 days;
    uint256 constant GRACE_PERIOD = 90 days;
    uint256 constant MAX_SUBDOMAIN_DEPTH = 10;
    uint256 constant COIN_TYPE_ETH = 60;
    uint256 constant MAX_PREMIUM_CAP = 100_000e18; // 100k USDM
    uint256 constant MAX_DECAY_PERIOD = 3650 days;
    uint256 constant MIN_YEARS = 1;
    uint256 constant MAX_YEARS = 10;
    
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
    mapping(bytes32 => uint256) public commitments;
    mapping(address => uint256) public primaryName;

    /// @notice Total number of names registered
    uint256 public totalRegistrations;
    
    /// @notice Total number of renewals
    uint256 public totalRenewals;
    
    /// @notice Total number of subdomains created
    uint256 public totalSubdomains;
    
    /// @notice Total volume in USDM (18 decimals) from registrations + renewals
    uint256 public totalVolume;

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

    /// @dev Blocks transfers of inactive tokens
    function _beforeTokenTransfer(address from, address to, uint256 tokenId)
        internal
        virtual
        override(ERC721)
    {
        if (from != address(0) && to != address(0)) {
            if (!_isActive(tokenId)) revert Expired();
        }
    }

    function tokenURI(uint256 tokenId) public view override(ERC721) returns (string memory) {
        if (!_recordExists(tokenId)) revert TokenDoesNotExist();

        NameRecord storage record = records[tokenId];

        // Check for stale subdomain
        if (record.parent != 0) {
            NameRecord storage parentRecord = records[record.parent];
            if (record.parentEpoch != parentRecord.epoch) {
                return _invalidMetadata();
            }
        }

        if (!_isActive(tokenId)) {
            return _expiredMetadata();
        }

        string memory fullName = _buildFullName(tokenId);
        fullName = string.concat(fullName, ".mega");
        string memory displayName = bytes(fullName).length <= 20
            ? fullName
            : string.concat(_truncateUTF8(fullName, 17), "...");

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

        string memory escapedName = _escapeJSON(fullName);

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
                        Base64.encode(bytes(_generateSVG(displayName))),
                        '"',
                        attributes,
                        "}"
                    )
                )
            )
        );
    }

    /*//////////////////////////////////////////////////////////////
                            COMMIT-REVEAL
    //////////////////////////////////////////////////////////////*/

    function makeCommitment(string calldata label, address owner, bytes32 secret)
        public
        pure
        returns (bytes32)
    {
        bytes memory normalized = _validateAndNormalize(bytes(label));
        return keccak256(abi.encode(normalized, owner, secret));
    }

    function commit(bytes32 commitment) public {
        if (
            commitments[commitment] != 0
                && block.timestamp <= commitments[commitment] + MAX_COMMITMENT_AGE
        ) {
            revert AlreadyCommitted();
        }
        commitments[commitment] = block.timestamp;
        emit Committed(commitment, msg.sender);
    }

    /*//////////////////////////////////////////////////////////////
                            REGISTRATION
    //////////////////////////////////////////////////////////////*/

    /// @notice Register a name (must approve USDM first)
    /// @param label The name to register
    /// @param owner Address to own the name
    /// @param secret Secret used in commitment
    /// @param numYears Number of years to register (1-10)
    function register(string calldata label, address owner, bytes32 secret, uint256 numYears)
        public
        nonReentrant
        returns (uint256 tokenId)
    {
        if (numYears < MIN_YEARS || numYears > MAX_YEARS) revert InvalidYears();
        
        bytes memory normalized = _validateAndNormalize(bytes(label));
        bytes32 commitment = keccak256(abi.encode(normalized, owner, secret));

        uint256 commitTime = commitments[commitment];
        if (commitTime == 0) revert CommitmentNotFound();
        if (block.timestamp < commitTime + MIN_COMMITMENT_AGE) revert CommitmentTooNew();
        if (block.timestamp > commitTime + MAX_COMMITMENT_AGE) revert CommitmentTooOld();

        delete commitments[commitment];

        tokenId = uint256(keccak256(abi.encodePacked(MEGA_NODE, keccak256(normalized))));
        if (_recordExists(tokenId) && _isActive(tokenId)) revert AlreadyRegistered();

        uint256 fee = registrationFee(normalized.length) * numYears;
        
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

        _mint(owner, tokenId);

        emit NameRegistered(tokenId, string(normalized), owner, expiresAt);
    }

    function registrationFee(uint256 labelLength) public view returns (uint256) {
        if (lengthFeeSet[labelLength]) {
            return lengthFees[labelLength];
        }
        return defaultFee;
    }

    /// @notice Register a name directly without commit-reveal (simpler flow for fast chains)
    /// @param label The name to register
    /// @param owner Address to own the name
    /// @param numYears Number of years to register (1-10)
    function registerDirect(string calldata label, address owner, uint256 numYears)
        public
        nonReentrant
        returns (uint256 tokenId)
    {
        if (numYears < MIN_YEARS || numYears > MAX_YEARS) revert InvalidYears();
        
        bytes memory normalized = _validateAndNormalize(bytes(label));

        tokenId = uint256(keccak256(abi.encodePacked(MEGA_NODE, keccak256(normalized))));
        if (_recordExists(tokenId) && _isActive(tokenId)) revert AlreadyRegistered();

        uint256 fee = registrationFee(normalized.length) * numYears;
        
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
        if (numYears < MIN_YEARS || numYears > MAX_YEARS) revert InvalidYears();
        
        bytes memory normalized = _validateAndNormalize(bytes(label));

        tokenId = uint256(keccak256(abi.encodePacked(MEGA_NODE, keccak256(normalized))));
        if (_recordExists(tokenId) && _isActive(tokenId)) revert AlreadyRegistered();

        uint256 fee = registrationFee(normalized.length) * numYears;
        
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
        _mint(owner, tokenId);

        emit NameRegistered(tokenId, string(normalized), owner, expiresAt);
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
        uint256 fee = registrationFee(labelLen) * numYears;

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
        _mint(msg.sender, tokenId);

        emit SubdomainRegistered(tokenId, parentId, string(normalized));
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

    function setFeeRecipient(address newRecipient) public onlyOwner {
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
        uint256 i = 0;

        while (i < len) {
            uint8 b = uint8(label[i]);

            // Forbid dots
            if (b == 0x2e) revert InvalidName();

            // ASCII lowercase conversion
            if (b >= 0x41 && b <= 0x5a) {
                result[i] = bytes1(b + 32);
                i++;
                continue;
            }

            // Regular ASCII
            if (b < 0x80) {
                result[i] = label[i];
                i++;
                continue;
            }

            // UTF-8 multi-byte sequences
            uint256 seqLen;
            if ((b & 0xe0) == 0xc0) seqLen = 2;
            else if ((b & 0xf0) == 0xe0) seqLen = 3;
            else if ((b & 0xf8) == 0xf0) seqLen = 4;
            else revert InvalidName();

            if (i + seqLen > len) revert InvalidName();

            for (uint256 j = 0; j < seqLen; j++) {
                result[i + j] = label[i + j];
            }
            i += seqLen;
        }

        return result;
    }

    function _generateSVG(string memory displayName) internal pure returns (string memory) {
        return string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">',
            '<defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">',
            '<stop offset="0%" style="stop-color:#6366f1"/><stop offset="100%" style="stop-color:#8b5cf6"/>',
            '</linearGradient></defs>',
            '<rect width="400" height="400" fill="url(#bg)"/>',
            '<text x="200" y="200" font-family="sans-serif" font-size="24" ',
            'text-anchor="middle" fill="#fff">',
            _escapeXML(displayName),
            '</text></svg>'
        );
    }

    function _escapeXML(string memory s) internal pure returns (string memory) {
        bytes memory sb = bytes(s);
        bytes memory result = new bytes(sb.length * 6);
        uint256 j = 0;

        for (uint256 i = 0; i < sb.length; i++) {
            bytes1 c = sb[i];
            if (c == "&") {
                result[j++] = "&"; result[j++] = "a"; result[j++] = "m"; result[j++] = "p"; result[j++] = ";";
            } else if (c == "<") {
                result[j++] = "&"; result[j++] = "l"; result[j++] = "t"; result[j++] = ";";
            } else if (c == ">") {
                result[j++] = "&"; result[j++] = "g"; result[j++] = "t"; result[j++] = ";";
            } else {
                result[j++] = c;
            }
        }

        bytes memory trimmed = new bytes(j);
        for (uint256 i = 0; i < j; i++) {
            trimmed[i] = result[i];
        }
        return string(trimmed);
    }

    function _escapeJSON(string memory s) internal pure returns (string memory) {
        bytes memory sb = bytes(s);
        bytes memory result = new bytes(sb.length * 2);
        uint256 j = 0;

        for (uint256 i = 0; i < sb.length; i++) {
            bytes1 c = sb[i];
            if (c == '"' || c == "\\") {
                result[j++] = "\\";
            }
            result[j++] = c;
        }

        bytes memory trimmed = new bytes(j);
        for (uint256 i = 0; i < j; i++) {
            trimmed[i] = result[i];
        }
        return string(trimmed);
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

    function _invalidMetadata() internal pure returns (string memory) {
        return string.concat(
            "data:application/json;base64,",
            Base64.encode(
                bytes(
                    '{"name":"[Invalid]","description":"This subdomain is no longer valid.","image":"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MDAgNDAwIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iIzk5OSIvPjx0ZXh0IHg9IjIwMCIgeT0iMjAwIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIyNCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2ZmZiI+W0ludmFsaWRdPC90ZXh0Pjwvc3ZnPg=="}'
                )
            )
        );
    }

    function _expiredMetadata() internal pure returns (string memory) {
        return string.concat(
            "data:application/json;base64,",
            Base64.encode(
                bytes(
                    '{"name":"[Expired]","description":"This name has expired.","image":"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MDAgNDAwIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iIzk5OSIvPjx0ZXh0IHg9IjIwMCIgeT0iMjAwIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIyNCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2ZmZiI+W0V4cGlyZWRdPC90ZXh0Pjwvc3ZnPg=="}'
                )
            )
        );
    }
}
