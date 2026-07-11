# NexPay - Cross-Border Stablecoin Remittance Platform

NexPay is a high-performance cross-border stablecoin remittance solution built on the **Avalanche Fuji Testnet**. Designed with a "send money like a text" philosophy, NexPay provides instantaneous, low-fee remittance and compliance-categorized transfers for global users. This repository contains the complete hackathon prototype, showcasing end-to-end flows from user wallets, compliance-gated smart contracts, and backend relayer architectures to the web and mobile frontends.

---

## 🚀 Public Use Cases

NexPay supports three key global payment scenarios, each accompanied by compliance-tracking metadata recorded directly on-chain:

1. **Personal Remittance**: Enables overseas workers to send funds home instantly to family and friends with near-zero transaction fees.
2. **Business Payments**: Streamlines B2B invoicing, enabling freelancers and international contractors to receive payments securely.
3. **Wallet Transfers**: Facilitates standard peer-to-peer wallet transfers with minimal friction.
4. **Fiat Off-Ramp / Cash Out**: Integrates a mock bank cashout mechanism that simulates traditional banking system settlements triggered by on-chain events.

---

## 🛠 Tech Stack & Architecture

NexPay is built using a modern, scalable web3 architecture designed to abstract away blockchain complexity:

* **Blockchain & Smart Contracts**:
  * Network: **Avalanche C-Chain (Fuji Testnet)** (Chain ID `43113`)
  * Smart Contract: Solidity (v0.8.20, optimized without external dependencies)
  * Primary Stablecoin: USDC (Fuji Testnet Contract: `0x5425890298aed601595a70AB815c96711a31Bc65`)
* **Backend API & Relayer**:
  * Infrastructure: Supabase Edge Functions (Deno Runtime)
  * Web3 Library: `ethers.js` (v6)
  * Database: Supabase (PostgreSQL with Row-Level Security for transaction indexing)
* **Frontend Clients**:
  * **Web Client**: React + Vite + TypeScript (fully-featured web dashboard)
  * **Mobile Client**: Flutter Material 3 (located in the `frontend/` directory)

---

## 📋 Architecture & Flow

```
┌─────────────────────────────────────────────────────┐
│              Frontend Clients                       │
│  - Web: React/Vite Dashboard                        │
│  - Mobile: Flutter Material 3                       │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│         Supabase Edge Functions                     │
│  - Deno & ethers v6 Backend Routing                 │
│  - Relayer gas funding & compliance checks          │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│         Avalanche Fuji Testnet                      │
│  - NexPay Solidity Smart Contract                   │
│  - USDC token interactions                          │
└─────────────────────────────────────────────────────┘
```

### End-to-End Demo Flow

1. **Wallet Selection**: Select from pre-configured demo wallets (each pre-seeded with mock USDC).
2. **Compliance Verification (KYC)**: Simulate identity verification via a compliance gate button on the dashboard.
3. **Instant Remittance**: Send USDC instantly to any recipient with a designated compliance category (e.g., Personal Remittance, Business Payment, Wallet Transfer).
4. **On-Chain Confirmation**: Experience sub-second transactional finality on the Avalanche C-Chain.
5. **Activity Feed**: Review the transaction details, including on-chain compliance tags, in the live ledger.
6. **Fiat Cashout**: Simulate bank cashout requests via partner off-ramp abstraction.

---

## 💻 API Reference

The backend API layer exposes several endpoints facilitating wallet and transaction management:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Check service health and current operations mode (simulation or live) |
| `/wallets` | GET | List demo wallets and statuses |
| `/balance/:address` | GET | Fetch the specified wallet's USDC and AVAX balances |
| `/transfers/:address` | GET | Fetch transaction and cashout histories |
| `/seed` | POST | Generate and pre-seed mock demo wallets |
| `/kyc/verify` | POST | Verify KYC status for a wallet address |
| `/onramp` | POST | Simulate fiat-to-USDC on-ramping |
| `/transfer` | POST | Process an instant compliance-categorized USDC transfer |
| `/cashout` | POST | Process a mock bank cashout request |

---

## 🔧 Deployment and Setup

The application is built to run in **Simulation Mode** by default, allowing local development and frontend testing without immediate smart contract deployment.

To transition the application to live on-chain operations on Avalanche Fuji, follow the deployment guidelines below:

### Smart Contract Deployment

1. **Navigate to the deployment directory**:
   ```bash
   cd deploy
   ```

2. **Generate a Relayer/Deployer Wallet**:
   Run the compilation and deployment helper script without arguments to generate a new key pair:
   ```bash
   node compile-deploy.mjs
   ```

3. **Fund the Deployer Address**:
   Go to the [Avalanche Faucet](https://faucet.avax.network/), select "Fuji" testnet, and request test AVAX to the generated address.

4. **Deploy the Smart Contract**:
   Deploy NexPay to Fuji Testnet using your funded private key:
   ```bash
   node compile-deploy.mjs <PRIVATE_KEY>
   ```

5. **Configure Secrets**:
   Apply the generated output variables as secrets/environment variables in your backend/Supabase dashboard:
   - `NEXPAY_CONTRACT_ADDRESS`: The deployed contract address.
   - `RELAYER_PRIVATE_KEY`: The relayer wallet private key.
