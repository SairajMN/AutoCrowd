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

        if (campaignFactoryAddress) {
            // CampaignFactory ABI (simplified)
            const campaignFactoryABI = [
                "function getAllCampaigns() view returns (tuple(address campaignAddress, address creator, string title, uint256 createdAt, bool isActive)[])",
                "function getCampaignCount() view returns (uint256)",
                "event CampaignCreated(address indexed campaignAddress, address indexed creator, string title, uint256 goal, uint256 duration)"
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

        logger.info('Started listening for blockchain events');
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
}

module.exports = new BlockchainService();
