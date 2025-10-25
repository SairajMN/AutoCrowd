// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IVerificationNFT} from "./IVerificationNFT.sol";

/**
 * @title CampaignVerificationContract
 * @dev Handles verification for a specific campaign
 * Manages contributor verification and milestone verification
 */
contract CampaignVerificationContract is Ownable, ReentrancyGuard {
    address public immutable CAMPAIGN_ADDRESS;
    address public immutable VERIFICATION_FACTORY;
    address public immutable VERIFICATION_NFT;

    // Verification levels
    enum VerificationLevel { NONE, BASIC, ADVANCED, EXPERT }

    // Verification statuses
    enum VerificationStatus { PENDING, APPROVED, REJECTED, EXPIRED, REVOKED }

    // Contributor verification data
    struct ContributorVerification {
        address contributor;
        VerificationLevel level;
        VerificationStatus status;
        uint256 verifiedAt;
        uint256 expiresAt;
        uint256 tokenId; // NFT token ID
        bytes32 verificationHash;
        address verifier;
    }

    // Milestone verification data
    struct MilestoneVerification {
        uint256 milestoneId;
        address contributor;
        string evidenceHash;
        string description;
        string evidenceUrl;
        address verifier;
        VerificationStatus status;
        uint256 confidenceScore; // 0-1000
        uint256 verifiedAt;
        bytes32 verificationId;
    }

    // Challenge data for anti-fraud
    struct VerificationChallenge {
        bytes32 challengeId;
        address contributor;
        string challengeType;
        bytes challengeData;
        bytes32 solutionHash;
        uint256 expiresAt;
        bool completed;
    }

    // Storage
    mapping(address => ContributorVerification) public contributorVerifications;
    mapping(bytes32 => MilestoneVerification) public milestoneVerifications;
    mapping(bytes32 => VerificationChallenge) public verificationChallenges;

    // Active verifications
    bytes32[] public activeMilestoneVerifications;
    bytes32[] public pendingChallenges;

    // Events
    event ContributorVerified(
        address indexed contributor,
        VerificationLevel level,
        uint256 tokenId,
        address verifier
    );

    event MilestoneVerified(
        bytes32 indexed verificationId,
        uint256 indexed milestoneId,
        address indexed contributor,
        VerificationStatus status,
        uint256 confidenceScore
    );

    event ChallengeCreated(
        bytes32 indexed challengeId,
        address indexed contributor,
        string challengeType
    );

    event ChallengeCompleted(
        bytes32 indexed challengeId,
        address indexed contributor,
        bool successful
    );

    constructor(
        address _campaignAddress,
        address _verificationFactory,
        address _verificationNFT
    ) Ownable(msg.sender) {
        CAMPAIGN_ADDRESS = _campaignAddress;
        VERIFICATION_FACTORY = _verificationFactory;
        VERIFICATION_NFT = _verificationNFT;
    }

    /**
     * @dev Request contributor verification
     */
    function requestContributorVerification(
        address _contributor,
        VerificationLevel _level,
        string memory _verificationData
    ) external returns (bytes32) {
        require(msg.sender == CAMPAIGN_ADDRESS || msg.sender == _contributor, "Unauthorized");
        require(contributorVerifications[_contributor].status != VerificationStatus.APPROVED, "Already verified");
        require(uint256(_level) > 0, "Invalid verification level");

        // Generate verification challenge
        bytes32 challengeId = keccak256(abi.encodePacked(
            _contributor,
            _level,
            block.timestamp,
            block.prevrandao
        ));

        bytes32 solutionHash = keccak256(abi.encodePacked(_verificationData));

        verificationChallenges[challengeId] = VerificationChallenge({
            challengeId: challengeId,
            contributor: _contributor,
            challengeType: "contributor_verification",
            challengeData: bytes(_verificationData),
            solutionHash: solutionHash,
            expiresAt: block.timestamp + 7 days,
            completed: false
        });

        pendingChallenges.push(challengeId);

        emit ChallengeCreated(challengeId, _contributor, "contributor_verification");

        return challengeId;
    }

    /**
     * @dev Verify contributor (only verified contributors can do this)
     */
    function verifyContributor(
        address _contributor,
        bytes32 _challengeId,
        string memory _solution,
        VerificationLevel _level
    ) external {
        // Only approved verifiers from factory can verify
        (,,,,,bool isVerifier) = IVerificationFactory(VERIFICATION_FACTORY).getVerifierDetails(msg.sender);
        require(isVerifier, "Not an approved verifier");

        VerificationChallenge storage challenge = verificationChallenges[_challengeId];
        require(challenge.contributor == _contributor, "Challenge mismatch");
        require(!challenge.completed, "Challenge already completed");
        require(block.timestamp <= challenge.expiresAt, "Challenge expired");
        require(keccak256(abi.encodePacked(_solution)) == challenge.solutionHash, "Invalid solution");

        challenge.completed = true;

        // Mint verification NFT
        uint256 tokenId = IVerificationNFT(VERIFICATION_NFT).mintVerificationNFT(
            _contributor,
            CAMPAIGN_ADDRESS,
            uint8(_level),
            _solution
        );

        // Create verification record
        contributorVerifications[_contributor] = ContributorVerification({
            contributor: _contributor,
            level: _level,
            status: VerificationStatus.APPROVED,
            verifiedAt: block.timestamp,
            expiresAt: block.timestamp + 365 days, // Valid for 1 year
            tokenId: tokenId,
            verificationHash: keccak256(abi.encodePacked(_solution)),
            verifier: msg.sender
        });

        // Update verifier reputation
        IVerificationFactory(VERIFICATION_FACTORY).updateVerifierReputation(msg.sender, true, 800);

        // Remove challenge from pending
        _removePendingChallenge(_challengeId);

        emit ContributorVerified(_contributor, _level, tokenId, msg.sender);
    }

    /**
     * @dev Request milestone verification
     */
    function requestMilestoneVerification(
        uint256 _milestoneId,
        address _contributor,
        string memory _evidenceHash,
        string memory _description,
        string memory _evidenceUrl
    ) external returns (bytes32) {
        require(msg.sender == CAMPAIGN_ADDRESS, "Only campaign can request milestone verification");
        require(contributorVerifications[_contributor].status == VerificationStatus.APPROVED, "Contributor not verified");

        bytes32 verificationId = keccak256(abi.encodePacked(
            _milestoneId,
            _contributor,
            _evidenceHash,
            block.timestamp
        ));

        require(milestoneVerifications[verificationId].verifiedAt == 0, "Already verified");

        milestoneVerifications[verificationId] = MilestoneVerification({
            milestoneId: _milestoneId,
            contributor: _contributor,
            evidenceHash: _evidenceHash,
            description: _description,
            evidenceUrl: _evidenceUrl,
            verifier: address(0),
            status: VerificationStatus.PENDING,
            confidenceScore: 0,
            verifiedAt: 0,
            verificationId: verificationId
        });

        activeMilestoneVerifications.push(verificationId);

        return verificationId;
    }

    /**
     * @dev Verify milestone completion
     */
    function verifyMilestone(
        bytes32 _verificationId,
        VerificationStatus _status,
        uint256 _confidenceScore,
        address _verifier
    ) external {
        // Only approved verifiers can verify milestones
        (,,,,,bool isVerifier) = IVerificationFactory(VERIFICATION_FACTORY).getVerifierDetails(msg.sender);
        require(isVerifier, "Not an approved verifier");

        MilestoneVerification storage verification = milestoneVerifications[_verificationId];
        require(verification.verifiedAt == 0, "Already verified");
        require(verification.status == VerificationStatus.PENDING, "Not pending verification");

        verification.verifier = _verifier;
        verification.status = _status;
        verification.confidenceScore = _confidenceScore;
        verification.verifiedAt = block.timestamp;

        // Update verifier reputation based on confidence
        bool successful = _status == VerificationStatus.APPROVED;
        IVerificationFactory(VERIFICATION_FACTORY).updateVerifierReputation(msg.sender, successful, _confidenceScore);

        // Remove from active verifications
        _removeActiveVerification(_verificationId);

        emit MilestoneVerified(_verificationId, verification.milestoneId, verification.contributor, _status, _confidenceScore);
    }

    /**
     * @dev Get contributor verification status
     */
    function getContributorVerification(address _contributor)
        external
        view
        returns (
            VerificationLevel level,
            VerificationStatus status,
            uint256 verifiedAt,
            uint256 expiresAt,
            uint256 tokenId,
            bool isValid
        )
    {
        ContributorVerification memory verification = contributorVerifications[_contributor];

        bool valid = verification.status == VerificationStatus.APPROVED &&
                    block.timestamp <= verification.expiresAt;

        return (
            verification.level,
            verification.status,
            verification.verifiedAt,
            verification.expiresAt,
            verification.tokenId,
            valid
        );
    }

    /**
     * @dev Get milestone verification details
     */
    function getMilestoneVerification(bytes32 _verificationId)
        external
        view
        returns (
            uint256 milestoneId,
            address contributor,
            string memory evidenceHash,
            string memory description,
            string memory evidenceUrl,
            address verifier,
            VerificationStatus status,
            uint256 confidenceScore,
            uint256 verifiedAt
        )
    {
        MilestoneVerification memory verification = milestoneVerifications[_verificationId];
        return (
            verification.milestoneId,
            verification.contributor,
            verification.evidenceHash,
            verification.description,
            verification.evidenceUrl,
            verification.verifier,
            verification.status,
            verification.confidenceScore,
            verification.verifiedAt
        );
    }

    /**
     * @dev Check if contributor is verified and valid
     */
    function isContributorVerified(address _contributor) external view returns (bool) {
        ContributorVerification memory verification = contributorVerifications[_contributor];
        return verification.status == VerificationStatus.APPROVED &&
               block.timestamp <= verification.expiresAt;
    }

    /**
     * @dev Get pending challenges
     */
    function getPendingChallenges(uint256 _startIndex, uint256 _count)
        external
        view
        returns (bytes32[] memory)
    {
        if (_startIndex >= pendingChallenges.length) {
            return new bytes32[](0);
        }

        uint256 endIndex = _startIndex + _count;
        if (endIndex > pendingChallenges.length) {
            endIndex = pendingChallenges.length;
        }

        uint256 resultLength = endIndex - _startIndex;
        bytes32[] memory result = new bytes32[](resultLength);

        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = pendingChallenges[_startIndex + i];
        }

        return result;
    }

    /**
     * @dev Get active milestone verifications
     */
    function getActiveVerifications(uint256 _startIndex, uint256 _count)
        external
        view
        returns (bytes32[] memory)
    {
        if (_startIndex >= activeMilestoneVerifications.length) {
            return new bytes32[](0);
        }

        uint256 endIndex = _startIndex + _count;
        if (endIndex > activeMilestoneVerifications.length) {
            endIndex = activeMilestoneVerifications.length;
        }

        uint256 resultLength = endIndex - _startIndex;
        bytes32[] memory result = new bytes32[](resultLength);

        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = activeMilestoneVerifications[_startIndex + i];
        }

        return result;
    }

    /**
     * @dev Internal function to remove pending challenge
     */
    function _removePendingChallenge(bytes32 _challengeId) internal {
        for (uint256 i = 0; i < pendingChallenges.length; i++) {
            if (pendingChallenges[i] == _challengeId) {
                pendingChallenges[i] = pendingChallenges[pendingChallenges.length - 1];
                pendingChallenges.pop();
                break;
            }
        }
    }

    /**
     * @dev Internal function to remove active verification
     */
    function _removeActiveVerification(bytes32 _verificationId) internal {
        for (uint256 i = 0; i < activeMilestoneVerifications.length; i++) {
            if (activeMilestoneVerifications[i] == _verificationId) {
                activeMilestoneVerifications[i] = activeMilestoneVerifications[activeMilestoneVerifications.length - 1];
                activeMilestoneVerifications.pop();
                break;
            }
        }
    }
}

// Interface for VerificationFactory
interface IVerificationFactory {
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
        );

    function updateVerifierReputation(
        address _verifier,
        bool _successful,
        uint256 _confidenceScore
    ) external;
}
