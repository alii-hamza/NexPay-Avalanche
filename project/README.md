# NexPay - Cross-border Stablecoin Remittance on Avalanche

## Hackathon Demo - Avalanche Fuji Testnet

> "Send money like a text - instant, near-free."

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Frontend (React/Vite + Flutter)                    │
│  - Home: balance + wallet selector                  │
│  - Send: address, amount, category dropdown         │
│  - Cashout: mock bank form                          │
│  - Activity: full transaction feed                  │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│  Supabase Edge Function (Deno/ethers v6)             │
│  /kyc/verify  /onramp  /transfer                    │
│  /cashout     /transfers/:addr  /balance/:addr      │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│  NexPay.sol (Solidity 0.8.20)                       │
│  Avalanche Fuji C-Chain                              │
│  USDC: 0x5425890298aed601595a70AB815c96711a31Bc65   │
└─────────────────────────────────────────────────────┘
```

## Demo Flow

1. **Select wallet** (Alice, Bob, or Carol - all pre-seeded with 100 USDC)
2. **Verify KYC** for any unverified wallet (button on home screen)
3. **Tap "Send Instantly"** - select recipient, amount, category
4. **Confirm transfer** - sent on-chain in ~1 second
5. **View Activity** - see category tag (PersonalRemittance / BusinessPayment / WalletTransfer) on every TX
6. **Cash Out to Bank** - mock fiat off-ramp via partner abstraction

## Deploying the Smart Contract

The demo runs in simulation mode by default. To go fully live on-chain:

```bash
# 1. Generate a relayer wallet
cd deploy
node compile-deploy.mjs

# 2. Fund the generated address at https://faucet.avax.network/
# Select "Fuji" testnet, paste the address

# 3. Deploy
node compile-deploy.mjs <PRIVATE_KEY>

# 4. Add secrets to Supabase edge function:
# NEXPAY_CONTRACT_ADDRESS=<deployed address>
# RELAYER_PRIVATE_KEY=<private key>
```

## Contract Functions

```solidity
// Instant USDC transfer with compliance category on-chain
transferInstant(address to, uint256 amount, uint8 category, string memo)
// 0=PersonalRemittance, 1=BusinessPayment, 2=WalletTransfer

// Lock USDC, emit CashoutRequested for off-chain partner
requestCashout(uint256 amount, string bankRef, uint8 category)

// Owner-only KYC gate
setKYC(address, bool)
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Service health + mode |
| `/wallets` | GET | List demo wallets |
| `/balance/:addr` | GET | USDC + AVAX balance |
| `/transfers/:addr` | GET | Full transaction history |
| `/seed` | POST | Create 3 demo wallets |
| `/kyc/verify` | POST | KYC gate wallet |
| `/onramp` | POST | Mock fiat → USDC |
| `/transfer` | POST | Instant wallet transfer |
| `/cashout` | POST | Bank cashout request |

## Compliance Categories

Every transaction carries a compliance tag on-chain:

| Code | Label | Use Case |
|------|-------|----------|
| 0 | PersonalRemittance | Overseas worker sending home |
| 1 | BusinessPayment | Freelancer invoice payment |
| 2 | WalletTransfer | Pure wallet-to-wallet |

## Tech Stack

- **Chain**: Avalanche C-Chain (Fuji Testnet, Chain ID 43113)
- **Smart Contract**: Solidity 0.8.20 (no OpenZeppelin dependency)
- **Backend**: Deno + ethers v6 (Supabase Edge Function)
- **Frontend (web)**: React + Vite (this demo)
- **Frontend (mobile)**: Flutter Material 3 (see `frontend/`)
- **Database**: Supabase (PostgreSQL with RLS)
- **USDC**: `0x5425890298aed601595a70AB815c96711a31Bc65` (Fuji)
