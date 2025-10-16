// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AICrowdfundingCampaign
 * @dev Crowdfunding campaign with AI-verified milestones and PYUSD funding
 */
contract AICrowdfundingCampaign is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum MilestoneState { Pending, Submitted, Voting, Approved, Rejected }
    struct Milestone {
        string description;
        uint256 amount;          // PYUSD amount for this milestone
        uint256 deadline;        // Timestamp when milestone should be completed
        MilestoneState state;    // State machine for milestone progress
        uint256 submittedAt;     // When submitted for verification
        uint256 votingEnd;       // End of voting period if AI uncertain
        uint256 yesVotes;        // Weighted yes votes (by contribution amount)
        uint256 noVotes;         // Weighted no votes (by contribution amount)
        string aiReviewHash;     // IPFS hash of submission/evidence
        bool fundsReleased;      // Whether funds have been released
    }

    struct CampaignInfo {
        string title;
        string description;
        uint256 totalGoal;       // Total PYUSD needed
        uint256 totalRaised;     // Total PYUSD raised
        uint256 startTime;
        uint256 endTime;
        address creator;
        bool isActive;
        uint256 milestoneCount;
    }

    CampaignInfo public campaignInfo;
    mapping(uint256 => Milestone) public milestones;
    mapping(address => uint256) public contributions;
    mapping(uint256 => mapping(address => bool)) public hasVoted; // milestoneId => voter => hasVoted
    address[] public backers;
    mapping(address => bool) public isBacker;
    IERC20 public pyusd; // PYUSD token contract

    uint256 public votingPeriod = 3 days; // Configurable voting period for uncertain milestones

    event ContributionMade(address indexed contributor, uint256 amount);
    event MilestoneSubmitted(uint256 indexed milestoneId, string reviewHash);
    event MilestoneVerified(uint256 indexed milestoneId, uint8 verdict);
    event VoteCast(address indexed voter, uint256 indexed milestoneId, bool support);
    event VotingFinalized(uint256 indexed milestoneId, bool approved);
    event FundsReleased(uint256 indexed milestoneId, uint256 amount);
    event RefundClaimed(address indexed backer, uint256 amount);

    constructor(
        string memory _title,
        string memory _description,
        uint256 _totalGoal,
        uint256 _duration,
        address _pyusd,
        address _creator,
        uint256[] memory _milestoneAmounts
    ) Ownable(_creator) {
        require(_totalGoal > 0, "Goal must be > 0");
        require(_duration > 0, "Duration must be > 0");
        require(_pyusd != address(0), "Zero address");

        campaignInfo = CampaignInfo({
            title: _title,
            description: _description,
            totalGoal: _totalGoal,
            totalRaised: 0,
            startTime: block.timestamp,
            endTime: block.timestamp + _duration,
            creator: _creator,
            isActive: true,
            milestoneCount: 0
        });

        pyusd = IERC20(_pyusd);

        // Initialize milestones from factory
        uint256 sum = 0;
        for (uint256 i = 0; i < _milestoneAmounts.length; i++) {
            require(_milestoneAmounts[i] > 0, "Milestone must > 0");
            milestones[i] = Milestone({
                description: "",
                amount: _milestoneAmounts[i],
                deadline: 0,
                state: MilestoneState.Pending,
                submittedAt: 0,
                votingEnd: 0,
                yesVotes: 0,
                noVotes: 0,
                aiReviewHash: "",
                fundsReleased: false
            });
            sum += _milestoneAmounts[i];
        }
        require(sum <= _totalGoal, "Milestones exceed goal");
        campaignInfo.milestoneCount = _milestoneAmounts.length;
    }

    /**
     * @dev Contribute PYUSD to the campaign
     */
    function contribute(uint256 _amount) external nonReentrant {
        require(block.timestamp <= campaignInfo.endTime, "Campaign ended");
        require(campaignInfo.isActive, "Campaign not active");
        require(_amount > 0, "Amount must be > 0");

        pyusd.safeTransferFrom(msg.sender, address(this), _amount);

        if (!isBacker[msg.sender]) {
            isBacker[msg.sender] = true;
            backers.push(msg.sender);
        }
        contributions[msg.sender] += _amount;
        campaignInfo.totalRaised += _amount;

        // Check if goal reached after contribution
        if (campaignInfo.totalRaised >= campaignInfo.totalGoal) {
            campaignInfo.isActive = false;
        }

        emit ContributionMade(msg.sender, _amount);
    }

    /**
     * @dev Add a milestone to the campaign (only creator)
     */
    function addMilestone(
        string memory _description,
        uint256 _amount,
        uint256 _deadline
    ) external onlyOwner {
        require(_amount > 0, "Amount must be > 0");
        require(_deadline > block.timestamp, "Deadline must be in future");

        uint256 milestoneId = campaignInfo.milestoneCount;
        milestones[milestoneId] = Milestone({
            description: _description,
            amount: _amount,
            deadline: _deadline,
            state: MilestoneState.Pending,
            submittedAt: 0,
            votingEnd: 0,
            yesVotes: 0,
            noVotes: 0,
            aiReviewHash: "",
            fundsReleased: false
        });

        campaignInfo.milestoneCount++;
    }

    /**
     * @dev Submit milestone completion for AI review
     */
    function submitMilestone(uint256 _milestoneId, string memory _reviewHash) external onlyOwner {
        require(_milestoneId < campaignInfo.milestoneCount, "Invalid milestone");
        Milestone storage m = milestones[_milestoneId];
        require(m.state == MilestoneState.Pending ||
                m.state == MilestoneState.Rejected, "Invalid state for submission");

        m.aiReviewHash = _reviewHash;
        m.state = MilestoneState.Submitted;
        m.submittedAt = block.timestamp;

        emit MilestoneSubmitted(_milestoneId, _reviewHash);
    }

    /**
     * @dev AI handler calls this to deliver verdict (verdict: 0=Rejected, 1=Approved, 2=Uncertain)
     */
    function onAiVerdict(uint256 _milestoneId, uint8 _verdict) external {
        require(msg.sender == owner() || isAiHandler(msg.sender), "Only AI or creator");
        require(_milestoneId < campaignInfo.milestoneCount, "Invalid milestone");

        Milestone storage m = milestones[_milestoneId];
        require(m.state == MilestoneState.Submitted, "Milestone not submitted");

        emit MilestoneVerified(_milestoneId, _verdict);

        if (_verdict == 1) { // Approved
            _payoutMilestone(_milestoneId);
        } else if (_verdict == 0) { // Rejected
            m.state = MilestoneState.Rejected;
        } else if (_verdict == 2) { // Uncertain -> start voting
            m.state = MilestoneState.Voting;
            m.votingEnd = block.timestamp + votingPeriod;
        } else {
            revert("Invalid verdict");
        }
    }

    /**
     * @dev Backers vote on milestones when AI verdict is uncertain
     */
    function voteOnMilestone(uint256 _milestoneId, bool _support) external {
        require(isBacker[msg.sender], "Only backer");
        require(_milestoneId < campaignInfo.milestoneCount, "Invalid milestone");

        Milestone storage m = milestones[_milestoneId];
        require(m.state == MilestoneState.Voting, "Not in voting");
        require(block.timestamp <= m.votingEnd, "Voting ended");
        require(!hasVoted[_milestoneId][msg.sender], "Already voted");

        hasVoted[_milestoneId][msg.sender] = true;
        uint256 voteWeight = contributions[msg.sender];

        if (_support) {
            m.yesVotes += voteWeight;
        } else {
            m.noVotes += voteWeight;
        }

        emit VoteCast(msg.sender, _milestoneId, _support);
    }

    /**
     * @dev Finalize voting once voting period ends
     */
    function finalizeVoting(uint256 _milestoneId) external nonReentrant {
        require(_milestoneId < campaignInfo.milestoneCount, "Invalid milestone");
        Milestone storage m = milestones[_milestoneId];
        require(m.state == MilestoneState.Voting, "Not in voting");
        require(block.timestamp > m.votingEnd, "Voting still active");

        bool approved = m.yesVotes > m.noVotes;
        if (approved) {
            _payoutMilestone(_milestoneId);
        } else {
            m.state = MilestoneState.Rejected;
        }

        emit VotingFinalized(_milestoneId, approved);
    }

    /**
     * @dev Claim refund if funding goal not met by deadline
     */
    function claimRefund() external nonReentrant {
        require(block.timestamp > campaignInfo.endTime, "Deadline not passed");
        require(campaignInfo.totalRaised < campaignInfo.totalGoal, "Goal was met");
        require(contributions[msg.sender] > 0, "No contribution");

        uint256 refundAmount = contributions[msg.sender];
        contributions[msg.sender] = 0;

        pyusd.safeTransfer(msg.sender, refundAmount);
        emit RefundClaimed(msg.sender, refundAmount);
    }

    /**
     * @dev Internal payout: transfers milestone amount to creator and marks Approved
     */
    function _payoutMilestone(uint256 _milestoneId) internal {
        Milestone storage m = milestones[_milestoneId];
        require(m.state == MilestoneState.Submitted ||
                m.state == MilestoneState.Voting, "Invalid state for payout");
        require(pyusd.balanceOf(address(this)) >= m.amount, "Insufficient funds in contract");

        m.state = MilestoneState.Approved;
        m.votingEnd = 0; // Reset voting end to indicate completed
        m.fundsReleased = true;

        campaignInfo.totalRaised -= m.amount;
        pyusd.safeTransfer(owner(), m.amount);
        emit FundsReleased(_milestoneId, m.amount);
    }

    /**
     * @dev Check if address is authorized AI handler (to be implemented based on your AI setup)
     */
    function isAiHandler(address /* _addr */) internal pure returns (bool) {
        // For hackathon: allow any address, in production implement proper access control
        return true;
    }

    /**
     * @dev Get campaign summary
     */
    function getCampaignSummary() external view returns (
        string memory title,
        string memory description,
        uint256 totalGoal,
        uint256 totalRaised,
        uint256 startTime,
        uint256 endTime,
        address creator,
        bool isActive,
        uint256 milestoneCount
    ) {
        CampaignInfo memory info = campaignInfo;
        return (
            info.title,
            info.description,
            info.totalGoal,
            info.totalRaised,
            info.startTime,
            info.endTime,
            info.creator,
            info.isActive,
            info.milestoneCount
        );
    }

    /**
     * @dev Get backers count
     */
    function backersCount() external view returns (uint256) {
        return backers.length;
    }
}
