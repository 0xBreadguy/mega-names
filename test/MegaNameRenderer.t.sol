// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import {MegaNames} from "../src/MegaNames.sol";
import {MegaNameRenderer} from "../src/MegaNameRenderer.sol";

contract MockUSDM {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    function mint(address to, uint256 amt) external { balanceOf[to] += amt; }
    function approve(address sp, uint256 amt) external returns (bool) { allowance[msg.sender][sp] = amt; return true; }
    function transferFrom(address f, address t, uint256 a) external returns (bool) {
        allowance[f][msg.sender] -= a; balanceOf[f] -= a; balanceOf[t] += a; return true;
    }
    function permit(address,address,uint256,uint256,uint8,bytes32,bytes32) external {}
}

contract MegaNameRendererTest is Test {
    MegaNames names;
    MegaNameRenderer renderer;
    MockUSDM usdm;
    address user = address(0xBEEF);

    address deployer;

    function setUp() public {
        vm.warp(1770000000); // ~2026
        deployer = tx.origin; // Solady Ownable uses tx.origin
        usdm = new MockUSDM();
        names = new MegaNames(address(usdm), address(0xFEE));
        renderer = new MegaNameRenderer(address(names), 1);
        vm.prank(deployer);
        names.setRegistrationOpen(true);
        usdm.mint(user, 10_000e18);
    }

    function _reg(string memory label, address to, uint256 numYrs) internal {
        address[] memory o = new address[](1); o[0] = to;
        string[] memory l = new string[](1); l[0] = label;
        vm.prank(deployer);
        names.adminRegisterBatch(l, o, numYrs);
    }

    function _nh(string memory label) internal pure returns (uint256) {
        bytes32 mega = 0x892fab39f6d2ae901009febba7dbdd0fd85e8a1651be6b8901774cdef395852f;
        return uint256(keccak256(abi.encodePacked(mega, keccak256(bytes(label)))));
    }

    function test_RendererTokenURI() public {
        _reg("bread", user, 3);
        vm.prank(deployer);
        names.setTokenURIRenderer(address(renderer));
        vm.prank(deployer);
        renderer.setRegistrationNumber(_nh("bread"), 1);

        string memory uri = names.tokenURI(_nh("bread"));
        assertTrue(bytes(uri).length > 0);
        // data:application/json;base64,...
        assertEq(bytes(uri)[0], bytes1("d"));
    }

    function test_AllTiers() public {
        _reg("abc", user, 1);   // 3-char rare
        _reg("abcd", user, 1);  // 4-char uncommon
        _reg("abcde", user, 1); // 5-char standard
        vm.prank(deployer);
        names.setTokenURIRenderer(address(renderer));

        assertTrue(bytes(names.tokenURI(_nh("abc"))).length > 0);
        assertTrue(bytes(names.tokenURI(_nh("abcd"))).length > 0);
        assertTrue(bytes(names.tokenURI(_nh("abcde"))).length > 0);
    }

    function test_SubdomainCount() public {
        _reg("bread", user, 3);
        uint256 pid = _nh("bread");
        vm.prank(user);
        names.registerSubdomain(pid, "crumb");

        vm.prank(deployer);
        renderer.incrementSubdomainCount(pid);
        assertEq(renderer.subdomainCount(pid), 1);

        vm.prank(deployer);
        names.setTokenURIRenderer(address(renderer));
        vm.prank(deployer);
        renderer.setRegistrationNumber(pid, 1);
        assertTrue(bytes(names.tokenURI(pid)).length > 0);
    }

    function test_BatchRegNumbers() public {
        _reg("alpha", user, 1);
        _reg("beta", user, 1);

        uint256[] memory tids = new uint256[](2);
        tids[0] = _nh("alpha");
        tids[1] = _nh("beta");
        vm.prank(deployer);
        renderer.batchSetRegistrationNumbers(tids, 1);

        assertEq(renderer.registrationNumber(tids[0]), 1);
        assertEq(renderer.registrationNumber(tids[1]), 2);
        assertEq(renderer.nextRegistrationNumber(), 3);
    }

    function test_Expired() public {
        _reg("old", user, 1);
        vm.prank(deployer);
        names.setTokenURIRenderer(address(renderer));
        vm.warp(block.timestamp + 365 days + 91 days);
        assertTrue(bytes(names.tokenURI(_nh("old"))).length > 0);
    }

    function test_SubdomainURI() public {
        _reg("bread", user, 3);
        uint256 pid = _nh("bread");
        vm.prank(user);
        names.registerSubdomain(pid, "crumb");

        vm.prank(deployer);
        names.setTokenURIRenderer(address(renderer));
        // Subdomain tokenURI
        bytes32 mega = 0x892fab39f6d2ae901009febba7dbdd0fd85e8a1651be6b8901774cdef395852f;
        bytes32 parentNode = keccak256(abi.encodePacked(mega, keccak256(bytes("bread"))));
        uint256 subId = uint256(keccak256(abi.encodePacked(parentNode, keccak256(bytes("crumb")))));
        assertTrue(bytes(names.tokenURI(subId)).length > 0);
    }
}
