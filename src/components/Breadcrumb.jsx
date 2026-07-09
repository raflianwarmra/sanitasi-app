import Icon from './Icon';

export default function Breadcrumb({ path, onNavigate }) {
  return (
    <nav aria-label="Breadcrumb" style={{
      borderBottom: '1px solid var(--line-2)',
      background: 'var(--paper)',
    }}>
      <div className="page-wrap page-pad" style={{
        fontSize: 12, color: 'var(--ink-3)', paddingTop: 9, paddingBottom: 9,
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2,
      }}>
        {path.map((item, i) => {
          const label = typeof item === 'string' ? item : item.label;
          const isLast = i === path.length - 1;
          return (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {i > 0 && <Icon name="chevronRight" size={12} style={{ color: 'var(--line)', margin: '0 3px' }} />}
              {item.path && !isLast ? (
                <button
                  onClick={() => onNavigate?.(item.path)}
                  style={{
                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    color: 'var(--ink-2)', fontSize: 12, fontFamily: 'inherit', fontWeight: 500,
                  }}
                >
                  {label}
                </button>
              ) : (
                <span aria-current={isLast ? 'page' : undefined} style={{ fontWeight: isLast ? 600 : 400, color: isLast ? 'var(--island-accent, var(--ink))' : undefined }}>
                  {label}
                </span>
              )}
            </span>
          );
        })}
      </div>
    </nav>
  );
}
