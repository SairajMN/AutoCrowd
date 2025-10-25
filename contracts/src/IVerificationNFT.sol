// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IVerificationNFT
 * @dev Interface for VerificationNFT contract
 */
interface IVerificationNFT {
    function mintVerificationNFT(
        address _contributor,
        address _campaign,
        uint8 _level,
        string memory _verificationData
    ) external returns (uint256);

    function mintMilestoneNFT(
        address _contributor,
        address _campaign,
        uint256 _milestoneId,
        string memory _metadataURI
    ) external returns (uint256);

    function isVerified(address _contributor, address _campaign) external view returns (bool);

    function getVerificationLevel(address _contributor, address _campaign) external view returns (uint8);

    function revokeVerification(address _contributor, address _campaign) external;

    function extendVerification(address _contributor, address _campaign, uint256 _additionalDays) external;
}
