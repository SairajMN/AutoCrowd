// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {VerificationFactory} from "../src/VerificationFactory.sol";
import {VerificationNFT} from "../src/VerificationNFT.sol";

contract DeployVerification is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy VerificationNFT first
        VerificationNFT verificationNFT = new VerificationNFT(address(0)); // Will set factory later
        console.log("VerificationNFT deployed at:", address(verificationNFT));

        // Deploy VerificationFactory with NFT address
        address campaignFactoryAddress = 0xf124e23F710E717Ec6d4046A9Ad5Ec907a6F13e9; // From .env
        VerificationFactory verificationFactory = new VerificationFactory(
            campaignFactoryAddress,
            address(verificationNFT)
        );
        console.log("VerificationFactory deployed at:", address(verificationFactory));

        // Set the factory address in VerificationNFT
        verificationNFT.setVerificationFactory(address(verificationFactory));
        console.log("VerificationNFT factory updated");

        // Add initial verifiers (optional - can be done later by owner)
        string[] memory verifierExpertise = new string[](3);
        verifierExpertise[0] = "contribution_verification";
        verifierExpertise[1] = "identity_check";
        verifierExpertise[2] = "fraud_detection";

        // Note: In production, add real verifier addresses here
        verificationFactory.addVerifier(
            campaignFactoryAddress, // Using campaign factory as first verifier for testing
            "AutoCrowd Verification",
            verifierExpertise
        );
        console.log("Initial verifier added");

        vm.stopBroadcast();

        // Output deployment addresses for .env configuration
        console.log("=== DEPLOYMENT COMPLETE ===");
        console.log("VERIFICATION_FACTORY_ADDRESS=%s", address(verificationFactory));
        console.log("VERIFICATION_NFT_ADDRESS=%s", address(verificationNFT));
        console.log("Update your backend/.env file with these addresses");
    }
}
