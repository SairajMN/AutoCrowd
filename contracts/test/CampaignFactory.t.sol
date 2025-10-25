// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {CampaignFactory} from "../src/CampaignFactory.sol";

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

contract CampaignFactoryTest is Test {
    CampaignFactory factory;
    MockERC20 pyusd;
    address creator = address(1);
    address mockAiHandler = address(0x42); // Mock AI handler address

    function setUp() public {
        pyusd = new MockERC20("PYUSD", "PYUSD", 18);
        factory = new CampaignFactory(address(pyusd), mockAiHandler);

        // Set up KYC verification for test contract (deployer is KYC oracle)
        factory.setKYCStatus(address(this), true);
        factory.setKYCStatus(creator, true);
        factory.setKYCStatus(address(2), true);
    }

    function test_Deployment() public view {
        assertEq(factory.PYUSD(), address(pyusd));
        // Verify campaign master NFT was deployed
        assertNotEq(address(factory.CAMPAIGN_MASTER_NFT()), address(0));
    }

    function test_CampaignMasterNFTDeployment() public view {
        // Verify campaign master NFT exists
        address campaignMasterNFT = address(factory.CAMPAIGN_MASTER_NFT());
        assertNotEq(campaignMasterNFT, address(0));
    }

    function test_CreateCampaign() public {
        address campaignAddress = factory.createCampaign(
            "Test Campaign",
            "Test Description",
            1000, // goal
            30 days // duration
        );

        assertNotEq(campaignAddress, address(0));

        // Check that campaign was added to campaigns array
        (address addr, address campCreator, string memory title, , bool isActive) = factory.campaigns(0);
        assertEq(addr, campaignAddress);
        assertEq(campCreator, address(this)); // msg.sender when calling factory functions
        assertEq(title, "Test Campaign");
        assertEq(isActive, true);

        // Check that creator has the campaign in their list
        uint256[] memory creatorCampaigns = factory.getCampaignsByCreator(address(this));
        assertEq(creatorCampaigns.length, 1);
        assertEq(creatorCampaigns[0], 0);
    }

    function test_CreateCampaignWithMilestones() public {
        uint256[] memory milestoneAmounts = new uint256[](3);
        milestoneAmounts[0] = 300;
        milestoneAmounts[1] = 400;
        milestoneAmounts[2] = 300;

        address campaignAddress = factory.createCampaign(
            "Milestone Campaign",
            "Campaign with milestones",
            1000, // goal
            30 days, // duration
            milestoneAmounts
        );

        assertNotEq(campaignAddress, address(0));
    }

    function test_GetAllCampaigns() public {
        // Create multiple campaigns
        factory.createCampaign("Campaign 1", "Description 1", 1000, 30 days);
        factory.createCampaign("Campaign 2", "Description 2", 2000, 60 days);

        CampaignFactory.CampaignData[] memory allCampaigns = factory.getAllCampaigns();
        assertEq(allCampaigns.length, 2);

        assertEq(allCampaigns[0].title, "Campaign 1");
        assertEq(allCampaigns[0].campaignAddress, factory.getCampaign(0).campaignAddress);
        assertEq(allCampaigns[0].creator, factory.getCampaign(0).creator);

        assertEq(allCampaigns[1].title, "Campaign 2");
        assertEq(allCampaigns[1].campaignAddress, factory.getCampaign(1).campaignAddress);
        assertEq(allCampaigns[1].creator, factory.getCampaign(1).creator);
    }

    function test_GetCampaignsByCreator() public {
        // Create campaigns as different creators
        vm.prank(creator);
        factory.createCampaign("Creator Campaign 1", "Description 1", 1000, 30 days);

        vm.prank(address(2));
        factory.createCampaign("Creator Campaign 2", "Description 2", 2000, 30 days);

        vm.prank(creator);
        factory.createCampaign("Creator Campaign 3", "Description 3", 3000, 30 days);

        // Check creator's campaigns
        uint256[] memory creatorCampaigns = factory.getCampaignsByCreator(creator);
        assertEq(creatorCampaigns.length, 2);

        // Check total campaigns
        assertEq(factory.getCampaignCount(), 3);
    }

    function test_GetCampaign() public {
        factory.createCampaign("Test Campaign", "Test Description", 1000, 30 days);

        CampaignFactory.CampaignData memory campaignData = factory.getCampaign(0);
        assertEq(campaignData.title, "Test Campaign");
        assertEq(campaignData.creator, address(this));
        assertEq(campaignData.isActive, true);
        assertGt(campaignData.createdAt, 0);
    }

    function test_GetActiveCampaignsCount() public {
        factory.createCampaign("Active Campaign 1", "Description 1", 1000, 30 days);
        factory.createCampaign("Active Campaign 2", "Description 2", 2000, 30 days);

        assertEq(factory.getActiveCampaignsCount(), 2);
    }

    function test_GetCampaignsPaginated() public {
        // Create multiple campaigns
        for (uint256 i = 0; i < 5; i++) {
            factory.createCampaign(
                string(abi.encodePacked("Campaign ", vm.toString(i))),
                "Description",
                1000 + i * 100,
                30 days
            );
        }

        // Get first 3 campaigns
        CampaignFactory.CampaignData[] memory paginated = factory.getCampaignsPaginated(0, 3);
        assertEq(paginated.length, 3);
        assertEq(paginated[0].title, "Campaign 0");
        assertEq(paginated[1].title, "Campaign 1");
        assertEq(paginated[2].title, "Campaign 2");

        // Get remaining 2 campaigns
        paginated = factory.getCampaignsPaginated(3, 3);
        assertEq(paginated.length, 2);
        assertEq(paginated[0].title, "Campaign 3");
        assertEq(paginated[1].title, "Campaign 4");
    }

    function test_RevertIf_InvalidGoal() public {
        vm.expectRevert("Goal must be > 0");
        factory.createCampaign("Test", "Description", 0, 30 days);
    }

    function test_RevertIf_InvalidDuration() public {
        vm.expectRevert("Duration must be at least 1 day");
        factory.createCampaign("Test", "Description", 1000, 0.5 days);
    }

    function test_RevertIf_GetCampaignInvalidIndex() public {
        vm.expectRevert("Invalid campaign index");
        factory.getCampaign(99);
    }

    function test_RevertIf_GetCampaignsPaginatedInvalidOffset() public {
        vm.expectRevert("Offset out of bounds");
        factory.getCampaignsPaginated(1, 5); // offset > campaigns.length should revert
    }

    function test_GetCampaignsPaginated_EmptyArray() public {
        // When offset equals campaigns.length, should return empty array
        CampaignFactory.CampaignData[] memory result = factory.getCampaignsPaginated(0, 5);
        assertEq(result.length, 0);
    }
}
