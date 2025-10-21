# AutoCrowd - Production-Ready AI-Powered Crowdfunding Platform

A decentralized crowdfunding platform with AI-powered milestone verification using ASI (Autonomous Software Intelligence) agents.

## 🚀 Features

- **AI-Powered Verification**: Real-time milestone verification using ASI agents
- **Blockchain Integration**: Secure smart contracts on Ethereum Sepolia
- **PYUSD Stablecoin**: US Dollar-pegged stablecoin for contributions
- **Blockscout Explorer**: Enhanced blockchain exploration capabilities
- **Production-Ready**: Docker containerization, monitoring, and security hardening

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

### Environment Variables

#### Backend (.env)
```env
# Server
PORT=8000
NODE_ENV=production

# Blockchain
ETH_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_RPC_KEY
PRIVATE_KEY=YOUR_PRIVATE_KEY
CHAIN_ID=11155111

# AI/ASI
ASI_API_KEY=YOUR_ASI_API_KEY
METTA_KNOWLEDGE_GRAPH_URL=https://metta.asi.one
AGENT_VERSE_URL=https://agentverse.asi.one

# Database
DATABASE_URL=postgresql://user:password@db-host:5432/autocrowd
REDIS_URL=redis://redis-host:6379

# Security
JWT_SECRET=YOUR_JWT_SECRET
ENCRYPTION_KEY=YOUR_ENCRYPTION_KEY

# Monitoring
SENTRY_DSN=YOUR_SENTRY_DSN
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_RPC_KEY
NEXT_PUBLIC_BLOCK_EXPLORER=https://eth-sepolia.blockscout.com
NEXT_PUBLIC_API_URL=https://your-api-domain.com
NEXT_PUBLIC_SENTRY_DSN=YOUR_SENTRY_DSN
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

## 🆘 Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/SairajMN/AutoCrowd/issues)
- **Discussions**: [GitHub Discussions](https://github.com/SairajMN/AutoCrowd/discussions)

## 🔗 Links

- **Live Demo**: [https://auto-crowd-frontend.vercel.app](https://auto-crowd-frontend.vercel.app)
- **API Documentation**: [https://auto-crowd-frontend.vercel.app/api](https://auto-crowd-frontend.vercel.app/api)
- **Blockscout Explorer**: [https://eth-sepolia.blockscout.com](https://eth-sepolia.blockscout.com)

---

Built with ❤️ using cutting-edge AI and blockchain technology.
