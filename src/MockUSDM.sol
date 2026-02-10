// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {ERC20} from "solady/tokens/ERC20.sol";

/// @title MockUSDM
/// @notice Mock USDM token for testing (18 decimals like real USDM)
contract MockUSDM is ERC20 {
    function name() public pure override returns (string memory) {
        return "Mock USDM";
    }

    function symbol() public pure override returns (string memory) {
        return "USDM";
    }

    function decimals() public pure override returns (uint8) {
        return 18;
    }

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}
