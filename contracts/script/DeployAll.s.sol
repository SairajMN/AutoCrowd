// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {CampaignFactory} from "../src/CampaignFactory.sol";
import {AICrowdfundingCampaign} from "../src/AICrowdfundingCampaign.sol";
import {VerificationNFT} from "../src/VerificationNFT.sol";
import {VerificationFactory} from "../src/VerificationFactory.sol";

contract DeployAll is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy first: PYUSD Mock (if needed for testing)
        // For production, use real PYUSD address

        // Use existing PYUSD address
        address pyusdAddress = 0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9; // From .env
        address aiHandlerAddress = 0x5Eeb0cda16903c2b3c867E0029a5Fb20792a3832; // AI Verification Handler

        console.log("Using PYUSD at:", pyusdAddress);
        console.log("Using AI Handler at:", aiHandlerAddress);

        // Deploy VerificationNFT first
        VerificationNFT verificationNFT = new VerificationNFT(address(0)); // Will set factory later
        console.log("VerificationNFT deployed at:", address(verificationNFT));

        // Deploy VerificationFactory with NFT address
        VerificationFactory verificationFactory = new VerificationFactory(
            address(0), // CampaignFactory address (will be set later)
            address(verificationNFT)
        );
        console.log("VerificationFactory deployed at:", address(verificationFactory));

        // Set the factory address in VerificationNFT
        verificationNFT.setVerificationFactory(address(verificationFactory));
        console.log("VerificationNFT factory updated");

        // Deploy CampaignFactory last (these need each other)
        CampaignFactory campaignFactory = new CampaignFactory(
            pyusdAddress,
            aiHandlerAddress
        );
        console.log("CampaignFactory deployed at:", address(campaignFactory));

        // Update VerificationFactory with actual CampaignFactory address
        verificationFactory.setCampaignFactory(address(campaignFactory));
        console.log("VerificationFactory CampaignFactory address updated");

        // Add initial verifiers to factory
        string[] memory verifierExpertise = new string[](3);
        verifierExpertise[0] = "contribution_verification";
        verifierExpertise[1] = "identity_check";
        verifierExpertise[2] = "fraud_detection";

        // In production, add real verifier addresses - using deployer for now
        verificationFactory.addVerifier(
            address(campaignFactory), // Using campaign factory as first verifier
            "AutoCrowd Verification",
            verifierExpertise
        );
        console.log("Initial verifier added");

        vm.stopBroadcast();

        // Output deployment addresses for .env configuration
        console.log("=== FULL DEPLOYMENT COMPLETE ===");
        console.log("CAMPAIGN_FACTORY_ADDRESS=%s", address(campaignFactory));
        console.log("VERIFICATION_FACTORY_ADDRESS=%s", address(verificationFactory));
        console.log("VERIFICATION_NFT_ADDRESS=%s", address(verificationNFT));
        console.log("AI_VERIFICATION_HANDLER_ADDRESS=%s", aiHandlerAddress);
        console.log("PYUSD_CONTRACT_ADDRESS=%s", pyusdAddress);

        console.log("=== INSTRUCTIONS ===");
        console.log("1. Update backend/.env with these new addresses");
        console.log("2. Run database_setup.sql on Supabase");
        console.log("3. Existing campaign data will be lost - deploy in production carefully");
    }
}
