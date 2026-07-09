import { useState } from 'react';
import { submitCashout } from '../services/api';
import { Wallet, CATEGORIES } from '../types';

interface CashoutScreenProps {
  wallet: Wallet | null;
  onSuccess: (updated?: Wallet[]) => void;
  onBack: () => void;
}

export function CashoutScreen({ wallet, onSuccess, onBack }: CashoutScreenProps) {
  const [amount, setAmount] = useState('0');
  const [bankName, setBankName] = useState('');
  const [account, setAccount] = useState('');
  const [routing, setRouting] = useState('');
  const [category, setCategory] = useState(0);
  const [step, setStep] = useState<'form' | 'sending' | 'success'>('form');
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState<string | null>(null);

  const balance = parseFloat(wallet?.usdc_balance || '0');

  function keyPress(k: string) {
    setAmount(prev => {
      if (k === '⌫') { const s = prev.slice(0, -1); return s === '' || s === '0' ? '0' : s; }
      if (k === '.' && prev.includes('.')) return prev;
      if (k === '.' && prev === '0') return '0.';
      const after = prev === '0' && k !== '.' ? k : prev + k;
      if (after.includes('.') && after.split('.')[1].length > 2) return prev;
      return after;
    });
  }

  async function submit() {
    const n = parseFloat(amount);
    if (!wallet || isNaN(n) || n <= 0) { setError('Enter a valid amount'); return; }
    if (n > balance) { setError('Insufficient balance'); return; }
    if (!bankName || !account || !routing) { setError('Fill in all bank details'); return; }

    setError(null);
    setStep('sending');
    try {
      const res = await submitCashout({
        fromAddress: wallet.address,
        amount,
        bankRef: `${bankName}|${account}|${routing}`,
        category,
      });
      setTxHash(res.txHash ?? '');
      setStep('success');
      onSuccess();
    } catch (e: any) {
      setError(e.message);
      setStep('form');
    }
  }

  if (step === 'success') {
    return (
      <div className="screen-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 28px', gap: 20, background: 'var(--bg)' }}>
        <div className="success-ring anim-pop">
          <span style={{ fontSize: 36 }}>🏦</span>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'var(--text)', fontSize: 24, fontWeight: 800 }}>Cashout Submitted!</div>
          <div style={{ color: 'var(--text2)', fontSize: 14, marginTop: 8, lineHeight: 1.5 }}>
            ${parseFloat(amount).toFixed(2)} USDC locked on-chain.<br />Partner settles to bank in 1–2 days.
          </div>
        </div>
        {txHash && (
          <div style={{ padding: '8px 14px', background: 'var(--card)', borderRadius: 10, border: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text3)', fontSize: 11, fontFamily: 'monospace' }}>TX: {txHash.slice(0,12)}...{txHash.slice(-8)}</span>
          </div>
        )}
        <button onClick={() => { setAmount('0'); setBankName(''); setAccount(''); setRouting(''); setStep('form'); setTxHash(''); }}
          style={{ width: '100%', padding: 16, borderRadius: 16, background: 'var(--primary)', color: 'white', fontWeight: 700, fontSize: 16 }}>
          Done
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', background: 'var(--bg)', position: 'relative' }}>
      {/* Header */}
      <div className="nav-bar">
        <button onClick={onBack} style={{ color: 'var(--primary)', fontWeight: 600, fontSize: 16 }}>← Back</button>
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', color: 'var(--text)', fontWeight: 700, fontSize: 16 }}>Cash Out</div>
      </div>

      <div className="screen-body" style={{ padding: '16px 20px 32px' }}>
        {/* Banner */}
        <div style={{ padding: '12px 14px', borderRadius: 14, background: 'linear-gradient(135deg, rgba(0,211,149,0.08), rgba(0,82,255,0.05))', border: '1px solid rgba(0,211,149,0.2)', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <span style={{ fontSize: 24 }}>🌐</span>
          <div>
            <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: 13 }}>Global Partner Network</div>
            <div style={{ color: 'var(--text3)', fontSize: 11 }}>150+ countries · 1–2 day settlement</div>
          </div>
        </div>

        {/* Wallet */}
        {wallet && (
          <div style={{ padding: '10px 14px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: 'var(--text2)', fontSize: 11 }}>From</div>
              <div style={{ color: 'var(--text)', fontWeight: 600, fontSize: 13 }}>{wallet.label}</div>
            </div>
            <div style={{ color: 'var(--accent)', fontWeight: 800, fontSize: 15 }}>${balance.toFixed(2)} USDC</div>
          </div>
        )}

        {/* Amount display */}
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ color: 'var(--text)', fontSize: 56, fontWeight: 800, letterSpacing: -2, lineHeight: 1 }}>
            ${amount === '0' ? '0' : amount}
          </div>
          <div style={{ color: 'var(--text3)', fontSize: 12, marginTop: 4 }}>USDC to cash out</div>
          {parseFloat(amount) > balance && <div style={{ color: 'var(--error)', fontSize: 12, marginTop: 4 }}>Insufficient balance</div>}
        </div>

        {/* Keypad */}
        <div className="keypad" style={{ margin: '8px 0 20px' }}>
          {['1','2','3','4','5','6','7','8','9','.','0','⌫'].map(k => (
            <button key={k} className="key-btn" onClick={() => keyPress(k)}
              style={{ fontSize: k === '⌫' ? 22 : 26, color: k === '⌫' ? 'var(--text2)' : 'var(--text)' }}>
              {k}
            </button>
          ))}
        </div>

        {/* Bank details */}
        <div style={{ color: 'var(--text3)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Bank Details</div>
        <div style={{ background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 16 }}>
          {[
            { label: 'Bank Name', value: bankName, set: setBankName, placeholder: 'e.g. Chase, BPI, HDFC' },
            { label: 'Account Number', value: account, set: setAccount, placeholder: '1234 5678 9012' },
            { label: 'Routing / SWIFT', value: routing, set: setRouting, placeholder: '021000021 or CHASUS33' },
          ].map((f, i) => (
            <div key={f.label} style={{ padding: '10px 14px', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ color: 'var(--text3)', fontSize: 10, fontWeight: 600, marginBottom: 3 }}>{f.label}</div>
              <input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text)', fontSize: 14 }} />
            </div>
          ))}
        </div>

        {/* Category */}
        <div style={{ color: 'var(--text3)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Category</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {CATEGORIES.map(c => (
            <button key={c.value} onClick={() => setCategory(c.value)} className="cat-pill" style={{
              background: category === c.value ? 'rgba(0,82,255,0.18)' : 'var(--card)',
              color: category === c.value ? 'var(--primary)' : 'var(--text2)',
              border: category === c.value ? '1.5px solid rgba(0,82,255,0.5)' : '1px solid var(--border)',
            }}>
              {c.icon} {c.label}
            </button>
          ))}
        </div>

        {/* Warning */}
        <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(255,152,0,0.08)', border: '1px solid rgba(255,152,0,0.2)', marginBottom: 16, color: 'var(--warning)', fontSize: 12, lineHeight: 1.5 }}>
          ⚠️ USDC locked on-chain. Partner settles to bank in 1–2 business days. Demo flow.
        </div>

        {error && (
          <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--error-bg)', color: 'var(--error)', fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <button onClick={submit} disabled={step === 'sending'}
          style={{
            width: '100%', padding: 16, borderRadius: 16,
            background: 'transparent', border: '2px solid var(--accent)',
            color: 'var(--accent)', fontWeight: 700, fontSize: 15,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            opacity: step === 'sending' ? 0.7 : 1,
          }}>
          {step === 'sending' ? (
            <>
              <span className="spinner" style={{ width: 18, height: 18, borderTopColor: 'var(--accent)', borderRightColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: 'transparent' }} />
              Processing...
            </>
          ) : 'Cash Out to Bank (via partner)'}
        </button>
      </div>
    </div>
  );
}
