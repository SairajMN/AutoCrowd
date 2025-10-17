// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {CampaignFactory} from "../src/CampaignFactory.sol";
import {AIVerificationHandler} from "../src/AIVerificationHandler.sol";

contract DeployScript is Script {
    function run() external {
        // Use environment variables for deployment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address pyusdAddress = vm.envAddress("PYUSD_CONTRACT_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        console.log("Deploying contracts to Sepolia...");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("PYUSD Address:", pyusdAddress);

        // Deploy AI Verification Handler
        console.log("Deploying AIVerificationHandler...");
        AIVerificationHandler aiHandler = new AIVerificationHandler();
        console.log("AIVerificationHandler deployed at:", address(aiHandler));

        // Deploy Campaign Factory
        console.log("Deploying CampaignFactory...");
        CampaignFactory factory = new CampaignFactory(pyusdAddress);
        console.log("CampaignFactory deployed at:", address(factory));

        vm.stopBroadcast();

        // Log addresses for frontend configuration
        console.log("\\n=== DEPLOYMENT COMPLETE ===");
        console.log("AI_HANDLER_ADDRESS=%s", address(aiHandler));
        console.log("CAMPAIGN_FACTORY_ADDRESS=%s", address(factory));
        console.log("\\nCopy these addresses to your .env file!");
    }
}
