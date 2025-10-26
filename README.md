# AutoCrowd - Production-Ready AI-Powered Crowdfunding Platform

A decentralized crowdfunding platform with AI-powered milestone verification using ASI (Autonomous Software Intelligence) agents.

## 🏆 Sponsors & Partners

This project proudly integrates cutting-edge technologies from our sponsors:

### 🤖 [ASI - Artificial Super Intelligence](https://asi.one)
**Core AI Engine**: Powers intelligent milestone verification, scam detection, and automated content analysis using advanced machine learning and ASI Alliance ecosystem integration.

### 🔍 [Blockscout](https://blockscout.com)
**Blockchain Intelligence**: Provides comprehensive transaction monitoring, smart contract verification, and real-time blockchain data analytics for complete transparency.

### 💰 [PayPal USD (PYUSD)](https://www.paypal.com/us/digital-wallet/paypal-usd)
**Stablecoin Infrastructure**: Enables secure, stable contributions through PayPal's official USD-pegged stablecoin with enterprise-grade custody and regulatory compliance.

## 🚀 Features

- **🤖 ASI AI Verification**: Real-time milestone verification using autonomous agents
- **🔐 Ballerine KYC Integration**: Production-ready identity verification with NFT minting
- **🔍 Blockscout Integration**: Complete blockchain exploration and monitoring
- **💰 PYUSD Stablecoin**: PayPal-backed stablecoin for contributions
- **🔒 Enhanced Security**: Multi-layered fraud detection and risk assessment
- **📊 Real-Time Analytics**: Live market data and blockchain intelligence
- **🏗️ Production-Ready**: Docker containerization, monitoring, and security hardening

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Blockchain    │
│   (Next.js)     │◄──►│   (Node.js)     │◄──►│   (Ethereum)    │
│                 │    │                 │    │                 │
│ - React UI      │    │ - AI Verification│    │ - Smart        │
│ - Web3 Wallet   │    │ - REST API      │    │   Contracts     │
│ - Blockscout    │    │ - Rate Limiting │    │ - PYUSD Token   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │                        │
                              ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   Database      │    │   Blockscout    │
                       │   (PostgreSQL)  │    │   Explorer      │
                       └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Cache         │
                       │   (Redis)       │
                       └─────────────────┘
```

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Wagmi** - React hooks for Ethereum
- **RainbowKit** - Wallet connection library

### Backend
- **Node.js 18** - JavaScript runtime
- **Express.js** - Web framework
- **PostgreSQL** - Primary database
- **Redis** - Caching and session store
- **Winston** - Logging framework

### Blockchain
- **Solidity** - Smart contract language
- **Foundry** - Development framework
- **Ethers.js** - Ethereum library
- **PYUSD** - PayPal USD stablecoin

### AI & Verification
- **ASI Agents** - Real Autonomous Software Intelligence (Production Mode)
- **MeTTa Knowledge Graph** - Advanced AI reasoning engine
- **AgentVerse** - Multi-agent coordination platform

### DevOps & Monitoring
- **Docker** - Containerization
- **Nginx** - Reverse proxy and load balancer
- **Prometheus** - Metrics collection
- **Grafana** - Monitoring dashboard

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (for local development)
- Git

### Option 1: FREE Vercel Deployment (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/SairajMN/AutoCrowd.git
   cd AutoCrowd
   ```

2. **Run the automated setup script**
   ```bash
   ./setup-free-services.sh
   ```
   This script will:
   - Set up Supabase (Free PostgreSQL)
   - Configure Upstash Redis (Free)
   - Deploy to Vercel automatically
   - Configure all environment variables

3. **Manual Setup (if script doesn't work)**
   ```bash
   # Install Vercel CLI
   npm install -g vercel

   # Login to Vercel
   vercel login

   # Deploy
   vercel --prod
   ```

### Option 2: Local Development

1. **Install dependencies**
   ```bash
   # Backend
   cd backend && npm install

   # Frontend
   cd ../frontend && npm install
   ```

2. **Configure environment variables**
   ```bash
   # Copy and edit environment files
   cp backend/.env.example backend/.env
   cp frontend/.env.local.example frontend/.env.local
   ```

3. **Start development servers**
   ```bash
   # Backend (Terminal 1)
   cd backend && npm run dev

   # Frontend (Terminal 2)
   cd frontend && npm run dev
   ```

### Option 3: Docker Deployment

1. **Deploy with Docker Compose**
   ```bash
   docker-compose up -d
   ```

2. **Verify deployment**
   ```bash
   curl http://localhost/health
   ```

### Local Development

1. **Install dependencies**
   ```bash
   # Install backend dependencies
   cd backend && npm install

   # Install frontend dependencies
   cd ../frontend && npm install

   # Install contracts dependencies
   cd ../contracts && npm install
   ```

2. **Start development servers**
   ```bash
   # Terminal 1: Backend
   cd backend && npm run dev

   # Terminal 2: Frontend
   cd frontend && npm run dev

   # Terminal 3: Contracts (optional)
   cd contracts && npm run dev
   ```

## 🔧 Configuration

### Complete Environment Setup

For comprehensive environment variable configuration, see **[ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md)** - your complete guide to all configuration options including:

- **Blockchain Configuration**: RPC URLs, private keys, contract addresses
- **AI Integration**: ASI API credentials, AgentVerse tokens
- **Database Setup**: Supabase PostgreSQL configuration
- **Ballerine KYC**: Production API keys and webhook settings
- **Security**: JWT secrets, encryption keys, monitoring
- **Frontend Settings**: API URLs, feature flags, analytics

### Quick Environment Setup
```bash
# Copy all environment templates
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
cp contracts/.env.example contracts/.env

# Edit with your actual credentials
code .env backend/.env frontend/.env.local contracts/.env
```

## 🔒 Security Features

- **Rate Limiting**: API rate limiting with Redis
- **CORS**: Configured CORS policies
- **Helmet**: Security headers middleware
- **Input Validation**: Joi schema validation
- **HTTPS**: SSL/TLS encryption
- **Container Security**: Non-root user execution

## 📊 Monitoring & Observability

### Health Checks
- Application health endpoints
- Database connectivity checks
- Blockchain node connectivity
- AI service availability

### Metrics
- Prometheus metrics collection
- Grafana dashboards
- Error tracking with Sentry
- Performance monitoring

### Logging
- Structured JSON logging
- Log levels (error, warn, info, debug)
- Log aggregation and analysis

## 🧪 Testing

```bash
# Run backend tests
cd backend && npm test

# Run contract tests
cd contracts && npm test

# Run frontend tests
cd frontend && npm run test
```

## 📦 Deployment Options

### Docker Compose (Recommended)
```bash
docker-compose up -d
```

### Kubernetes
```bash
kubectl apply -f k8s/
```


### VERIFIED CONTRACTS
```terminal
CAMPAIGN_FACTORY_ADDRESS=0x3d8Ec8993A50A8E0FF5B8453cEb9fa080FA49d0C
VERIFICATION_FACTORY_ADDRESS=0xe59F4D2627A6361C4c1afc1007be0538794f9712
VERIFICATION_NFT_ADDRESS=0x20414055d367f21A82665e9DE57E03e79F5aF01b
AI_VERIFICATION_HANDLER_ADDRESS=0x5Eeb0cda16903c2b3c867E0029a5Fb20792a3832

```

### Cloud Platforms
- **AWS**: ECS, EKS, or Elastic Beanstalk
- **Google Cloud**: Cloud Run or GKE
- **Azure**: Container Instances or AKS

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📚 Documentation

### Core Documentation
- **[ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md)** - Complete environment setup guide
- **[ENHANCED_KYC_SYSTEM.md](ENHANCED_KYC_SYSTEM.md)** - Detailed KYC verification system
- **[FREE_SERVICES_GUIDE.md](FREE_SERVICES_GUIDE.md)** - Free tier deployment guide
- **[FETCH_AI_SETUP.md](FETCH_AI_SETUP.md)** - AI integration setup

### Component Documentation
- **[backend/README.md](backend/README.md)** - Backend API documentation
- **[frontend/frontend.md](frontend/frontend.md)** - Frontend development guide
- **[KYC_RESET_GUIDE.md](KYC_RESET_GUIDE.md)** - KYC system maintenance
- **[QUICK_START_GUIDE.md](QUICK_START_GUIDE.md)** - Fast deployment guide

### Sponsor Documentation
- **[sponsors/ASI.md](sponsors/ASI.md)** - ASI integration guide
- **[sponsors/blockscout.md](sponsors/blockscout.md)** - Blockscout setup
- **[sponsors/PAYPALUSD.md](sponsors/PAYPALUSD.md)** - PYUSD integration

## 🆘 Support

- **Documentation**: See comprehensive docs above
- **Issues**: [GitHub Issues](https://github.com/SairajMN/AutoCrowd/issues)
- **Discussions**: [GitHub Discussions](https://github.com/SairajMN/AutoCrowd/discussions)

## 🔗 Links

- **Live Demo**: [https://auto-crowd-frontend.vercel.app](https://auto-crowd-frontend.vercel.app)
- **API Documentation**: [https://auto-crowd-frontend.vercel.app/api](https://auto-crowd-frontend.vercel.app/api)
- **Blockscout Explorer**: [https://eth-sepolia.blockscout.com](https://eth-sepolia.blockscout.com)

---

Built with ❤️ using cutting-edge AI and blockchain technology.
