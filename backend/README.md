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

## AI Verification Workflow

1. **Milestone Submission**: Creator submits milestone completion
2. **Evidence Analysis**: MeTTa knowledge graph analyzes evidence
3. **Agent Verification**: ASI agents provide verification verdict
4. **Result Combination**: Evidence analysis and agent verdict combined
5. **Blockchain Update**: Verdict submitted to smart contracts
6. **Fund Release**: Funds released automatically if approved

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
