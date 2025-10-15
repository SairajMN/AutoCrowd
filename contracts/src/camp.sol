// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Campaign is Ownable {
    IERC20 public pyusd;
    uint256 public Goal;
    uint256 public totalFunded;
    address public creator;
    mapping(address => uint256) public contributions;
    uint256 public Count;

    enum MilestoneState { Pending, Submitted, AI_Review, Approved, Rejected, Voting }

    struct Milestone {
        string description;
        string proof;
        MilestoneState state;
        uint256 fundsAllocated;
        uint256 yesVotes;
        uint256 noVotes;
        mapping(address => bool) voted;
    }

    Milestone[] public milestones;
    string public aiVerdict;

    event CampaignFunded(address backer, uint256 amount);
    event MilestoneSubmitted(uint256 indexed milestoneId, string proof);
    event AIVerdictEmitted(uint256 indexed milestoneId, string verdict);
    event MilestoneStateChanged(uint256 indexed milestoneId, MilestoneState state);
    event FundsReleased(uint256 indexed milestoneId, uint256 amount);
    event VotingStarted(uint256 indexed milestoneId);
    event VoteCast(address voter, uint256 indexed milestoneId, bool approve);

    constructor(address _pyusd, uint256 _Goal, address _creator, string[] memory _milestoneDescs, uint256[] memory _allocations) Ownable(_creator) {
        pyusd = IERC20(_pyusd);
        Goal = _Goal;
        creator = _creator;
        require(_milestoneDescs.length == _allocations.length, "Mismatching milestones");
        uint256 totalAlloc = 0;
        for (uint256 i = 0; i < _milestoneDescs.length; i++) {
            milestones.push();
            Milestone storage ms = milestones[milestones.length - 1];
            ms.description = _milestoneDescs[i];
            ms.proof = "";
            ms.state = MilestoneState.Pending;
            ms.fundsAllocated = _allocations[i];
            ms.yesVotes = 0;
            ms.noVotes = 0;
            totalAlloc += _allocations[i];
        }
        require(totalAlloc == _Goal, "Allocations must match goal");
    }

    function contribute(uint256 amount) external {
        require(totalFunded < Goal, "Goal reached");
        pyusd.transferFrom(msg.sender, address(this), amount);
        contributions[msg.sender] += amount;
        if (contributions[msg.sender] == amount) Count++;
        totalFunded += amount;
        emit CampaignFunded(msg.sender, amount);
    }

    function submitMilestoneProof(uint256 milestoneId, string calldata proof) external onlyOwner {
        Milestone storage ms = milestones[milestoneId];
        require(ms.state == MilestoneState.Pending, "Invalid state");
        ms.proof = proof;
        ms.state = MilestoneState.Submitted;
        emit MilestoneSubmitted(milestoneId, proof);
        emit MilestoneStateChanged(milestoneId, MilestoneState.Submitted);
    }

    function setAIVerdict(uint256 milestoneId, string calldata verdict, bool approved) external {
        Milestone storage ms = milestones[milestoneId];
        require(ms.state == MilestoneState.Submitted || ms.state == MilestoneState.AI_Review, "Invalid state");
        aiVerdict = verdict;
        emit AIVerdictEmitted(milestoneId, verdict);
        if (approved) {
            ms.state = MilestoneState.Approved;
            releaseFunds(milestoneId);
        } else {
            ms.state = MilestoneState.Rejected;
            startVoting(milestoneId);
        }
        emit MilestoneStateChanged(milestoneId, ms.state);
    }

    function startVoting(uint256 milestoneId) internal {
        Milestone storage ms = milestones[milestoneId];
        ms.state = MilestoneState.Voting;
        emit VotingStarted(milestoneId);
        emit MilestoneStateChanged(milestoneId, MilestoneState.Voting);
    }

    function voteOnMilestone(uint256 milestoneId, bool approve) external {
        Milestone storage ms = milestones[milestoneId];
        require(ms.state == MilestoneState.Voting, "Not in voting");
        require(contributions[msg.sender] > 0, "Not a backer");
        require(!ms.voted[msg.sender], "Already voted");
        uint256 weight = contributions[msg.sender];
        if (approve) ms.yesVotes += weight;
        else ms.noVotes += weight;
        ms.voted[msg.sender] = true;
        emit VoteCast(msg.sender, milestoneId, approve);
    }

    function finalizeVoting(uint256 milestoneId) external {
        Milestone storage ms = milestones[milestoneId];
        require(ms.state == MilestoneState.Voting, "Not in voting");
        if (ms.yesVotes > ms.noVotes) {
            ms.state = MilestoneState.Approved;
            releaseFunds(milestoneId);
        } else {
            ms.state = MilestoneState.Rejected;
        }
        emit MilestoneStateChanged(milestoneId, ms.state);
    }

    function releaseFunds(uint256 milestoneId) internal {
        Milestone storage ms = milestones[milestoneId];
        pyusd.transfer(creator, ms.fundsAllocated);
        emit FundsReleased(milestoneId, ms.fundsAllocated);
    }
}