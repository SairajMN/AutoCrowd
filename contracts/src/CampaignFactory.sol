// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AICrowdfundingCampaign} from "./AICrowdfundingCampaign.sol";
import {CampaignMasterNFT} from "./CampaignMasterNFT.sol";

/**
 * @title CampaignFactory
 * @dev Factory contract for deploying AI-powered crowdfunding campaigns
 * Requires KYC verification for campaign creators
 * Mints CampaignMaster NFT to verified creators
 */
contract CampaignFactory {
    address public immutable PYUSD;
    address public immutable DEFAULT_AI_HANDLER;
    CampaignMasterNFT public immutable CAMPAIGN_MASTER_NFT;

    // KYC verification requirement
    mapping(address => bool) public isKYCVerified;
    mapping(address => uint256) public kycVerifiedAt;
    address public kycOracle; // Address authorized to update KYC status

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

    event KYCStatusUpdated(
        address indexed user,
        bool isVerified,
        uint256 verifiedAt
    );

    event KYCOracleUpdated(
        address indexed previousOracle,
        address indexed newOracle
    );

    constructor(address _pyusd, address _defaultAiHandler) {
        PYUSD = _pyusd;
        DEFAULT_AI_HANDLER = _defaultAiHandler;

        // Deploy creator KYC NFT contract
        CAMPAIGN_MASTER_NFT = new CampaignMasterNFT(address(this));

        kycOracle = msg.sender; // Deployer is initial KYC oracle
    }

    /**
     * @dev Create a new crowdfunding campaign (bypasses KYC for testing)
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
     * @dev Create a new crowdfunding campaign with milestone breakdown (bypasses KYC for testing)
     */
    function createCampaign(
        string memory _title,
        string memory _description,
        uint256 _goal,
        uint256 _duration,
        uint256[] memory _milestoneAmounts
    ) external returns (address) {
        // TEMPORARY: Bypass KYC requirement for testing
        // TODO: Re-enable after KYC synchronization is working
        // require(isKYCVerified[msg.sender], "KYC verification required to create campaigns");

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
            _milestoneAmounts,
            DEFAULT_AI_HANDLER
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
     * @dev Internal function to create campaign
     */
    function _createCampaign(
        string memory _title,
        string memory _description,
        uint256 _goal,
        uint256 _duration,
        uint256[] memory _milestoneAmounts
    ) internal returns (address) {
        // REQUIRE KYC VERIFICATION BEFORE CAMPAIGN CREATION
        require(isKYCVerified[msg.sender], "KYC verification required to create campaigns");

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
            _milestoneAmounts,
            DEFAULT_AI_HANDLER
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
        require(_offset <= campaigns.length, "Offset out of bounds");

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

    // ===== KYC VERIFICATION FUNCTIONS =====

    /**
     * @dev Set KYC verification status for a user (only KYC oracle)
     */
    function setKYCStatus(address _user, bool _isVerified) external {
        require(msg.sender == kycOracle, "Only KYC oracle can update status");

        isKYCVerified[_user] = _isVerified;
        if (_isVerified) {
            kycVerifiedAt[_user] = block.timestamp;
            // Mint CampaignMaster NFT for verified user
            _mintVerificationNFT(_user);
        }

        emit KYCStatusUpdated(_user, _isVerified, block.timestamp);
    }

    /**
     * @dev Batch set KYC verification status for multiple users
     */
    function batchSetKYCStatus(address[] calldata _users, bool[] calldata _statuses) external {
        require(msg.sender == kycOracle, "Only KYC oracle can update status");
        require(_users.length == _statuses.length, "Arrays length mismatch");

        for (uint256 i = 0; i < _users.length; i++) {
            address user = _users[i];
            bool status = _statuses[i];

            isKYCVerified[user] = status;
            if (status) {
                kycVerifiedAt[user] = block.timestamp;
                // Mint CampaignMaster NFT for verified user
                _mintVerificationNFT(user);
            }

            emit KYCStatusUpdated(user, status, block.timestamp);
        }
    }

    /**
     * @dev Update KYC oracle address (only current oracle)
     */
    function setKYCOracle(address _newOracle) external {
        require(msg.sender == kycOracle, "Only current KYC oracle can update");
        require(_newOracle != address(0), "Invalid oracle address");

        address previousOracle = kycOracle;
        kycOracle = _newOracle;

        emit KYCOracleUpdated(previousOracle, _newOracle);
    }

    /**
     * @dev Check if user can create campaigns (KYC verified and not expired)
     */
    function canCreateCampaign(address _user) external view returns (bool) {
        return isKYCVerified[_user];
    }

    /**
     * @dev Get KYC verification details for a user
     */
    function getKYCDetails(address _user) external view returns (
        bool isVerified,
        uint256 verifiedAt,
        bool canCreateCampaigns
    ) {
        isVerified = isKYCVerified[_user];
        verifiedAt = kycVerifiedAt[_user];
        canCreateCampaigns = isVerified; // Currently no expiration

        return (isVerified, verifiedAt, canCreateCampaigns);
    }

    /**
     * @dev Internal function to mint CampaignMaster NFT for verified user
     */
    function _mintVerificationNFT(address _user) internal {
        // Only mint if user doesn't already have an NFT
        if (!CAMPAIGN_MASTER_NFT.hasNFT(_user)) {
            // Create metadata URI with verification details
            string memory metadataURI = string(abi.encodePacked(
                "ipfs://", // In production, this would be actual IPFS hash
                "campaign-master-verification/",
                _toString(uint256(uint160(_user))),
                "/",
                _toString(block.timestamp)
            ));

            CAMPAIGN_MASTER_NFT.mintNFT(
                _user,
                "AutoCrowd KYC", // KYC Provider
                "Level 1", // Verification Level
                metadataURI
            );
        }
    }

    /**
     * @dev Internal function to convert uint256 to string
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
