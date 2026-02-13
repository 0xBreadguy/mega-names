// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {MegaNames} from "../src/MegaNames.sol";
import {MockUSDM} from "../src/MockUSDM.sol";

contract DeployTestnet is Script {
    // Fee recipient
    address constant FEE_RECIPIENT = 0x25925C0191E8195aFb9dFA35Cd04071FF11D2e38;

    function run() public {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        console.log("Deployer:", deployer);

        vm.startBroadcast(deployerKey);

        // 1. Deploy MockUSDM
        MockUSDM usdm = new MockUSDM();
        console.log("MockUSDM deployed:", address(usdm));

        // 2. Deploy MegaNames with MockUSDM
        MegaNames megaNames = new MegaNames(address(usdm), FEE_RECIPIENT);
        console.log("MegaNames deployed:", address(megaNames));

        // 3. Mint test USDM to deployer
        uint256 amount = 1_000_000 * 1e18;
        usdm.mint(deployer, amount);
        console.log("Minted 1M USDM to deployer");

        vm.stopBroadcast();

        console.log("");
        console.log("=== DEPLOYMENT COMPLETE ===");
        console.log("MockUSDM:", address(usdm));
        console.log("MegaNames:", address(megaNames));
        console.log("Fee Recipient:", FEE_RECIPIENT);
    }
}
