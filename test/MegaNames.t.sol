// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Test} from "forge-std/Test.sol";
import {MegaNames} from "../src/MegaNames.sol";
import {MockUSDM} from "../src/MockUSDM.sol";

contract MegaNamesTest is Test {
    MegaNames public names;
    MockUSDM public usdm;
    
    address constant WARREN_SAFE = 0xd4aE3973244592ef06dfdf82470329aCfA62C187;
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address charlie = makeAddr("charlie");
    address deployer; // tx.origin = contract owner

    function setUp() public {
        deployer = tx.origin; // Solady Ownable uses tx.origin
        usdm = new MockUSDM();
        names = new MegaNames(address(usdm), WARREN_SAFE);
        
        usdm.mint(alice, 100_000e18);
        usdm.mint(bob, 100_000e18);
        usdm.mint(charlie, 100_000e18);

        // Open registration for tests (deployer is owner via tx.origin)
        vm.prank(deployer);
        names.setRegistrationOpen(true);
    }

    // ─── Metadata ───

    function test_MetadataCorrect() public view {
        assertEq(names.name(), "MegaNames");
        assertEq(names.symbol(), "MEGA");
    }

    function test_FeeRecipient() public view {
        assertEq(names.feeRecipient(), WARREN_SAFE);
    }

    function test_PaymentToken() public view {
        assertEq(names.paymentToken(), address(usdm));
    }

    function test_MegaNodeHash() public view {
        bytes32 expected = keccak256(abi.encodePacked(bytes32(0), keccak256("mega")));
        assertEq(names.MEGA_NODE(), expected);
    }

    // ─── Fee Schedule ───

    function test_LengthFees() public view {
        assertEq(names.registrationFee(1), 1000e18);
        assertEq(names.registrationFee(2), 500e18);
        assertEq(names.registrationFee(3), 100e18);
        assertEq(names.registrationFee(4), 10e18);
        assertEq(names.registrationFee(5), 1e18);
        assertEq(names.registrationFee(10), 1e18);
    }

    function test_MultiYearDiscounts() public view {
        uint256 yearly = names.registrationFee(5); // $1
        
        // 1 year: no discount
        assertEq(names.calculateFee(5, 1), yearly);
        // 2 years: 5% off
        assertEq(names.calculateFee(5, 2), yearly * 2 * 9500 / 10000);
        // 3 years: 10% off
        assertEq(names.calculateFee(5, 3), yearly * 3 * 9000 / 10000);
        // 5 years: 15% off
        assertEq(names.calculateFee(5, 5), yearly * 5 * 8500 / 10000);
        // 10 years: 25% off
        assertEq(names.calculateFee(5, 10), yearly * 10 * 7500 / 10000);
    }

    // ─── Registration ───

    function test_Register() public {
        vm.startPrank(alice);
        usdm.approve(address(names), type(uint256).max);

        uint256 tokenId = names.register("bread", alice, 1);

        assertEq(names.ownerOf(tokenId), alice);
        assertEq(names.totalRegistrations(), 1);
        
        (string memory label, uint256 parent, uint64 expiresAt,,) = names.records(tokenId);
        assertEq(label, "bread");
        assertEq(parent, 0);
        assertGt(expiresAt, block.timestamp);

        vm.stopPrank();
    }

    function test_RegisterMultiYear() public {
        vm.startPrank(alice);
        usdm.approve(address(names), type(uint256).max);

        uint256 balBefore = usdm.balanceOf(alice);
        names.register("multi", alice, 3);
        uint256 paid = balBefore - usdm.balanceOf(alice);

        assertEq(paid, names.calculateFee(5, 3));

        vm.stopPrank();
    }

    function test_FeesGoToWarren() public {
        vm.startPrank(alice);
        usdm.approve(address(names), type(uint256).max);

        uint256 warrenBefore = usdm.balanceOf(WARREN_SAFE);
        uint256 fee = names.registrationFee(4);

        names.register("test", alice, 1);

        assertEq(usdm.balanceOf(WARREN_SAFE), warrenBefore + fee);
        assertEq(names.totalVolume(), fee);

        vm.stopPrank();
    }

    function test_PremiumShortNames() public {
        vm.startPrank(alice);
        usdm.approve(address(names), type(uint256).max);

        uint256 balBefore = usdm.balanceOf(alice);
        names.register("x", alice, 1);
        assertEq(balBefore - usdm.balanceOf(alice), 1000e18);

        vm.stopPrank();
    }

    function test_RevertWhen_DuplicateRegistration() public {
        vm.startPrank(alice);
        usdm.approve(address(names), type(uint256).max);
        names.register("taken", alice, 1);

        vm.expectRevert(MegaNames.AlreadyRegistered.selector);
        names.register("taken", bob, 1);
        vm.stopPrank();
    }

    function test_RevertWhen_InsufficientApproval() public {
        vm.startPrank(alice);
        vm.expectRevert();
        names.register("noallowance", alice, 1);
        vm.stopPrank();
    }

    function test_RevertWhen_InvalidYears() public {
        vm.startPrank(alice);
        usdm.approve(address(names), type(uint256).max);

        vm.expectRevert(MegaNames.InvalidYears.selector);
        names.register("zero", alice, 0);

        vm.expectRevert(MegaNames.InvalidYears.selector);
        names.register("eleven", alice, 11);

        vm.stopPrank();
    }

    // ─── Primary Name & Reverse Resolution ───

    function test_PrimaryName() public {
        vm.startPrank(alice);
        usdm.approve(address(names), type(uint256).max);

        uint256 tokenId = names.register("bread", alice, 1);
        assertEq(names.getName(alice), "");

        names.setPrimaryName(tokenId);
        assertEq(names.getName(alice), "bread.mega");

        vm.stopPrank();
    }

    function test_ClearPrimaryName() public {
        vm.startPrank(alice);
        usdm.approve(address(names), type(uint256).max);

        uint256 tokenId = names.register("clear", alice, 1);
        names.setPrimaryName(tokenId);
        assertEq(names.getName(alice), "clear.mega");

        names.clearPrimaryName();
        assertEq(names.getName(alice), "");

        vm.stopPrank();
    }

    function test_PrimaryNameClearsOnTransfer() public {
        vm.startPrank(alice);
        usdm.approve(address(names), type(uint256).max);

        uint256 tokenId = names.register("xfername", alice, 1);
        names.setPrimaryName(tokenId);
        assertEq(names.getName(alice), "xfername.mega");

        names.transferFrom(alice, bob, tokenId);
        vm.stopPrank();

        // getName checks ownership — alice no longer owns it
        assertEq(names.getName(alice), "");
        assertEq(names.ownerOf(tokenId), bob);
    }

    // ─── Resolver ───

    function test_SetAddr() public {
        vm.startPrank(alice);
        usdm.approve(address(names), type(uint256).max);

        uint256 tokenId = names.register("resolve", alice, 1);
        
        // Before setAddr, addr() returns 0 (no explicit address set)
        assertEq(names.addr(tokenId), address(0));

        names.setAddr(tokenId, bob);
        assertEq(names.addr(tokenId), bob);

        vm.stopPrank();
    }

    function test_TextRecords() public {
        vm.startPrank(alice);
        usdm.approve(address(names), type(uint256).max);

        uint256 tokenId = names.register("records", alice, 1);

        names.setText(tokenId, "com.twitter", "@bread_");
        names.setText(tokenId, "url", "https://megaeth.com");
        names.setText(tokenId, "avatar", "ipfs://Qm...");

        assertEq(names.text(tokenId, "com.twitter"), "@bread_");
        assertEq(names.text(tokenId, "url"), "https://megaeth.com");
        assertEq(names.text(tokenId, "avatar"), "ipfs://Qm...");
        assertEq(names.text(tokenId, "nonexistent"), "");

        vm.stopPrank();
    }

    function test_Contenthash() public {
        vm.startPrank(alice);
        usdm.approve(address(names), type(uint256).max);

        uint256 tokenId = names.register("ipfs", alice, 1);

        bytes memory ipfsHash = hex"e3010170122029f2d17be6139079dc48696d1f582a8530eb9805b561eda517e22a892c7e3f1f";
        names.setContenthash(tokenId, ipfsHash);
        assertEq(names.contenthash(tokenId), ipfsHash);

        vm.stopPrank();
    }

    function test_WarrenContenthash() public {
        vm.startPrank(alice);
        usdm.approve(address(names), type(uint256).max);

        uint256 tokenId = names.register("warren", alice, 1);

        names.setWarrenContenthash(tokenId, 42, true);
        (uint32 warrenTokenId, bool isMaster, bool isWarren) = names.warren(tokenId);
        assertEq(warrenTokenId, 42);
        assertTrue(isMaster);
        assertTrue(isWarren);

        names.setWarrenContenthash(tokenId, 100, false);
        (warrenTokenId, isMaster, isWarren) = names.warren(tokenId);
        assertEq(warrenTokenId, 100);
        assertFalse(isMaster);
        assertTrue(isWarren);

        vm.stopPrank();
    }

    // ─── Subdomains ───

    function test_Subdomains() public {
        vm.startPrank(alice);
        usdm.approve(address(names), type(uint256).max);

        uint256 parentId = names.register("alice", alice, 1);
        uint256 subId = names.registerSubdomain(parentId, "blog");

        assertEq(names.ownerOf(subId), alice);
        assertEq(names.totalSubdomains(), 1);

        names.setPrimaryName(subId);
        assertEq(names.getName(alice), "blog.alice.mega");

        vm.stopPrank();
    }

    function test_RevertWhen_SubdomainByNonOwner() public {
        vm.startPrank(alice);
        usdm.approve(address(names), type(uint256).max);
        uint256 parentId = names.register("owned", alice, 1);
        vm.stopPrank();

        vm.startPrank(bob);
        vm.expectRevert(MegaNames.NotParentOwner.selector);
        names.registerSubdomain(parentId, "hack");
        vm.stopPrank();
    }

    // ─── Renewal ───

    function test_Renewal() public {
        vm.startPrank(alice);
        usdm.approve(address(names), type(uint256).max);

        uint256 tokenId = names.register("renew", alice, 1);
        (,, uint64 expiresAt,,) = names.records(tokenId);

        vm.warp(block.timestamp + 300 days);

        uint256 warrenBefore = usdm.balanceOf(WARREN_SAFE);
        names.renew(tokenId, 1);

        (,, uint64 newExpiresAt,,) = names.records(tokenId);
        assertGt(newExpiresAt, expiresAt);
        assertEq(names.totalRenewals(), 1);
        assertGt(usdm.balanceOf(WARREN_SAFE), warrenBefore);

        vm.stopPrank();
    }

    // ─── Expiry & Re-Registration ───

    function test_RevertWhen_TransferExpired() public {
        vm.startPrank(alice);
        usdm.approve(address(names), type(uint256).max);

        uint256 tokenId = names.register("expiring", alice, 1);

        vm.warp(block.timestamp + 366 days + 91 days);

        vm.expectRevert(MegaNames.Expired.selector);
        names.transferFrom(alice, bob, tokenId);

        vm.stopPrank();
    }

    function test_ReRegisterExpiredName() public {
        vm.startPrank(alice);
        usdm.approve(address(names), type(uint256).max);
        uint256 tokenId = names.register("expname", alice, 1);
        vm.stopPrank();

        // Past expiry + grace + full premium decay
        vm.warp(block.timestamp + 366 days + 91 days + 22 days);

        vm.startPrank(bob);
        usdm.approve(address(names), type(uint256).max);
        uint256 balBefore = usdm.balanceOf(bob);
        uint256 newTokenId = names.register("expname", bob, 1);
        uint256 paid = balBefore - usdm.balanceOf(bob);

        assertEq(newTokenId, tokenId);
        assertEq(names.ownerOf(tokenId), bob);
        assertEq(paid, names.calculateFee(7, 1)); // Just base fee

        vm.stopPrank();
    }

    // ─── Premium Decay (Dutch Auction) ───

    function test_PremiumDecayTimeline() public {
        vm.startPrank(alice);
        usdm.approve(address(names), type(uint256).max);
        uint256 tokenId = names.register("decay", alice, 1);
        vm.stopPrank();

        uint256 graceEnd = block.timestamp + 365 days + 90 days;

        // Before expiry — no premium
        assertEq(names.currentPremium(tokenId), 0);

        // During grace period — no premium
        vm.warp(block.timestamp + 365 days + 45 days);
        assertEq(names.currentPremium(tokenId), 0);

        // Day 0 after grace — max premium
        vm.warp(graceEnd + 1);
        uint256 premium = names.currentPremium(tokenId);
        assertGt(premium, 9_999e18); // ~10k

        // Day 21+ — fully decayed
        vm.warp(graceEnd + 21 days + 1);
        assertEq(names.currentPremium(tokenId), 0);
    }

    function test_PremiumChargedOnReRegistration() public {
        vm.startPrank(alice);
        usdm.approve(address(names), type(uint256).max);
        uint256 tokenId = names.register("premium", alice, 1);
        vm.stopPrank();

        // Just after grace period ends
        vm.warp(block.timestamp + 365 days + 90 days + 1);

        vm.startPrank(bob);
        usdm.approve(address(names), type(uint256).max);
        uint256 balBefore = usdm.balanceOf(bob);
        names.register("premium", bob, 1);
        uint256 paid = balBefore - usdm.balanceOf(bob);

        uint256 baseFee = names.calculateFee(7, 1);
        // Should pay significantly more than base fee
        assertGt(paid, baseFee + 9_000e18);

        vm.stopPrank();
    }

    function test_NoPremiumOnFreshRegistration() public {
        vm.startPrank(alice);
        usdm.approve(address(names), type(uint256).max);

        bytes32 megaNode = names.MEGA_NODE();
        uint256 tokenId = uint256(keccak256(abi.encodePacked(megaNode, keccak256("fresh"))));
        assertEq(names.currentPremium(tokenId), 0);

        uint256 balBefore = usdm.balanceOf(alice);
        names.register("fresh", alice, 1);
        uint256 paid = balBefore - usdm.balanceOf(alice);
        assertEq(paid, names.calculateFee(5, 1));

        vm.stopPrank();
    }

    // ─── Admin Functions ───

    function test_AdminRegister() public {
        vm.prank(deployer);
        uint256 tokenId = names.adminRegister("reserved", alice, 1);

        assertEq(names.ownerOf(tokenId), alice);
        assertEq(names.totalRegistrations(), 1);
        assertEq(usdm.balanceOf(alice), 100_000e18); // No charge
    }

    function test_AdminRegisterBatch() public {
        string[] memory labels = new string[](3);
        labels[0] = "mega";
        labels[1] = "eth";
        labels[2] = "chain";

        address[] memory owners = new address[](3);
        owners[0] = alice;
        owners[1] = bob;
        owners[2] = charlie;

        vm.prank(deployer);
        names.adminRegisterBatch(labels, owners, 1);

        assertEq(names.totalRegistrations(), 3);
        assertEq(usdm.balanceOf(alice), 100_000e18);
        assertEq(usdm.balanceOf(bob), 100_000e18);
    }

    function test_RevertWhen_NonOwnerAdminRegister() public {
        vm.startPrank(alice);
        vm.expectRevert();
        names.adminRegister("hack", alice, 1);
        vm.stopPrank();
    }

    function test_RevertWhen_BatchLengthMismatch() public {
        string[] memory labels = new string[](2);
        labels[0] = "one";
        labels[1] = "two";

        address[] memory owners = new address[](1);
        owners[0] = alice;

        vm.prank(deployer);
        vm.expectRevert(MegaNames.LengthMismatch.selector);
        names.adminRegisterBatch(labels, owners, 1);
    }

    // ─── ERC-721 Enumeration ───

    function test_TokensOfOwner() public {
        vm.startPrank(alice);
        usdm.approve(address(names), type(uint256).max);

        names.register("first", alice, 1);
        uint256 id2 = names.register("second", alice, 1);
        names.register("third", alice, 1);

        uint256[] memory tokens = names.tokensOfOwner(alice);
        assertEq(tokens.length, 3);
        assertEq(names.tokensOfOwnerCount(alice), 3);

        names.transferFrom(alice, bob, id2);

        tokens = names.tokensOfOwner(alice);
        assertEq(tokens.length, 2);
        assertEq(names.tokensOfOwnerCount(bob), 1);

        vm.stopPrank();
    }

    // ─── ERC-7930 Interop Address ───

    function test_InteropAddress() public {
        vm.startPrank(alice);
        usdm.approve(address(names), type(uint256).max);

        uint256 tokenId = names.register("interop", alice, 1);
        names.setAddr(tokenId, alice); // Must explicitly set addr

        bytes memory interop = names.interopAddress(tokenId);

        assertGt(interop.length, 0);
        // Version 0x0001
        assertEq(uint8(interop[0]), 0x00);
        assertEq(uint8(interop[1]), 0x01);
        // ChainType 0x0000 (EVM)
        assertEq(uint8(interop[2]), 0x00);
        assertEq(uint8(interop[3]), 0x00);
        // AddressLength = 20 (0x14)
        uint8 chainRefLen = uint8(interop[4]);
        assertEq(uint8(interop[5 + chainRefLen]), 0x14);

        vm.stopPrank();
    }

    function test_InteropAddressEmpty_WhenExpired() public {
        vm.startPrank(alice);
        usdm.approve(address(names), type(uint256).max);

        uint256 tokenId = names.register("expinterop", alice, 1);
        names.setAddr(tokenId, alice);

        vm.warp(block.timestamp + 366 days + 91 days);

        bytes memory interop = names.interopAddress(tokenId);
        assertEq(interop.length, 0);

        vm.stopPrank();
    }

    // ─── Owner Config ───

    function test_SetDefaultFee() public {
        vm.prank(deployer);
        names.setDefaultFee(5e18);
        assertEq(names.registrationFee(5), 5e18);
    }

    function test_SetLengthFee() public {
        vm.prank(deployer);
        names.setLengthFee(3, 200e18);
        assertEq(names.registrationFee(3), 200e18);

        vm.prank(deployer);
        names.clearLengthFee(3);
        assertEq(names.registrationFee(3), 1e18); // Falls back to defaultFee ($1)
    }

    function test_SetFeeRecipient() public {
        vm.prank(deployer);
        names.setFeeRecipient(bob);
        assertEq(names.feeRecipient(), bob);
    }

    function test_SetPaymentToken() public {
        MockUSDM newToken = new MockUSDM();
        vm.prank(deployer);
        names.setPaymentToken(address(newToken));
        assertEq(names.paymentToken(), address(newToken));
    }

    function test_SetPremiumSettings() public {
        vm.prank(deployer);
        names.setPremiumSettings(50_000e18, 30 days);
        assertEq(names.maxPremium(), 50_000e18);
        assertEq(names.premiumDecayPeriod(), 30 days);
    }

    function test_RevertWhen_PremiumTooHigh() public {
        vm.prank(deployer);
        vm.expectRevert(MegaNames.PremiumTooHigh.selector);
        names.setPremiumSettings(200_000e18, 21 days);
    }

    function test_RevertWhen_NonOwnerConfig() public {
        vm.startPrank(alice);

        vm.expectRevert();
        names.setDefaultFee(5e18);

        vm.expectRevert();
        names.setFeeRecipient(alice);

        vm.expectRevert();
        names.setPaymentToken(address(0));

        vm.stopPrank();
    }

    // ─── Resolver Clears on Re-Registration ───

    function test_ResolverClearsOnReRegistration() public {
        vm.startPrank(alice);
        usdm.approve(address(names), type(uint256).max);
        uint256 tokenId = names.register("stale", alice, 1);
        names.setText(tokenId, "com.twitter", "@old");
        names.setAddr(tokenId, alice);
        vm.stopPrank();

        // Expire fully + premium decay
        vm.warp(block.timestamp + 366 days + 91 days + 22 days);

        vm.startPrank(bob);
        usdm.approve(address(names), type(uint256).max);
        names.register("stale", bob, 1);

        // Old records should be cleared (recordVersion incremented)
        assertEq(names.text(tokenId, "com.twitter"), "");
        assertEq(names.addr(tokenId), address(0));

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                        LABEL VALIDATION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_RegistrationClosedBlocksPublic() public {
        // Close registration
        vm.prank(deployer);
        names.setRegistrationOpen(false);

        // Public register should fail
        vm.startPrank(alice);
        usdm.approve(address(names), type(uint256).max);
        vm.expectRevert(MegaNames.RegistrationClosed.selector);
        names.register("blocked", alice, 1);
        vm.stopPrank();

        // Admin register should still work
        vm.prank(deployer);
        uint256 tokenId = names.adminRegister("reserved", alice, 1);
        (string memory label,,,,) = names.records(tokenId);
        assertEq(label, "reserved");
    }

    function test_RevertWhen_NullByteInLabel() public {
        vm.prank(deployer);
        vm.expectRevert(MegaNames.InvalidName.selector);
        names.adminRegister("evil\x00hidden", alice, 1);
    }

    function test_RevertWhen_SpaceInLabel() public {
        vm.prank(deployer);
        vm.expectRevert(MegaNames.InvalidName.selector);
        names.adminRegister("has space", alice, 1);
    }

    function test_RevertWhen_SpecialCharsInLabel() public {
        vm.prank(deployer);
        vm.expectRevert(MegaNames.InvalidName.selector);
        names.adminRegister("<script>", alice, 1);
    }

    function test_RevertWhen_ControlCharsInLabel() public {
        vm.prank(deployer);
        vm.expectRevert(MegaNames.InvalidName.selector);
        names.adminRegister("test\x01ctrl", alice, 1);
    }

    function test_RevertWhen_LeadingHyphen() public {
        vm.prank(deployer);
        vm.expectRevert(MegaNames.InvalidName.selector);
        names.adminRegister("-leading", alice, 1);
    }

    function test_RevertWhen_TrailingHyphen() public {
        vm.prank(deployer);
        vm.expectRevert(MegaNames.InvalidName.selector);
        names.adminRegister("trailing-", alice, 1);
    }

    function test_RevertWhen_UnicodeEmoji() public {
        vm.prank(deployer);
        vm.expectRevert(MegaNames.InvalidName.selector);
        names.adminRegister(unicode"🍞", alice, 1);
    }

    function test_RevertWhen_AtSign() public {
        vm.prank(deployer);
        vm.expectRevert(MegaNames.InvalidName.selector);
        names.adminRegister("user@name", alice, 1);
    }

    function test_RevertWhen_Underscore() public {
        vm.prank(deployer);
        vm.expectRevert(MegaNames.InvalidName.selector);
        names.adminRegister("under_score", alice, 1);
    }

    function test_ValidLabelWithHyphens() public {
        vm.prank(deployer);
        uint256 tokenId = names.adminRegister("my-name", alice, 1);
        (string memory label,,,,) = names.records(tokenId);
        assertEq(label, "my-name");
    }

    function test_ValidLabelWithNumbers() public {
        vm.prank(deployer);
        uint256 tokenId = names.adminRegister("web3dao", alice, 1);
        (string memory label,,,,) = names.records(tokenId);
        assertEq(label, "web3dao");
    }

    function test_LabelUppercaseNormalization() public {
        vm.prank(deployer);
        uint256 tokenId = names.adminRegister("HELLO", alice, 1);
        (string memory label,,,,) = names.records(tokenId);
        assertEq(label, "hello");
    }
}
