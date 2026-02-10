// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {MegaNames} from "../src/MegaNames.sol";

contract DeployMegaNames is Script {
    // Warren Protocol Safe (fee recipient)
    address constant WARREN_SAFE = 0xd4aE3973244592ef06dfdf82470329aCfA62C187;

    function run() public returns (MegaNames) {
        vm.startBroadcast();

        MegaNames names = new MegaNames(WARREN_SAFE);

        console.log("MegaNames deployed to:", address(names));
        console.log("Fee recipient:", names.feeRecipient());
        console.log("MEGA_NODE:", vm.toString(names.MEGA_NODE()));

        vm.stopBroadcast();

        return names;
    }
}
