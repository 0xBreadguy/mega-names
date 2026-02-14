// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/// @notice Minimal interface for MegaNames ownership check
interface IMegaNamesOwner {
    function ownerOf(uint256 tokenId) external view returns (address);
}

/// @notice Interface for SubdomainRouter to read mode
interface ISubdomainRouter {
    enum Mode { OPEN, ALLOWLIST }
    function parentConfigs(uint256 parentId) external view returns (
        address payoutAddress, bool enabled, Mode mode
    );
    function maxTokenGates() external view returns (uint256);
}

/// @title SubdomainLogic v1
/// @notice Swappable business logic for subdomain pricing and gating
/// @dev Called by SubdomainRouter.validate() — view-only, cannot modify router state
/// @author MegaETH Labs
contract SubdomainLogic {
    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/

    error NotParentOwner();
    error TooManyGates();
    error InvalidPrice();

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    event PriceSet(uint256 indexed parentId, uint256 price);
    event TokenGateSet(uint256 indexed parentId, address token, uint256 minBalance);
    event TokenGateRemoved(uint256 indexed parentId);

    /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/

    struct TokenGate {
        address token;      // ERC-20 or ERC-721 (both use balanceOf)
        uint256 minBalance; // minimum balance required
    }

    IMegaNamesOwner public immutable megaNames;
    ISubdomainRouter public immutable router;

    /// @notice Price per subdomain in USDM (18 decimals)
    mapping(uint256 => uint256) public prices;

    /// @notice Token gate per parent (1 per parent in v1)
    mapping(uint256 => TokenGate) public tokenGates;

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _megaNames, address _router) payable {
        megaNames = IMegaNamesOwner(_megaNames);
        router = ISubdomainRouter(_router);
    }

    /*//////////////////////////////////////////////////////////////
                            PARENT OWNER
    //////////////////////////////////////////////////////////////*/

    /// @notice Set subdomain price for a parent name
    /// @param parentId Token ID of the parent name
    /// @param price Price in USDM (18 decimals). Must be ≥ router.MIN_PRICE
    function setPrice(uint256 parentId, uint256 price) external {
        if (megaNames.ownerOf(parentId) != msg.sender) revert NotParentOwner();
        prices[parentId] = price;
        emit PriceSet(parentId, price);
    }

    /// @notice Set token gate for a parent name
    /// @param parentId Token ID of the parent name
    /// @param token ERC-20 or ERC-721 contract address
    /// @param minBalance Minimum balance required (1 for NFTs, amount for ERC-20)
    function setTokenGate(uint256 parentId, address token, uint256 minBalance) external {
        if (megaNames.ownerOf(parentId) != msg.sender) revert NotParentOwner();
        if (router.maxTokenGates() < 1) revert TooManyGates();

        tokenGates[parentId] = TokenGate({
            token: token,
            minBalance: minBalance
        });

        emit TokenGateSet(parentId, token, minBalance);
    }

    /// @notice Remove token gate
    function removeTokenGate(uint256 parentId) external {
        if (megaNames.ownerOf(parentId) != msg.sender) revert NotParentOwner();
        delete tokenGates[parentId];
        emit TokenGateRemoved(parentId);
    }

    /*//////////////////////////////////////////////////////////////
                             VALIDATION
    //////////////////////////////////////////////////////////////*/

    /// @notice Validate a subdomain registration request
    /// @dev Called by SubdomainRouter — view only
    /// @param parentId Token ID of the parent name
    /// @param label Subdomain label (unused in v1, available for future logic)
    /// @param buyer Address attempting to register
    /// @return allowed Whether the buyer is allowed
    /// @return price Price in USDM (18 decimals)
    function validate(uint256 parentId, string calldata label, address buyer)
        external view returns (bool allowed, uint256 price)
    {
        label; // silence unused warning — available for label-based pricing in v2

        price = prices[parentId];
        if (price == 0) return (false, 0); // no price set

        // Check mode from router config
        (, , ISubdomainRouter.Mode mode) = router.parentConfigs(parentId);

        if (mode == ISubdomainRouter.Mode.ALLOWLIST) {
            // Check token gate
            TokenGate memory gate = tokenGates[parentId];
            if (gate.token != address(0) && gate.minBalance > 0) {
                // Use balanceOf — works for both ERC-20 and ERC-721
                (bool success, bytes memory data) = gate.token.staticcall(
                    abi.encodeWithSignature("balanceOf(address)", buyer)
                );
                if (success && data.length >= 32) {
                    uint256 balance = abi.decode(data, (uint256));
                    if (balance >= gate.minBalance) return (true, price);
                }
            }
            return (false, price); // not allowed
        }

        // OPEN mode — anyone can register
        return (true, price);
    }
}
