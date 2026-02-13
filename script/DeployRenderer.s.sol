// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Script.sol";
import {MegaNameRenderer} from "../src/MegaNameRenderer.sol";

contract DeployRenderer is Script {
    // MegaNames mainnet contract
    address constant MEGA_NAMES = 0x5B424C6CCba77b32b9625a6fd5A30D409d20d997;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        // Start numbering from 1 (we'll backfill existing 130+ names)
        MegaNameRenderer renderer = new MegaNameRenderer(MEGA_NAMES);

        console.log("Renderer deployed at:", address(renderer));

        vm.stopBroadcast();
    }
}
