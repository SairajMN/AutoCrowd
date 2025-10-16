// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title AIVerificationHandler
 * @dev Handles AI verification for campaign milestones with access control
 */
contract AIVerificationHandler is AccessControl {
    bytes32 public constant AI_VERIFIER_ROLE = keccak256("AI_VERIFIER_ROLE");

    struct VerificationRequest {
        address campaignAddress;
        uint256 milestoneId;
        address requester;
        uint256 timestamp;
        bool isProcessed;
        bool isApproved;
        string aiReportHash;
    }

    mapping(bytes32 => VerificationRequest) public verificationRequests;
    mapping(address => bool) public authorizedCampaigns;
    bytes32[] public pendingRequests;

    event VerificationRequested(
        bytes32 indexed requestId,
        address indexed campaign,
        uint256 milestoneId,
        address requester
    );

    event VerificationCompleted(
        bytes32 indexed requestId,
        bool approved,
        string aiReportHash
    );

    event CampaignAuthorized(address indexed campaign);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(AI_VERIFIER_ROLE, msg.sender);
    }

    /**
     * @dev Authorize a campaign to use AI verification
     */
    function authorizeCampaign(address _campaign) external onlyRole(DEFAULT_ADMIN_ROLE) {
        authorizedCampaigns[_campaign] = true;
        emit CampaignAuthorized(_campaign);
    }

    /**
     * @dev Grant AI verifier role
     */
    function grantAiVerifierRole(address _verifier) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(AI_VERIFIER_ROLE, _verifier);
    }

    /**
     * @dev Request AI verification for a milestone (called by campaign)
     */
    function requestVerification(
        address _campaign,
        uint256 _milestoneId,
        string memory _evidenceHash
    ) external returns (bytes32) {
        require(authorizedCampaigns[_campaign], "Campaign not authorized");

        bytes32 requestId;
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, _campaign)
            mstore(add(ptr, 0x20), _milestoneId)
            mstore(add(ptr, 0x40), caller())
            mstore(add(ptr, 0x60), timestamp())
            requestId := keccak256(ptr, 0x80)
        }

        require(verificationRequests[requestId].timestamp == 0, "Request already exists");

        verificationRequests[requestId] = VerificationRequest({
            campaignAddress: _campaign,
            milestoneId: _milestoneId,
            requester: msg.sender,
            timestamp: block.timestamp,
            isProcessed: false,
            isApproved: false,
            aiReportHash: _evidenceHash
        });

        pendingRequests.push(requestId);

        emit VerificationRequested(requestId, _campaign, _milestoneId, msg.sender);

        return requestId;
    }

    /**
     * @dev Complete AI verification (only AI verifiers)
     */
    function completeVerification(
        bytes32 _requestId,
        bool _approved,
        string memory _aiReportHash
    ) external onlyRole(AI_VERIFIER_ROLE) {
        VerificationRequest storage request = verificationRequests[_requestId];
        require(!request.isProcessed, "Request already processed");
        require(request.timestamp > 0, "Request not found");

        request.isProcessed = true;
        request.isApproved = _approved;
        request.aiReportHash = _aiReportHash;

        // Remove from pending requests array
        _removePendingRequest(_requestId);

        emit VerificationCompleted(_requestId, _approved, _aiReportHash);

        // Call back to campaign contract (simplified for hackathon)
        // In production, this would use a more secure callback mechanism
        _notifyCampaign(request.campaignAddress, request.milestoneId, _approved);
    }

    /**
     * @dev Internal function to notify campaign of verification result
     */
    function _notifyCampaign(address _campaign, uint256 _milestoneId, bool _approved) internal {
        // For hackathon: simplified callback
        // In production, use proper interface calls or oracle callbacks
        (bool success, ) = _campaign.call(
            abi.encodeWithSignature("verifyMilestone(uint256,bool)", _milestoneId, _approved)
        );
        require(success, "Campaign notification failed");
    }

    /**
     * @dev Get verification request details
     */
    function getVerificationRequest(bytes32 _requestId)
        external
        view
        returns (
            address campaignAddress,
            uint256 milestoneId,
            address requester,
            uint256 timestamp,
            bool isProcessed,
            bool isApproved,
            string memory aiReportHash
        )
    {
        VerificationRequest memory request = verificationRequests[_requestId];
        return (
            request.campaignAddress,
            request.milestoneId,
            request.requester,
            request.timestamp,
            request.isProcessed,
            request.isApproved,
            request.aiReportHash
        );
    }

    /**
     * @dev Internal function to remove processed request from pending array
     */
    function _removePendingRequest(bytes32 _requestId) internal {
        for (uint256 i = 0; i < pendingRequests.length; i++) {
            if (pendingRequests[i] == _requestId) {
                pendingRequests[i] = pendingRequests[pendingRequests.length - 1];
                pendingRequests.pop();
                break;
            }
        }
    }

    /**
     * @dev Get pending verification requests (for AI service to process)
     */
    function getPendingRequests(uint256 _startIndex, uint256 _count)
        external
        view
        returns (bytes32[] memory)
    {
        if (_startIndex >= pendingRequests.length) {
            return new bytes32[](0);
        }

        uint256 endIndex = _startIndex + _count;
        if (endIndex > pendingRequests.length) {
            endIndex = pendingRequests.length;
        }

        uint256 resultLength = endIndex - _startIndex;
        bytes32[] memory result = new bytes32[](resultLength);

        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = pendingRequests[_startIndex + i];
        }

        return result;
    }
}
