import { useState } from 'react';
import { sendTransfer } from '../services/api';
import { Wallet, CATEGORIES } from '../types';

interface SendScreenProps {
  wallets: Wallet[];
  activeWallet: Wallet | null;
  onSuccess: (updated?: Wallet[]) => void;
  onBack: () => void;
}

const AVATARS = ['👩', '👨', '🧑'];
const AVATAR_COLORS = [
  ['#0052FF', '#1a6fff'],
  ['#7B2FF7', '#9b4fff'],
  ['#00A876', '#00D395'],
];

function short(addr: string) { return `${addr.slice(0, 6)}...${addr.slice(-4)}`; }

export function SendScreen({ wallets, activeWallet, onSuccess, onBack }: SendScreenProps) {
  // step: 'contacts' → pick who to send to
  //       'amount'   → keypad + confirm sheet
  //       'sending'  → in-flight
  //       'success'  → done
  const [step, setStep] = useState<'contacts' | 'amount' | 'sending' | 'success'>('contacts');
  const [recipient, setRecipient] = useState<Wallet | null>(null);
  const [amount, setAmount] = useState('0');
  const [category, setCategory] = useState(0);
  const [memo, setMemo] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [txResult, setTxResult] = useState<any>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const contacts = wallets.filter(w => w.address !== activeWallet?.address);
  const balance = parseFloat(activeWallet?.usdc_balance || '0');
  const amountNum = parseFloat(amount) || 0;

  // ── Keypad ────────────────────────────────────────────
  function keyPress(k: string) {
    setAmount(prev => {
      if (k === '⌫') {
        const s = prev.slice(0, -1);
        return s === '' ? '0' : s;
      }
      if (k === '.' && prev.includes('.')) return prev;
      if (k === '.' && prev === '0') return '0.';
      const next = prev === '0' && k !== '.' ? k : prev + k;
      if (next.includes('.') && next.split('.')[1].length > 2) return prev;
      return next;
    });
  }

  function selectContact(w: Wallet) {
    setRecipient(w);
    setAmount('0');
    setCategory(0);
    setMemo('');
    setError(null);
    setStep('amount');
  }

  // ── Send ──────────────────────────────────────────────
  async function send() {
    if (!activeWallet || !recipient) return;
    setShowConfirm(false);
    setStep('sending');
    const start = Date.now();
    try {
      const res = await sendTransfer({
        fromAddress: activeWallet.address,
        toAddress: recipient.address,
        amount,
        category,
        memo,
      });
      setElapsedMs(Date.now() - start);
      setTxResult(res);

      // optimistic balance update
      const updated = wallets.map(w => {
        if (w.address === activeWallet.address)
          return { ...w, usdc_balance: String(Math.max(0, parseFloat(w.usdc_balance) - amountNum).toFixed(6)) };
        if (w.address === recipient.address)
          return { ...w, usdc_balance: String((parseFloat(w.usdc_balance) + amountNum).toFixed(6)) };
        return w;
      });

      setStep('success');
      onSuccess(updated);
    } catch (e: any) {
      setError(e.message);
      setStep('amount');
    }
  }

  // ─────────────────────────────────────────────────────
  // SUCCESS
  // ─────────────────────────────────────────────────────
  if (step === 'success' && txResult && recipient) {
    const rIdx = wallets.indexOf(recipient);
    return (
      <div className="screen-body" style={{
        background: 'var(--bg)', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '32px 24px 40px', gap: 0,
      }}>
        {/* Check circle */}
        <div className="anim-pop" style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'rgba(0,200,83,0.14)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20,
        }}>
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>

        <div style={{ color: 'var(--text)', fontSize: 28, fontWeight: 800, letterSpacing: -0.5, marginBottom: 6 }}>
          ${amountNum.toFixed(2)}
        </div>
        <div style={{ color: 'var(--text2)', fontSize: 15, marginBottom: 28 }}>
          sent to <strong style={{ color: 'var(--text)' }}>{recipient.label}</strong>
        </div>

        {/* Receipt card */}
        <div style={{ width: '100%', background: 'var(--card)', borderRadius: 18, border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 24 }}>
          {[
            ['To', recipient.label],
            ['Address', short(recipient.address)],
            ['Amount', `$${amountNum.toFixed(2)} USD`],
            ['Category', CATEGORIES[category]?.label ?? ''],
            ...(memo ? [['Memo', memo]] : []),
            ['Speed', `${elapsedMs}ms`],
            ['Network', 'Avalanche Fuji'],
            ['TX', txResult.txHash ? `${txResult.txHash.slice(0, 10)}...${txResult.txHash.slice(-6)}` : 'Simulated'],
          ].map(([k, v], i, arr) => (
            <div key={k} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 16px',
              borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <span style={{ color: 'var(--text3)', fontSize: 13 }}>{k}</span>
              <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: 13, maxWidth: '60%', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => { setStep('contacts'); setRecipient(null); setAmount('0'); setTxResult(null); }}
          style={{ width: '100%', padding: 16, borderRadius: 16, background: 'var(--primary)', color: 'white', fontWeight: 700, fontSize: 16, marginBottom: 10 }}>
          Send Again
        </button>
        <button
          onClick={onBack}
          style={{ width: '100%', padding: 14, borderRadius: 16, background: 'transparent', color: 'var(--text3)', fontWeight: 600, fontSize: 15 }}>
          Back to Home
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────
  // CONTACTS LIST
  // ─────────────────────────────────────────────────────
  if (step === 'contacts') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', background: 'var(--bg)' }}>
        <div className="nav-bar">
          <button onClick={onBack} style={{ color: 'var(--primary)', fontWeight: 600, fontSize: 15 }}>← Back</button>
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', color: 'var(--text)', fontWeight: 700, fontSize: 16 }}>Send Money</div>
        </div>

        <div className="screen-body" style={{ padding: '8px 16px 32px' }}>
          {/* From wallet pill */}
          {activeWallet && (
            <div style={{ padding: '10px 14px', borderRadius: 14, background: 'var(--card)', border: '1px solid var(--border)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 6px var(--accent)' }} />
              <div style={{ flex: 1 }}>
                <span style={{ color: 'var(--text3)', fontSize: 11 }}>Sending from  </span>
                <span style={{ color: 'var(--text)', fontWeight: 700, fontSize: 13 }}>{activeWallet.label}</span>
              </div>
              <span style={{ color: 'var(--accent)', fontWeight: 800, fontSize: 16 }}>${balance.toFixed(2)}</span>
            </div>
          )}

          <div style={{ color: 'var(--text3)', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12, paddingLeft: 2 }}>
            Select Recipient
          </div>

          {contacts.length === 0 ? (
            <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text3)' }}>No other wallets available</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {contacts.map((w, ci) => {
                const wIdx = wallets.indexOf(w);
                const [c1, c2] = AVATAR_COLORS[wIdx % AVATAR_COLORS.length];
                const wBal = parseFloat(w.usdc_balance || '0');
                return (
                  <button
                    key={w.address}
                    onClick={() => selectContact(w)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 14px', borderRadius: 16, width: '100%', textAlign: 'left',
                      background: 'var(--card)', border: '1px solid var(--border)',
                      marginBottom: 8,
                      transition: 'all 0.12s',
                    }}
                    onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.985)')}
                    onMouseUp={e => (e.currentTarget.style.transform = '')}
                    onMouseLeave={e => (e.currentTarget.style.transform = '')}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: 50, height: 50, borderRadius: 16, flexShrink: 0,
                      background: `linear-gradient(135deg, ${c1}, ${c2})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 24,
                    }}>
                      {AVATARS[wIdx % AVATARS.length]}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <span style={{ color: 'var(--text)', fontWeight: 700, fontSize: 15 }}>{w.label}</span>
                        {w.kyc_verified && (
                          <span style={{ fontSize: 10, color: 'var(--accent)', background: 'rgba(0,211,149,0.12)', padding: '1px 5px', borderRadius: 5, fontWeight: 700 }}>KYC</span>
                        )}
                      </div>
                      <div style={{ color: 'var(--text3)', fontSize: 11, fontFamily: 'monospace' }}>
                        {w.address.slice(0, 10)}...{w.address.slice(-6)}
                      </div>
                    </div>

                    {/* Balance + arrow */}
                    <div style={{ flexShrink: 0, textAlign: 'right', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div>
                        <div style={{ color: 'var(--text2)', fontWeight: 700, fontSize: 15 }}>${wBal.toFixed(2)}</div>
                        <div style={{ color: 'var(--text3)', fontSize: 10 }}>USD</div>
                      </div>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────
  // AMOUNT ENTRY (after contact selected)
  // ─────────────────────────────────────────────────────
  const recipientIdx = recipient ? wallets.indexOf(recipient) : 0;
  const [rc1, rc2] = AVATAR_COLORS[recipientIdx % AVATAR_COLORS.length];
  const canSend = amountNum > 0 && amountNum <= balance && recipient !== null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', background: 'var(--bg)', position: 'relative' }}>
      <div className="nav-bar">
        <button onClick={() => { setStep('contacts'); setError(null); }} style={{ color: 'var(--primary)', fontWeight: 600, fontSize: 15 }}>← Contacts</button>
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', color: 'var(--text)', fontWeight: 700, fontSize: 16 }}>Enter Amount</div>
      </div>

      <div className="screen-body" style={{ padding: '16px 20px 32px' }}>
        {/* Selected recipient */}
        {recipient && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
            borderRadius: 16, background: 'var(--card)', border: '1px solid var(--border)',
            marginBottom: 20,
          }}>
            <div style={{ width: 42, height: 42, borderRadius: 13, flexShrink: 0, background: `linear-gradient(135deg,${rc1},${rc2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
              {AVATARS[recipientIdx % AVATARS.length]}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: 'var(--text3)', fontSize: 11 }}>Sending to</div>
              <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: 15 }}>{recipient.label}</div>
            </div>
            <button
              onClick={() => setStep('contacts')}
              style={{ color: 'var(--primary)', fontSize: 12, fontWeight: 600, background: 'rgba(0,82,255,0.1)', padding: '4px 10px', borderRadius: 8 }}>
              Change
            </button>
          </div>
        )}

        {/* Amount display */}
        <div style={{ textAlign: 'center', padding: '12px 0 4px' }}>
          <div style={{
            color: amountNum > balance ? 'var(--error)' : 'var(--text)',
            fontSize: 64, fontWeight: 800, letterSpacing: -3, lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            transition: 'color 0.15s',
          }}>
            ${amount === '0' ? '0' : amount}
          </div>
          <div style={{ color: 'var(--text3)', fontSize: 13, marginTop: 6 }}>
            USD  ·  Balance: <span style={{ color: 'var(--accent)' }}>${balance.toFixed(2)}</span>
          </div>
          {amountNum > balance && (
            <div style={{ color: 'var(--error)', fontSize: 12, marginTop: 4, fontWeight: 600 }}>Insufficient balance</div>
          )}
        </div>

        {/* Quick amounts */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', margin: '12px 0' }}>
          {[10, 25, 50, 100].map(n => (
            <button key={n} onClick={() => setAmount(String(n))} style={{
              padding: '5px 12px', borderRadius: 20,
              background: amountNum === n ? 'var(--primary)' : 'var(--card)',
              color: amountNum === n ? 'white' : 'var(--text2)',
              fontSize: 13, fontWeight: 600,
              border: amountNum === n ? 'none' : '1px solid var(--border)',
              transition: 'all 0.12s',
            }}>
              ${n}
            </button>
          ))}
        </div>

        {/* Keypad */}
        <div className="keypad" style={{ margin: '8px 0 14px' }}>
          {['1','2','3','4','5','6','7','8','9','.','0','⌫'].map(k => (
            <button key={k} className="key-btn" onClick={() => keyPress(k)}
              style={{ fontSize: k === '⌫' ? 20 : 26, color: k === '⌫' ? 'var(--text2)' : 'var(--text)' }}>
              {k}
            </button>
          ))}
        </div>

        {/* Category */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: 'var(--text3)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Category</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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
        </div>

        {/* Memo */}
        <div style={{ background: 'var(--card)', borderRadius: 12, border: '1px solid var(--border)', padding: '10px 14px', marginBottom: 14 }}>
          <input
            value={memo}
            onChange={e => setMemo(e.target.value)}
            placeholder="Add a note  (optional)"
            style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text)', fontSize: 14 }}
          />
        </div>

        {error && (
          <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--error-bg)', color: 'var(--error)', fontSize: 13, marginBottom: 12 }}>
            {error}
          </div>
        )}

        {/* Fee line */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, padding: '7px 12px', borderRadius: 10, background: 'rgba(0,82,255,0.07)' }}>
          <span style={{ fontSize: 12 }}>⛽</span>
          <span style={{ color: 'var(--primary)', fontSize: 12, fontWeight: 500 }}>~0.001 AVAX gas · ~1 second on Avalanche</span>
        </div>

        <button
          disabled={!canSend}
          onClick={() => setShowConfirm(true)}
          style={{
            width: '100%', padding: 16, borderRadius: 16, fontWeight: 700, fontSize: 16,
            background: canSend ? 'var(--primary)' : 'var(--card)',
            color: canSend ? 'white' : 'var(--text3)',
            boxShadow: canSend ? '0 6px 20px rgba(0,82,255,0.35)' : 'none',
            transition: 'all 0.15s',
          }}>
          {amountNum <= 0 ? 'Enter an amount' : amountNum > balance ? 'Insufficient balance' : `Send $${amountNum.toFixed(2)} →`}
        </button>
      </div>

      {/* ── Confirm sheet ── */}
      {(showConfirm || step === 'sending') && recipient && (
        <div
          className="sheet-backdrop"
          onClick={step !== 'sending' ? () => setShowConfirm(false) : undefined}
        >
          <div className="sheet anim-slide-up" onClick={e => e.stopPropagation()} style={{ padding: '0 0 32px' }}>
            <div className="sheet-handle" />
            <div style={{ padding: '0 20px' }}>

              {/* Recipient header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: `linear-gradient(135deg,${rc1},${rc2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                  {AVATARS[recipientIdx % AVATARS.length]}
                </div>
                <div>
                  <div style={{ color: 'var(--text3)', fontSize: 11 }}>Sending to</div>
                  <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: 17 }}>{recipient.label}</div>
                </div>
              </div>

              {/* Big amount */}
              <div style={{ textAlign: 'center', padding: '18px 0', background: 'var(--bg3)', borderRadius: 16, marginBottom: 16 }}>
                <div style={{ color: 'var(--text)', fontSize: 50, fontWeight: 800, letterSpacing: -2 }}>
                  ${amountNum.toFixed(2)}
                </div>
                <div style={{ color: 'var(--text3)', fontSize: 13, marginTop: 4 }}>USD</div>
              </div>

              {/* Details */}
              {[
                ['From', activeWallet?.label ?? ''],
                ['To', `${recipient.label} (${short(recipient.address)})`],
                ['Category', CATEGORIES[category]?.label ?? ''],
                ...(memo ? [['Note', memo]] : []),
                ['Gas fee', '~0.001 AVAX'],
                ['Network', 'Avalanche Fuji'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text3)', fontSize: 13 }}>{k}</span>
                  <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: 13, maxWidth: '62%', textAlign: 'right' }}>{v}</span>
                </div>
              ))}

              <button
                onClick={send}
                disabled={step === 'sending'}
                style={{
                  width: '100%', marginTop: 20, padding: 17, borderRadius: 16,
                  background: 'var(--primary)', color: 'white', fontWeight: 700, fontSize: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  opacity: step === 'sending' ? 0.85 : 1,
                }}>
                {step === 'sending' ? (
                  <>
                    <span className="spinner" style={{ width: 20, height: 20, borderTopColor: 'white', borderRightColor: 'rgba(255,255,255,0.25)', borderBottomColor: 'rgba(255,255,255,0.25)', borderLeftColor: 'rgba(255,255,255,0.25)' }} />
                    Sending on Avalanche...
                  </>
                ) : (
                  <>Confirm Send  ${amountNum.toFixed(2)}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
