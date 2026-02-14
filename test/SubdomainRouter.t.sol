// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import {SubdomainRouter} from "../src/SubdomainRouter.sol";
import {SubdomainLogic} from "../src/SubdomainLogic.sol";
import {MegaNames} from "../src/MegaNames.sol";

/// @dev Mock ERC-20 for USDM
contract MockUSDM {
    string public name = "Mock USDM";
    string public symbol = "USDM";
    uint8 public decimals = 18;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

/// @dev Mock ERC-721 for token gating
contract MockNFT {
    mapping(address => uint256) public balanceOf;

    function mint(address to) external {
        balanceOf[to]++;
    }
}

contract SubdomainRouterTest is Test {
    MegaNames megaNames;
    MockUSDM usdm;
    SubdomainRouter router;
    SubdomainLogic logic;
    MockNFT gateNFT;

    address deployer;
    address parentOwner = address(0xA);
    address buyer = address(0xB);
    address feeRecipient = address(0xFEE);
    address referrer = address(0xEEF);

    uint256 parentId;

    function setUp() public {
        // tx.origin is MegaNames owner (due to _initializeOwner(tx.origin))
        deployer = tx.origin;

        // Deploy contracts
        usdm = new MockUSDM();
        megaNames = new MegaNames(address(usdm), feeRecipient);
        gateNFT = new MockNFT();

        // Deploy router + logic
        router = new SubdomainRouter(
            address(megaNames),
            address(usdm),
            feeRecipient,
            address(0) // set logic after
        );
        logic = new SubdomainLogic(address(megaNames), address(router));
        router.setLogicContract(address(logic));

        // Admin-register a parent name for parentOwner (must prank as MegaNames owner)
        vm.prank(deployer);
        parentId = megaNames.adminRegister("testparent", parentOwner, 3);

        // Parent owner approves router
        vm.prank(parentOwner);
        megaNames.setApprovalForAll(address(router), true);

        // Fund buyer with USDM
        usdm.mint(buyer, 10_000e18);
        vm.prank(buyer);
        usdm.approve(address(router), type(uint256).max);
    }

    /*//////////////////////////////////////////////////////////////
                            CONFIGURE TESTS
    //////////////////////////////////////////////////////////////*/

    function test_configure_open() public {
        vm.prank(parentOwner);
        router.configure(parentId, parentOwner, true, SubdomainRouter.Mode.OPEN);

        (address payout, bool enabled, SubdomainRouter.Mode mode) = router.getConfig(parentId);
        assertEq(payout, parentOwner);
        assertTrue(enabled);
        assertEq(uint8(mode), uint8(SubdomainRouter.Mode.OPEN));
    }

    function test_configure_allowlist() public {
        vm.prank(parentOwner);
        router.configure(parentId, parentOwner, true, SubdomainRouter.Mode.ALLOWLIST);

        (, , SubdomainRouter.Mode mode) = router.getConfig(parentId);
        assertEq(uint8(mode), uint8(SubdomainRouter.Mode.ALLOWLIST));
    }

    function test_configure_revert_notOwner() public {
        vm.prank(buyer);
        vm.expectRevert(SubdomainRouter.NotParentOwner.selector);
        router.configure(parentId, buyer, true, SubdomainRouter.Mode.OPEN);
    }

    function test_configure_revert_zeroAddress() public {
        vm.prank(parentOwner);
        vm.expectRevert(SubdomainRouter.InvalidAddress.selector);
        router.configure(parentId, address(0), true, SubdomainRouter.Mode.OPEN);
    }

    function test_configure_revert_noApproval() public {
        // Revoke approval first
        vm.prank(parentOwner);
        megaNames.setApprovalForAll(address(router), false);

        vm.prank(parentOwner);
        vm.expectRevert(SubdomainRouter.ApprovalRequired.selector);
        router.configure(parentId, parentOwner, true, SubdomainRouter.Mode.OPEN);
    }

    function test_disable() public {
        vm.startPrank(parentOwner);
        router.configure(parentId, parentOwner, true, SubdomainRouter.Mode.OPEN);
        router.disable(parentId);
        vm.stopPrank();

        (, bool enabled, ) = router.getConfig(parentId);
        assertFalse(enabled);
    }

    function test_disable_revert_notOwner() public {
        vm.prank(buyer);
        vm.expectRevert(SubdomainRouter.NotParentOwner.selector);
        router.disable(parentId);
    }

    /*//////////////////////////////////////////////////////////////
                          REGISTRATION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_register_open() public {
        // Configure parent
        vm.prank(parentOwner);
        router.configure(parentId, parentOwner, true, SubdomainRouter.Mode.OPEN);

        // Set price on logic
        vm.prank(parentOwner);
        logic.setPrice(parentId, 5e18); // $5

        uint256 parentOwnerBalBefore = usdm.balanceOf(parentOwner);
        uint256 feeBalBefore = usdm.balanceOf(feeRecipient);

        // Buyer registers
        vm.prank(buyer);
        uint256 subId = router.register(parentId, "mysub", address(0));

        // Subdomain owned by buyer
        assertEq(megaNames.ownerOf(subId), buyer);

        // Parent still owned by parentOwner
        assertEq(megaNames.ownerOf(parentId), parentOwner);

        // Fee distribution: 97.5% to owner, 2.5% to protocol
        uint256 ownerReceived = usdm.balanceOf(parentOwner) - parentOwnerBalBefore;
        uint256 feeReceived = usdm.balanceOf(feeRecipient) - feeBalBefore;
        assertEq(ownerReceived, 4.875e18); // 97.5%
        assertEq(feeReceived, 0.125e18);   // 2.5%

        // Counters
        (uint64 sold, uint64 active, ) = router.getCounters(parentId);
        assertEq(sold, 1);
        assertEq(active, 1);
    }

    function test_register_for() public {
        address recipient = address(0xC);

        vm.prank(parentOwner);
        router.configure(parentId, parentOwner, true, SubdomainRouter.Mode.OPEN);
        vm.prank(parentOwner);
        logic.setPrice(parentId, 1e18);

        vm.prank(buyer);
        uint256 subId = router.registerFor(parentId, "gift", recipient, address(0));

        assertEq(megaNames.ownerOf(subId), recipient);
    }

    function test_register_revert_notEnabled() public {
        vm.prank(parentOwner);
        logic.setPrice(parentId, 1e18);

        vm.prank(buyer);
        vm.expectRevert(SubdomainRouter.NotEnabled.selector);
        router.register(parentId, "test", address(0));
    }

    function test_register_revert_noPrice() public {
        vm.prank(parentOwner);
        router.configure(parentId, parentOwner, true, SubdomainRouter.Mode.OPEN);
        // No price set — validate returns (false, 0)

        vm.prank(buyer);
        vm.expectRevert(SubdomainRouter.NotAllowed.selector);
        router.register(parentId, "test", address(0));
    }

    function test_register_revert_priceBelowMin() public {
        vm.prank(parentOwner);
        router.configure(parentId, parentOwner, true, SubdomainRouter.Mode.OPEN);
        vm.prank(parentOwner);
        logic.setPrice(parentId, 0.001e18); // below $0.01 min

        vm.prank(buyer);
        vm.expectRevert(SubdomainRouter.PriceBelowMinimum.selector);
        router.register(parentId, "test", address(0));
    }

    /*//////////////////////////////////////////////////////////////
                          TOKEN GATE TESTS
    //////////////////////////////////////////////////////////////*/

    function test_register_tokenGate_allowed() public {
        // Configure with allowlist mode
        vm.prank(parentOwner);
        router.configure(parentId, parentOwner, true, SubdomainRouter.Mode.ALLOWLIST);
        vm.prank(parentOwner);
        logic.setPrice(parentId, 2e18);
        vm.prank(parentOwner);
        logic.setTokenGate(parentId, address(gateNFT), 1);

        // Mint NFT to buyer
        gateNFT.mint(buyer);

        // Should succeed
        vm.prank(buyer);
        uint256 subId = router.register(parentId, "gated", address(0));
        assertEq(megaNames.ownerOf(subId), buyer);
    }

    function test_register_tokenGate_rejected() public {
        vm.prank(parentOwner);
        router.configure(parentId, parentOwner, true, SubdomainRouter.Mode.ALLOWLIST);
        vm.prank(parentOwner);
        logic.setPrice(parentId, 2e18);
        vm.prank(parentOwner);
        logic.setTokenGate(parentId, address(gateNFT), 1);

        // Buyer has no NFT
        vm.prank(buyer);
        vm.expectRevert(SubdomainRouter.NotAllowed.selector);
        router.register(parentId, "gated", address(0));
    }

    function test_register_tokenGate_erc20() public {
        vm.prank(parentOwner);
        router.configure(parentId, parentOwner, true, SubdomainRouter.Mode.ALLOWLIST);
        vm.prank(parentOwner);
        logic.setPrice(parentId, 1e18);
        // Gate: must hold ≥100 USDM
        vm.prank(parentOwner);
        logic.setTokenGate(parentId, address(usdm), 100e18);

        // Buyer has 10,000 USDM — should pass
        vm.prank(buyer);
        uint256 subId = router.register(parentId, "rich", address(0));
        assertEq(megaNames.ownerOf(subId), buyer);
    }

    function test_removeTokenGate() public {
        vm.startPrank(parentOwner);
        logic.setTokenGate(parentId, address(gateNFT), 1);
        logic.removeTokenGate(parentId);
        vm.stopPrank();

        (address token, uint256 minBal) = logic.tokenGates(parentId);
        assertEq(token, address(0));
        assertEq(minBal, 0);
    }

    /*//////////////////////////////////////////////////////////////
                           BATCH TESTS
    //////////////////////////////////////////////////////////////*/

    function test_registerBatch() public {
        vm.prank(parentOwner);
        router.configure(parentId, parentOwner, true, SubdomainRouter.Mode.OPEN);
        vm.prank(parentOwner);
        logic.setPrice(parentId, 1e18);

        string[] memory labels = new string[](3);
        labels[0] = "api";
        labels[1] = "docs";
        labels[2] = "app";

        uint256 buyerBalBefore = usdm.balanceOf(buyer);

        vm.prank(buyer);
        uint256[] memory subIds = router.registerBatch(parentId, labels, address(0));

        assertEq(subIds.length, 3);
        for (uint256 i; i < 3; ++i) {
            assertEq(megaNames.ownerOf(subIds[i]), buyer);
        }

        // Total paid: 3 * $1 = $3
        uint256 buyerPaid = buyerBalBefore - usdm.balanceOf(buyer);
        assertEq(buyerPaid, 3e18);

        // Counters
        (uint64 sold, uint64 active, ) = router.getCounters(parentId);
        assertEq(sold, 3);
        assertEq(active, 3);

        // Parent still owned
        assertEq(megaNames.ownerOf(parentId), parentOwner);
    }

    function test_registerBatch_revert_tooLarge() public {
        vm.prank(parentOwner);
        router.configure(parentId, parentOwner, true, SubdomainRouter.Mode.OPEN);
        vm.prank(parentOwner);
        logic.setPrice(parentId, 1e18);

        string[] memory labels = new string[](51);
        for (uint256 i; i < 51; ++i) {
            labels[i] = "x";
        }

        vm.prank(buyer);
        vm.expectRevert(SubdomainRouter.BatchTooLarge.selector);
        router.registerBatch(parentId, labels, address(0));
    }

    /*//////////////////////////////////////////////////////////////
                           REFERRAL TESTS
    //////////////////////////////////////////////////////////////*/

    function test_register_withReferral() public {
        // Enable referral fee
        router.setReferralFee(100); // 1%

        vm.prank(parentOwner);
        router.configure(parentId, parentOwner, true, SubdomainRouter.Mode.OPEN);
        vm.prank(parentOwner);
        logic.setPrice(parentId, 10e18); // $10

        uint256 refBalBefore = usdm.balanceOf(referrer);
        uint256 ownerBalBefore = usdm.balanceOf(parentOwner);
        uint256 feeBalBefore = usdm.balanceOf(feeRecipient);

        vm.prank(buyer);
        router.register(parentId, "referred", referrer);

        // Referrer gets 1% = $0.10
        assertEq(usdm.balanceOf(referrer) - refBalBefore, 0.1e18);
        // Protocol gets 2.5% = $0.25
        assertEq(usdm.balanceOf(feeRecipient) - feeBalBefore, 0.25e18);
        // Owner gets 96.5% = $9.65
        assertEq(usdm.balanceOf(parentOwner) - ownerBalBefore, 9.65e18);
    }

    /*//////////////////////////////////////////////////////////////
                            ADMIN TESTS
    //////////////////////////////////////////////////////////////*/

    function test_setLogicContract() public {
        SubdomainLogic newLogic = new SubdomainLogic(address(megaNames), address(router));
        router.setLogicContract(address(newLogic));
        assertEq(router.logicContract(), address(newLogic));
    }

    function test_setProtocolFee() public {
        router.setProtocolFee(500); // 5%
        assertEq(router.protocolFeeBps(), 500);
    }

    function test_setProtocolFee_revert_tooHigh() public {
        vm.expectRevert(SubdomainRouter.FeeTooHigh.selector);
        router.setProtocolFee(1001); // > 10%
    }

    function test_setFeeRecipient() public {
        address newFee = address(0xABC);
        router.setFeeRecipient(newFee);
        assertEq(router.feeRecipient(), newFee);
    }

    function test_setFeeRecipient_revert_zero() public {
        vm.expectRevert(SubdomainRouter.InvalidAddress.selector);
        router.setFeeRecipient(address(0));
    }

    function test_setMaxTokenGates() public {
        router.setMaxTokenGates(5);
        assertEq(router.maxTokenGates(), 5);
    }

    /*//////////////////////////////////////////////////////////////
                          EDGE CASE TESTS
    //////////////////////////////////////////////////////////////*/

    function test_register_parentTransferred_afterConfig() public {
        // Configure
        vm.prank(parentOwner);
        router.configure(parentId, parentOwner, true, SubdomainRouter.Mode.OPEN);
        vm.prank(parentOwner);
        logic.setPrice(parentId, 1e18);

        // Transfer parent to someone else
        vm.prank(parentOwner);
        megaNames.transferFrom(parentOwner, address(0xD), parentId);

        // Registration should fail (transferFrom fails — router not approved by new owner)
        vm.prank(buyer);
        vm.expectRevert();
        router.register(parentId, "test", address(0));
    }

    function test_register_duplicateLabel() public {
        vm.prank(parentOwner);
        router.configure(parentId, parentOwner, true, SubdomainRouter.Mode.OPEN);
        vm.prank(parentOwner);
        logic.setPrice(parentId, 1e18);

        // Register first
        vm.prank(buyer);
        router.register(parentId, "unique", address(0));

        // Try duplicate — MegaNames reverts with AlreadyRegistered
        vm.prank(buyer);
        vm.expectRevert();
        router.register(parentId, "unique", address(0));
    }

    function test_quote() public {
        vm.prank(parentOwner);
        router.configure(parentId, parentOwner, true, SubdomainRouter.Mode.OPEN);
        vm.prank(parentOwner);
        logic.setPrice(parentId, 5e18);

        (bool allowed, uint256 price, uint256 protocolFee, uint256 total) =
            router.quote(parentId, "test", buyer);

        assertTrue(allowed);
        assertEq(price, 5e18);
        assertEq(protocolFee, 0.125e18);
        assertEq(total, 5e18);
    }

    function test_quote_disabled() public {
        (bool allowed, , , ) = router.quote(parentId, "test", buyer);
        assertFalse(allowed);
    }

    function test_logicUpgrade_configsPersist() public {
        // Configure and register one
        vm.prank(parentOwner);
        router.configure(parentId, parentOwner, true, SubdomainRouter.Mode.OPEN);
        vm.prank(parentOwner);
        logic.setPrice(parentId, 1e18);
        vm.prank(buyer);
        router.register(parentId, "before", address(0));

        // Deploy new logic
        SubdomainLogic newLogic = new SubdomainLogic(address(megaNames), address(router));
        router.setLogicContract(address(newLogic));

        // Config persists on router
        (address payout, bool enabled, ) = router.getConfig(parentId);
        assertEq(payout, parentOwner);
        assertTrue(enabled);

        // Counters persist
        (uint64 sold, , ) = router.getCounters(parentId);
        assertEq(sold, 1);

        // Need to re-set price on new logic
        vm.prank(parentOwner);
        newLogic.setPrice(parentId, 2e18);

        // Register with new logic
        vm.prank(buyer);
        uint256 subId = router.register(parentId, "after", address(0));
        assertEq(megaNames.ownerOf(subId), buyer);

        // Counters incremented
        (sold, , ) = router.getCounters(parentId);
        assertEq(sold, 2);
    }
}
