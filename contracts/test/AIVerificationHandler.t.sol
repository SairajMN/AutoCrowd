// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {AIVerificationHandler} from "../src/AIVerificationHandler.sol";

contract AIVerificationHandlerTest is Test {
    AIVerificationHandler aiHandler;
    address admin = address(1);
    address aiVerifier = address(2);
    address authorizedCampaign = address(3);
    address unauthorizedCampaign = address(4);
    address requester = address(5);

    function setUp() public {
        vm.prank(admin);
        aiHandler = new AIVerificationHandler();

        // Authorize a campaign
        vm.prank(admin);
        aiHandler.authorizeCampaign(authorizedCampaign);

        // Grant AI verifier role
        vm.prank(admin);
        aiHandler.grantAiVerifierRole(aiVerifier);
    }

    function test_Deployment() public view {
        // Admin should have the roles
        assertTrue(aiHandler.hasRole(aiHandler.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(aiHandler.hasRole(aiHandler.AI_VERIFIER_ROLE(), admin));
    }

    function test_AuthorizeCampaign() public {
        vm.prank(admin);
        aiHandler.authorizeCampaign(address(99));

        assertEq(aiHandler.authorizedCampaigns(address(99)), true);
    }

    function test_GrantAiVerifierRole() public {
        vm.prank(admin);
        aiHandler.grantAiVerifierRole(address(99));

        assertTrue(aiHandler.hasRole(aiHandler.AI_VERIFIER_ROLE(), address(99)));
    }

    function test_RequestVerification() public {
        bytes32 requestId = aiHandler.requestVerification(
            authorizedCampaign,
            0, // milestoneId
            "evidence_hash_ipfs"
        );

        assertNotEq(requestId, bytes32(0));

        (
            address requestCampaignAddress,
            uint256 requestMilestoneId,
            address requestRequester,
            uint256 requestTimestamp,
            bool requestIsProcessed,
            bool requestIsApproved,
            string memory requestAiReportHash
        ) = aiHandler.getVerificationRequest(requestId);

        assertEq(requestCampaignAddress, authorizedCampaign);
        assertEq(requestMilestoneId, 0);
        assertEq(requestRequester, address(this)); // msg.sender is this contract in test
        assertEq(requestIsProcessed, false);
        assertEq(requestIsApproved, false);
        assertEq(requestAiReportHash, "evidence_hash_ipfs");
        assertGt(requestTimestamp, 0);
    }

    function test_RevertIf_RequestVerificationUnauthorizedCampaign() public {
        vm.expectRevert("Campaign not authorized");
        aiHandler.requestVerification(
            unauthorizedCampaign, // Not authorized
            0,
            "evidence_hash"
        );
    }

    function test_CompleteVerification() public {
        // First request verification
        bytes32 requestId = aiHandler.requestVerification(
            authorizedCampaign,
            0,
            "evidence_hash"
        );

        // Complete verification as AI verifier
        vm.prank(aiVerifier);
        aiHandler.completeVerification(
            requestId,
            true, // approved
            "ai_report_hash"
        );

        // Check updated request
        (
            address completedCampaignAddress,
            uint256 completedMilestoneId,
            address completedRequestRequester,
            uint256 completedRequestTimestamp,
            bool completedRequestIsProcessed,
            bool completedRequestIsApproved,
            string memory completedRequestAiReportHash
        ) = aiHandler.getVerificationRequest(requestId);

        assertEq(completedRequestIsProcessed, true);
        assertEq(completedRequestIsApproved, true);
        assertEq(completedRequestAiReportHash, "ai_report_hash");
    }

    function test_RevertIf_CompleteVerificationUnauthorized() public {
        // First request verification
        bytes32 requestId = aiHandler.requestVerification(
            authorizedCampaign,
            0,
            "evidence_hash"
        );

        // Try to complete verification as unauthorized user
        vm.expectRevert(); // AccessControl error
        vm.prank(requester);
        aiHandler.completeVerification(
            requestId,
            true,
            "ai_report_hash"
        );
    }

    function test_RevertIf_CompleteVerificationTwice() public {
        // First request verification
        bytes32 requestId = aiHandler.requestVerification(
            authorizedCampaign,
            0,
            "evidence_hash"
        );

        // Complete verification first time
        vm.prank(aiVerifier);
        aiHandler.completeVerification(
            requestId,
            true,
            "ai_report_hash_1"
        );

        // Try to complete again - should fail
        vm.expectRevert("Request already processed");
        vm.prank(aiVerifier);
        aiHandler.completeVerification(
            requestId,
            false,
            "ai_report_hash_2"
        );
    }

    function test_RevertIf_CompleteVerificationInvalidRequest() public {
        // Try to complete verification with non-existent request ID
        vm.expectRevert("Request not found");
        vm.prank(aiVerifier);
        aiHandler.completeVerification(
            bytes32(uint256(999)), // Invalid request ID
            true,
            "ai_report_hash"
        );
    }

    function test_GetPendingRequests() public {
        // Create multiple verification requests
        bytes32 requestId1 = aiHandler.requestVerification(authorizedCampaign, 0, "evidence_0");
        bytes32 requestId2 = aiHandler.requestVerification(authorizedCampaign, 1, "evidence_1");

        // Get pending requests (start from index 0, max 10)
        bytes32[] memory pendingRequests = aiHandler.getPendingRequests(0, 10);

        assertEq(pendingRequests.length, 2); // Should have exactly 2 pending requests

        // Verify the requests exist and are not processed
        for (uint256 i = 0; i < pendingRequests.length; i++) {
            (
                ,
                ,
                ,
                ,
                bool isProcessed,
                ,
            ) = aiHandler.getVerificationRequest(pendingRequests[i]);
            assertEq(isProcessed, false);
        }

        // Complete one request and verify pending requests decrease
        vm.prank(aiVerifier);
        aiHandler.completeVerification(requestId1, true, "ai_report_1");

        bytes32[] memory pendingRequestsAfter = aiHandler.getPendingRequests(0, 10);
        assertEq(pendingRequestsAfter.length, 1); // Should have 1 remaining
        assertEq(pendingRequestsAfter[0], requestId2); // Should be the second request
    }

    function test_MultipleRequestsDifferentMilestones() public {
        bytes32 requestId1 = aiHandler.requestVerification(authorizedCampaign, 0, "evidence_0");
        bytes32 requestId2 = aiHandler.requestVerification(authorizedCampaign, 1, "evidence_1");
        bytes32 requestId3 = aiHandler.requestVerification(authorizedCampaign, 2, "evidence_2");

        assertNotEq(requestId1, requestId2);
        assertNotEq(requestId2, requestId3);
        assertNotEq(requestId1, requestId3);

        // Verify all requests exist
        (
            address campaign1,
            uint256 milestone1,
            ,
            ,
            ,
            ,
        ) = aiHandler.getVerificationRequest(requestId1);
        assertEq(campaign1, authorizedCampaign);
        assertEq(milestone1, 0);

        (
            address campaign2,
            uint256 milestone2,
            ,
            ,
            ,
            ,
        ) = aiHandler.getVerificationRequest(requestId2);
        assertEq(campaign2, authorizedCampaign);
        assertEq(milestone2, 1);

        (
            address campaign3,
            uint256 milestone3,
            ,
            ,
            ,
            ,
        ) = aiHandler.getVerificationRequest(requestId3);
        assertEq(campaign3, authorizedCampaign);
        assertEq(milestone3, 2);
    }

    function test_RequestVerificationAsDifferentRequester() public {
        vm.prank(requester);
        bytes32 requestId = aiHandler.requestVerification(
            authorizedCampaign,
            0,
            "evidence_hash"
        );

        (
            address campaignAddress,
            uint256 milestoneId,
            address requestRequester,
            ,
            ,
            ,
        ) = aiHandler.getVerificationRequest(requestId);

        assertEq(requestRequester, requester);
    }
}
