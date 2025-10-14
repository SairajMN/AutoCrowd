# AutoCrowd
# On-Chain AI Crowdfunding Platform MVP

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solidity](https://img.shields.io/badge/Solidity-^0.8.20-blue.svg)](https://soliditylang.org)
[![Foundry](https://img.shields.io/badge/Foundry-v0.2.0-red.svg)](https://getfoundry.sh)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org)
[![Ethereum Sepolia](https://img.shields.io/badge/Network-Sepolia-orange.svg)](https://sepolia.etherscan.io)

A cutting-edge **on-chain AI-powered crowdfunding platform** designed for transparency, security, and autonomous milestone verification. Creators launch campaigns funded with PayPal's **PYUSD stablecoin** on Ethereum Sepolia testnet. Milestones are evaluated by **Artificial Superintelligence (ASI) Alliance agents**, with funds released automatically upon AI approval or via backer voting for uncertain cases. All actions are tracked transparently via **Blockscout**, optimized for hackathon prize categories: **Blockscout ($7,000)**, **PayPal ($10,000)**, and **ASI Alliance ($10,000)**.


## 🎯 Project Overview

This MVP delivers a **functional end-to-end demo** combining blockchain, AI, and user-friendly UI. Key features include:
- **PYUSD Crowdfunding**: Backers fund campaigns using PayPal’s stablecoin with gas-efficient ERC20 transfers.
- **AI-Driven Milestone Verification**: ASI agents analyze milestone proofs (e.g., URLs/text) using uAgents and MeTTa knowledge graphs.
- **Fallback Voting**: Backers vote (weighted by contribution) if AI verdicts are uncertain.
- **Blockscout Transparency**: Real-time transaction and event tracking via custom explorer and SDK.
- **Wallet-Agnostic UI**: Supports MetaMask, WalletConnect, Coinbase Wallet, and more via Wagmi.
- **Prize Optimization**: Tailored for Blockscout, PayPal, and ASI Alliance criteria with on-chain events, AI integration, and seamless UX.

### Workflow Diagram (ASCII)

```
USER JOURNEY:
1. Creator ───Factory───→ New Campaign (Set PYUSD goal + milestones)
   │
2. Backers ──PYUSD──→ Fund Campaign (Approve & transfer via wallet)
   │
3. Creator ──Submit──→ Milestone Proof (URL/text)
   │
4. Contract ──Event──→ AI Backend Listener (uAgents via Web3.py)
   │
5. ASI Agent ──Analysis──→ On-chain Verdict (MeTTa reasoning + ASI:One)
   │
6. IF Approved ──Auto-release──→ Funds to Creator
   │
7. IF Uncertain ──Trigger──→ Backer Voting (Weighted by contribution)
   │
8. ALL Actions ──Blockscout──→ Transparent Tracking (SDK in UI)
```

## 🏗️ Technical Stack

| Layer | Technologies |
|-------|--------------|
| **Blockchain** | Solidity 0.8.20, Foundry, OpenZeppelin, Ethereum Sepolia Testnet, PYUSD ERC20 |
| **AI Integration** | ASI Alliance (uAgents, Agentverse, MeTTa Knowledge Graphs, ASI:One Chat Protocol) |
| **Transparency** | Blockscout Autoscout Explorer, Blockscout SDK, MCP Server for AI queries |
| **Frontend** | Next.js 14 (TypeScript), Wagmi, Ethers.js, WalletConnect v2, Tailwind CSS |
| **Testing/Dev** | Forge tests, Web3.py for agents, Cypress E2E testing |
