//SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Campaign} from "./camp.sol";

contract Createcamp {
    address public pyusd;
    address[] public Campaigns;

    constructor (address _pyusd) {
        pyusd = _pyusd;
    }

    function create(uint Goal, string[] memory milestoneDescs, uint[] memory allocations) external {
        Campaign campaign = new Campaign(pyusd, Goal, msg.sender, milestoneDescs, allocations);
        campaigns.push(address(campaign));
        emit Created(address(campaign), msg.sender, Goal);

    }

    event Created(address indexed campaign, address creator, uint Goal);

    function seeCampaigns() external view returns (address[] memory) {
        returns campaigns;
    }
}