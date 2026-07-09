export interface Wallet {
  address: string;
  label: string;
  kyc_verified: boolean;
  usdc_balance: string;
  created_at: string;
}

export interface Transfer {
  id: string;
  tx_hash?: string;
  from_address: string;
  to_address: string;
  amount: string;
  category: number;
  category_label: string;
  memo: string;
  status: string;
  created_at: string;
  direction?: 'sent' | 'received';
}

export interface CashoutRequest {
  id: string;
  tx_hash?: string;
  from_address: string;
  amount: string;
  bank_ref: string;
  category: number;
  status: string;
  created_at: string;
}

export type Screen = 'home' | 'send' | 'cashout' | 'activity';

export const CATEGORIES = [
  { value: 0, label: 'Personal Remittance', subtitle: 'Family & personal support', icon: '🏠' },
  { value: 1, label: 'Freelancer Payment', subtitle: 'Business & contractor payments', icon: '💼' },
  { value: 2, label: 'Wallet Transfer', subtitle: 'Direct wallet to wallet', icon: '⇄' },
];
