// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MegaNames.sol";

contract DeployMainnet is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Mainnet addresses
        address paymentToken = 0xbB4E6d2F0f1C65a180D8aA57acF22eF8397f6c62;  // USDM mainnet
        address feeRecipient = 0xd4aE3973244592ef06dfdf82470329aCfA62C187;  // Warren Safe
        
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
