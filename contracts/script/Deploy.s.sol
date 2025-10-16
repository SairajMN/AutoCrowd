// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {CampaignFactory} from "../src/CampaignFactory.sol";
import {AIVerificationHandler} from "../src/AIVerificationHandler.sol";

contract DeployScript is Script {
function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address pyusdAddress = vm.envAddress("PYUSD_CONTRACT_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy AI Verification Handler
        AIVerificationHandler aiHandler = new AIVerificationHandler();
        console.log("AIVerificationHandler deployed at:", address(aiHandler));

        // Deploy Campaign Factory
        CampaignFactory factory = new CampaignFactory(pyusdAddress);
        console.log("CampaignFactory deployed at:", address(factory));

        vm.stopBroadcast();

        // Log addresses for frontend configuration
        console.log("Deployment completed!");
        console.log("AI_HANDLER_ADDRESS=", address(aiHandler));
        console.log("CAMPAIGN_FACTORY_ADDRESS=", address(factory));
    }
}
