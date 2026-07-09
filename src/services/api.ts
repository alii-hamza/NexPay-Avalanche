import { createClient } from '@supabase/supabase-js';
import { Wallet, Transfer, CashoutRequest } from '../types';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ── helpers ──────────────────────────────────────────────────────────────────

function mockTxHash() {
  return '0x' + Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

// ── wallets ───────────────────────────────────────────────────────────────────

export async function getWallets(): Promise<Wallet[]> {
  const { data, error } = await supabase
    .from('wallets')
    .select('address, label, kyc_verified, usdc_balance, created_at')
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Wallet[];
}

export async function seedWallets(): Promise<Wallet[]> {
  const demos = [
    { address: '0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0', label: 'Alice (Overseas Worker)', kyc_verified: true,  usdc_balance: '100.000000', private_key: 'demo_key_alice' },
    { address: '0xb2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1', label: 'Bob (Freelancer)',        kyc_verified: true,  usdc_balance: '100.000000', private_key: 'demo_key_bob'   },
    { address: '0xc3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2', label: 'Carol (Wallet User)',   kyc_verified: false, usdc_balance: '100.000000', private_key: 'demo_key_carol' },
  ];
  await supabase.from('wallets').upsert(demos, { onConflict: 'address' });
  return getWallets();
}

// ── transfers ─────────────────────────────────────────────────────────────────

export async function getTransfers(address: string): Promise<{ transfers: Transfer[]; cashouts: CashoutRequest[] }> {
  const addr = address.toLowerCase();

  const [{ data: sent }, { data: received }, { data: cashouts }] = await Promise.all([
    supabase.from('transfers').select('*').eq('from_address', addr).order('created_at', { ascending: false }),
    supabase.from('transfers').select('*').eq('to_address',   addr).order('created_at', { ascending: false }),
    supabase.from('cashout_requests').select('*').eq('from_address', addr).order('created_at', { ascending: false }),
  ]);

  const all = [
    ...(sent     ?? []).map(t => ({ ...t, direction: 'sent'     as const })),
    ...(received ?? []).map(t => ({ ...t, direction: 'received' as const })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return { transfers: all as Transfer[], cashouts: (cashouts ?? []) as CashoutRequest[] };
}

// ── send transfer (simulation) ────────────────────────────────────────────────

export async function sendTransfer(params: {
  fromAddress: string;
  toAddress: string;
  amount: string;
  category: number;
  memo: string;
}): Promise<{ txHash: string }> {
  const { fromAddress, toAddress, amount, category, memo } = params;
  const from = fromAddress.toLowerCase();
  const to   = toAddress.toLowerCase();
  const txHash = mockTxHash();

  // 1. Deduct from sender
  const { data: sender } = await supabase
    .from('wallets').select('usdc_balance').eq('address', from).maybeSingle();
  const newSenderBal = Math.max(0, parseFloat(sender?.usdc_balance ?? '0') - parseFloat(amount));

  // 2. Credit recipient
  const { data: recip } = await supabase
    .from('wallets').select('usdc_balance').eq('address', to).maybeSingle();
  const newRecipBal = parseFloat(recip?.usdc_balance ?? '0') + parseFloat(amount);

  const CATEGORY_LABELS = ['PersonalRemittance', 'BusinessPayment', 'WalletTransfer'];

  // 3. Write all three changes in parallel
  await Promise.all([
    supabase.from('wallets').update({ usdc_balance: newSenderBal.toFixed(6) }).eq('address', from),
    supabase.from('wallets').update({ usdc_balance: newRecipBal.toFixed(6)  }).eq('address', to),
    supabase.from('transfers').insert({
      from_address:   from,
      to_address:     to,
      amount:         String(amount),
      category,
      category_label: CATEGORY_LABELS[category] ?? 'WalletTransfer',
      memo:           memo ?? '',
      status:         'confirmed',
      tx_hash:        txHash,
    }),
  ]);

  return { txHash };
}

// ── cashout (simulation) ──────────────────────────────────────────────────────

export async function submitCashout(params: {
  fromAddress: string;
  amount: string;
  bankRef: string;
  category: number;
}): Promise<{ txHash: string }> {
  const { fromAddress, amount, bankRef, category } = params;
  const from    = fromAddress.toLowerCase();
  const txHash  = mockTxHash();

  const { data: wallet } = await supabase
    .from('wallets').select('usdc_balance').eq('address', from).maybeSingle();
  const newBal = Math.max(0, parseFloat(wallet?.usdc_balance ?? '0') - parseFloat(amount));

  await Promise.all([
    supabase.from('wallets').update({ usdc_balance: newBal.toFixed(6) }).eq('address', from),
    supabase.from('cashout_requests').insert({
      from_address: from,
      amount:       String(amount),
      bank_ref:     bankRef,
      category,
      status:       'processing',
      tx_hash:      txHash,
    }),
  ]);

  return { txHash };
}

// ── kyc (toggle in DB) ────────────────────────────────────────────────────────

export async function verifyKyc(address: string): Promise<void> {
  await supabase.from('wallets').update({ kyc_verified: true }).eq('address', address.toLowerCase());
}
