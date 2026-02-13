// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {MegaNames} from "../src/MegaNames.sol";
import {MockUSDM} from "../src/MockUSDM.sol";

/// @notice Generic deploy script — deploys MockUSDM on testnet, uses real USDM on mainnet
contract DeployMegaNames is Script {
    // Fee recipient
    address constant FEE_RECIPIENT = 0x25925C0191E8195aFb9dFA35Cd04071FF11D2e38;
    
    // USDM on MegaETH Mainnet
    address constant USDM_MAINNET = 0xFAfDdbb3FC7688494971a79cc65DCa3EF82079E7;

    function run() public returns (MegaNames, address) {
        vm.startBroadcast();

        address usdm;
        
        if (block.chainid == 4326) {
            usdm = USDM_MAINNET;
            console.log("Using mainnet USDM:", usdm);
        } else {
            MockUSDM mockUsdm = new MockUSDM();
            usdm = address(mockUsdm);
            console.log("Deployed MockUSDM:", usdm);
        }

        MegaNames names = new MegaNames(usdm, FEE_RECIPIENT);

        console.log("MegaNames deployed to:", address(names));
        console.log("Payment token:", names.paymentToken());
        console.log("Fee recipient:", names.feeRecipient());
        console.log("MEGA_NODE:", vm.toString(names.MEGA_NODE()));

        vm.stopBroadcast();

        return (names, usdm);
    }
}
