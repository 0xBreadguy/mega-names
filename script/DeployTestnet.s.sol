// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {MegaNames} from "../src/MegaNames.sol";
import {MockUSDM} from "../src/MockUSDM.sol";

contract DeployTestnet is Script {
    function run() public {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        
        // Bread's test address
        address breadTest = 0x9D152D78B05f31EA6979061d432110c8664cA1a7;
        
        // Warren Safe (fee recipient)
        address warrenSafe = 0xd4aE3973244592ef06dfdf82470329aCfA62C187;

        console.log("Deployer:", deployer);
        console.log("Bread Test:", breadTest);

        vm.startBroadcast(deployerKey);

        // 1. Deploy MockUSDM
        MockUSDM usdm = new MockUSDM();
        console.log("MockUSDM deployed:", address(usdm));

        // 2. Deploy MegaNames with MockUSDM
        MegaNames megaNames = new MegaNames(address(usdm), warrenSafe);
        console.log("MegaNames deployed:", address(megaNames));

        // 3. Mint 1M USDM to Bread
        uint256 amount = 1_000_000 * 1e18; // 1M USDM (18 decimals)
        usdm.mint(breadTest, amount);
        console.log("Minted 1M USDM to Bread");

        // 4. Also mint some to deployer for testing
        usdm.mint(deployer, amount);
        console.log("Minted 1M USDM to deployer");

        vm.stopBroadcast();

        console.log("");
        console.log("=== DEPLOYMENT COMPLETE ===");
        console.log("MockUSDM:", address(usdm));
        console.log("MegaNames:", address(megaNames));
        console.log("Fee Recipient:", warrenSafe);
    }
}
