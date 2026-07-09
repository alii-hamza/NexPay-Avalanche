import { useState, useEffect } from 'react';
import { HomeScreen } from './screens/HomeScreen';
import { SendScreen } from './screens/SendScreen';
import { ActivityScreen } from './screens/ActivityScreen';
import { CashoutScreen } from './screens/CashoutScreen';
import { getWallets, seedWallets } from './services/api';
import { Wallet } from './types';

type Tab = 'home' | 'send' | 'activity' | 'cashout';

export default function App() {
  const [tab, setTab]                       = useState<Tab>('home');
  const [wallets, setWallets]               = useState<Wallet[]>([]);
  const [activeIdx, setActiveIdx]           = useState(0);
  const [loading, setLoading]               = useState(true);
  const [loadError, setLoadError]           = useState<string | null>(null);
  const [txRefresh, setTxRefresh]           = useState(0);

  async function loadWallets() {
    setLoadError(null);
    try {
      let ws = await getWallets();
      if (ws.length === 0) ws = await seedWallets();
      setWallets(ws);
    } catch (e: any) {
      setLoadError(e?.message ?? 'Failed to load wallets');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadWallets(); }, []);

  const activeWallet = wallets[activeIdx] ?? null;

  function onTxSuccess(updatedWallets?: Wallet[]) {
    if (updatedWallets) setWallets(updatedWallets);
    else loadWallets(); // re-fetch fresh balances
    setTxRefresh(n => n + 1);
    setTab('activity');
  }

  return (
    <div id="app-shell">
      {/* ── Fake status bar ── */}
      <div className="status-bar">
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>9:41</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="16" height="11" viewBox="0 0 16 11" fill="white" opacity={0.8}>
            <rect x="0"   y="4"   width="3" height="7" rx="1"/>
            <rect x="4.5" y="2.5" width="3" height="8.5" rx="1"/>
            <rect x="9"   y="0.5" width="3" height="10.5" rx="1"/>
            <rect x="13.5" y="0"  width="2.5" height="11" rx="1" opacity={0.3}/>
          </svg>
          <svg width="15" height="11" viewBox="0 0 24 12" fill="none" opacity={0.8}>
            <path d="M1 4C4.5 1.5 8 0.5 12 0.5C16 0.5 19.5 1.5 23 4" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <path d="M4.5 7.5C7 5.5 9.5 4.5 12 4.5C14.5 4.5 17 5.5 19.5 7.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="12" cy="11" r="1.5" fill="white"/>
          </svg>
          <div style={{ width: 22, height: 11, borderRadius: 3, border: '1.5px solid rgba(255,255,255,0.5)', padding: '1.5px', display: 'flex' }}>
            <div style={{ width: '70%', background: '#00D395', borderRadius: 1 }}/>
          </div>
        </div>
      </div>

      {/* ── Screen area ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg,#0052FF,#00D395)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>⚡</div>
            <div style={{ color: 'var(--text2)', fontSize: 14 }}>Loading NexPay...</div>
          </div>
        ) : loadError ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
            <div style={{ fontSize: 40 }}>⚠️</div>
            <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: 16 }}>Connection Error</div>
            <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center' }}>{loadError}</div>
            <button onClick={loadWallets} style={{ padding: '12px 28px', borderRadius: 12, background: 'var(--primary)', color: 'white', fontWeight: 700, fontSize: 15 }}>
              Retry
            </button>
          </div>
        ) : (
          <>
            {tab === 'home' && (
              <HomeScreen
                wallets={wallets}
                activeIdx={activeIdx}
                onSelectWallet={setActiveIdx}
                onSend={() => setTab('send')}
                onCashout={() => setTab('cashout')}
                onReload={loadWallets}
              />
            )}
            {tab === 'send' && (
              <SendScreen
                wallets={wallets}
                activeWallet={activeWallet}
                onSuccess={onTxSuccess}
                onBack={() => setTab('home')}
              />
            )}
            {tab === 'activity' && (
              <ActivityScreen
                address={activeWallet?.address ?? ''}
                refresh={txRefresh}
                wallets={wallets}
              />
            )}
            {tab === 'cashout' && (
              <CashoutScreen
                wallet={activeWallet}
                onSuccess={onTxSuccess}
                onBack={() => setTab('home')}
              />
            )}
          </>
        )}
      </div>

      {/* ── Bottom Tab Bar ── */}
      {!loading && !loadError && (
        <nav className="tab-bar">
          {([
            ['home',     'Home',     <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>, <path d="M9 21V12h6v9"/>],
            ['send',     'Send',     <line x1="22" y1="2" x2="11" y2="13"/>, <polygon points="22 2 15 22 11 13 2 9 22 2"/>],
            ['activity', 'Activity', <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>],
            ['cashout',  'Cash Out', <rect x="2" y="5" width="20" height="14" rx="2"/>, <line x1="2" y1="10" x2="22" y2="10"/>],
          ] as const).map(([id, label, ...paths]) => (
            <button key={id} className={`tab-btn${tab === id ? ' active' : ''}`} onClick={() => setTab(id as Tab)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                {paths}
              </svg>
              {label}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
