export default function Breadcrumb({ path, onNavigate }) {
  return (
    <div style={{
      fontSize: 12, color: 'var(--ink-3)', padding: '10px 24px',
      borderBottom: '1.5px solid var(--line-2)',
      fontFamily: 'JetBrains Mono', display: 'flex', gap: 0, flexWrap: 'wrap',
      background: 'var(--paper)',
    }}>
      {path.map((item, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center' }}>
          {i > 0 && <span style={{ margin: '0 6px', color: 'var(--line)' }}>/</span>}
          {item.path ? (
            <button
              onClick={() => onNavigate?.(item.path)}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                color: 'var(--accent)', fontFamily: 'JetBrains Mono', fontSize: 12,
              }}
            >
              {item.label}
            </button>
          ) : (
            <span>{typeof item === 'string' ? item : item.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}
