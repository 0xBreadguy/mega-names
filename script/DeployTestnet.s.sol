// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {MegaNames} from "../src/MegaNames.sol";
import {MegaNameRenderer} from "../src/MegaNameRenderer.sol";
import {SubdomainRouter} from "../src/SubdomainRouter.sol";
import {SubdomainLogic} from "../src/SubdomainLogic.sol";
import {MockUSDM} from "../src/MockUSDM.sol";

contract DeployTestnet is Script {
    address constant FEE_RECIPIENT = 0x25925C0191E8195aFb9dFA35Cd04071FF11D2e38;

    function run() public {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        console.log("Deployer:", deployer);

        vm.startBroadcast(deployerKey);

        // 1. Deploy MockUSDM
        MockUSDM usdm = new MockUSDM();
        console.log("MockUSDM:", address(usdm));

        // 2. Deploy MegaNames
        MegaNames megaNames = new MegaNames(address(usdm), FEE_RECIPIENT);
        console.log("MegaNames:", address(megaNames));

        // 3. Deploy MegaNameRenderer
        MegaNameRenderer renderer = new MegaNameRenderer(address(megaNames));
        console.log("MegaNameRenderer:", address(renderer));

        // 4. Set renderer on MegaNames
        megaNames.setTokenURIRenderer(address(renderer));
        console.log("Renderer set on MegaNames");

        // 5. Deploy SubdomainRouter (with placeholder logic)
        SubdomainRouter router =
            new SubdomainRouter(address(megaNames), address(usdm), FEE_RECIPIENT, address(0));
        console.log("SubdomainRouter:", address(router));

        // 6. Deploy SubdomainLogic
        SubdomainLogic logic = new SubdomainLogic(address(megaNames), address(router));
        console.log("SubdomainLogic:", address(logic));

        // 7. Set logic on router
        router.setLogicContract(address(logic));
        console.log("Logic contract set on router");

        // 8. Mint test USDM to deployer
        uint256 amount = 1_000_000 * 1e18;
        usdm.mint(deployer, amount);
        console.log("Minted 1M USDM to deployer");

        vm.stopBroadcast();

        console.log("");
        console.log("=== TESTNET DEPLOYMENT COMPLETE ===");
        console.log("MockUSDM:         ", address(usdm));
        console.log("MegaNames:        ", address(megaNames));
        console.log("MegaNameRenderer: ", address(renderer));
        console.log("SubdomainRouter:  ", address(router));
        console.log("SubdomainLogic:   ", address(logic));
        console.log("Fee Recipient:    ", FEE_RECIPIENT);
    }
}
