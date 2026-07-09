/*
# NexPay Schema

## Overview
Creates the core tables for the NexPay cross-border stablecoin remittance dApp.

## Tables

### wallets
Stores demo wallets with their private keys and KYC status.
- id: UUID primary key
- address: Ethereum address (unique)
- private_key: encrypted private key for demo relayer
- label: human-friendly name
- kyc_verified: boolean KYC status
- usdc_balance: cached USDC balance (string to handle big numbers)
- created_at: timestamp

### transfers
Records every on-chain transfer with compliance metadata.
- id: UUID primary key
- tx_hash: on-chain transaction hash
- from_address: sender wallet address
- to_address: recipient wallet address
- amount: USDC amount (string, 6 decimals)
- category: 0=PersonalRemittance, 1=BusinessPayment, 2=WalletTransfer
- category_label: human-readable category
- memo: optional transfer memo
- status: pending/confirmed/failed
- created_at: timestamp

### cashout_requests
Records cashout requests to partner bank abstraction.
- id: UUID primary key
- tx_hash: on-chain transaction hash
- from_address: wallet requesting cashout
- amount: USDC amount
- bank_ref: bank reference string (account number, etc.)
- category: compliance category
- status: pending/processing/completed/failed
- created_at: timestamp

## Security
- RLS enabled on all tables with anon+authenticated policies (no-auth demo app)
*/

CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  address text UNIQUE NOT NULL,
  private_key text NOT NULL,
  label text NOT NULL,
  kyc_verified boolean NOT NULL DEFAULT false,
  usdc_balance text NOT NULL DEFAULT '0',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_hash text,
  from_address text NOT NULL,
  to_address text NOT NULL,
  amount text NOT NULL,
  category integer NOT NULL DEFAULT 0,
  category_label text NOT NULL DEFAULT 'PersonalRemittance',
  memo text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cashout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_hash text,
  from_address text NOT NULL,
  amount text NOT NULL,
  bank_ref text NOT NULL,
  category integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashout_requests ENABLE ROW LEVEL SECURITY;

-- wallets policies
DROP POLICY IF EXISTS "anon_select_wallets" ON wallets;
CREATE POLICY "anon_select_wallets" ON wallets FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_wallets" ON wallets;
CREATE POLICY "anon_insert_wallets" ON wallets FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_wallets" ON wallets;
CREATE POLICY "anon_update_wallets" ON wallets FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_wallets" ON wallets;
CREATE POLICY "anon_delete_wallets" ON wallets FOR DELETE TO anon, authenticated USING (true);

-- transfers policies
DROP POLICY IF EXISTS "anon_select_transfers" ON transfers;
CREATE POLICY "anon_select_transfers" ON transfers FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_transfers" ON transfers;
CREATE POLICY "anon_insert_transfers" ON transfers FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_transfers" ON transfers;
CREATE POLICY "anon_update_transfers" ON transfers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_transfers" ON transfers;
CREATE POLICY "anon_delete_transfers" ON transfers FOR DELETE TO anon, authenticated USING (true);

-- cashout_requests policies
DROP POLICY IF EXISTS "anon_select_cashouts" ON cashout_requests;
CREATE POLICY "anon_select_cashouts" ON cashout_requests FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_cashouts" ON cashout_requests;
CREATE POLICY "anon_insert_cashouts" ON cashout_requests FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_cashouts" ON cashout_requests;
CREATE POLICY "anon_update_cashouts" ON cashout_requests FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_cashouts" ON cashout_requests;
CREATE POLICY "anon_delete_cashouts" ON cashout_requests FOR DELETE TO anon, authenticated USING (true);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_transfers_from ON transfers(from_address);
CREATE INDEX IF NOT EXISTS idx_transfers_to ON transfers(to_address);
CREATE INDEX IF NOT EXISTS idx_cashouts_from ON cashout_requests(from_address);
CREATE INDEX IF NOT EXISTS idx_wallets_address ON wallets(address);
