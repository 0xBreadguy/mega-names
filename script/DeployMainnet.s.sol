// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MegaNames.sol";

contract DeployMainnet is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Mainnet addresses
        address paymentToken = 0xFAfDdbb3FC7688494971a79cc65DCa3EF82079E7;  // USDM mainnet
        address feeRecipient = 0x25925C0191E8195aFb9dFA35Cd04071FF11D2e38;  // Mainnet fees address
        
        console.log("Deploying MegaNames to MegaETH Mainnet...");
        console.log("Payment Token (USDM):", paymentToken);
        console.log("Fee Recipient (Warren Safe):", feeRecipient);
        
        vm.startBroadcast(deployerPrivateKey);
        
        MegaNames megaNames = new MegaNames(paymentToken, feeRecipient);
        
        vm.stopBroadcast();
        
        console.log("MegaNames deployed at:", address(megaNames));
        console.log("Owner:", megaNames.owner());
    }
}
