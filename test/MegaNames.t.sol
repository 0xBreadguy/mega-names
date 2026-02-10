// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Test, console} from "forge-std/Test.sol";
import {MegaNames} from "../src/MegaNames.sol";

contract MegaNamesTest is Test {
    MegaNames public names;
    
    address constant WARREN_SAFE = 0xd4aE3973244592ef06dfdf82470329aCfA62C187;
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    function setUp() public {
        names = new MegaNames(WARREN_SAFE);
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
    }

    function test_MetadataCorrect() public view {
        assertEq(names.name(), "MegaNames");
        assertEq(names.symbol(), "MEGA");
    }

    function test_FeeRecipient() public view {
        assertEq(names.feeRecipient(), WARREN_SAFE);
    }

    function test_LengthFees() public view {
        assertEq(names.registrationFee(1), 0.5 ether);
        assertEq(names.registrationFee(2), 0.1 ether);
        assertEq(names.registrationFee(3), 0.05 ether);
        assertEq(names.registrationFee(4), 0.01 ether);
        assertEq(names.registrationFee(5), 0.0005 ether);
        assertEq(names.registrationFee(10), 0.0005 ether);
    }

    function test_CommitRevealRegister() public {
        vm.startPrank(alice);

        bytes32 secret = keccak256("secret");
        bytes32 commitment = names.makeCommitment("bread", alice, secret);

        names.commit(commitment);
        
        // Warp past MIN_COMMITMENT_AGE
        vm.warp(block.timestamp + 61);

        uint256 fee = names.registrationFee(5);
        uint256 tokenId = names.register{value: fee}("bread", alice, secret);

        assertEq(names.ownerOf(tokenId), alice);
        assertEq(names.getName(alice), ""); // No primary set yet

        names.setPrimaryName(tokenId);
        assertEq(names.getName(alice), "bread.mega");

        vm.stopPrank();
    }

    function test_FeesGoToWarren() public {
        vm.startPrank(alice);

        bytes32 secret = keccak256("secret");
        bytes32 commitment = names.makeCommitment("test", alice, secret);
        names.commit(commitment);
        vm.warp(block.timestamp + 61);

        uint256 warrenBefore = WARREN_SAFE.balance;
        uint256 fee = names.registrationFee(4); // 4 char = 0.01 ether

        names.register{value: fee}("test", alice, secret);

        assertEq(WARREN_SAFE.balance, warrenBefore + fee);

        vm.stopPrank();
    }

    function test_Subdomains() public {
        vm.startPrank(alice);

        // Register parent
        bytes32 secret = keccak256("secret");
        bytes32 commitment = names.makeCommitment("alice", alice, secret);
        names.commit(commitment);
        vm.warp(block.timestamp + 61);

        uint256 parentId = names.register{value: 0.01 ether}("alice", alice, secret);

        // Register subdomain
        uint256 subId = names.registerSubdomain(parentId, "blog");
        assertEq(names.ownerOf(subId), alice);

        names.setPrimaryName(subId);
        assertEq(names.getName(alice), "blog.alice.mega");

        vm.stopPrank();
    }

    function test_Resolver() public {
        vm.startPrank(alice);

        bytes32 secret = keccak256("secret");
        bytes32 commitment = names.makeCommitment("myname", alice, secret);
        names.commit(commitment);
        vm.warp(block.timestamp + 61);

        uint256 tokenId = names.register{value: 0.0005 ether}("myname", alice, secret);

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

        bytes32 secret = keccak256("secret");
        bytes32 commitment = names.makeCommitment("renew", alice, secret);
        names.commit(commitment);
        vm.warp(block.timestamp + 61);

        uint256 tokenId = names.register{value: 0.0005 ether}("renew", alice, secret);

        // Get current expiry from records
        (,, uint64 expiresAt,,) = names.records(tokenId);

        // Renew before expiry
        vm.warp(block.timestamp + 300 days);

        uint256 warrenBefore = WARREN_SAFE.balance;
        names.renew{value: 0.0005 ether}(tokenId);

        (,, uint64 newExpiresAt,,) = names.records(tokenId);
        assertGt(newExpiresAt, expiresAt);
        assertEq(WARREN_SAFE.balance, warrenBefore + 0.0005 ether);

        vm.stopPrank();
    }

    function test_MegaNodeHash() public view {
        // Verify MEGA_NODE is correct namehash("mega")
        bytes32 expected = keccak256(abi.encodePacked(bytes32(0), keccak256("mega")));
        assertEq(names.MEGA_NODE(), expected);
    }

    function test_RevertWhen_RegisterWithoutCommit() public {
        vm.prank(alice);
        vm.expectRevert(MegaNames.CommitmentNotFound.selector);
        names.register{value: 1 ether}("nocommit", alice, keccak256("secret"));
    }

    function test_RevertWhen_TransferExpired() public {
        vm.startPrank(alice);

        bytes32 secret = keccak256("secret");
        bytes32 commitment = names.makeCommitment("expiring", alice, secret);
        names.commit(commitment);
        vm.warp(block.timestamp + 61);

        uint256 tokenId = names.register{value: 0.0005 ether}("expiring", alice, secret);

        // Warp past expiry + grace period
        vm.warp(block.timestamp + 366 days + 91 days);

        // Should fail - expired token
        vm.expectRevert(MegaNames.Expired.selector);
        names.transferFrom(alice, bob, tokenId);

        vm.stopPrank();
    }
}
