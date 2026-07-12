// "Isu Prioritas" as three distinct planning-alert cards. Desktop: one
// horizontal row; below 900px: scroll-snap strip with the next card partly
// visible. Every kab/kota is a real navigation target.

import { fmtPct } from '../lib/format';
import Icon from './Icon';
import EmptyState from './EmptyState';

function IssueCard({ tone, count, title, threshold, items, onOpen, emptyText }) {
  const color = tone === 'bad' ? 'var(--bad)' : 'var(--warn)';
  const soft = tone === 'bad' ? 'var(--bad-soft)' : 'var(--warn-soft)';
  return (
    <section className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--line-2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span aria-hidden="true" style={{
            width: 34, height: 34, borderRadius: 8, background: soft, color,
            display: 'grid', placeItems: 'center', flexShrink: 0,
          }}>
            <Icon name="alert" size={17} />
          </span>
          <div className="num" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color }}>{count}</div>
        </div>
        <h3 style={{ fontSize: 13.5, fontWeight: 600, margin: '10px 0 2px' }}>{title}</h3>
        <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{threshold}</div>
      </div>
      <div style={{ padding: 8, overflowY: 'auto', maxHeight: 250, flexGrow: 1 }}>
        {items.length === 0 ? (
          <EmptyState compact icon="check" title={emptyText} />
        ) : items.map((it) => (
          <button
            key={it.kode || it.label}
            type="button"
            onClick={() => onOpen(it)}
            style={{
              all: 'unset', boxSizing: 'border-box', cursor: 'pointer', display: 'flex',
              justifyContent: 'space-between', alignItems: 'center', gap: 10,
              width: '100%', minHeight: 40, padding: '8px 10px', borderRadius: 6, fontSize: 12.5,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--paper-2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            onFocus={(e) => { e.currentTarget.style.background = 'var(--paper-2)'; }}
            onBlur={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.label}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {it.value != null && <span className="num" style={{ fontWeight: 600, color }}>{fmtPct(it.value, 1)}</span>}
              <Icon name="chevronRight" size={13} style={{ color: 'var(--ink-3)' }} />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

export default function PriorityIssueCards({ kabsNoIPLT, babsHigh, amanLow, onOpenKab }) {
  return (
    <div className="hcards" role="group" aria-label="Isu prioritas">
      <IssueCard
        tone="bad"
        count={kabsNoIPLT.length}
        title="Kab/kota belum memiliki IPLT"
        threshold="Tidak ada unit IPLT tercatat"
        emptyText="Semua kab/kota memiliki IPLT"
        items={kabsNoIPLT.map((k) => ({ kode: k.kode, label: k.kabkot, row: k }))}
        onOpen={(it) => onOpenKab(it.row)}
      />
      <IssueCard
        tone="bad"
        count={babsHigh.length}
        title="BABS terbuka masih tinggi"
        threshold="BABS di tempat terbuka > 10%"
        emptyText="Tidak ada kab/kota di atas ambang"
        items={babsHigh.map((k) => ({ kode: k.kode, label: k.kabkot, value: k.babs2025, row: k }))}
        onOpen={(it) => onOpenKab(it.row)}
      />
      <IssueCard
        tone="warn"
        count={amanLow.length}
        title="Akses aman sangat rendah"
        threshold="Akses aman < 5%"
        emptyText="Tidak ada kab/kota di bawah ambang"
        items={amanLow.map((k) => ({ kode: k.kode, label: k.kabkot, value: k.aman2025, row: k }))}
        onOpen={(it) => onOpenKab(it.row)}
      />
    </div>
  );
}
