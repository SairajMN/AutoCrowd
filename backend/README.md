# AutoCrowd Backend

**Production-ready** AI-powered backend service for AutoCrowd crowdfunding platform, featuring **real-time Veriff KYC integration**, ASI milestone verification, and comprehensive blockchain intelligence.

## 🏆 Integration Partners & Sponsors

### 🤖 ASI (Artificial Super Intelligence) Alliance
**Core AI Engine**: **Production-mode** autonomous agents providing intelligent milestone verification, scam detection, and real-time content analysis through MeTTa knowledge graphs and AgentVerse multi-agent platform.

### 🔐 Veriff KYC Integration
**Identity Verification**: **Production-ready** KYC system with face verification, document scanning, NFT minting, and secure webhook handling for verified users.

### 🔍 Blockscout
**Blockchain Intelligence**: Real-time transaction monitoring, smart contract event tracking, and comprehensive blockchain data analytics for complete campaign transparency.

### 💰 PayPal USD (PYUSD)
**Stablecoin Infrastructure**: Enterprise-grade stablecoin processing with sophisticated balance validation, transaction monitoring, and USD-pegged conversion utilities.

## Features

- **🤖 ASI Multi-Agent System**: Distributed AI verification with AgentVerse coordination
- **🔍 Blockscout Transaction Intelligence**: Real-time blockchain monitoring and contract event processing
- **💰 PYUSD Stablecoin Integration**: Advanced balance validation and transaction processing
- **📊 Real-Time Analytics**: Live market data integration and risk assessment
- **🔒 Enterprise Security**: Multi-layered fraud detection and authorization
- **⚡ RESTful API**: Comprehensive endpoints for frontend integration
- **🔄 Event-Driven Architecture**: Automated workflows based on blockchain events

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend       │    │   Blockchain    │
│   (Next.js)     │◄──►│   (Node.js)      │◄──►│   (Ethereum)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   ASI Alliance   │
                       │   Ecosystem      │
                       └──────────────────┘
                              │
                    ┌─────────┼─────────┐
                    ▼         ▼         ▼
              ┌─────────┐ ┌─────────┐ ┌─────────┐
              │ MeTTa   │ │AgentVerse│ │ASI:One  │
              │Knowledge│ │ Agents  │ │Chat API │
              │ Graph   │ │         │ │         │
              └─────────┘ └─────────┘ └─────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.8+
- Redis (optional, for caching)
- PostgreSQL (optional, for data persistence)

### Installation

1. **Install Node.js dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Setup environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Start the services**
   ```bash
   # Start Node.js backend
   npm run dev
   
   # Start Python AI agent (in separate terminal)
   python src/agents/milestone_verifier.py
   ```

## Configuration

### Environment Variables

```bash
# Server Configuration
PORT=8000
NODE_ENV=development

# Blockchain Configuration
ETH_RPC_URL=https://sepolia.drpc.org
PRIVATE_KEY=your_private_key_here
CHAIN_ID=11155111

# Contract Addresses
CAMPAIGN_FACTORY_ADDRESS=0x...
AI_VERIFICATION_HANDLER_ADDRESS=0x...
PYUSD_CONTRACT_ADDRESS=0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9

# ASI Configuration
ASI_API_KEY=your_asi_api_key
ASI_ENDPOINT=https://api.asi.one
METTA_KNOWLEDGE_GRAPH_URL=https://metta.asi.one
AGENT_VERSE_URL=https://agentverse.asi.one

# Database (optional)
DATABASE_URL=postgresql://user:password@localhost:5432/autocrowd
REDIS_URL=redis://localhost:6379
```

## API Endpoints

### Verification Service

- `POST /api/verification/verify` - Request AI verification
- `POST /api/verification/submit-verdict` - Submit verification verdict
- `GET /api/verification/status/:requestId` - Get verification status
- `GET /api/verification/pending` - Get pending requests
- `POST /api/verification/retry/:requestId` - Retry failed verification

### Campaign Service

- `GET /api/campaigns` - Get all campaigns
- `GET /api/campaigns/:address` - Get campaign details
- `GET /api/campaigns/:address/milestones` - Get campaign milestones
- `GET /api/campaigns/:address/contributions` - Get campaign contributions
- `GET /api/campaigns/creator/:creator` - Get campaigns by creator
- `GET /api/campaigns/stats/summary` - Get campaign statistics

### Events Service

- `GET /api/events` - Get blockchain events
- `GET /api/events/campaigns/:address` - Get campaign events
- `GET /api/events/verifications/:requestId` - Get verification events
- `GET /api/events/transaction/:txHash` - Get transaction events
- `GET /api/events/stats/summary` - Get event statistics

## 🤖 AI Milestone Verification System

AutoCrowd features a **production-grade AI verification system** that combines multiple AI technologies to ensure transparent and trustworthy milestone verification. The system uses **ASI Alliance ecosystem**, **real-time blockchain intelligence**, and **advanced machine learning** for comprehensive fraud detection and verification.

### AI Verification Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend       │    │   Blockchain    │
│   Submission    │◄──►│   AI Engine      │◄──►│   Smart         │
└─────────────────┘    └──────────────────┘    │   Contracts     │
                              │                 └─────────────────┘
                              ▼
                       ┌──────────────────┐
                       │   ASI Alliance   │
                       │   AI Ecosystem   │
                       └──────────────────┘
                              │
                    ┌─────────┼─────────┐
                    ▼         ▼         ▼
              ┌─────────┐ ┌─────────┐ ┌─────────┐
              │ MeTTa   │ │AgentVerse│ │Blockscout│
              │Knowledge│ │ Agents  │ │Analytics │
              │ Graph   │ │         │ │         │
              └─────────┘ └─────────┘ └─────────┘
```

### Complete AI Verification Workflow

#### 1. **Milestone Submission & Evidence Collection**
- Creator submits milestone completion with evidence (IPFS hashes, URLs, descriptions)
- System validates submission format and completeness
- Evidence is stored and indexed for AI analysis

#### 2. **Multi-Layer Evidence Analysis**
**MeTTa Knowledge Graph Analysis**:
- Semantic analysis of milestone descriptions and requirements
- Cross-referencing with similar completed milestones
- Authenticity scoring based on evidence quality and completeness
- Contextual relevance assessment using ASI knowledge base

**Real-time Blockchain Intelligence**:
- Transaction pattern analysis for contributor behavior
- Smart contract event verification and validation
- On-chain activity correlation with milestone claims
- Fraud detection through behavioral analytics

#### 3. **ASI AgentVerse Multi-Agent Verification**
**Primary AI Agents**:
- **EvidenceAnalyzer**: Validates submitted deliverables against requirements
- **AuthenticityChecker**: Detects potential fraud or manipulation
- **ComplianceValidator**: Ensures milestone meets platform standards
- **RiskAssessor**: Evaluates overall campaign and contributor risk

**Agent Communication Protocol**:
```javascript
// Example agent interaction
const agentRequest = {
    task: "milestone_verification",
    context: {
        milestoneId: "milestone_123",
        campaignAddress: "0x...",
        evidenceHash: "Qm...",
        description: "Smart contract deployment completed",
        evidenceAnalysis: evidenceResults,
        blockchainContext: realtimeData
    },
    parameters: {
        confidenceThreshold: 0.8,
        analysisDepth: "comprehensive",
        riskAssessment: true
    }
};
```

#### 4. **Advanced Risk Assessment Engine**
**Real-time Risk Factors**:
- **Contributor Risk**: Behavioral analysis and reputation scoring
- **Market Risk**: Cryptocurrency volatility and market conditions
- **PYUSD Stability**: Stablecoin peg monitoring and depegging risk
- **Verification Patterns**: Historical verification accuracy trends
- **Campaign Creator Risk**: Creator reputation and past performance

**Risk Mitigation Strategies**:
- **AI-Automated Actions**: Low-risk scenarios handled automatically
- **Human Escalation**: Medium-risk cases flagged for review
- **Critical Override**: High-risk scenarios require human intervention

#### 5. **Verdict Generation & Confidence Scoring**
**Multi-Factor Decision Making**:
- Evidence analysis weight: 40%
- Agent verdict weight: 60%
- Real-time risk adjustment: ±20%
- Historical pattern influence: ±10%

**Verdict Categories**:
- **Approved** (≥0.8 confidence): Automatic fund release
- **Uncertain** (0.3-0.8 confidence): Human review required
- **Rejected** (≤0.3 confidence): Milestone revision needed

#### 6. **Blockchain Integration & Fund Release**
**Smart Contract Updates**:
- AI verdict submitted to verification handler contract
- Automatic fund release for approved milestones
- Event logging for transparency and audit trails
- Refund mechanisms for failed campaigns

**Real-time Monitoring**:
- Continuous transaction monitoring via Blockscout
- Automated fraud detection and alerting
- Performance analytics and optimization

### AI Technologies Used

#### **ASI (Artificial Super Intelligence) Alliance**
- **MeTTa Knowledge Graph**: Semantic analysis and reasoning
- **AgentVerse**: Multi-agent coordination and consensus
- **ASI:One Chat Protocol**: Advanced AI communication
- **Real-time Learning**: Continuous model improvement

#### **Blockchain Intelligence (Blockscout)**
- **Transaction Monitoring**: Real-time contribution tracking
- **Smart Contract Analytics**: Contract behavior analysis
- **Event Log Processing**: Milestone completion verification
- **Address Intelligence**: Contributor reputation analysis

#### **Machine Learning Models**
- **Computer Vision**: Deliverable image and document analysis
- **Natural Language Processing**: Description and requirement analysis
- **Anomaly Detection**: Fraud pattern recognition
- **Predictive Analytics**: Success probability forecasting

### Verification Process Details

#### **Evidence Analysis Pipeline**
1. **Content Validation**: Format and completeness checking
2. **Semantic Analysis**: Understanding milestone requirements
3. **Authenticity Scoring**: Evidence quality assessment
4. **Cross-verification**: Blockchain transaction correlation
5. **Risk Assessment**: Fraud and manipulation detection

#### **Multi-Agent Consensus**
1. **EvidenceAnalyzer Agent**: Validates deliverable quality
2. **AuthenticityChecker Agent**: Detects potential fraud
3. **ComplianceValidator Agent**: Ensures platform standards
4. **RiskAssessor Agent**: Evaluates overall risk profile
5. **Consensus Engine**: Combines agent verdicts with confidence weighting

#### **Real-time Context Integration**
- **Market Conditions**: Cryptocurrency volatility impact
- **Contributor Behavior**: Historical activity patterns
- **Campaign Progress**: Fundraising velocity and engagement
- **Network State**: Blockchain congestion and gas prices

### Security & Trust Features

#### **Fraud Detection Mechanisms**
- **Behavioral Analytics**: Unusual contribution patterns
- **Address Clustering**: Sybil attack detection
- **Timing Analysis**: Suspicious activity timing
- **Amount Analysis**: Unusual transaction sizes

#### **Transparency & Auditability**
- **Complete Audit Trail**: All AI decisions logged
- **Explainable AI**: Clear reasoning for all verdicts
- **Human Oversight**: Escalation for uncertain cases
- **Regulatory Compliance**: GDPR and blockchain privacy standards

### Performance & Scalability

#### **Real-time Processing**
- **Sub-2-minute verification**: Average processing time
- **Parallel AI analysis**: Multiple agents working simultaneously
- **Caching optimization**: Reduced redundant computations
- **Load balancing**: Distributed processing across AI nodes

#### **Quality Assurance**
- **Confidence thresholds**: Minimum scores for auto-approval
- **Human review triggers**: Automatic escalation protocols
- **Continuous learning**: Model improvement from feedback
- **A/B testing**: Algorithm optimization and validation

### Integration Examples

#### **Frontend Integration**
```javascript
// Submit milestone for AI verification
const submitForVerification = async (milestoneData) => {
    const response = await fetch('/api/verification/verify', {
        method: 'POST',
        body: JSON.stringify({
            milestoneId: milestoneData.id,
            campaignAddress: milestoneData.campaign,
            evidenceHash: milestoneData.evidence,
            description: milestoneData.description
        })
    });

    const result = await response.json();
    // result.verdict: 'approved' | 'rejected' | 'uncertain'
    // result.confidence: 0.0 - 1.0
    // result.reasoning: Detailed explanation
};
```

#### **Backend Processing**
```javascript
// AI verification service call
const verificationResult = await aiVerificationService.verifyMilestoneWithRealtimeData({
    milestoneId: milestone.id,
    campaignAddress: campaign.address,
    evidenceHash: evidence.ipfsHash,
    description: milestone.description,
    submitterAddress: creator.address,
    realtimeContext: getRealtimeContext()
});
```

### Monitoring & Analytics

#### **Verification Metrics**
- **Success Rate**: Percentage of approved milestones
- **Processing Time**: Average verification duration
- **Accuracy Rate**: AI decision accuracy vs human review
- **Fraud Detection**: False positive/negative rates

#### **Real-time Dashboards**
- **Live Verification Queue**: Pending and processing requests
- **Agent Performance**: Individual AI agent metrics
- **Risk Monitoring**: Real-time risk score tracking
- **Market Impact**: External factor influence analysis

### Future Enhancements

#### **Advanced AI Capabilities**
- **Generative AI**: Automated evidence generation assistance
- **Predictive Analytics**: Milestone success forecasting
- **Causal Inference**: Understanding verification factors
- **Federated Learning**: Privacy-preserving model improvement

#### **Enhanced Security**
- **Zero-Knowledge Proofs**: Privacy-preserving verification
- **Multi-signature AI**: Consensus-based decision making
- **Quantum-resistant**: Future-proof cryptographic methods
- **Decentralized AI**: Distributed verification networks

This comprehensive AI verification system ensures that AutoCrowd maintains the highest standards of transparency, security, and trust in the crowdfunding ecosystem.

## Development

### Running Tests

```bash
npm test
```

### Code Style

```bash
npm run lint
```

### Docker Support

```bash
# Build Docker image
docker build -t autocrowd-backend .

# Run with Docker Compose
docker-compose up
```

## Monitoring

The backend includes comprehensive logging and monitoring:

- **Winston Logging**: Structured JSON logging
- **Health Checks**: Service health monitoring
- **Error Tracking**: Sentry integration support
- **Performance Metrics**: Request timing and resource usage

## Security

- **Input Validation**: Joi schema validation
- **Rate Limiting**: API rate limiting
- **CORS Configuration**: Cross-origin resource sharing
- **Helmet**: Security headers
- **Environment Variables**: Secure configuration management

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
