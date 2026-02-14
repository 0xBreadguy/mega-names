// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Script.sol";
import {SubdomainRouter} from "../src/SubdomainRouter.sol";
import {SubdomainLogic} from "../src/SubdomainLogic.sol";

contract DeploySubdomainRegistrar is Script {
    function run() external {
        // MegaETH mainnet addresses
        address megaNames = 0x5B424C6CCba77b32b9625a6fd5A30D409d20d997;
        address usdm = 0xFAfDdbb3FC7688494971a79cc65DCa3EF82079E7;
        address feeRecipient = 0x25925C0191E8195aFb9dFA35Cd04071FF11D2e38;

        vm.startBroadcast();

        // Deploy router first (with address(0) logic)
        SubdomainRouter router = new SubdomainRouter(
            megaNames,
            usdm,
            feeRecipient,
            address(0)
        );
        console.log("SubdomainRouter:", address(router));

        // Deploy logic with router reference
        SubdomainLogic logic = new SubdomainLogic(megaNames, address(router));
        console.log("SubdomainLogic:", address(logic));

        // Set logic on router
        router.setLogicContract(address(logic));
        console.log("Logic contract set on router");

        vm.stopBroadcast();
    }
}
