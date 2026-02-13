// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import "../src/MegaNames.sol";
import "../src/MegaNameRenderer.sol";

contract MegaNameRendererTest is Test {
    MegaNames names;
    MegaNameRenderer renderer;
    address alice = address(0xA11CE);
    address mockUSDM;
    address deployer;

    function setUp() public {
        deployer = tx.origin;
        mockUSDM = address(new MockERC20());
        names = new MegaNames(mockUSDM, deployer);
        renderer = new MegaNameRenderer(address(names));

        vm.startPrank(deployer);
        names.setTokenURIRenderer(address(renderer));
        names.setRegistrationOpen(true);
        vm.stopPrank();

        MockERC20(mockUSDM).mint(alice, 100000e18);
        vm.prank(alice);
        MockERC20(mockUSDM).approve(address(names), type(uint256).max);
    }

    function _nh(string memory label) internal pure returns (uint256) {
        bytes32 megaNode = keccak256(abi.encodePacked(bytes32(0), keccak256("mega")));
        return uint256(keccak256(abi.encodePacked(megaNode, keccak256(bytes(label)))));
    }

    function test_RendererTokenURI() public {
        vm.prank(deployer);
        names.adminRegister("bread", alice, 3);

        string memory uri = names.tokenURI(_nh("bread"));
        assertTrue(bytes(uri).length > 0);
        assertTrue(_startsWith(uri, "data:application/json;base64,"));
    }

    function test_SubdomainURI() public {
        vm.prank(deployer);
        names.adminRegister("bread", alice, 3);
        uint256 parentTid = _nh("bread");

        vm.prank(alice);
        names.registerSubdomain(parentTid, "dev");

        bytes32 subNode = keccak256(abi.encodePacked(bytes32(parentTid), keccak256("dev")));
        string memory uri = names.tokenURI(uint256(subNode));
        assertTrue(bytes(uri).length > 0);
    }

    function test_Expired() public {
        vm.prank(deployer);
        names.adminRegister("old", alice, 1);

        vm.warp(block.timestamp + 400 days);
        string memory uri = names.tokenURI(_nh("old"));
        assertTrue(bytes(uri).length > 0);
    }

    function test_AllTiers() public {
        vm.startPrank(deployer);
        names.adminRegister("x", alice, 1);
        names.adminRegister("ab", alice, 1);
        names.adminRegister("abc", alice, 1);
        names.adminRegister("abcd", alice, 1);
        names.adminRegister("abcde", alice, 1);
        vm.stopPrank();

        assertTrue(bytes(names.tokenURI(_nh("x"))).length > 0);
        assertTrue(bytes(names.tokenURI(_nh("ab"))).length > 0);
        assertTrue(bytes(names.tokenURI(_nh("abc"))).length > 0);
        assertTrue(bytes(names.tokenURI(_nh("abcd"))).length > 0);
        assertTrue(bytes(names.tokenURI(_nh("abcde"))).length > 0);
    }

    function test_LongName() public {
        vm.prank(deployer);
        names.adminRegister("superlongnamethatis", alice, 1);
        string memory uri = names.tokenURI(_nh("superlongnamethatis"));
        assertTrue(bytes(uri).length > 0);
    }

    function _startsWith(string memory str, string memory prefix) internal pure returns (bool) {
        bytes memory s = bytes(str);
        bytes memory p = bytes(prefix);
        if (s.length < p.length) return false;
        for (uint256 i; i < p.length; i++) {
            if (s[i] != p[i]) return false;
        }
        return true;
    }
}

contract MockERC20 {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "insufficient");
        require(allowance[from][msg.sender] >= amount, "not approved");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        return true;
    }
}
