import { useState } from 'react';
import { Wallet } from '../types';

interface HomeScreenProps {
  wallets: Wallet[];
  activeIdx: number;
  onSelectWallet: (i: number) => void;
  onSend: () => void;
  onCashout: () => void;
  onReload: () => void;
}

const AVATARS = ['👩', '👨', '🧑'];
const CARD_GRADIENTS = [
  ['#0052FF', '#1a6fff'],
  ['#7B2FF7', '#9b4fff'],
  ['#00A876', '#00D395'],
];

export function HomeScreen({ wallets, activeIdx, onSelectWallet, onSend, onCashout, onReload }: HomeScreenProps) {
  const [refreshing, setRefreshing] = useState(false);
  const wallet = wallets[activeIdx] ?? null;
  const balance = parseFloat(wallet?.usdc_balance || '0');

  async function refresh() {
    setRefreshing(true);
    await onReload();
    setRefreshing(false);
  }

  return (
    <div className="screen-body" style={{ background: 'var(--bg)' }}>

      {/* Top bar */}
      <div style={{ padding: '14px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg,#0052FF,#00D395)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⚡</div>
          <span style={{ color: 'var(--text)', fontWeight: 800, fontSize: 16 }}>NexPay</span>
        </div>
        <button
          onClick={refresh}
          style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <span style={{ display: 'inline-block', animation: refreshing ? 'spin 0.7s linear infinite' : 'none' }}>↻</span>
        </button>
      </div>

      {/* Active wallet balance — the big hero */}
      {wallet && (
        <div
          className="anim-fade-up"
          style={{
            margin: '20px 16px 0',
            borderRadius: 24,
            padding: '24px 22px 22px',
            background: `linear-gradient(145deg, ${CARD_GRADIENTS[activeIdx % CARD_GRADIENTS.length][0]}, ${CARD_GRADIENTS[activeIdx % CARD_GRADIENTS.length][1]})`,
            boxShadow: `0 10px 32px ${CARD_GRADIENTS[activeIdx % CARD_GRADIENTS.length][0]}55`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Decorative circle */}
          <div style={{ position: 'absolute', top: -28, right: -28, width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
          <div style={{ position: 'absolute', bottom: -18, right: 40, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative' }}>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: 500, marginBottom: 3 }}>
                {wallet.label}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: 'monospace' }}>
                {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
              </div>
            </div>
            {wallet.kyc_verified && (
              <div style={{ background: 'rgba(255,255,255,0.18)', borderRadius: 8, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3}><polyline points="20 6 9 17 4 12"/></svg>
                <span style={{ color: 'white', fontSize: 10, fontWeight: 700 }}>KYC</span>
              </div>
            )}
          </div>

          {/* Big USD balance */}
          <div style={{ marginTop: 22, position: 'relative' }}>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>Available Balance</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
              <span style={{ color: 'white', fontSize: 52, fontWeight: 800, letterSpacing: -2, lineHeight: 1 }}>
                ${balance.toFixed(2)}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 16, fontWeight: 600, marginBottom: 6 }}>USD</span>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 4 }}>
              ≈ {balance.toFixed(6)} USDC · Avalanche Fuji
            </div>
          </div>

          {/* Quick action buttons ON the card */}
          <div style={{ display: 'flex', gap: 10, marginTop: 20, position: 'relative' }}>
            <button
              onClick={onSend}
              style={{
                flex: 1, padding: '11px 0', borderRadius: 13,
                background: 'rgba(255,255,255,0.18)',
                color: 'white', fontWeight: 700, fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                border: '1px solid rgba(255,255,255,0.25)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
              Send
            </button>
            <button
              onClick={onCashout}
              style={{
                flex: 1, padding: '11px 0', borderRadius: 13,
                background: 'rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.85)', fontWeight: 600, fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2"/>
                <line x1="2" y1="10" x2="22" y2="10"/>
              </svg>
              Cash Out
            </button>
          </div>
        </div>
      )}

      {/* Wallet switcher */}
      <div style={{ padding: '24px 16px 0' }}>
        <div style={{ color: 'var(--text3)', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12, paddingLeft: 4 }}>
          Switch Wallet
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {wallets.map((w, i) => {
            const bal = parseFloat(w.usdc_balance || '0');
            const isActive = i === activeIdx;
            return (
              <button
                key={w.address}
                onClick={() => onSelectWallet(i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 16, width: '100%', textAlign: 'left',
                  background: isActive ? 'var(--card)' : 'transparent',
                  border: isActive ? `1px solid ${CARD_GRADIENTS[i % CARD_GRADIENTS.length][0]}55` : '1px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{
                  width: 42, height: 42, borderRadius: 13, flexShrink: 0,
                  background: isActive
                    ? `linear-gradient(135deg, ${CARD_GRADIENTS[i % CARD_GRADIENTS.length][0]}, ${CARD_GRADIENTS[i % CARD_GRADIENTS.length][1]})`
                    : 'var(--card)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21,
                }}>
                  {AVATARS[i % AVATARS.length]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'var(--text)', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {w.label}
                    {w.kyc_verified && (
                      <span style={{ fontSize: 10, color: 'var(--accent)', background: 'rgba(0,211,149,0.12)', padding: '1px 5px', borderRadius: 5, fontWeight: 700 }}>KYC</span>
                    )}
                  </div>
                  <div style={{ color: 'var(--text3)', fontSize: 11, marginTop: 1, fontFamily: 'monospace' }}>
                    {w.address.slice(0, 8)}...{w.address.slice(-6)}
                  </div>
                </div>
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  <div style={{ color: isActive ? 'var(--accent)' : 'var(--text2)', fontWeight: 800, fontSize: 16 }}>
                    ${bal.toFixed(2)}
                  </div>
                  <div style={{ color: 'var(--text3)', fontSize: 10, marginTop: 1 }}>USD</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Network strip */}
      <div style={{ margin: '20px 16px 32px', padding: '10px 14px', borderRadius: 12, background: 'var(--bg3)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#E84142', boxShadow: '0 0 5px #E84142', flexShrink: 0 }} />
        <span style={{ color: 'var(--text3)', fontSize: 12 }}>Avalanche Fuji C-Chain</span>
        <span style={{ color: 'var(--text3)', fontSize: 12, marginLeft: 4 }}>·</span>
        <span style={{ color: 'var(--text3)', fontSize: 12 }}>USDC</span>
        <span style={{ marginLeft: 'auto', color: 'var(--text3)', fontSize: 11 }}>~1s finality · 0.001 AVAX gas</span>
      </div>
    </div>
  );
}
