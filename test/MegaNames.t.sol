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

    function setUp() public {
        usdm = new MockUSDM();
        names = new MegaNames(address(usdm), WARREN_SAFE);
        
        // Mint USDM to test accounts
        usdm.mint(alice, 10_000e6); // $10k
        usdm.mint(bob, 10_000e6);
    }

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

    function test_LengthFees() public view {
        // Fees in USDM (6 decimals)
        assertEq(names.registrationFee(1), 1000e6);  // $1000
        assertEq(names.registrationFee(2), 500e6);   // $500
        assertEq(names.registrationFee(3), 100e6);   // $100
        assertEq(names.registrationFee(4), 10e6);    // $10
        assertEq(names.registrationFee(5), 1e6);     // $1
        assertEq(names.registrationFee(10), 1e6);    // $1
    }

    function test_CommitRevealRegister() public {
        vm.startPrank(alice);
        usdm.approve(address(names), type(uint256).max);

        bytes32 secret = keccak256("secret");
        bytes32 commitment = names.makeCommitment("bread", alice, secret);

        names.commit(commitment);
        
        // Warp past MIN_COMMITMENT_AGE
        vm.warp(block.timestamp + 61);

        uint256 tokenId = names.register("bread", alice, secret);

        assertEq(names.ownerOf(tokenId), alice);
        assertEq(names.getName(alice), ""); // No primary set yet

        names.setPrimaryName(tokenId);
        assertEq(names.getName(alice), "bread.mega");

        vm.stopPrank();
    }

    function test_FeesGoToWarren() public {
        vm.startPrank(alice);
        usdm.approve(address(names), type(uint256).max);

        bytes32 secret = keccak256("secret");
        bytes32 commitment = names.makeCommitment("test", alice, secret);
        names.commit(commitment);
        vm.warp(block.timestamp + 61);

        uint256 warrenBefore = usdm.balanceOf(WARREN_SAFE);
        uint256 fee = names.registrationFee(4); // 4 char = $10

        names.register("test", alice, secret);

        assertEq(usdm.balanceOf(WARREN_SAFE), warrenBefore + fee);

        vm.stopPrank();
    }

    function test_Subdomains() public {
        vm.startPrank(alice);
        usdm.approve(address(names), type(uint256).max);

        // Register parent
        bytes32 secret = keccak256("secret");
        bytes32 commitment = names.makeCommitment("alice", alice, secret);
        names.commit(commitment);
        vm.warp(block.timestamp + 61);

        uint256 parentId = names.register("alice", alice, secret);

        // Register subdomain (free!)
        uint256 subId = names.registerSubdomain(parentId, "blog");
        assertEq(names.ownerOf(subId), alice);

        names.setPrimaryName(subId);
        assertEq(names.getName(alice), "blog.alice.mega");

        vm.stopPrank();
    }

    function test_Resolver() public {
        vm.startPrank(alice);
        usdm.approve(address(names), type(uint256).max);

        bytes32 secret = keccak256("secret");
        bytes32 commitment = names.makeCommitment("myname", alice, secret);
        names.commit(commitment);
        vm.warp(block.timestamp + 61);

        uint256 tokenId = names.register("myname", alice, secret);

        // Set address resolution
        names.setAddr(tokenId, bob);
        assertEq(names.addr(tokenId), bob);

        // Set text record
        names.setText(tokenId, "com.twitter", "@mybrand");
        assertEq(names.text(tokenId, "com.twitter"), "@mybrand");

        // Set contenthash (IPFS CIDv1)
        bytes memory ipfsHash = hex"e3010170122029f2d17be6139079dc48696d1f582a8530eb9805b561eda517e22a892c7e3f1f";
        names.setContenthash(tokenId, ipfsHash);
        assertEq(names.contenthash(tokenId), ipfsHash);

        vm.stopPrank();
    }

    function test_Renewal() public {
        vm.startPrank(alice);
        usdm.approve(address(names), type(uint256).max);

        bytes32 secret = keccak256("secret");
        bytes32 commitment = names.makeCommitment("renew", alice, secret);
        names.commit(commitment);
        vm.warp(block.timestamp + 61);

        uint256 tokenId = names.register("renew", alice, secret);

        // Get current expiry from records
        (,, uint64 expiresAt,,) = names.records(tokenId);

        // Renew before expiry
        vm.warp(block.timestamp + 300 days);

        uint256 warrenBefore = usdm.balanceOf(WARREN_SAFE);
        names.renew(tokenId);

        (,, uint64 newExpiresAt,,) = names.records(tokenId);
        assertGt(newExpiresAt, expiresAt);
        assertEq(usdm.balanceOf(WARREN_SAFE), warrenBefore + 1e6); // $1 fee

        vm.stopPrank();
    }

    function test_MegaNodeHash() public view {
        // Verify MEGA_NODE is correct namehash("mega")
        bytes32 expected = keccak256(abi.encodePacked(bytes32(0), keccak256("mega")));
        assertEq(names.MEGA_NODE(), expected);
    }

    function test_RevertWhen_RegisterWithoutCommit() public {
        vm.startPrank(alice);
        usdm.approve(address(names), type(uint256).max);
        
        vm.expectRevert(MegaNames.CommitmentNotFound.selector);
        names.register("nocommit", alice, keccak256("secret"));
        
        vm.stopPrank();
    }

    function test_RevertWhen_TransferExpired() public {
        vm.startPrank(alice);
        usdm.approve(address(names), type(uint256).max);

        bytes32 secret = keccak256("secret");
        bytes32 commitment = names.makeCommitment("expiring", alice, secret);
        names.commit(commitment);
        vm.warp(block.timestamp + 61);

        uint256 tokenId = names.register("expiring", alice, secret);

        // Warp past expiry + grace period
        vm.warp(block.timestamp + 366 days + 91 days);

        // Should fail - expired token
        vm.expectRevert(MegaNames.Expired.selector);
        names.transferFrom(alice, bob, tokenId);

        vm.stopPrank();
    }

    function test_RevertWhen_InsufficientApproval() public {
        vm.startPrank(alice);
        // Don't approve USDM

        bytes32 secret = keccak256("secret");
        bytes32 commitment = names.makeCommitment("noallowance", alice, secret);
        names.commit(commitment);
        vm.warp(block.timestamp + 61);

        // Should revert due to no approval
        vm.expectRevert();
        names.register("noallowance", alice, secret);

        vm.stopPrank();
    }

    function test_PremiumNames() public {
        vm.startPrank(alice);
        usdm.approve(address(names), type(uint256).max);

        // Register 1-char name ($1000)
        bytes32 secret = keccak256("secret");
        bytes32 commitment = names.makeCommitment("x", alice, secret);
        names.commit(commitment);
        vm.warp(block.timestamp + 61);

        uint256 balBefore = usdm.balanceOf(alice);
        names.register("x", alice, secret);
        uint256 balAfter = usdm.balanceOf(alice);

        assertEq(balBefore - balAfter, 1000e6); // $1000

        vm.stopPrank();
    }
}
