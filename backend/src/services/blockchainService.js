const { ethers } = require('ethers');
const winston = require('winston');

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [new winston.transports.Console()]
});

class BlockchainService {
    constructor() {
        this.provider = null;
        this.wallet = null;
        this.campaignFactoryContract = null;
        this.aiVerificationHandlerContract = null;
        this.nftContract = null;
        this.chainId = parseInt(process.env.CHAIN_ID) || 11155111;
    }

    async initialize() {
        try {
            logger.info('Initializing Blockchain Service...');

            // Initialize provider
            const rpcUrl = process.env.ETH_RPC_URL;
            if (!rpcUrl) {
                throw new Error('ETH_RPC_URL environment variable is required');
            }

            this.provider = new ethers.JsonRpcProvider(rpcUrl);

            // Initialize wallet
            const privateKey = process.env.PRIVATE_KEY;
            if (privateKey) {
                this.wallet = new ethers.Wallet(privateKey, this.provider);
                logger.info(`Wallet initialized: ${this.wallet.address}`);
            } else {
                logger.warn('PRIVATE_KEY not provided, running in read-only mode');
            }

            // Initialize contracts
            await this.initializeContracts();

            // Verify network
            await this.verifyNetwork();

            logger.info('Blockchain Service initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize Blockchain Service:', error);
            throw error;
        }
    }

    async initializeContracts() {
        const campaignFactoryAddress = process.env.CAMPAIGN_FACTORY_ADDRESS;
        const aiHandlerAddress = process.env.AI_VERIFICATION_HANDLER_ADDRESS;
        const nftContractAddress = process.env.AI_HANDLER_ADDRESS || process.env.CAMPAIGN_MASTER_NFT_ADDRESS;

        if (campaignFactoryAddress) {
            // CampaignFactory ABI (including KYC functions)
            const campaignFactoryABI = [
                "function getAllCampaigns() view returns (tuple(address campaignAddress, address creator, string title, uint256 createdAt, bool isActive)[])",
                "function getCampaignCount() view returns (uint256)",
                "function setKYCStatus(address _user, bool _isVerified) external",
                "function batchSetKYCStatus(address[] calldata _users, bool[] calldata _statuses) external",
                "function isKYCVerified(address) view returns (bool)",
                "function getKYCDetails(address) view returns (bool isVerified, uint256 verifiedAt, bool canCreateCampaigns)",
                "function canCreateCampaign(address) view returns (bool)",
                "event CampaignCreated(address indexed campaignAddress, address indexed creator, string title, uint256 goal, uint256 duration)",
                "event KYCStatusUpdated(address indexed user, bool isVerified, uint256 verifiedAt)"
            ];

            this.campaignFactoryContract = new ethers.Contract(
                campaignFactoryAddress,
                campaignFactoryABI,
                this.wallet || this.provider
            );

            logger.info(`CampaignFactory contract initialized at ${campaignFactoryAddress}`);
        }

        if (aiHandlerAddress) {
            // AIVerificationHandler ABI (simplified)
            const aiHandlerABI = [
                "function requestVerification(address _campaign, uint256 _milestoneId, string memory _evidenceHash) returns (bytes32)",
                "function completeVerification(bytes32 _requestId, bool _approved, string memory _aiReportHash)",
                "function getVerificationRequest(bytes32 _requestId) view returns (tuple(address campaignAddress, uint256 milestoneId, address requester, uint256 timestamp, bool isProcessed, bool isApproved, string aiReportHash))",
                "event VerificationRequested(bytes32 indexed requestId, address indexed campaign, uint256 milestoneId, address requester)",
                "event VerificationCompleted(bytes32 indexed requestId, bool approved, string aiReportHash)"
            ];

            this.aiVerificationHandlerContract = new ethers.Contract(
                aiHandlerAddress,
                aiHandlerABI,
                this.wallet || this.provider
            );

            logger.info(`AI Verification Handler contract initialized at ${aiHandlerAddress}`);
        }

        if (nftContractAddress) {
            // CampaignMasterNFT ABI
            const nftABI = [
                "function mintNFT(address _recipient, string memory _kycProvider, string memory _verificationLevel, string memory _metadataURI) external returns (uint256)",
                "function hasNFT(address _wallet) external view returns (bool)",
                "function getTokenId(address _wallet) external view returns (uint256)",
                "function getVerificationDetails(uint256 _tokenId) external view returns (address walletAddress, uint256 verifiedAt, string memory kycProvider, string memory verificationLevel, string memory metadataURI, bool isActive)",
                "function tokenDetails(uint256 tokenId) external view returns (address walletAddress, uint256 verifiedAt, string memory kycProvider, string memory verificationLevel, string memory metadataURI, bool isActive)",
                "function revokeNFT(address _wallet) external",
                "event NFTMinted(address indexed recipient, uint256 indexed tokenId, string kycProvider, string verificationLevel)"
            ];

            this.nftContract = new ethers.Contract(
                nftContractAddress,
                nftABI,
                this.wallet || this.provider
            );

            logger.info(`NFT contract initialized at ${nftContractAddress}`);
        }
    }

    async verifyNetwork() {
        try {
            const network = await this.provider.getNetwork();
            if (parseInt(network.chainId.toString()) !== this.chainId) {
                throw new Error(`Wrong network. Expected chain ID ${this.chainId}, got ${network.chainId}`);
            }
            logger.info(`Connected to network: ${network.name} (Chain ID: ${network.chainId})`);
        } catch (error) {
            logger.error('Network verification failed:', error);
            throw error;
        }
    }

    /**
     * Get all campaigns from the factory contract
     */
    async getAllCampaigns() {
        if (!this.campaignFactoryContract) {
            throw new Error('CampaignFactory contract not initialized');
        }

        try {
            const campaigns = await this.campaignFactoryContract.getAllCampaigns();
            logger.info(`Retrieved ${campaigns.length} campaigns`);
            return campaigns;
        } catch (error) {
            logger.error('Failed to get campaigns:', error);
            throw error;
        }
    }

    /**
     * Request AI verification for a milestone
     */
    async requestVerification(campaignAddress, milestoneId, evidenceHash) {
        if (!this.aiVerificationHandlerContract || !this.wallet) {
            throw new Error('AI Verification Handler contract or wallet not initialized');
        }

        try {
            logger.info(`Requesting verification for milestone ${milestoneId} in campaign ${campaignAddress}`);

            const tx = await this.aiVerificationHandlerContract.requestVerification(
                campaignAddress,
                milestoneId,
                evidenceHash
            );

            const receipt = await tx.wait();
            logger.info(`Verification requested. Transaction hash: ${tx.hash}`);

            // Extract request ID from events
            const event = receipt.logs.find(log => {
                try {
                    const parsed = this.aiVerificationHandlerContract.interface.parseLog(log);
                    return parsed.name === 'VerificationRequested';
                } catch {
                    return false;
                }
            });

            if (event) {
                const parsed = this.aiVerificationHandlerContract.interface.parseLog(event);
                return parsed.args.requestId;
            }

            throw new Error('Could not extract request ID from transaction receipt');

        } catch (error) {
            logger.error('Failed to request verification:', error);
            throw error;
        }
    }

    /**
     * Complete AI verification with verdict
     */
    async completeVerification(requestId, approved, aiReportHash) {
        if (!this.aiVerificationHandlerContract || !this.wallet) {
            throw new Error('AI Verification Handler contract or wallet not initialized');
        }

        try {
            logger.info(`Completing verification for request ${requestId}. Approved: ${approved}`);

            const tx = await this.aiVerificationHandlerContract.completeVerification(
                requestId,
                approved,
                aiReportHash
            );

            const receipt = await tx.wait();
            logger.info(`Verification completed. Transaction hash: ${tx.hash}`);

            return {
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString()
            };

        } catch (error) {
            logger.error('Failed to complete verification:', error);
            throw error;
        }
    }

    /**
     * Get verification request details
     */
    async getVerificationRequest(requestId) {
        if (!this.aiVerificationHandlerContract) {
            throw new Error('AI Verification Handler contract not initialized');
        }

        try {
            const request = await this.aiVerificationHandlerContract.getVerificationRequest(requestId);
            return request;
        } catch (error) {
            logger.error(`Failed to get verification request ${requestId}:`, error);
            throw error;
        }
    }

    /**
     * Get block number
     */
    async getBlockNumber() {
        try {
            return await this.provider.getBlockNumber();
        } catch (error) {
            logger.error('Failed to get block number:', error);
            throw error;
        }
    }

    /**
     * Get transaction by hash
     */
    async getTransaction(txHash) {
        try {
            return await this.provider.getTransaction(txHash);
        } catch (error) {
            logger.error(`Failed to get transaction ${txHash}:`, error);
            throw error;
        }
    }

    /**
     * Get transaction receipt
     */
    async getTransactionReceipt(txHash) {
        try {
            return await this.provider.getTransactionReceipt(txHash);
        } catch (error) {
            logger.error(`Failed to get transaction receipt ${txHash}:`, error);
            throw error;
        }
    }

    /**
     * Listen for events on contracts
     */
    async listenForEvents() {
        if (!this.campaignFactoryContract) {
            logger.warn('CampaignFactory contract not initialized, skipping event listening');
            return;
        }

        try {
            // Listen for new campaigns
            this.campaignFactoryContract.on('CampaignCreated', (campaignAddress, creator, title, goal, duration) => {
                logger.info('New campaign created:', {
                    campaignAddress,
                    creator,
                    title,
                    goal: goal.toString(),
                    duration: duration.toString()
                });
            });

            // Listen for AI verification events
            if (this.aiVerificationHandlerContract) {
                this.aiVerificationHandlerContract.on('VerificationRequested', (requestId, campaign, milestoneId, requester) => {
                    logger.info('Verification requested:', {
                        requestId,
                        campaign,
                        milestoneId: milestoneId.toString(),
                        requester
                    });
                });

                this.aiVerificationHandlerContract.on('VerificationCompleted', (requestId, approved, aiReportHash) => {
                    logger.info('Verification completed:', {
                        requestId,
                        approved,
                        aiReportHash
                    });
                });
            }

            logger.info('Started listening for blockchain events');
        } catch (error) {
            logger.error('Failed to set up event listeners:', error);
            throw error;
        }
    }

    /**
     * Stop listening for events
     */
    async stopListeningForEvents() {
        if (this.campaignFactoryContract) {
            this.campaignFactoryContract.removeAllListeners();
            logger.info('Stopped listening for blockchain events');
        }
    }

    /**
     * Get verified contributors for a campaign with Blockscout and ASI verification
     */
    async getVerifiedContributors(campaignAddress, startIndex = 0, limit = 50, verifyBlockscout = true, checkScam = true) {
        try {
            logger.info(`Getting verified contributors for campaign ${campaignAddress}`);

            // Initialize campaign contract
            const campaignABI = [
                "function backers(uint256) view returns (address)",
                "function backersCount() view returns (uint256)",
                "function contributions(address) view returns (uint256)",
                "function isBacker(address) view returns (bool)",
                "function campaignInfo() view returns (string title, string description, uint256 totalGoal, uint256 totalRaised, uint256 startTime, uint256 endTime, address creator, bool isActive, uint256 milestoneCount)"
            ];

            const campaignContract = new ethers.Contract(campaignAddress, campaignABI, this.provider);

            // Get backers count
            const backersCount = await campaignContract.backersCount();
            logger.info(`Campaign has ${backersCount} backers`);

            // Get backers in batches
            const endIndex = Math.min(startIndex + limit, parseInt(backersCount));
            const contributors = [];

            for (let i = startIndex; i < endIndex; i++) {
                try {
                    const backerAddress = await campaignContract.backers(i);
                    const contributionAmount = await campaignContract.contributions(backerAddress);

                    if (parseInt(contributionAmount) > 0) {
                        const contributorData = await this.verifyContributor(
                            campaignAddress,
                            backerAddress,
                            contributionAmount,
                            verifyBlockscout,
                            checkScam
                        );

                        contributors.push(contributorData);
                    }
                } catch (error) {
                    logger.warn(`Failed to process backer at index ${i}:`, error.message);
                }
            }

            logger.info(`Successfully verified ${contributors.length} contributors`);
            return contributors;

        } catch (error) {
            logger.error('Failed to get verified contributors:', error);
            throw error;
        }
    }

    /**
     * Verify a single contributor with Blockscout and ASI
     */
    async verifyContributor(campaignAddress, contributorAddress, contractAmount, verifyBlockscout = true, checkScam = true) {
        try {
            let blockscoutVerified = false;
            let blockscoutDetails = null;
            let scamRiskScore = 0.0;
            let riskFactors = [];
            let verificationStatus = 'PENDING';
            let confidenceLevel = 'LOW';

            // Get contribution details from contract
            let contractContributions = {
                totalAmount: contractAmount,
                transactionCount: 1, // Will be filled from Blockscout
                firstContribution: null,
                lastContribution: null,
                averageContribution: contractAmount
            };

            // Blockscout verification
            if (verifyBlockscout) {
                try {
                    const blockscoutData = await this.verifyContributorWithBlockscout(campaignAddress, contributorAddress);

                    if (blockscoutData.transactions.length > 0) {
                        blockscoutVerified = true;
                        blockscoutDetails = blockscoutData;

                        // Update contribution details from Blockscout
                        const contributions = blockscoutData.transactions.filter(tx =>
                            tx.to.toLowerCase() === campaignAddress.toLowerCase()
                        );

                        if (contributions.length > 0) {
                            contractContributions.transactionCount = contributions.length;
                            contractContributions.firstContribution = new Date(contributions[0].timestamp).toISOString();
                            contractContributions.lastContribution = new Date(contributions[contributions.length - 1].timestamp).toISOString();

                            const totalBlockscoutAmount = contributions.reduce((sum, tx) => sum + parseInt(tx.value || '0'), 0);
                            contractContributions.averageContribution = totalBlockscoutAmount / contributions.length;

                            // Verify amounts match (within reasonable tolerance for gas)
                            const contractTotal = parseInt(contractAmount);
                            const tolerance = contractTotal * 0.1; // 10% tolerance for potential gas differences
                            if (Math.abs(totalBlockscoutAmount - contractTotal) < tolerance) {
                                verificationStatus = 'VERIFIED';
                                confidenceLevel = 'HIGH';
                            } else {
                                verificationStatus = 'AMOUNT_MISMATCH';
                                confidenceLevel = 'MEDIUM';
                                riskFactors.push('Contract and Blockscout amounts do not match');
                            }
                        }
                    } else {
                        confidenceLevel = 'LOW';
                        riskFactors.push('No transactions found in Blockscout');
                    }
                } catch (error) {
                    logger.warn(`Blockscout verification failed for ${contributorAddress}:`, error.message);
                    riskFactors.push('Blockscout verification unavailable');
                }
            }

            // ASI scam detection
            if (checkScam) {
                try {
                    const scamAnalysis = await this.analyzeContributorRisk(contributorAddress, campaignAddress);
                    scamRiskScore = scamAnalysis.riskScore;
                    riskFactors = [...riskFactors, ...scamAnalysis.riskFactors];

                    if (scamRiskScore > 0.6) {
                        verificationStatus = 'HIGH_RISK';
                        confidenceLevel = 'HIGH';
                    } else if (scamRiskScore > 0.3) {
                        verificationStatus = 'MONITOR';
                        confidenceLevel = 'MEDIUM';
                    }
                } catch (error) {
                    logger.warn(`ASI scam detection failed for ${contributorAddress}:`, error.message);
                }
            }

            return {
                address: contributorAddress,
                totalContributed: ethers.formatUnits(contractAmount, 18), // PYUSD has 18 decimals
                contributionCount: contractContributions.transactionCount,
                firstContribution: contractContributions.firstContribution,
                lastContribution: contractContributions.lastContribution,
                averageContribution: ethers.formatUnits(contractContributions.averageContribution, 18),
                verificationStatus,
                scamRiskScore,
                blockscoutVerified,
                riskFactors,
                confidenceLevel,
                asiVerifiedAt: new Date().toISOString(),
                blockscoutDetails: verifyBlockscout ? blockscoutDetails : null
            };

        } catch (error) {
            logger.error(`Failed to verify contributor ${contributorAddress}:`, error);

            // Return basic data with error status
            return {
                address: contributorAddress,
                totalContributed: ethers.formatUnits(contractAmount, 18),
                contributionCount: 1,
                firstContribution: null,
                lastContribution: null,
                averageContribution: ethers.formatUnits(contractAmount, 18),
                verificationStatus: 'ERROR',
                scamRiskScore: 0.5,
                blockscoutVerified: false,
                riskFactors: ['Verification failed'],
                confidenceLevel: 'LOW',
                asiVerifiedAt: new Date().toISOString(),
                blockscoutDetails: null
            };
        }
    }

    /**
     * Verify contributor with Blockscout API
     */
    async verifyContributorWithBlockscout(campaignAddress, contributorAddress) {
        try {
            const axios = require('axios');
            const blockscoutUrl = process.env.BLOCKSCOUT_API_URL || 'https://eth-sepolia.blockscout.com/api';

            // Get transactions for the contributor
            const response = await axios.get(`${blockscoutUrl}`, {
                params: {
                    module: 'account',
                    action: 'txlist',
                    address: contributorAddress,
                    startblock: 0,
                    endblock: 'latest',
                    page: 1,
                    offset: 100,
                    sort: 'asc'
                },
                timeout: 10000
            });

            const transactions = response.data?.result || [];

            // Filter transactions to the campaign and parse values
            const campaignTxs = transactions
                .filter(tx => tx.to.toLowerCase() === campaignAddress.toLowerCase())
                .map(tx => ({
                    hash: tx.hash,
                    timestamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
                    value: tx.value,
                    gasUsed: tx.gasUsed,
                    from: tx.from,
                    to: tx.to,
                    blockNumber: parseInt(tx.blockNumber)
                }));

            return {
                contributorAddress,
                campaignAddress,
                totalTransactions: transactions.length,
                campaignTransactions: campaignTxs.length,
                transactions: campaignTxs,
                verified: campaignTxs.length > 0
            };

        } catch (error) {
            logger.warn(`Blockscout API call failed for ${contributorAddress}:`, error.message);
            throw new Error(`Blockscout verification failed: ${error.message}`);
        }
    }

    /**
     * Analyze contributor risk using ASI
     */
    async analyzeContributorRisk(contributorAddress, campaignAddress) {
        try {
            const aiVerificationService = require('./aiVerificationService');

            // Get contributor stats from real-time data
            const contributorStats = aiVerificationService.realtimeData.contributorStats.get(contributorAddress.toLowerCase());

            // Get campaign creator analysis
            const campaignCreator = await this.getCampaignCreator(campaignAddress);

            let riskScore = 0.0;
            const riskFactors = [];

            // Contributor behavior analysis
            if (contributorStats) {
                if (contributorStats.totalTransactions < 3) {
                    riskScore += 0.2;
                    riskFactors.push('Low transaction volume');
                }

                if (contributorStats.transactionFrequency > 20) {
                    riskScore += 0.3;
                    riskFactors.push('High transaction frequency - potential automation');
                }

                if (contributorStats.riskScore > 0.6) {
                    riskScore += 0.4;
                    riskFactors.push('Historical suspicious behavior');
                }
            } else {
                // Lack of historical data is suspicious for new contributors
                riskScore += 0.1;
                riskFactors.push('No historical contributor data');
            }

            // Check if contributor is also the campaign creator (self-contribution)
            if (campaignCreator && contributorAddress.toLowerCase() === campaignCreator.toLowerCase()) {
                riskScore += 0.5;
                riskFactors.push('Self-contribution detected');
            }

            return {
                riskScore: Math.min(1.0, riskScore),
                riskFactors,
                analysis: contributorStats ? 'Based on transaction history' : 'Limited data available'
            };

        } catch (error) {
            logger.warn(`Contributor risk analysis failed for ${contributorAddress}:`, error);
            return {
                riskScore: 0.5,
                riskFactors: ['Risk analysis unavailable'],
                analysis: 'Error during analysis'
            };
        }
    }

    /**
     * Get campaign creator from contract
     */
    async getCampaignCreator(campaignAddress) {
        try {
            const campaignABI = [
                "function campaignInfo() view returns (string title, string description, uint256 totalGoal, uint256 totalRaised, uint256 startTime, uint256 endTime, address creator, bool isActive, uint256 milestoneCount)"
            ];

            const campaignContract = new ethers.Contract(campaignAddress, campaignABI, this.provider);
            const campaignInfo = await campaignContract.campaignInfo();

            return campaignInfo.creator;
        } catch (error) {
            logger.warn(`Failed to get campaign creator for ${campaignAddress}:`, error.message);
            return null;
        }
    }

    /**
     * Get wallet transactions for identity verification
     */
    async getWalletTransactions(walletAddress, limit = 50) {
        try {
            logger.debug(`Getting transactions for wallet ${walletAddress}`);

            const axios = require('axios');
            const blockscoutUrl = process.env.BLOCKSCOUT_API_URL || 'https://eth-sepolia.blockscout.com/api';

            // Get transactions for the wallet
            const response = await axios.get(`${blockscoutUrl}`, {
                params: {
                    module: 'account',
                    action: 'txlist',
                    address: walletAddress,
                    startblock: 0,
                    endblock: 'latest',
                    page: 1,
                    offset: limit,
                    sort: 'desc' // Most recent first
                },
                timeout: 10000
            });

            const transactions = response.data?.result || [];

            // Parse and format transactions
            const formattedTransactions = transactions.map(tx => ({
                hash: tx.hash,
                timestamp: new Date(parseInt(tx.timeStamp) * 1000),
                blockNumber: parseInt(tx.blockNumber),
                from: tx.from.toLowerCase(),
                to: tx.to ? tx.to.toLowerCase() : null,
                value: tx.value,
                gasUsed: tx.gasUsed,
                gasPrice: tx.gasPrice,
                contractAddress: tx.contractAddress || null,
                functionName: tx.functionName || null,
                methodId: tx.methodId || null,
                confirmations: tx.confirmations,
                txreceipt_status: tx.txreceipt_status
            }));

            logger.debug(`Retrieved ${formattedTransactions.length} transactions for ${walletAddress}`);
            return formattedTransactions;

        } catch (error) {
            logger.warn(`Failed to get wallet transactions for ${walletAddress}:`, error.message);
            // Return empty array instead of throwing to allow graceful degradation
            return [];
        }
    }

    /**
     * Get detailed contributor verification info
     */
    async getDetailedContributorVerification(campaignAddress, contributorAddress, enhanceWithRealtime = true) {
        try {
            logger.info(`Getting detailed verification for contributor ${contributorAddress} in campaign ${campaignAddress}`);

            // Initialize campaign contract
            const campaignABI = [
                "function contributions(address) view returns (uint256)",
                "function isBacker(address) view returns (bool)",
                "function backers(uint256) view returns (address)",
                "function backersCount() view returns (uint256)"
            ];

            const campaignContract = new ethers.Contract(campaignAddress, campaignABI, this.provider);

            // Verify contributor exists in campaign
            const isBacker = await campaignContract.isBacker(contributorAddress);
            if (!isBacker) {
                return null;
            }

            const contractAmount = await campaignContract.contributions(contributorAddress);

            // Get detailed verification
            const detailedVerification = await this.verifyContributor(
                campaignAddress,
                contributorAddress,
                contractAmount,
                true, // Always verify with Blockscout for detailed info
                enhanceWithRealtime
            );

            // Add additional details if enhancing with real-time data
            if (enhanceWithRealtime) {
                try {
                    const aiVerificationService = require('./aiVerificationService');
                    const realtimeContext = aiVerificationService.getRealtimeVerificationContext(campaignAddress, contributorAddress);

                    detailedVerification.realtimeContext = {
                        pyusdPrice: realtimeContext.pyusdPrice,
                        contributorStats: realtimeContext.contributorStats?.toJSON?.() || realtimeContext.contributorStats,
                        marketData: realtimeContext.marketData,
                        freshness: realtimeContext.timestamp
                    };
                } catch (error) {
                    logger.warn('Failed to add realtime context:', error.message);
                }
            }

            return detailedVerification;

        } catch (error) {
            logger.error(`Failed to get detailed contributor verification:`, error);
            throw error;
        }
    }

    /**
     * Set KYC verification status on the CampaignFactory contract
     * @param {string} userAddress - User's wallet address
     * @param {boolean} isVerified - Verification status
     * @returns {Object} Transaction result
     */
    async setKYCStatus(userAddress, isVerified) {
        if (!this.campaignFactoryContract || !this.wallet) {
            throw new Error('CampaignFactory contract or wallet not initialized');
        }

        try {
            logger.info(`Setting KYC status for ${userAddress} to ${isVerified}`);

            const tx = await this.campaignFactoryContract.setKYCStatus(userAddress, isVerified);
            const receipt = await tx.wait();

            logger.info(`KYC status updated. Transaction hash: ${tx.hash}`);

            return {
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString(),
                userAddress,
                isVerified,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            logger.error(`Failed to set KYC status for ${userAddress}:`, error);
            throw error;
        }
    }

    /**
     * Batch set KYC verification status for multiple users
     * @param {string[]} userAddresses - Array of user wallet addresses
     * @param {boolean[]} statuses - Array of verification statuses
     * @returns {Object} Transaction result
     */
    async batchSetKYCStatus(userAddresses, statuses) {
        if (!this.campaignFactoryContract || !this.wallet) {
            throw new Error('CampaignFactory contract or wallet not initialized');
        }

        if (userAddresses.length !== statuses.length) {
            throw new Error('User addresses and statuses arrays must have the same length');
        }

        try {
            logger.info(`Batch setting KYC status for ${userAddresses.length} users`);

            const tx = await this.campaignFactoryContract.batchSetKYCStatus(userAddresses, statuses);
            const receipt = await tx.wait();

            logger.info(`Batch KYC status updated. Transaction hash: ${tx.hash}`);

            return {
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString(),
                userCount: userAddresses.length,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Failed to batch set KYC status:', error);
            throw error;
        }
    }

    /**
     * Check if user is KYC verified on-chain
     * @param {string} userAddress - User's wallet address
     * @returns {boolean} Verification status
     */
    async isKYCVerified(userAddress) {
        if (!this.campaignFactoryContract) {
            throw new Error('CampaignFactory contract not initialized');
        }

        try {
            const isVerified = await this.campaignFactoryContract.isKYCVerified(userAddress);
            return isVerified;
        } catch (error) {
            logger.error(`Failed to check KYC status for ${userAddress}:`, error);
            throw error;
        }
    }

    /**
     * Get KYC details for a user
     * @param {string} userAddress - User's wallet address
     * @returns {Object} KYC details
     */
    async getKYCDetails(userAddress) {
        if (!this.campaignFactoryContract) {
            throw new Error('CampaignFactory contract not initialized');
        }

        try {
            const details = await this.campaignFactoryContract.getKYCDetails(userAddress);
            return {
                isVerified: details.isVerified,
                verifiedAt: details.verifiedAt.toString(),
                canCreateCampaigns: details.canCreateCampaigns
            };
        } catch (error) {
            logger.error(`Failed to get KYC details for ${userAddress}:`, error);
            throw error;
        }
    }

    /**
     * Check if user can create campaigns (KYC verified)
     * @param {string} userAddress - User's wallet address
     * @returns {boolean} Whether user can create campaigns
     */
    async canCreateCampaign(userAddress) {
        if (!this.campaignFactoryContract) {
            throw new Error('CampaignFactory contract not initialized');
        }

        try {
            const canCreate = await this.campaignFactoryContract.canCreateCampaign(userAddress);
            return canCreate;
        } catch (error) {
            logger.error(`Failed to check campaign creation permission for ${userAddress}:`, error);
            throw error;
        }
    }

    /**
     * Mint verification NFT for successful KYC verification
     * @param {string} recipientAddress - User's wallet address
     * @param {string} kycProvider - KYC provider name (e.g., 'veriff')
     * @param {string} verificationLevel - Verification level (e.g., 'Full')
     * @param {string} metadataURI - IPFS metadata URI
     * @returns {Object} Minting result with tokenId and transaction hash
     */
    async mintVerificationNFT(recipientAddress, kycProvider = 'veriff', verificationLevel = 'Full', metadataURI = '') {
        if (!this.nftContract || !this.wallet) {
            throw new Error('NFT contract or wallet not initialized');
        }

        try {
            logger.info(`Minting verification NFT for ${recipientAddress} with provider ${kycProvider}`);

            // Check if user already has NFT
            const hasNFT = await this.nftContract.hasNFT(recipientAddress);
            if (hasNFT) {
                logger.info(`User ${recipientAddress} already has NFT, skipping mint`);
                const tokenId = await this.nftContract.getTokenId(recipientAddress);
                return {
                    tokenId: tokenId.toString(),
                    transactionHash: null,
                    alreadyExists: true,
                    contractAddress: await this.nftContract.target || this.nftContract.address
                };
            }

            const tx = await this.nftContract.mintNFT(
                recipientAddress,
                kycProvider,
                verificationLevel,
                metadataURI
            );

            const receipt = await tx.wait();
            logger.info(`NFT minted successfully. Transaction hash: ${tx.hash}`);

            // Extract token ID from events
            const event = receipt.logs.find(log => {
                try {
                    const parsed = this.nftContract.interface.parseLog(log);
                    return parsed.name === 'NFTMinted';
                } catch {
                    return false;
                }
            });

            let tokenId = '0';
            if (event) {
                const parsed = this.nftContract.interface.parseLog(event);
                tokenId = parsed.args.tokenId.toString();
            }

            return {
                tokenId,
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString(),
                contractAddress: await this.nftContract.target || this.nftContract.address,
                recipientAddress,
                kycProvider,
                verificationLevel,
                metadataURI,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            logger.error(`Failed to mint verification NFT for ${recipientAddress}:`, error);
            throw error;
        }
    }

    /**
     * Check if user has verification NFT
     * @param {string} userAddress - User's wallet address
     * @returns {boolean} Whether user has NFT
     */
    async hasVerificationNFT(userAddress) {
        if (!this.nftContract) {
            throw new Error('NFT contract not initialized');
        }

        try {
            const hasNFT = await this.nftContract.hasNFT(userAddress);
            return hasNFT;
        } catch (error) {
            logger.error(`Failed to check NFT status for ${userAddress}:`, error);
            throw error;
        }
    }

    /**
     * Get verification NFT details for user
     * @param {string} userAddress - User's wallet address
     * @returns {Object} NFT details
     */
    async getVerificationNFTDetails(userAddress) {
        if (!this.nftContract) {
            throw new Error('NFT contract not initialized');
        }

        try {
            // Normalize address to checksum format
            const normalizedAddress = ethers.getAddress(userAddress.toLowerCase());

            const hasNFT = await this.nftContract.hasNFT(normalizedAddress);
            if (!hasNFT) {
                return null;
            }

            const tokenId = await this.nftContract.getTokenId(normalizedAddress);
            const details = await this.nftContract.getVerificationDetails(tokenId);

            return {
                tokenId: tokenId.toString(),
                walletAddress: details.walletAddress,
                verifiedAt: details.verifiedAt.toString(),
                kycProvider: details.kycProvider,
                verificationLevel: details.verificationLevel,
                metadataURI: details.metadataURI,
                isActive: details.isActive,
                contractAddress: await this.nftContract.target || this.nftContract.address
            };

        } catch (error) {
            logger.error(`Failed to get NFT details for ${userAddress}:`, error);
            throw error;
        }
    }
}

module.exports = new BlockchainService();
