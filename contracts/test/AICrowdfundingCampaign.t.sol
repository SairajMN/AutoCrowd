// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AICrowdfundingCampaign} from "../src/AICrowdfundingCampaign.sol";

contract MockERC20 {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    uint256 public totalSupply;
    string public name;
    string public symbol;
    uint8 public decimals;

    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }

    function mint(address to, uint256 amount) public {
        balanceOf[to] += amount;
        totalSupply += amount;
    }

    function transfer(address to, uint256 amount) public returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function approve(address spender, uint256 amount) public returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        return true;
    }
}

contract AICrowdfundingCampaignTest is Test {
    AICrowdfundingCampaign campaign;
    MockERC20 pyusd;
    address creator = address(1);
    address backer1 = address(2);
    address backer2 = address(3);
    address aiHandler = address(4);
    uint256[] milestoneAmounts;

    function setUp() public {
        pyusd = new MockERC20("PYUSD", "PYUSD", 18);

        // Set up milestone amounts: 100, 200, 300
        milestoneAmounts = new uint256[](3);
        milestoneAmounts[0] = 100;
        milestoneAmounts[1] = 200;
        milestoneAmounts[2] = 300;

        vm.prank(creator);
        campaign = new AICrowdfundingCampaign(
            "Test Campaign",
            "Test Description",
            600, // total goal: 600 PYUSD
            30 days, // 30 day duration
            address(pyusd),
            creator,
            milestoneAmounts
        );
    }

    function test_Deployment() public view {
        (
            string memory title,
            string memory description,
            uint256 totalGoal,
            uint256 totalRaised,
            ,
            ,
            address campaignCreator,
            bool isActive,
            uint256 milestoneCount
        ) = campaign.getCampaignSummary();

        assertEq(title, "Test Campaign");
        assertEq(description, "Test Description");
        assertEq(totalGoal, 600);
        assertEq(totalRaised, 0);
        assertEq(campaignCreator, creator);
        assertEq(isActive, true);
        assertEq(milestoneCount, 3);
    }

    function test_Contribute() public {
        uint256 amount = 100;

        // Mint PYUSD to backer
        pyusd.mint(backer1, amount);

        vm.startPrank(backer1);
        pyusd.approve(address(campaign), amount);
        campaign.contribute(amount);
        vm.stopPrank();

        assertEq(campaign.contributions(backer1), amount);
        assertEq(campaign.isBacker(backer1), true);
        assertEq(campaign.backersCount(), 1);

        (, , , uint256 totalRaised, , , , , ) = campaign.getCampaignSummary();
        assertEq(totalRaised, amount);
    }

    function test_MultipleContributions() public {
        // First backer contributes 100
        pyusd.mint(backer1, 100);
        vm.startPrank(backer1);
        pyusd.approve(address(campaign), 100);
        campaign.contribute(100);
        vm.stopPrank();

        // Second backer contributes 200
        pyusd.mint(backer2, 200);
        vm.startPrank(backer2);
        pyusd.approve(address(campaign), 200);
        campaign.contribute(200);
        vm.stopPrank();

        assertEq(campaign.contributions(backer1), 100);
        assertEq(campaign.contributions(backer2), 200);
        assertEq(campaign.backersCount(), 2);

        (, , , uint256 totalRaised, , , , , ) = campaign.getCampaignSummary();
        assertEq(totalRaised, 300);
    }

    function test_AddMilestone() public {
        vm.prank(creator);
        campaign.addMilestone("New milestone", 100, block.timestamp + 60 days);

        (, , , , , , , , uint256 milestoneCount) = campaign.getCampaignSummary();
        assertEq(milestoneCount, 4);

        (string memory description, uint256 amount, , , , , , , , bool fundsReleased) =
            campaign.milestones(3);
        assertEq(description, "New milestone");
        assertEq(amount, 100);
        assertEq(fundsReleased, false);
    }

    function test_SubmitMilestone() public {
        string memory reviewHash = "QmYwAPJzv5CZsnAzt7HZA8cEGFcptaNNcBh951dTkVJpho";

        vm.prank(creator);
        campaign.submitMilestone(0, reviewHash);

        (, , , AICrowdfundingCampaign.MilestoneState state, , , , , string memory aiReviewHash, ) =
            campaign.milestones(0);
        assertEq(uint(state), uint(AICrowdfundingCampaign.MilestoneState.Submitted));
        assertEq(aiReviewHash, reviewHash);
    }

    function test_OnAIVerdictApprove() public {
        // Contribute first to have funds available
        pyusd.mint(backer1, 600);
        vm.startPrank(backer1);
        pyusd.approve(address(campaign), 600);
        campaign.contribute(600);
        vm.stopPrank();

        // Move past deadline to enable fund withdrawals
        vm.warp(block.timestamp + 31 days);

        // Submit milestone
        vm.prank(creator);
        campaign.submitMilestone(0, "test_hash");

        // AI approves milestone
        vm.prank(creator); // Creator can also trigger AI verdict for testing
        campaign.onAiVerdict(0, 1); // verdict = 1 (approved)

        (, , , AICrowdfundingCampaign.MilestoneState state, , , , , , bool fundsReleased) =
            campaign.milestones(0);
        assertEq(uint(state), uint(AICrowdfundingCampaign.MilestoneState.Approved));
        assertEq(fundsReleased, true);

        // Check that funds were transferred to creator
        assertEq(pyusd.balanceOf(creator), 100);
    }

    function test_VoteOnMilestone() public {
        // Contribute with multiple backers
        pyusd.mint(backer1, 100);
        pyusd.mint(backer2, 200);

        vm.startPrank(backer1);
        pyusd.approve(address(campaign), 100);
        campaign.contribute(100);
        vm.stopPrank();

        vm.startPrank(backer2);
        pyusd.approve(address(campaign), 200);
        campaign.contribute(200);
        vm.stopPrank();

        // Submit milestone
        vm.prank(creator);
        campaign.submitMilestone(0, "test_hash");

        // AI says uncertain
        vm.prank(creator);
        campaign.onAiVerdict(0, 2); // verdict = 2 (uncertain)

        // Start voting (move time forward past voting period start would be needed in real scenario)
        vm.warp(block.timestamp + campaign.votingPeriod() + 1);
        vm.prank(creator);
        campaign.finalizeVoting(0);

        (, , , AICrowdfundingCampaign.MilestoneState state, , , , , , ) =
            campaign.milestones(0);
        // Should be rejected since no one voted
        assertEq(uint(state), uint(AICrowdfundingCampaign.MilestoneState.Rejected));
    }

    function test_ClaimRefund() public {
        // Contribute funds
        pyusd.mint(backer1, 100);
        vm.startPrank(backer1);
        pyusd.approve(address(campaign), 100);
        campaign.contribute(100);
        vm.stopPrank();

        // Fast forward past campaign end without reaching goal
        vm.warp(block.timestamp + 31 days);

        vm.prank(backer1);
        campaign.claimRefund();

        // Check that backer got their money back and contribution is reset
        assertEq(pyusd.balanceOf(backer1), 100);
        assertEq(campaign.contributions(backer1), 0);
    }

    function test_RevertIf_ContributeAfterDeadline() public {
        pyusd.mint(backer1, 100);

        // Move past deadline
        vm.warp(block.timestamp + 31 days);

        vm.startPrank(backer1);
        pyusd.approve(address(campaign), 100);
        vm.expectRevert();
        campaign.contribute(100);
        vm.stopPrank();
    }

    function test_RevertIf_UnauthorizedSubmitMilestone() public {
        vm.expectRevert(); // Ownable error
        vm.prank(backer1);
        campaign.submitMilestone(0, "test_hash");
    }
}
