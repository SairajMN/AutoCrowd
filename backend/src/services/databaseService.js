const { createClient } = require('@supabase/supabase-js');
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

/**
 * Database Service for AutoCrowd
 * Handles all database operations using Supabase PostgreSQL
 */
class DatabaseService {
  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    this.supabase = null;
    this.isConnected = false;
  }

  async initialize() {
    try {
      logger.info('Initializing Database Service...');

      if (!this.supabaseUrl || !this.supabaseServiceKey) {
        throw new Error('Supabase credentials not configured');
      }

      this.supabase = createClient(this.supabaseUrl, this.supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });

      // Test connection
      await this.testConnection();

      // Initialize tables if they don't exist
      await this.initializeTables();

      this.isConnected = true;
      logger.info('Database Service initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize Database Service:', error);
      throw error;
    }
  }

  async testConnection() {
    try {
      // Test connection by checking if our tables exist
      const { data, error } = await this.supabase
        .from('creator_verifications')
        .select('count')
        .limit(1);

      if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist
        throw error;
      }

      logger.info('Database connection test successful');
    } catch (error) {
      logger.error('Database connection test failed:', error);
      throw error;
    }
  }

  async initializeTables() {
    try {
      logger.info('Initializing database tables...');

      // Create verification_sessions table
      const { error: sessionsError } = await this.supabase.rpc('create_verification_tables');
      if (sessionsError) {
        logger.warn('RPC function not available, tables may already exist:', sessionsError.message);
      }

      // Alternative: Try to create tables using SQL
      await this.createTablesManually();

      // Ensure verification_url column exists
      await this.ensureVerificationUrlColumn();

      logger.info('Database tables initialized');
    } catch (error) {
      logger.error('Failed to initialize tables:', error);
      // Don't throw here - tables might already exist
    }
  }

  async createTablesManually() {
    const tablesSQL = `
      -- Creator verification sessions
      CREATE TABLE IF NOT EXISTS creator_verifications (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255) UNIQUE NOT NULL,
        wallet_address VARCHAR(42) NOT NULL,
        verification_type VARCHAR(50) NOT NULL DEFAULT 'kyc',
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        provider VARCHAR(50),
        verification_url VARCHAR(500),
        user_data JSONB,
        verification_data JSONB,
        asi_analysis JSONB,
        risk_score DECIMAL(3,2),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE
      );

      -- AI verification results
      CREATE TABLE IF NOT EXISTS ai_verifications (
        id SERIAL PRIMARY KEY,
        request_id VARCHAR(255) UNIQUE NOT NULL,
        campaign_address VARCHAR(42) NOT NULL,
        milestone_id INTEGER NOT NULL,
        submitter_address VARCHAR(42),
        evidence_hash VARCHAR(255),
        description TEXT,
        evidence_url VARCHAR(500),
        verdict VARCHAR(50),
        confidence DECIMAL(3,2),
        reasoning TEXT,
        provider VARCHAR(50),  -- AI provider that handled verification (asi, fetch, mock)
        scam_analysis JSONB,
        realtime_data JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        completed_at TIMESTAMP WITH TIME ZONE,
        blockchain_tx_hash VARCHAR(66)
      );

      -- Verification attempts log
      CREATE TABLE IF NOT EXISTS verification_attempts (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255),
        request_id VARCHAR(255),
        attempt_type VARCHAR(50) NOT NULL,
        provider VARCHAR(50),
        status VARCHAR(50) NOT NULL,
        error_message TEXT,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_creator_verifications_wallet ON creator_verifications(wallet_address);
      CREATE INDEX IF NOT EXISTS idx_creator_verifications_status ON creator_verifications(status);
      CREATE INDEX IF NOT EXISTS idx_creator_verifications_session ON creator_verifications(session_id);
      CREATE INDEX IF NOT EXISTS idx_ai_verifications_campaign ON ai_verifications(campaign_address);
      CREATE INDEX IF NOT EXISTS idx_ai_verifications_request ON ai_verifications(request_id);
      CREATE INDEX IF NOT EXISTS idx_verification_attempts_session ON verification_attempts(session_id);

      -- Add verification_url column to creator_verifications if it doesn't exist
      ALTER TABLE creator_verifications ADD COLUMN IF NOT EXISTS verification_url VARCHAR(500);
    `;

    try {
      // Execute table creation SQL
      const { error } = await this.supabase.rpc('exec_sql', { sql: tablesSQL });
      if (error) {
        logger.warn('Failed to create tables via RPC, trying direct approach:', error.message);
        // Tables might already exist, which is fine
      }
    } catch (error) {
      logger.warn('Table creation attempt failed (may already exist):', error.message);
    }
  }

  // Creator Verification Methods
  async createCreatorVerification(sessionData) {
    try {
      const { data, error } = await this.supabase
        .from('creator_verifications')
        .insert([{
          session_id: sessionData.sessionId,
          wallet_address: sessionData.walletAddress.toLowerCase(),
          verification_type: sessionData.verificationType || 'kyc',
          status: sessionData.status || 'pending',
          provider: sessionData.provider,
          user_data: sessionData.userData || {},
          expires_at: sessionData.expiresAt,
          created_at: new Date()
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to create creator verification:', error);
      throw error;
    }
  }

  async updateCreatorVerification(sessionId, updateData) {
    try {
      // Transform camelCase keys to snake_case for database
      const transformedData = {};
      for (const [key, value] of Object.entries(updateData)) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        transformedData[snakeKey] = value;
      }

      const { data, error } = await this.supabase
        .from('creator_verifications')
        .update({
          ...transformedData,
          updated_at: new Date()
        })
        .eq('session_id', sessionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to update creator verification:', error);
      throw error;
    }
  }

  async getCreatorVerification(sessionId) {
    try {
      const { data, error } = await this.supabase
        .from('creator_verifications')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      logger.error('Failed to get creator verification:', error);
      throw error;
    }
  }

  async getCreatorVerificationByWallet(walletAddress) {
    try {
      const { data, error } = await this.supabase
        .from('creator_verifications')
        .select('*')
        .eq('wallet_address', walletAddress.toLowerCase())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      logger.error('Failed to get creator verification by wallet:', error);
      throw error;
    }
  }

  async getAllCreatorVerifications(filters = {}) {
    try {
      let query = this.supabase
        .from('creator_verifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.provider) {
        query = query.eq('provider', filters.provider);
      }
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to get all creator verifications:', error);
      throw error;
    }
  }

  async getPendingVerifications() {
    try {
      const { data, error } = await this.supabase
        .from('creator_verifications')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to get pending verifications:', error);
      throw error;
    }
  }

  // AI Verification Methods
  async createAIVerification(verificationData) {
    try {
      const { data, error } = await this.supabase
        .from('ai_verifications')
        .insert([{
          request_id: verificationData.requestId,
          campaign_address: verificationData.campaignAddress.toLowerCase(),
          milestone_id: verificationData.milestoneId,
          submitter_address: verificationData.submitterAddress?.toLowerCase(),
          evidence_hash: verificationData.evidenceHash,
          description: verificationData.description,
          evidence_url: verificationData.evidenceUrl,
          verdict: verificationData.verdict,
          confidence: verificationData.confidence,
          reasoning: verificationData.reasoning,
          provider: verificationData.provider || 'unknown',  // AI provider (asi, fetch, mock)
          scam_analysis: verificationData.scamAnalysis || {},
          realtime_data: verificationData.realtimeData || {},
          created_at: new Date()
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to create AI verification:', error);
      throw error;
    }
  }

  async updateAIVerification(requestId, updateData) {
    try {
      const { data, error } = await this.supabase
        .from('ai_verifications')
        .update({
          ...updateData,
          completed_at: updateData.completed_at || new Date()
        })
        .eq('request_id', requestId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to update AI verification:', error);
      throw error;
    }
  }

  async getAIVerification(requestId) {
    try {
      const { data, error } = await this.supabase
        .from('ai_verifications')
        .select('*')
        .eq('request_id', requestId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      logger.error('Failed to get AI verification:', error);
      throw error;
    }
  }

  async getAIVerificationsByCampaign(campaignAddress, limit = 50) {
    try {
      const { data, error } = await this.supabase
        .from('ai_verifications')
        .select('*')
        .eq('campaign_address', campaignAddress.toLowerCase())
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to get AI verifications by campaign:', error);
      throw error;
    }
  }

  // Verification Attempts Logging
  async logVerificationAttempt(attemptData) {
    try {
      const { data, error } = await this.supabase
        .from('verification_attempts')
        .insert([{
          session_id: attemptData.sessionId,
          request_id: attemptData.requestId,
          attempt_type: attemptData.attemptType,
          provider: attemptData.provider,
          status: attemptData.status,
          error_message: attemptData.errorMessage,
          metadata: attemptData.metadata || {},
          created_at: new Date()
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to log verification attempt:', error);
      throw error;
    }
  }

  // Cleanup expired sessions
  async cleanupExpiredSessions() {
    try {
      const { data, error } = await this.supabase
        .from('creator_verifications')
        .update({ status: 'expired' })
        .lt('expires_at', new Date())
        .eq('status', 'pending');

      if (error) throw error;

      if (data && data.length > 0) {
        logger.info(`Cleaned up ${data.length} expired verification sessions`);
      }

      return data;
    } catch (error) {
      logger.error('Failed to cleanup expired sessions:', error);
      throw error;
    }
  }

  // Statistics and Analytics
  async getVerificationStats() {
    try {
      const { data: creatorStats, error: creatorError } = await this.supabase
        .from('creator_verifications')
        .select('status, provider')
        .order('created_at', { ascending: false })
        .limit(1000);

      const { data: aiStats, error: aiError } = await this.supabase
        .from('ai_verifications')
        .select('verdict, confidence')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (creatorError || aiError) throw creatorError || aiError;

      // Calculate statistics
      const stats = {
        creatorVerifications: {
          total: creatorStats?.length || 0,
          byStatus: {},
          byProvider: {}
        },
        aiVerifications: {
          total: aiStats?.length || 0,
          approvalRate: 0,
          averageConfidence: 0
        },
        lastUpdated: new Date()
      };

      // Creator stats
      creatorStats?.forEach(item => {
        stats.creatorVerifications.byStatus[item.status] = (stats.creatorVerifications.byStatus[item.status] || 0) + 1;
        if (item.provider) {
          stats.creatorVerifications.byProvider[item.provider] = (stats.creatorVerifications.byProvider[item.provider] || 0) + 1;
        }
      });

      // AI stats
      if (aiStats && aiStats.length > 0) {
        const approved = aiStats.filter(item => item.verdict === 'approved').length;
        stats.aiVerifications.approvalRate = approved / aiStats.length;
        stats.aiVerifications.averageConfidence = aiStats.reduce((sum, item) => sum + (item.confidence || 0), 0) / aiStats.length;
      }

      return stats;
    } catch (error) {
      logger.error('Failed to get verification stats:', error);
      throw error;
    }
  }

  async ensureVerificationUrlColumn() {
    try {
      logger.info('Ensuring verification_url column exists...');

      // Try to add the column directly using raw SQL
      const { error } = await this.supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE creator_verifications ADD COLUMN IF NOT EXISTS verification_url VARCHAR(500);'
      });

      if (error) {
        logger.warn('Failed to add verification_url column via RPC:', error.message);
        // Try alternative approach - test if column exists by attempting to select it
        try {
          const { error: testError } = await this.supabase
            .from('creator_verifications')
            .select('verification_url')
            .limit(1);

          if (testError && testError.code === '42703') { // Column doesn't exist
            logger.error('verification_url column is still missing after schema update attempts');
            throw new Error('Database schema is out of sync. Please run the database_setup.sql manually in Supabase SQL Editor.');
          }
        } catch (testError) {
          logger.warn('Could not verify column existence:', testError.message);
        }
      } else {
        logger.info('verification_url column ensured');
      }
    } catch (error) {
      logger.error('Failed to ensure verification_url column:', error);
      // Don't throw here - let the application continue, the error will surface when trying to use the column
    }
  }

  // Reset Methods
  async resetAllVerifications() {
    try {
      logger.info('Resetting all verification data from database');

      // Delete all creator verifications
      const { data: creatorData, error: creatorError } = await this.supabase
        .from('creator_verifications')
        .delete()
        .neq('id', 0); // Delete all records

      if (creatorError) throw creatorError;

      // Delete all AI verifications
      const { data: aiData, error: aiError } = await this.supabase
        .from('ai_verifications')
        .delete()
        .neq('id', 0); // Delete all records

      if (aiError) throw aiError;

      // Delete all verification attempts
      const { data: attemptsData, error: attemptsError } = await this.supabase
        .from('verification_attempts')
        .delete()
        .neq('id', 0); // Delete all records

      if (attemptsError) throw attemptsError;

      logger.info('All verification data reset successfully');

      return {
        clearedSessions: creatorData?.length || 0,
        clearedAiVerifications: aiData?.length || 0,
        clearedAttempts: attemptsData?.length || 0
      };
    } catch (error) {
      logger.error('Failed to reset all verifications:', error);
      throw error;
    }
  }

  async resetWalletVerification(walletAddress) {
    try {
      const normalizedAddress = walletAddress.toLowerCase();
      logger.info(`Resetting verification data for wallet ${normalizedAddress}`);

      // Delete creator verifications for this wallet
      const { data: creatorData, error: creatorError } = await this.supabase
        .from('creator_verifications')
        .delete()
        .eq('wallet_address', normalizedAddress);

      if (creatorError) throw creatorError;

      // Delete AI verifications for campaigns created by this wallet
      const { data: aiData, error: aiError } = await this.supabase
        .from('ai_verifications')
        .delete()
        .eq('campaign_address', normalizedAddress);

      if (aiError) throw aiError;

      // Delete verification attempts for this wallet (by session_id matching)
      // First get session IDs for this wallet
      const { data: sessions } = await this.supabase
        .from('creator_verifications')
        .select('session_id')
        .eq('wallet_address', normalizedAddress);

      let clearedAttempts = 0;
      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map(s => s.session_id);

        const { data: attemptsData, error: attemptsError } = await this.supabase
          .from('verification_attempts')
          .delete()
          .in('session_id', sessionIds);

        if (attemptsError) throw attemptsError;
        clearedAttempts = attemptsData?.length || 0;
      }

      logger.info(`Verification data reset for wallet ${normalizedAddress}`);

      return {
        clearedSessions: creatorData?.length || 0,
        clearedAiVerifications: aiData?.length || 0,
        clearedAttempts
      };
    } catch (error) {
      logger.error(`Failed to reset verification for wallet ${walletAddress}:`, error);
      throw error;
    }
  }

  async close() {
    // Supabase client doesn't need explicit closing
    this.isConnected = false;
    logger.info('Database service closed');
  }
}

module.exports = new DatabaseService();
