// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";
import {Ownable} from "solady/auth/Ownable.sol";

/// @notice Minimal interface for MegaNames
interface IMegaNames {
    function ownerOf(uint256 tokenId) external view returns (address);
    function transferFrom(address from, address to, uint256 tokenId) external;
    function registerSubdomain(uint256 parentId, string calldata label) external returns (uint256);
    function isApprovedForAll(address owner, address operator) external view returns (bool);
    function records(uint256 tokenId) external view returns (
        string memory label, uint256 parent, uint64 expiresAt, uint64 epoch, uint64 parentEpoch
    );
}

/// @notice Interface for swappable logic contract
interface ISubdomainLogic {
    function validate(uint256 parentId, string calldata label, address buyer)
        external view returns (bool allowed, uint256 price);
}

/// @title SubdomainRouter
/// @notice Permanent router for paid subdomain registration on MegaNames
/// @dev Flash-based: pulls parent NFT, registers subdomain, returns parent — all atomic
/// @author MegaETH Labs
contract SubdomainRouter is Ownable {
    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/

    error NotParentOwner();
    error NotEnabled();
    error NotAllowed();
    error PriceBelowMinimum();
    error FlashFailed();
    error BatchTooLarge();
    error InvalidAddress();
    error FeeTooHigh();
    error NoLogicContract();
    error ApprovalRequired();

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    event Configured(uint256 indexed parentId, address payoutAddress, bool enabled, Mode mode);
    event Disabled(uint256 indexed parentId);
    event SubdomainSold(
        uint256 indexed parentId, uint256 indexed subTokenId,
        string label, address buyer, uint256 price
    );
    event LogicContractChanged(address newLogic);
    event ProtocolFeeChanged(uint256 newBps);
    event ReferralFeeChanged(uint256 newBps);
    event FeeRecipientChanged(address newRecipient);
    event MaxTokenGatesChanged(uint256 newMax);

    /*//////////////////////////////////////////////////////////////
                                 ENUMS
    //////////////////////////////////////////////////////////////*/

    enum Mode { OPEN, ALLOWLIST }

    /*//////////////////////////////////////////////////////////////
                                CONSTANTS
    //////////////////////////////////////////////////////////////*/

    uint256 public constant MAX_PROTOCOL_FEE_BPS = 1000; // 10% cap
    uint256 public constant MAX_REFERRAL_FEE_BPS = 1000; // 10% cap
    uint256 public constant MAX_BATCH_SIZE = 50;
    uint256 public constant MIN_PRICE = 0.01e18; // $0.01 USDM

    // Transient storage slots
    bytes32 private constant _FLASH_LOCK_SLOT = 0x00;

    /*//////////////////////////////////////////////////////////////
                              IMMUTABLES
    //////////////////////////////////////////////////////////////*/

    IMegaNames public immutable megaNames;
    address public immutable paymentToken; // USDM

    /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/

    struct ParentConfig {
        address payoutAddress;
        bool enabled;
        Mode mode;
    }

    struct Counters {
        uint64 subdomainsSold;
        uint64 subdomainsActive;
        uint128 subdomainVolume; // USDM in 1e6 units (divide raw by 1e12 to store)
    }

    address public feeRecipient;
    uint256 public protocolFeeBps; // 250 = 2.5%
    uint256 public referralFeeBps; // 0 for v1
    address public logicContract;
    uint256 public maxTokenGates; // 1 for v1

    mapping(uint256 => ParentConfig) public parentConfigs;
    mapping(uint256 => Counters) public counters;

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        address _megaNames,
        address _paymentToken,
        address _feeRecipient,
        address _logicContract
    ) payable {
        _initializeOwner(msg.sender);
        megaNames = IMegaNames(_megaNames);
        paymentToken = _paymentToken;
        feeRecipient = _feeRecipient;
        logicContract = _logicContract;
        protocolFeeBps = 250; // 2.5%
        maxTokenGates = 1;
    }

    /*//////////////////////////////////////////////////////////////
                          PARENT OWNER CONFIG
    //////////////////////////////////////////////////////////////*/

    /// @notice Configure subdomain sales for a parent name
    /// @param parentId Token ID of the parent name
    /// @param payoutAddress Address to receive sale proceeds
    /// @param enabled Whether sales are active
    /// @param mode OPEN (anyone) or ALLOWLIST (token-gated)
    function configure(
        uint256 parentId,
        address payoutAddress,
        bool enabled,
        Mode mode
    ) external {
        if (megaNames.ownerOf(parentId) != msg.sender) revert NotParentOwner();
        if (payoutAddress == address(0)) revert InvalidAddress();
        // Verify approval is set
        if (!megaNames.isApprovedForAll(msg.sender, address(this))) revert ApprovalRequired();

        parentConfigs[parentId] = ParentConfig({
            payoutAddress: payoutAddress,
            enabled: enabled,
            mode: mode
        });

        emit Configured(parentId, payoutAddress, enabled, mode);
    }

    /// @notice Disable subdomain sales
    function disable(uint256 parentId) external {
        if (megaNames.ownerOf(parentId) != msg.sender) revert NotParentOwner();
        parentConfigs[parentId].enabled = false;
        emit Disabled(parentId);
    }

    /*//////////////////////////////////////////////////////////////
                            REGISTRATION
    //////////////////////////////////////////////////////////////*/

    /// @notice Register a paid subdomain
    /// @param parentId Token ID of the parent name
    /// @param label Subdomain label to register
    /// @param referrer Referrer address (address(0) if none)
    function register(uint256 parentId, string calldata label, address referrer)
        external
        returns (uint256 subTokenId)
    {
        return _register(parentId, label, msg.sender, referrer);
    }

    /// @notice Register a paid subdomain for someone else
    function registerFor(
        uint256 parentId,
        string calldata label,
        address to,
        address referrer
    ) external returns (uint256 subTokenId) {
        if (to == address(0)) revert InvalidAddress();
        return _register(parentId, label, to, referrer);
    }

    /// @notice Register multiple subdomains in one tx (single flash)
    function registerBatch(
        uint256 parentId,
        string[] calldata labels,
        address referrer
    ) external returns (uint256[] memory subTokenIds) {
        if (labels.length > MAX_BATCH_SIZE) revert BatchTooLarge();
        if (labels.length == 0) revert BatchTooLarge();

        ParentConfig storage config = parentConfigs[parentId];
        if (!config.enabled) revert NotEnabled();
        if (logicContract == address(0)) revert NoLogicContract();

        address parentOwner = megaNames.ownerOf(parentId);
        subTokenIds = new uint256[](labels.length);

        // Validate all labels and collect total price
        uint256 totalPrice;
        uint256[] memory prices = new uint256[](labels.length);
        for (uint256 i; i < labels.length; ++i) {
            (bool allowed, uint256 price) = ISubdomainLogic(logicContract).validate(
                parentId, labels[i], msg.sender
            );
            if (!allowed) revert NotAllowed();
            if (price < MIN_PRICE) revert PriceBelowMinimum();
            prices[i] = price;
            totalPrice += price;
        }

        // Collect total payment upfront
        _distributePayment(totalPrice, config.payoutAddress, referrer);

        // Flash: pull parent
        _setFlashLock();
        megaNames.transferFrom(parentOwner, address(this), parentId);

        // Register all subdomains
        for (uint256 i; i < labels.length; ++i) {
            subTokenIds[i] = megaNames.registerSubdomain(parentId, labels[i]);
        }

        // Return parent
        megaNames.transferFrom(address(this), parentOwner, parentId);
        _clearFlashLock();

        // Transfer subdomains to buyer and update counters
        Counters storage c = counters[parentId];
        for (uint256 i; i < labels.length; ++i) {
            megaNames.transferFrom(address(this), msg.sender, subTokenIds[i]);
            c.subdomainsSold++;
            c.subdomainsActive++;
            emit SubdomainSold(parentId, subTokenIds[i], labels[i], msg.sender, prices[i]);
        }
        c.subdomainVolume += uint128(totalPrice / 1e12);

        // Verify parent returned
        if (megaNames.ownerOf(parentId) != parentOwner) revert FlashFailed();
    }

    /*//////////////////////////////////////////////////////////////
                         INTERNAL REGISTRATION
    //////////////////////////////////////////////////////////////*/

    function _register(
        uint256 parentId,
        string calldata label,
        address to,
        address referrer
    ) internal returns (uint256 subTokenId) {
        ParentConfig storage config = parentConfigs[parentId];
        if (!config.enabled) revert NotEnabled();
        if (logicContract == address(0)) revert NoLogicContract();

        // Validate via logic contract
        (bool allowed, uint256 price) = ISubdomainLogic(logicContract).validate(
            parentId, label, msg.sender
        );
        if (!allowed) revert NotAllowed();
        if (price < MIN_PRICE) revert PriceBelowMinimum();

        // Collect payment (direct transfers)
        _distributePayment(price, config.payoutAddress, referrer);

        // Flash: pull parent → register → return parent
        address parentOwner = megaNames.ownerOf(parentId);

        _setFlashLock();
        megaNames.transferFrom(parentOwner, address(this), parentId);
        subTokenId = megaNames.registerSubdomain(parentId, label);
        megaNames.transferFrom(address(this), parentOwner, parentId);
        _clearFlashLock();

        // Transfer subdomain to buyer
        megaNames.transferFrom(address(this), to, subTokenId);

        // Update counters
        Counters storage c = counters[parentId];
        c.subdomainsSold++;
        c.subdomainsActive++;
        c.subdomainVolume += uint128(price / 1e12);

        // Verify parent returned
        if (megaNames.ownerOf(parentId) != parentOwner) revert FlashFailed();

        emit SubdomainSold(parentId, subTokenId, label, to, price);
    }

    /*//////////////////////////////////////////////////////////////
                            FEE DISTRIBUTION
    //////////////////////////////////////////////////////////////*/

    function _distributePayment(uint256 price, address payoutAddress, address referrer) internal {
        uint256 protocolFee = price * protocolFeeBps / 10000;
        uint256 referralFee;
        if (referrer != address(0) && referralFeeBps > 0) {
            referralFee = price * referralFeeBps / 10000;
        }
        uint256 ownerPayout = price - protocolFee - referralFee;

        SafeTransferLib.safeTransferFrom(paymentToken, msg.sender, payoutAddress, ownerPayout);
        if (protocolFee > 0) {
            SafeTransferLib.safeTransferFrom(paymentToken, msg.sender, feeRecipient, protocolFee);
        }
        if (referralFee > 0) {
            SafeTransferLib.safeTransferFrom(paymentToken, msg.sender, referrer, referralFee);
        }
    }

    /*//////////////////////////////////////////////////////////////
                          TRANSIENT STORAGE
    //////////////////////////////////////////////////////////////*/

    function _setFlashLock() internal {
        assembly {
            if tload(_FLASH_LOCK_SLOT) { revert(0, 0) } // reentrancy guard
            tstore(_FLASH_LOCK_SLOT, 1)
        }
    }

    function _clearFlashLock() internal {
        assembly {
            tstore(_FLASH_LOCK_SLOT, 0)
        }
    }

    /*//////////////////////////////////////////////////////////////
                         ERC721 RECEIVER
    //////////////////////////////////////////////////////////////*/

    /// @dev Accept NFT transfers (needed for flash)
    function onERC721Received(address, address, uint256, bytes calldata)
        external pure returns (bytes4)
    {
        return this.onERC721Received.selector;
    }

    /*//////////////////////////////////////////////////////////////
                              ADMIN
    //////////////////////////////////////////////////////////////*/

    function setLogicContract(address _logic) external onlyOwner {
        logicContract = _logic;
        emit LogicContractChanged(_logic);
    }

    function setProtocolFee(uint256 _bps) external onlyOwner {
        if (_bps > MAX_PROTOCOL_FEE_BPS) revert FeeTooHigh();
        protocolFeeBps = _bps;
        emit ProtocolFeeChanged(_bps);
    }

    function setReferralFee(uint256 _bps) external onlyOwner {
        if (_bps > MAX_REFERRAL_FEE_BPS) revert FeeTooHigh();
        referralFeeBps = _bps;
        emit ReferralFeeChanged(_bps);
    }

    function setFeeRecipient(address _recipient) external onlyOwner {
        if (_recipient == address(0)) revert InvalidAddress();
        feeRecipient = _recipient;
        emit FeeRecipientChanged(_recipient);
    }

    function setMaxTokenGates(uint256 _max) external onlyOwner {
        maxTokenGates = _max;
        emit MaxTokenGatesChanged(_max);
    }

    /*//////////////////////////////////////////////////////////////
                              VIEWS
    //////////////////////////////////////////////////////////////*/

    /// @notice Get parent config (for frontend)
    function getConfig(uint256 parentId) external view returns (
        address payoutAddress, bool enabled, Mode mode
    ) {
        ParentConfig storage c = parentConfigs[parentId];
        return (c.payoutAddress, c.enabled, c.mode);
    }

    /// @notice Get counters (for renderer)
    function getCounters(uint256 parentId) external view returns (
        uint64 sold, uint64 active, uint128 volumeUsdm6
    ) {
        Counters storage c = counters[parentId];
        return (c.subdomainsSold, c.subdomainsActive, c.subdomainVolume);
    }

    /// @notice Check if a subdomain can be registered and its price
    function quote(uint256 parentId, string calldata label, address buyer)
        external view returns (bool allowed, uint256 price, uint256 protocolFee, uint256 total)
    {
        ParentConfig storage config = parentConfigs[parentId];
        if (!config.enabled || logicContract == address(0)) {
            return (false, 0, 0, 0);
        }

        (allowed, price) = ISubdomainLogic(logicContract).validate(parentId, label, buyer);
        if (!allowed || price < MIN_PRICE) return (false, 0, 0, 0);

        protocolFee = price * protocolFeeBps / 10000;
        total = price;
    }
}
