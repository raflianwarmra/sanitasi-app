import { useEffect, useId, useMemo, useRef, useState } from 'react';
import Icon from './Icon';
import { usePresence } from '../hooks/useOverlay';

// Searchable single-select following the WAI-ARIA combobox + listbox pattern:
// the trigger opens a popover anchored to it; the search field owns focus and
// drives the active option (↑ ↓ Home End to move, Enter to choose, Esc to
// close and return focus to the trigger).

export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Pilih...',
  emptyText = 'Tidak ditemukan',
  style,
  className,
  disabled = false,
  sortOptions = true,
  ariaLabel,
}) {
  const uid = useId();
  const listId = `${uid}-list`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const pop = usePresence(open, 220);

  const normalized = useMemo(
    () => options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o)),
    [options],
  );
  const sorted = useMemo(
    () => (sortOptions ? [...normalized].sort((a, b) => a.label.localeCompare(b.label, 'id')) : normalized),
    [normalized, sortOptions],
  );
  const filtered = useMemo(() => {
    if (!query.trim()) return sorted;
    const q = query.trim().toLowerCase();
    return sorted.filter((o) => o.label.toLowerCase().includes(q));
  }, [sorted, query]);

  const selected = normalized.find((o) => o.value === value);
  const name = ariaLabel || placeholder;

  const close = (refocus = true) => {
    setOpen(false);
    setQuery('');
    if (refocus) triggerRef.current?.focus();
  };

  const openList = () => {
    if (disabled) return;
    const i = sorted.findIndex((o) => o.value === value);
    setActive(i >= 0 ? i : 0);
    setOpen(true);
  };

  const choose = (o) => {
    onChange(o.value);
    close();
  };

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const onSearchKey = (e) => {
    const last = filtered.length - 1;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, last)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(Math.max(last, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[active]) choose(filtered[active]); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === 'Tab') { setOpen(false); setQuery(''); }
  };

  return (
    <div ref={wrapRef} className={className} style={{ position: 'relative', minWidth: 0, ...style }}>
      <button
        ref={triggerRef}
        type="button"
        className="input select-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${name}: ${selected ? selected.label : 'belum dipilih'}`}
        onClick={() => (open ? close(false) : openList())}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openList(); }
        }}
        style={{ cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1 }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: selected ? 'var(--ink)' : 'var(--ink-3)' }}>
          {selected ? selected.label : placeholder}
        </span>
        <Icon name="chevronDown" size={14} style={{ color: 'var(--ink-3)', transition: 'transform var(--dur-1) var(--ease-out)', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>

      {pop.mounted && (
        <div className="popover" data-state={pop.state} inert={!open}>
          <div style={{ padding: 6, borderBottom: '1px solid var(--line-2)' }}>
            <input
              className="input"
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={filtered[active] ? `${uid}-opt-${active}` : undefined}
              aria-label={`Cari ${name.toLowerCase()}`}
              placeholder="Cari…"
              autoFocus
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActive(0); }}
              onKeyDown={onSearchKey}
            />
          </div>
          <div ref={listRef} id={listId} role="listbox" aria-label={name} className="select-list">
            {filtered.length === 0 ? (
              <div className="text-caption" style={{ padding: 12 }}>{emptyText}</div>
            ) : (
              filtered.map((o, i) => {
                const isSel = o.value === value;
                return (
                  <div
                    key={o.value}
                    id={`${uid}-opt-${i}`}
                    role="option"
                    aria-selected={isSel}
                    data-active={i === active}
                    data-index={i}
                    className="select-option"
                    onPointerMove={() => { if (i !== active) setActive(i); }}
                    onClick={() => choose(o)}
                  >
                    <span>{o.label}</span>
                    {isSel && <Icon name="check" size={14} />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
