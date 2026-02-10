// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {MegaNames} from "../src/MegaNames.sol";
import {MockUSDM} from "../src/MockUSDM.sol";

contract DeployMegaNames is Script {
    // Warren Protocol Safe (fee recipient)
    address constant WARREN_SAFE = 0xd4aE3973244592ef06dfdf82470329aCfA62C187;
    
    // USDM on MegaETH Mainnet
    address constant USDM_MAINNET = 0x078D782b760474a361dDA0AF3839290b0EF57AD6;

    function run() public returns (MegaNames, address) {
        vm.startBroadcast();

        address usdm;
        
        // Check if we're on mainnet (has USDM) or testnet (deploy mock)
        if (block.chainid == 4326) {
            // Mainnet - use real USDM
            usdm = USDM_MAINNET;
            console.log("Using mainnet USDM:", usdm);
        } else {
            // Testnet - deploy mock USDM
            MockUSDM mockUsdm = new MockUSDM();
            usdm = address(mockUsdm);
            console.log("Deployed MockUSDM:", usdm);
        }

        MegaNames names = new MegaNames(usdm, WARREN_SAFE);

        console.log("MegaNames deployed to:", address(names));
        console.log("Payment token:", names.paymentToken());
        console.log("Fee recipient:", names.feeRecipient());
        console.log("MEGA_NODE:", vm.toString(names.MEGA_NODE()));

        vm.stopBroadcast();

        return (names, usdm);
    }
}
