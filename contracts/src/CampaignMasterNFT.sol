// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CampaignMasterNFT
 * @dev NFT awarded to verified campaign creators containing their verification details
 */
contract CampaignMasterNFT is ERC721, ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    struct VerificationDetails {
        address walletAddress;
        uint256 verifiedAt;
        string kycProvider;
        string verificationLevel;
        string metadataURI;
        bool isActive;
    }

    mapping(uint256 => VerificationDetails) public tokenDetails;
    mapping(address => uint256) public walletToTokenId;
    mapping(address => bool) public hasNFT;

    address public campaignFactory;

    event NFTMinted(
        address indexed recipient,
        uint256 indexed tokenId,
        string kycProvider,
        string verificationLevel
    );

    event NFTUpdated(
        uint256 indexed tokenId,
        string newMetadataURI,
        bool isActive
    );

    constructor(address _campaignFactory)
        ERC721("CampaignMaster", "CMNFT")
        Ownable(msg.sender)
    {
        campaignFactory = _campaignFactory;
    }

    /**
     * @dev Mint NFT to verified campaign creator (only CampaignFactory)
     */
    function mintNFT(
        address _recipient,
        string memory _kycProvider,
        string memory _verificationLevel,
        string memory _metadataURI
    ) external returns (uint256) {
        require(msg.sender == campaignFactory, "Only CampaignFactory can mint");
        require(!hasNFT[_recipient], "Recipient already has NFT");
        require(_recipient != address(0), "Invalid recipient");

        uint256 tokenId = _nextTokenId++;

        _mint(_recipient, tokenId);
        _setTokenURI(tokenId, _metadataURI);

        tokenDetails[tokenId] = VerificationDetails({
            walletAddress: _recipient,
            verifiedAt: block.timestamp,
            kycProvider: _kycProvider,
            verificationLevel: _verificationLevel,
            metadataURI: _metadataURI,
            isActive: true
        });

        walletToTokenId[_recipient] = tokenId;
        hasNFT[_recipient] = true;

        emit NFTMinted(_recipient, tokenId, _kycProvider, _verificationLevel);

        return tokenId;
    }

    /**
     * @dev Update NFT metadata and status (only owner or CampaignFactory)
     */
    function updateNFT(
        uint256 _tokenId,
        string memory _newMetadataURI,
        bool _isActive
    ) external {
        require(msg.sender == campaignFactory || msg.sender == owner(), "Unauthorized");
        require(_ownerOf(_tokenId) != address(0), "Token does not exist");

        tokenDetails[_tokenId].metadataURI = _newMetadataURI;
        tokenDetails[_tokenId].isActive = _isActive;

        if (bytes(_newMetadataURI).length > 0) {
            _setTokenURI(_tokenId, _newMetadataURI);
        }

        emit NFTUpdated(_tokenId, _newMetadataURI, _isActive);
    }

    /**
     * @dev Revoke NFT (burn it) - only in case of verification revocation
     */
    function revokeNFT(address _wallet) external {
        require(msg.sender == campaignFactory || msg.sender == owner(), "Unauthorized");
        require(hasNFT[_wallet], "Wallet does not have NFT");

        uint256 tokenId = walletToTokenId[_wallet];
        require(_ownerOf(tokenId) != address(0), "Token does not exist");

        // Mark as inactive first
        tokenDetails[tokenId].isActive = false;

        // Burn the token
        _burn(tokenId);

        // Clean up mappings
        delete walletToTokenId[_wallet];
        delete hasNFT[_wallet];
        delete tokenDetails[tokenId];
    }

    /**
     * @dev Get verification details for a token
     */
    function getVerificationDetails(uint256 _tokenId)
        external
        view
        returns (
            address walletAddress,
            uint256 verifiedAt,
            string memory kycProvider,
            string memory verificationLevel,
            string memory metadataURI,
            bool isActive
        )
    {
        require(_ownerOf(_tokenId) != address(0), "Token does not exist");
        VerificationDetails memory details = tokenDetails[_tokenId];
        return (
            details.walletAddress,
            details.verifiedAt,
            details.kycProvider,
            details.verificationLevel,
            details.metadataURI,
            details.isActive
        );
    }

    /**
     * @dev Get token ID for a wallet address
     */
    function getTokenId(address _wallet) external view returns (uint256) {
        require(hasNFT[_wallet], "Wallet does not have NFT");
        return walletToTokenId[_wallet];
    }

    /**
     * @dev Check if wallet has active NFT
     */
    function hasActiveNFT(address _wallet) external view returns (bool) {
        if (!hasNFT[_wallet]) return false;
        uint256 tokenId = walletToTokenId[_wallet];
        return tokenDetails[tokenId].isActive;
    }

    /**
     * @dev Update campaign factory address (only owner)
     */
    function setCampaignFactory(address _newFactory) external onlyOwner {
        require(_newFactory != address(0), "Invalid factory address");
        campaignFactory = _newFactory;
    }

    // Override functions required by Solidity
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
            // Transfer detected - clean up old wallet mapping
            delete walletToTokenId[from];
            delete hasNFT[from];
            // Set up new wallet mapping
            walletToTokenId[to] = tokenId;
            hasNFT[to] = true;
        }
        return super._update(to, tokenId, auth);
    }


}
