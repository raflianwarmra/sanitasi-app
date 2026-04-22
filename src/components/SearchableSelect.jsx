import { useEffect, useMemo, useRef, useState } from 'react';

export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Pilih...',
  emptyText = 'Tidak ditemukan',
  style,
  className,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  const normalized = useMemo(
    () => options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o)),
    [options]
  );
  const sorted = useMemo(
    () => [...normalized].sort((a, b) => a.label.localeCompare(b.label, 'id')),
    [normalized]
  );
  const filtered = useMemo(() => {
    if (!query.trim()) return sorted;
    const q = query.trim().toLowerCase();
    return sorted.filter((o) => o.label.toLowerCase().includes(q));
  }, [sorted, query]);

  const selected = normalized.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  return (
    <div ref={wrapRef} className={className} style={{ position: 'relative', minWidth: 0, ...style }}>
      <button
        type="button"
        className="input"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        style={{
          width: '100%',
          textAlign: 'left',
          fontSize: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: selected ? 'var(--ink)' : 'var(--ink-3)' }}>
          {selected ? selected.label : placeholder}
        </span>
        <span style={{ fontSize: 10, color: 'var(--ink-3)' }}>▾</span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: 'var(--paper)',
            border: '1.5px solid var(--line)',
            borderRadius: 6,
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            zIndex: 1000,
            maxHeight: 280,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <input
            ref={inputRef}
            className="input"
            placeholder="Cari..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ margin: 6, width: 'calc(100% - 12px)', fontSize: 12 }}
          />
          <div style={{ overflowY: 'auto', maxHeight: 220 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 12, fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic' }}>{emptyText}</div>
            ) : (
              filtered.map((o) => (
                <div
                  key={o.value}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                    setQuery('');
                  }}
                  style={{
                    padding: '8px 12px',
                    fontSize: 12,
                    cursor: 'pointer',
                    background: o.value === value ? 'var(--accent-soft)' : 'transparent',
                    fontWeight: o.value === value ? 600 : 400,
                  }}
                  onMouseEnter={(e) => {
                    if (o.value !== value) e.currentTarget.style.background = 'var(--line-2)';
                  }}
                  onMouseLeave={(e) => {
                    if (o.value !== value) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {o.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
