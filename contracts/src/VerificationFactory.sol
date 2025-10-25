// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {CampaignVerificationContract} from "./CampaignVerificationContract.sol";

/**
 * @title VerificationFactory
 * @dev Factory for creating verification contracts for campaigns
 * Manages verifiers and integrates with campaign factory
 */
contract VerificationFactory is Ownable {
    address public campaignFactory;
    address public immutable VERIFICATION_NFT;

    // Verifier management
    mapping(address => bool) public isVerifier;
    mapping(address => VerifierInfo) public verifierInfo;
    address[] public verifiers;

    struct VerifierInfo {
        string name;
        string[] expertise;
        uint256 reputationScore;
        uint256 totalVerifications;
        uint256 successfulVerifications;
        bool isActive;
        uint256 joinedAt;
    }

    // Campaign verification contracts
    mapping(address => address) public campaignToVerificationContract;
    mapping(address => address) public verificationContractToCampaign;
    address[] public activeVerificationContracts;

    event VerifierAdded(address indexed verifier, string name);
    event VerifierRemoved(address indexed verifier);
    event VerificationContractCreated(
        address indexed campaignAddress,
        address indexed verificationContract
    );
    event VerifierReputationUpdated(address indexed verifier, uint256 newScore);

    constructor(address _campaignFactory, address _verificationNFT) Ownable(msg.sender) {
        campaignFactory = _campaignFactory;
        VERIFICATION_NFT = _verificationNFT;
    }

    /**
     * @dev Create verification contract for a campaign
     */
    function createVerificationContract(address _campaignAddress)
        external
        returns (address)
    {
        require(msg.sender == campaignFactory, "Only CampaignFactory can create verification contracts");
        require(campaignToVerificationContract[_campaignAddress] == address(0), "Verification contract already exists");

        CampaignVerificationContract verificationContract = new CampaignVerificationContract(
            _campaignAddress,
            address(this),
            VERIFICATION_NFT
        );

        address verificationAddress = address(verificationContract);

        campaignToVerificationContract[_campaignAddress] = verificationAddress;
        verificationContractToCampaign[verificationAddress] = _campaignAddress;
        activeVerificationContracts.push(verificationAddress);

        emit VerificationContractCreated(_campaignAddress, verificationAddress);

        return verificationAddress;
    }

    /**
     * @dev Add a verifier to the network
     */
    function addVerifier(
        address _verifier,
        string memory _name,
        string[] memory _expertise
    ) external onlyOwner {
        require(!isVerifier[_verifier], "Already a verifier");
        require(_verifier != address(0), "Invalid verifier address");

        isVerifier[_verifier] = true;
        verifierInfo[_verifier] = VerifierInfo({
            name: _name,
            expertise: _expertise,
            reputationScore: 500, // Start with neutral reputation
            totalVerifications: 0,
            successfulVerifications: 0,
            isActive: true,
            joinedAt: block.timestamp
        });

        verifiers.push(_verifier);

        emit VerifierAdded(_verifier, _name);
    }

    /**
     * @dev Remove a verifier
     */
    function removeVerifier(address _verifier) external onlyOwner {
        require(isVerifier[_verifier], "Not a verifier");

        isVerifier[_verifier] = false;
        verifierInfo[_verifier].isActive = false;

        emit VerifierRemoved(_verifier);
    }

    /**
     * @dev Update verifier reputation after verification
     */
    function updateVerifierReputation(
        address _verifier,
        bool _successful,
        uint256 _confidenceScore
    ) external {
        require(msg.sender == campaignToVerificationContract[verificationContractToCampaign[msg.sender]],
                "Only verification contracts can update reputation");

        VerifierInfo storage info = verifierInfo[_verifier];
        info.totalVerifications += 1;

        if (_successful) {
            info.successfulVerifications += 1;
        }

        // Update reputation score based on success rate and confidence
        uint256 successRate = info.totalVerifications > 0 ?
            (info.successfulVerifications * 1000) / info.totalVerifications : 500;

        // Weight success rate with confidence score (0-1000 scale)
        info.reputationScore = (successRate + _confidenceScore) / 2;

        emit VerifierReputationUpdated(_verifier, info.reputationScore);
    }

    /**
     * @dev Get verifier details
     */
    function getVerifierDetails(address _verifier)
        external
        view
        returns (
            string memory name,
            string[] memory expertise,
            uint256 reputationScore,
            uint256 totalVerifications,
            uint256 successRate,
            bool isActive
        )
    {
        VerifierInfo memory info = verifierInfo[_verifier];
        uint256 successRateCalc = info.totalVerifications > 0 ?
            (info.successfulVerifications * 100) / info.totalVerifications : 0;

        return (
            info.name,
            info.expertise,
            info.reputationScore,
            info.totalVerifications,
            successRateCalc,
            info.isActive
        );
    }

    /**
     * @dev Get active verifiers
     */
    function getActiveVerifiers() external view returns (address[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < verifiers.length; i++) {
            if (verifierInfo[verifiers[i]].isActive) {
                activeCount++;
            }
        }

        address[] memory activeVerifiers = new address[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < verifiers.length; i++) {
            if (verifierInfo[verifiers[i]].isActive) {
                activeVerifiers[index] = verifiers[i];
                index++;
            }
        }

        return activeVerifiers;
    }

    /**
     * @dev Get verification contract for campaign
     */
    function getVerificationContract(address _campaignAddress)
        external
        view
        returns (address)
    {
        return campaignToVerificationContract[_campaignAddress];
    }

    /**
     * @dev Get campaign for verification contract
     */
    function getCampaignForVerificationContract(address _verificationContract)
        external
        view
        returns (address)
    {
        return verificationContractToCampaign[_verificationContract];
    }

    /**
     * @dev Update campaign factory address
     */
    function setCampaignFactory(address _newFactory) external onlyOwner {
        require(_newFactory != address(0), "Invalid factory address");
        campaignFactory = _newFactory;
    }
}
