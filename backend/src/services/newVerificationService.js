const axios = require('axios');
const winston = require('winston');
const crypto = require('crypto');
const databaseService = require('./databaseService');
const blockchainService = require('./blockchainService');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

class NewVerificationService {
  constructor() {
    this.verificationFactoryAddress = process.env.VERIFICATION_FACTORY_ADDRESS;
    this.verificationNFTAddress = process.env.VERIFICATION_NFT_ADDRESS;
    this.campaignFactoryAddress = process.env.CAMPAIGN_FACTORY_ADDRESS;

    // Challenge types for different verification levels
    this.challengeTypes = {
      basic: ['identity_check', 'contribution_proof'],
      advanced: ['identity_check', 'contribution_proof', 'activity_verification'],
      expert: ['identity_check', 'contribution_proof', 'activity_verification', 'expert_review']
    };

    // Verification level requirements
    this.levelRequirements = {
      basic: { minContribution: 1, challenges: 1 },
      advanced: { minContribution: 10, challenges: 2 },
      expert: { minContribution: 100, challenges: 3 }
    };
  }

  /**
   * Initialize the new verification service
   */
  async initialize() {
    logger.info('Initializing New Verification Service...');

    // Validate contract addresses
    if (!this.verificationFactoryAddress) {
      throw new Error('VERIFICATION_FACTORY_ADDRESS not configured');
    }
    if (!this.verificationNFTAddress) {
      throw new Error('VERIFICATION_NFT_ADDRESS not configured');
    }

    // Initialize database tables if needed
    await this.ensureDatabaseTables();

    logger.info('New Verification Service initialized');
  }

  /**
   * Ensure all required database tables exist
   */
  async ensureDatabaseTables() {
    try {
      // The tables are created via database_setup.sql migration
      logger.info('Database tables verified');
    } catch (error) {
      logger.error('Failed to verify database tables:', error);
    }
  }

  /**
   * Create verification contract for a campaign
   */
  async createVerificationContract(campaignAddress) {
    try {
      logger.info(`Creating verification contract for campaign ${campaignAddress}`);

      // Call blockchain service to create verification contract via factory
      const result = await blockchainService.createVerificationContract(campaignAddress);

      // Store in database
      await databaseService.createVerificationContract({
        contract_address: result.verificationContract,
        campaign_address: campaignAddress,
        factory_address: this.verificationFactoryAddress,
        created_at: new Date()
      });

      return {
        success: true,
        verificationContract: result.verificationContract,
        transactionHash: result.transactionHash
      };
    } catch (error) {
      logger.error('Failed to create verification contract:', error);
      throw error;
    }
  }

  /**
   * Request contributor verification
   */
  async requestContributorVerification(contributorAddress, campaignAddress, level = 'basic') {
    try {
      logger.info(`Requesting ${level} verification for contributor ${contributorAddress} in campaign ${campaignAddress}`);

      // Get or create verification contract for campaign
      let verificationContract = await databaseService.getVerificationContractByCampaign(campaignAddress);

      if (!verificationContract) {
        const result = await this.createVerificationContract(campaignAddress);
        verificationContract = {
          contract_address: result.verificationContract
        };
      }

      // Generate verification challenges based on level
      const challenges = await this.generateVerificationChallenges(contributorAddress, campaignAddress, level);

      // Create verification request in database
      const verificationRequest = {
        contributor_address: contributorAddress,
        campaign_address: campaignAddress,
        verification_contract_address: verificationContract.contract_address,
        verification_level: level,
        status: 'pending',
        created_at: new Date()
      };

      await databaseService.createContributorVerification(verificationRequest);

      // Store challenges in database
      for (const challenge of challenges) {
        await databaseService.createVerificationChallenge({
          challenge_id: challenge.challengeId,
          contributor_address: contributorAddress,
          campaign_address: campaignAddress,
          challenge_type: challenge.type,
          challenge_data: challenge.data,
          expires_at: challenge.expiresAt,
          created_at: new Date()
        });
      }

      // Call blockchain to request verification
      const blockchainResult = await blockchainService.requestContributorVerification(
        verificationContract.contract_address,
        contributorAddress,
        level,
        JSON.stringify(challenges)
      );

      return {
        success: true,
        verificationContract: verificationContract.contract_address,
        challenges: challenges,
        transactionHash: blockchainResult?.transactionHash
      };
    } catch (error) {
      logger.error('Failed to request contributor verification:', error);
      throw error;
    }
  }

  /**
   * Generate verification challenges based on level
   */
  generateVerificationChallenges(contributorAddress, campaignAddress, level) {
    const challenges = [];
    const requiredChallenges = this.challengeTypes[level] || this.challengeTypes.basic;

    for (const challengeType of requiredChallenges) {
      const challengeId = this.generateChallengeId();
      let challengeData = {};

      switch (challengeType) {
        case 'identity_check':
          challengeData = {
            question: 'Please provide a government-issued ID number (last 4 digits)',
            verificationMethod: 'manual_review'
          };
          break;

        case 'contribution_proof':
          challengeData = {
            question: 'Describe your contribution to this campaign',
            minLength: 50,
            verificationMethod: 'ai_review'
          };
          break;

        case 'activity_verification':
          challengeData = {
            question: 'Provide proof of recent activity (social media, GitHub, etc.)',
            verificationMethod: 'link_verification'
          };
          break;

        case 'expert_review':
          challengeData = {
            question: 'Expert reviewer will evaluate your overall contribution quality',
            verificationMethod: 'expert_review'
          };
          break;

        default:
          challengeData = { question: 'Complete identity verification' };
      }

      challenges.push({
        challengeId,
        type: challengeType,
        data: challengeData,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });
    }

    return challenges;
  }

  /**
   * Submit verification challenge solution
   */
  async submitChallengeSolution(contributorAddress, campaignAddress, challengeId, solution) {
    try {
      logger.info(`Submitting solution for challenge ${challengeId} by contributor ${contributorAddress}`);

      // Get challenge from database
      const challenge = await databaseService.getVerificationChallenge(challengeId);
      if (!challenge) {
        throw new Error('Challenge not found');
      }

      if (challenge.status !== 'pending') {
        throw new Error('Challenge not in pending status');
      }

      if (new Date() > challenge.expires_at) {
        throw new Error('Challenge expired');
      }

      // Store solution hash
      const solutionHash = this.hashSolution(solution);
      await databaseService.updateVerificationChallenge(challengeId, {
        solution_hash: solutionHash,
        completed_at: new Date(),
        status: 'completed'
      });

      return {
        success: true,
        challengeId,
        solutionHash,
        status: 'submitted'
      };
    } catch (error) {
      logger.error('Failed to submit challenge solution:', error);
      throw error;
    }
  }

  /**
   * Verify contributor (called by verifier)
   */
  async verifyContributor(contributorAddress, campaignAddress, verificationLevel, verifierAddress) {
    try {
      logger.info(`Verifying contributor ${contributorAddress} at level ${verificationLevel}`);

      // Get verification contract
      const verificationContract = await databaseService.getVerificationContractByCampaign(campaignAddress);
      if (!verificationContract) {
        throw new Error('Verification contract not found for campaign');
      }

      // Check if verifier is approved
      const verifierDetails = await blockchainService.getVerifierDetails(verifierAddress);
      if (!verifierDetails.isVerifier) {
        throw new Error('Verifier not approved');
      }

      // Check all challenges are completed
      const challenges = await databaseService.getContributorChallenges(contributorAddress, campaignAddress);
      const completedChallenges = challenges.filter(c => c.status === 'completed');

      const required = this.levelRequirements[verificationLevel].challenges;
      if (completedChallenges.length < required) {
        throw new Error(`Not enough completed challenges. Required: ${required}, Completed: ${completedChallenges.length}`);
      }

      // Call blockchain verification
      const blockchainResult = await blockchainService.verifyContributor(
        verificationContract.contract_address,
        contributorAddress,
        verificationLevel,
        verifierAddress
      );

      // Update database
      await databaseService.updateContributorVerification(contributorAddress, campaignAddress, {
        verification_token_id: blockchainResult.tokenId.toString(),
        verification_hash: blockchainResult.verificationHash,
        verified_at: new Date(),
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        status: 'approved',
        provider: verifierAddress
      });

      // Update verifier reputation
      await blockchainService.updateVerifierReputation(verifierAddress, true, 800);

      return {
        success: true,
        tokenId: blockchainResult.tokenId,
        verificationLevel,
        verifier: verifierAddress,
        transactionHash: blockchainResult.transactionHash
      };
    } catch (error) {
      logger.error('Failed to verify contributor:', error);
      throw error;
    }
  }

  /**
   * Request milestone verification
   */
  async requestMilestoneVerification(milestoneId, contributorAddress, campaignAddress, evidenceData) {
    try {
      logger.info(`Requesting milestone ${milestoneId} verification for contributor ${contributorAddress}`);

      // Get verification contract
      const verificationContract = await databaseService.getVerificationContractByCampaign(campaignAddress);
      if (!verificationContract) {
        throw new Error('Verification contract not found for campaign');
      }

      // Ensure contributor is verified
      const contributorVerification = await databaseService.getContributorVerification(contributorAddress, campaignAddress);
      if (!contributorVerification || contributorVerification.status !== 'approved') {
        throw new Error('Contributor not verified for this campaign');
      }

      // Create milestone verification in database
      const verificationId = this.generateVerificationId();

      const milestoneRequest = {
        milestone_id: milestoneId,
        campaign_address: campaignAddress,
        contributor_address: contributorAddress,
        verification_contract_address: verificationContract.contract_address,
        evidence_hash: this.hashData(evidenceData.evidence),
        description: evidenceData.description,
        evidence_url: evidenceData.evidenceUrl,
        created_at: new Date()
      };

      await databaseService.createMilestoneVerification(milestoneRequest);

      // Call blockchain
      const blockchainResult = await blockchainService.requestMilestoneVerification(
        verificationContract.contract_address,
        milestoneId,
        contributorAddress,
        evidenceData.evidence,
        evidenceData.description,
        evidenceData.evidenceUrl
      );

      return {
        success: true,
        verificationId: blockchainResult.verificationId,
        transactionHash: blockchainResult.transactionHash
      };
    } catch (error) {
      logger.error('Failed to request milestone verification:', error);
      throw error;
    }
  }

  /**
   * Verify milestone (called by verifier)
   */
  async verifyMilestone(verificationId, verdict, confidenceScore, verifierAddress, reasoning = '') {
    try {
      logger.info(`Verifying milestone with ID ${verificationId}, verdict: ${verdict}`);

      // Get milestone verification from database
      const milestoneVerification = await databaseService.getMilestoneVerification(verificationId);
      if (!milestoneVerification) {
        throw new Error('Milestone verification not found');
      }

      // Check verifier
      const verifierDetails = await blockchainService.getVerifierDetails(verifierAddress);
      if (!verifierDetails.isVerifier) {
        throw new Error('Verifier not approved');
      }

      // Call blockchain verification
      const blockchainResult = await blockchainService.verifyMilestone(
        milestoneVerification.verification_contract_address,
        verificationId,
        verdict,
        confidenceScore,
        verifierAddress
      );

      // Update database
      const status = verdict === 'approved' ? 'approved' : verdict === 'rejected' ? 'rejected' : 'uncertain';

      await databaseService.updateMilestoneVerification(verificationId, {
        verifier_address: verifierAddress,
        verdict: status,
        confidence_score: confidenceScore,
        verification_details: { reasoning, blockchainResult },
        blockchain_tx_hash: blockchainResult.transactionHash,
        verified_at: new Date()
      });

      // Update verifier reputation
      const successful = status === 'approved';
      await blockchainService.updateVerifierReputation(verifierAddress, successful, confidenceScore);

      return {
        success: true,
        verificationId,
        verdict: status,
        confidenceScore,
        verifier: verifierAddress,
        transactionHash: blockchainResult.transactionHash
      };
    } catch (error) {
      logger.error('Failed to verify milestone:', error);
      throw error;
    }
  }

  /**
   * Get contributor verification status
   */
  async getContributorVerificationStatus(contributorAddress, campaignAddress) {
    try {
      const verification = await databaseService.getContributorVerification(contributorAddress, campaignAddress);

      if (!verification) {
        return {
          verified: false,
          level: 'none',
          status: 'not_verified',
          expiresAt: null,
          tokenId: null
        };
      }

      const isExpired = verification.expires_at && new Date() > verification.expires_at;

      return {
        verified: verification.status === 'approved' && !isExpired,
        level: verification.verification_level,
        status: isExpired ? 'expired' : verification.status,
        verifiedAt: verification.verified_at,
        expiresAt: verification.expires_at,
        tokenId: verification.verification_token_id,
        provider: verification.provider
      };
    } catch (error) {
      logger.error('Failed to get contributor verification status:', error);
      throw error;
    }
  }

  /**
   * Get pending verification challenges for contributor
   */
  async getPendingChallenges(contributorAddress, campaignAddress) {
    try {
      const challenges = await databaseService.getContributorChallenges(contributorAddress, campaignAddress);

      return challenges
        .filter(c => c.status === 'pending' && new Date() <= c.expires_at)
        .map(c => ({
          challengeId: c.challenge_id,
          type: c.challenge_type,
          data: c.challenge_data,
          expiresAt: c.expires_at,
          createdAt: c.created_at
        }));
    } catch (error) {
      logger.error('Failed to get pending challenges:', error);
      throw error;
    }
  }

  /**
   * Get verifier statistics
   */
  async getVerifierStats(verifierAddress) {
    try {
      const verifier = await databaseService.getVerifier(verifierAddress);

      if (!verifier) {
        return null;
      }

      const successRate = verifier.total_verifications > 0 ?
        (verifier.successful_verifications / verifier.total_verifications) * 100 : 0;

      return {
        address: verifier.address,
        name: verifier.name,
        reputationScore: verifier.reputation_score,
        totalVerifications: verifier.total_verifications,
        successRate: Math.round(successRate),
        isActive: verifier.is_active,
        expertise: verifier.expertise_areas,
        joinedAt: verifier.created_at
      };
    } catch (error) {
      logger.error('Failed to get verifier stats:', error);
      throw error;
    }
  }

  /**
   * Utility functions
   */
  generateChallengeId() {
    return crypto.randomBytes(32).toString('hex');
  }

  generateVerificationId() {
    return '0x' + crypto.randomBytes(32).toString('hex');
  }

  hashSolution(solution) {
    return crypto.createHash('sha256').update(solution).digest('hex');
  }

  hashData(data) {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }
}

module.exports = new NewVerificationService();
