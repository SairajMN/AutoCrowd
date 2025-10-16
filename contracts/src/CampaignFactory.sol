// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AICrowdfundingCampaign} from "./AICrowdfundingCampaign.sol";

/**
 * @title CampaignFactory
 * @dev Factory contract for deploying AI-powered crowdfunding campaigns
 */
contract CampaignFactory {
    address public immutable PYUSD;

    struct CampaignData {
        address campaignAddress;
        address creator;
        string title;
        uint256 createdAt;
        bool isActive;
    }

    CampaignData[] public campaigns;
    mapping(address => uint256[]) public creatorCampaigns;

    event CampaignCreated(
        address indexed campaignAddress,
        address indexed creator,
        string title,
        uint256 goal,
        uint256 duration
    );

    constructor(address _pyusd) {
        PYUSD = _pyusd;
    }

    /**
     * @dev Create a new crowdfunding campaign
     */
    function createCampaign(
        string memory _title,
        string memory _description,
        uint256 _goal,
        uint256 _duration
    ) external returns (address) {
        uint256[] memory emptyMilestones = new uint256[](0);
        return _createCampaign(_title, _description, _goal, _duration, emptyMilestones);
    }

    /**
     * @dev Create a new crowdfunding campaign with milestone breakdown
     */
    function createCampaign(
        string memory _title,
        string memory _description,
        uint256 _goal,
        uint256 _duration,
        uint256[] memory _milestoneAmounts
    ) external returns (address) {
        return _createCampaign(_title, _description, _goal, _duration, _milestoneAmounts);
    }

    /**
     * @dev Internal function to create campaign
     */
    function _createCampaign(
        string memory _title,
        string memory _description,
        uint256 _goal,
        uint256 _duration,
        uint256[] memory _milestoneAmounts
    ) internal returns (address) {
        require(_goal > 0, "Goal must be > 0");
        require(_duration >= 1 days, "Duration must be at least 1 day");
        require(_duration <= 365 days, "Duration cannot exceed 1 year");

        // Validate milestone amounts sum to goal and none are zero
        if (_milestoneAmounts.length > 0) {
            uint256 sum = 0;
            for (uint256 i = 0; i < _milestoneAmounts.length; i++) {
                require(_milestoneAmounts[i] > 0, "Milestone must > 0");
                sum += _milestoneAmounts[i];
            }
            require(sum <= _goal, "Milestones exceed goal");
        }

        AICrowdfundingCampaign newCampaign = new AICrowdfundingCampaign(
            _title,
            _description,
            _goal,
            _duration,
            PYUSD,
            msg.sender,
            _milestoneAmounts
        );

        address campaignAddress = address(newCampaign);

        CampaignData memory campaignData = CampaignData({
            campaignAddress: campaignAddress,
            creator: msg.sender,
            title: _title,
            createdAt: block.timestamp,
            isActive: true
        });

        campaigns.push(campaignData);
        creatorCampaigns[msg.sender].push(campaigns.length - 1);

        emit CampaignCreated(campaignAddress, msg.sender, _title, _goal, _duration);

        return campaignAddress;
    }

    /**
     * @dev Get all campaigns
     */
    function getAllCampaigns() external view returns (CampaignData[] memory) {
        return campaigns;
    }

    /**
     * @dev Get campaigns by creator
     */
    function getCampaignsByCreator(address _creator) external view returns (uint256[] memory) {
        return creatorCampaigns[_creator];
    }

    /**
     * @dev Get campaign by index
     */
    function getCampaign(uint256 _index) external view returns (CampaignData memory) {
        require(_index < campaigns.length, "Invalid campaign index");
        return campaigns[_index];
    }

    /**
     * @dev Get total number of campaigns
     */
    function getCampaignCount() external view returns (uint256) {
        return campaigns.length;
    }

    /**
     * @dev Get active campaigns count
     */
    function getActiveCampaignsCount() external view returns (uint256) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < campaigns.length; i++) {
            if (campaigns[i].isActive) {
                activeCount++;
            }
        }
        return activeCount;
    }

    /**
     * @dev Get paginated campaigns for frontend
     */
    function getCampaignsPaginated(uint256 _offset, uint256 _limit)
        external
        view
        returns (CampaignData[] memory)
    {
        require(_offset < campaigns.length, "Offset out of bounds");

        uint256 actualLimit = _limit;
        if (_offset + _limit > campaigns.length) {
            actualLimit = campaigns.length - _offset;
        }

        CampaignData[] memory result = new CampaignData[](actualLimit);
        for (uint256 i = 0; i < actualLimit; i++) {
            result[i] = campaigns[_offset + i];
        }

        return result;
    }
}
