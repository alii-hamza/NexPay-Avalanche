import { useState, useEffect, useRef } from 'react';
import { getTransfers } from '../services/api';
import { Transfer, CashoutRequest, CATEGORIES } from '../types';
import { Wallet } from '../types';

interface ActivityScreenProps {
  address: string;
  refresh: number;
  wallets: Wallet[];
}

const AVATARS = ['👩', '👨', '🧑'];
const CAT_COLORS = ['#0052FF', '#00D395', '#7B2FF7'];
const CAT_BG    = ['rgba(0,82,255,0.12)', 'rgba(0,211,149,0.12)', 'rgba(123,47,247,0.12)'];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000)   return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000)return `${Math.floor(diff / 3600000)}h ago`;
  const d = new Date(iso);
  return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]} ${d.getDate()}`;
}

function short(addr: string) {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function ActivityScreen({ address, refresh, wallets }: ActivityScreenProps) {
  const [tab, setTab] = useState<'all' | 'cashouts'>('all');
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [cashouts, setCashouts]   = useState<CashoutRequest[]>([]);
  const [loading, setLoading]     = useState(true);
  const prevCount = useRef(0);
  const [newIds, setNewIds]       = useState<Set<string>>(new Set());

  // Build address→wallet map for name lookups
  const walletMap = Object.fromEntries(wallets.map((w, i) => [w.address.toLowerCase(), { ...w, idx: i }]));

  function nameOf(addr: string) {
    const w = walletMap[addr?.toLowerCase()];
    return w ? w.label : short(addr);
  }
  function avatarOf(addr: string) {
    const w = walletMap[addr?.toLowerCase()];
    return w ? AVATARS[w.idx % AVATARS.length] : '👤';
  }

  useEffect(() => {
    if (!address) return;
    getTransfers(address).then(res => {
      const txs: Transfer[] = res.transfers ?? [];
      if (prevCount.current > 0 && txs.length > prevCount.current) {
        const freshIds = new Set(txs.slice(0, txs.length - prevCount.current).map(t => t.id));
        setNewIds(freshIds);
        setTimeout(() => setNewIds(new Set()), 2500);
      }
      prevCount.current = txs.length;
      setTransfers(txs);
      setCashouts(res.cashouts ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [address, refresh]);

  const allItems = [
    ...transfers.map(t => ({ ...t, _kind: 'transfer' as const })),
    ...cashouts.map(c => ({ ...c, _kind: 'cashout'  as const })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const displayList = tab === 'all' ? allItems : cashouts.map(c => ({ ...c, _kind: 'cashout' as const }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', background: 'var(--bg)' }}>

      {/* Header */}
      <div className="nav-bar" style={{ justifyContent: 'center' }}>
        <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: 17 }}>Activity</div>
        {transfers.length > 0 && (
          <div style={{
            position: 'absolute', right: 16,
            background: 'var(--primary)', color: 'white',
            fontWeight: 700, fontSize: 11, padding: '2px 9px', borderRadius: 10,
          }}>
            {transfers.length}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {(['all', 'cashouts'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '12px 0',
            background: 'none', border: 'none',
            borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent',
            color: tab === t ? 'var(--text)' : 'var(--text3)',
            fontWeight: tab === t ? 700 : 400, fontSize: 13,
          }}>
            {t === 'all' ? `All Transactions` : `Cash Outs`}
          </button>
        ))}
      </div>

      <div className="screen-body">
        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text3)' }}>Loading...</div>
        ) : displayList.length === 0 ? (
          <div style={{ padding: '70px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 52, marginBottom: 14 }}>📋</div>
            <div style={{ color: 'var(--text2)', fontSize: 16, fontWeight: 700 }}>No transactions yet</div>
            <div style={{ color: 'var(--text3)', fontSize: 13, marginTop: 6 }}>
              {tab === 'all' ? 'Use the Send tab to make your first transfer' : 'No cashouts yet'}
            </div>
          </div>
        ) : (
          <div style={{ padding: '12px 16px 32px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {displayList.map((item, i) => {
              const isNew = newIds.has(item.id);

              // ── Cashout row ──
              if (item._kind === 'cashout') {
                const c = item as CashoutRequest & { _kind: 'cashout' };
                return (
                  <div key={c.id} className={isNew ? 'anim-fade-up' : ''} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 14px', borderRadius: 16,
                    background: isNew ? 'rgba(0,211,149,0.06)' : 'var(--card)',
                    border: `1px solid ${isNew ? 'rgba(0,211,149,0.25)' : 'var(--border)'}`,
                  }}>
                    <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(0,211,149,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                      🏦
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: 14 }}>Bank Cashout</div>
                      <div style={{ color: 'var(--text3)', fontSize: 11, marginTop: 2 }}>
                        {c.bank_ref?.split('|')[0]}  ·  {timeAgo(c.created_at)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ color: 'var(--text2)', fontWeight: 800, fontSize: 16 }}>
                        -${parseFloat(c.amount).toFixed(2)}
                      </div>
                      <StatusPill status={c.status} />
                    </div>
                  </div>
                );
              }

              // ── Transfer row ──
              const t = item as Transfer & { _kind: 'transfer' };
              const isSent   = t.from_address?.toLowerCase() === address?.toLowerCase();
              const otherAddr = isSent ? t.to_address : t.from_address;
              const name      = nameOf(otherAddr);
              const avatar    = avatarOf(otherAddr);
              const catIdx    = Math.min(t.category ?? 0, 2);
              const amt       = parseFloat(t.amount).toFixed(2);

              return (
                <div key={t.id} className={isNew ? 'anim-fade-up' : ''} style={{
                  padding: '14px 14px', borderRadius: 16,
                  background: isNew ? 'rgba(0,82,255,0.06)' : 'var(--card)',
                  border: `1px solid ${isNew ? 'rgba(0,82,255,0.25)' : 'var(--border)'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Avatar with direction badge */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                        {avatar}
                      </div>
                      <div style={{
                        position: 'absolute', bottom: -2, right: -2,
                        width: 18, height: 18, borderRadius: '50%',
                        background: isSent ? 'var(--error)' : 'var(--success)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, border: '2px solid var(--card)',
                      }}>
                        {isSent ? '↑' : '↓'}
                      </div>
                    </div>

                    {/* Name + meta */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: 15 }}>
                        {isSent ? `To ${name}` : `From ${name}`}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700,
                          color: CAT_COLORS[catIdx], background: CAT_BG[catIdx],
                          padding: '2px 7px', borderRadius: 6,
                        }}>
                          {CATEGORIES[catIdx]?.label}
                        </span>
                        <span style={{ color: 'var(--text3)', fontSize: 11 }}>{timeAgo(t.created_at)}</span>
                      </div>
                      {t.memo && (
                        <div style={{ color: 'var(--text3)', fontSize: 11, marginTop: 3, fontStyle: 'italic' }}>
                          "{t.memo}"
                        </div>
                      )}
                    </div>

                    {/* Amount */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ color: isSent ? 'var(--error)' : 'var(--success)', fontWeight: 800, fontSize: 17 }}>
                        {isSent ? '-' : '+'}${amt}
                      </div>
                      <StatusPill status={t.status} />
                    </div>
                  </div>

                  {/* TX hash chip */}
                  {t.tx_hash && (
                    <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: 'var(--bg3)', borderRadius: 8 }}>
                      <span style={{ color: 'var(--text3)', fontSize: 10 }}>TX</span>
                      <span style={{ color: 'var(--text3)', fontSize: 10, fontFamily: 'monospace' }}>
                        {t.tx_hash.slice(0, 8)}...{t.tx_hash.slice(-6)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    confirmed:  ['var(--success)',  'Confirmed'],
    pending:    ['var(--warning)',  'Pending'],
    failed:     ['var(--error)',    'Failed'],
    processing: ['var(--primary)', 'Processing'],
  };
  const [color, label] = map[status] ?? ['var(--text3)', status];
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3, marginTop: 4 }}>
      <div style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
      <span style={{ color, fontSize: 10, fontWeight: 700 }}>{label}</span>
    </div>
  );
}
