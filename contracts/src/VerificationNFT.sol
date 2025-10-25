// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {ERC721Burnable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VerificationNFT
 * @dev NFT representing contributor verification status
 * Different from CampaignMasterNFT which is for creator KYC
 */
contract VerificationNFT is ERC721, ERC721URIStorage, ERC721Burnable, Ownable {
    uint256 private _nextTokenId;

    // Verification types
    enum VerificationType { CONTRIBUTOR, MILESTONE }

    struct VerificationDetails {
        address contributor;
        address campaign;
        VerificationType verificationType;
        uint8 level; // 1-4 corresponding to VerificationLevel enum
        uint256 verifiedAt;
        uint256 expiresAt;
        string verificationData;
        bool isActive;
    }

    mapping(uint256 => VerificationDetails) public tokenDetails;
    mapping(address => mapping(address => uint256)) public contributorCampaignToken; // contributor => campaign => tokenId
    mapping(address => uint256[]) public contributorTokens;

    address public verificationFactory;

    event VerificationNFTMinted(
        address indexed contributor,
        address indexed campaign,
        uint256 indexed tokenId,
        VerificationType verificationType,
        uint8 level
    );

    event VerificationNFTUpdated(
        uint256 indexed tokenId,
        bool isActive,
        uint256 newExpiry
    );

    constructor(address _verificationFactory)
        ERC721("AutoCrowd Contributor Verification", "ACVNFT")
        Ownable(msg.sender)
    {
        verificationFactory = _verificationFactory;
    }

    /**
     * @dev Mint verification NFT to contributor (only VerificationFactory)
     */
    function mintVerificationNFT(
        address _contributor,
        address _campaign,
        uint8 _level,
        string memory _verificationData
    ) external returns (uint256) {
        require(msg.sender == verificationFactory, "Only VerificationFactory can mint");
        require(_contributor != address(0), "Invalid contributor address");
        require(_campaign != address(0), "Invalid campaign address");
        require(_level >= 1 && _level <= 4, "Invalid verification level");

        uint256 tokenId = _nextTokenId++;

        _mint(_contributor, tokenId);
        _setTokenURI(tokenId, _generateTokenURI(_contributor, _campaign, _level, _verificationData));

        // Store verification details
        tokenDetails[tokenId] = VerificationDetails({
            contributor: _contributor,
            campaign: _campaign,
            verificationType: VerificationType.CONTRIBUTOR,
            level: _level,
            verifiedAt: block.timestamp,
            expiresAt: block.timestamp + 365 days, // Valid for 1 year
            verificationData: _verificationData,
            isActive: true
        });

        // Update mappings
        contributorCampaignToken[_contributor][_campaign] = tokenId;
        contributorTokens[_contributor].push(tokenId);

        emit VerificationNFTMinted(_contributor, _campaign, tokenId, VerificationType.CONTRIBUTOR, _level);

        return tokenId;
    }

    /**
     * @dev Mint milestone verification NFT (special achievement NFT)
     */
    function mintMilestoneNFT(
        address _contributor,
        address _campaign,
        uint256 _milestoneId,
        string memory _metadataURI
    ) external returns (uint256) {
        require(msg.sender == verificationFactory, "Only VerificationFactory can mint");

        uint256 tokenId = _nextTokenId++;

        _mint(_contributor, tokenId);
        _setTokenURI(tokenId, _metadataURI);

        // Store milestone verification details
        tokenDetails[tokenId] = VerificationDetails({
            contributor: _contributor,
            campaign: _campaign,
            verificationType: VerificationType.MILESTONE,
            level: 1, // Milestone NFTs have level 1
            verifiedAt: block.timestamp,
            expiresAt: 0, // Milestone NFTs don't expire
            verificationData: string(abi.encodePacked("milestone_", _toString(_milestoneId))),
            isActive: true
        });

        contributorTokens[_contributor].push(tokenId);

        emit VerificationNFTMinted(_contributor, _campaign, tokenId, VerificationType.MILESTONE, 1);

        return tokenId;
    }

    /**
     * @dev Update verification NFT status (activate/deactivate or extend expiry)
     */
    function updateVerificationNFT(
        uint256 _tokenId,
        bool _isActive,
        uint256 _newExpiry
    ) external {
        require(msg.sender == verificationFactory || msg.sender == owner(), "Unauthorized");
        require(_ownerOf(_tokenId) != address(0), "Token does not exist");

        VerificationDetails storage details = tokenDetails[_tokenId];
        details.isActive = _isActive;

        if (_newExpiry > 0) {
            details.expiresAt = _newExpiry;
        }

        emit VerificationNFTUpdated(_tokenId, _isActive, _newExpiry);
    }

    /**
     * @dev Revoke verification (deactivate NFT)
     */
    function revokeVerification(address _contributor, address _campaign) external {
        require(msg.sender == verificationFactory || msg.sender == owner(), "Unauthorized");

        uint256 tokenId = contributorCampaignToken[_contributor][_campaign];
        require(tokenId != 0, "No verification NFT found");

        tokenDetails[tokenId].isActive = false;

        emit VerificationNFTUpdated(tokenId, false, tokenDetails[tokenId].expiresAt);
    }

    /**
     * @dev Extend verification expiry
     */
    function extendVerification(address _contributor, address _campaign, uint256 _additionalDays) external {
        require(msg.sender == verificationFactory || msg.sender == owner(), "Unauthorized");

        uint256 tokenId = contributorCampaignToken[_contributor][_campaign];
        require(tokenId != 0, "No verification NFT found");

        VerificationDetails storage details = tokenDetails[tokenId];
        details.expiresAt += _additionalDays * 1 days;

        emit VerificationNFTUpdated(tokenId, details.isActive, details.expiresAt);
    }

    /**
     * @dev Check if contributor is verified for a campaign
     */
    function isVerified(address _contributor, address _campaign) external view returns (bool) {
        uint256 tokenId = contributorCampaignToken[_contributor][_campaign];
        if (tokenId == 0) return false;

        VerificationDetails memory details = tokenDetails[tokenId];
        return details.isActive &&
               details.verificationType == VerificationType.CONTRIBUTOR &&
               (details.expiresAt == 0 || block.timestamp <= details.expiresAt);
    }

    /**
     * @dev Get verification level for contributor in campaign
     */
    function getVerificationLevel(address _contributor, address _campaign) external view returns (uint8) {
        uint256 tokenId = contributorCampaignToken[_contributor][_campaign];
        if (tokenId == 0) return 0;

        return tokenDetails[tokenId].level;
    }

    /**
     * @dev Get verification details for a token
     */
    function getVerificationDetails(uint256 _tokenId)
        external
        view
        returns (
            address contributor,
            address campaign,
            VerificationType verificationType,
            uint8 level,
            uint256 verifiedAt,
            uint256 expiresAt,
            string memory verificationData,
            bool isActive
        )
    {
        require(_ownerOf(_tokenId) != address(0), "Token does not exist");
        VerificationDetails memory details = tokenDetails[_tokenId];
        return (
            details.contributor,
            details.campaign,
            details.verificationType,
            details.level,
            details.verifiedAt,
            details.expiresAt,
            details.verificationData,
            details.isActive
        );
    }

    /**
     * @dev Get all tokens owned by a contributor
     */
    function getContributorTokens(address _contributor) external view returns (uint256[] memory) {
        return contributorTokens[_contributor];
    }

    /**
     * @dev Set verification factory address
     */
    function setVerificationFactory(address _newFactory) external onlyOwner {
        require(_newFactory != address(0), "Invalid factory address");
        verificationFactory = _newFactory;
    }

    /**
     * @dev Generate token URI for verification NFT
     */
    function _generateTokenURI(
        address _contributor,
        address _campaign,
        uint8 _level,
        string memory _verificationData
    ) internal pure returns (string memory) {
        // In production, this would generate a proper metadata URI
        // For now, return a simple JSON-like string
        return string(abi.encodePacked(
            '{"name": "AutoCrowd Contributor Verification", ',
            '"description": "Verification NFT for contributor in campaign", ',
            '"contributor": "', _toString(uint256(uint160(_contributor))), '", ',
            '"campaign": "', _toString(uint256(uint160(_campaign))), '", ',
            '"level": ', _toString(_level), ', ',
            '"verificationData": "', _verificationData, '"}'
        ));
    }

    /**
     * @dev Convert uint256 to string
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

    // Override functions
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721)
        returns (address)
    {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            // Transfer detected - update mappings
            VerificationDetails memory details = tokenDetails[tokenId];

            // Remove from old contributor mappings
            delete contributorCampaignToken[details.contributor][details.campaign];
            _removeFromContributorTokens(details.contributor, tokenId);
        }
        return super._update(to, tokenId, auth);
    }

    /**
     * @dev Internal function to remove token from contributor's token list
     */
    function _removeFromContributorTokens(address _contributor, uint256 _tokenId) internal {
        uint256[] storage tokens = contributorTokens[_contributor];
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == _tokenId) {
                tokens[i] = tokens[tokens.length - 1];
                tokens.pop();
                break;
            }
        }
    }
}
