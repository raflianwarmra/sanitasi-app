import Icon from './Icon';

// Wayfinding: where am I, and one tap back to any parent level.
export default function Breadcrumb({ path, onNavigate }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="page-wrap page-pad crumbs" style={{ listStyle: 'none', marginTop: 0, marginBottom: 0, paddingTop: 14, paddingBottom: 0 }}>
        {path.map((item, i) => {
          const label = typeof item === 'string' ? item : item.label;
          const isLast = i === path.length - 1;
          return (
            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {i > 0 && <Icon name="chevronRight" size={12} style={{ color: 'var(--ink-3)', margin: '0 2px', opacity: 0.6 }} />}
              {item.path && !isLast ? (
                <button type="button" className="crumb-btn" onClick={() => onNavigate?.(item.path)}>{label}</button>
              ) : (
                <span aria-current={isLast ? 'page' : undefined} style={{ fontWeight: isLast ? 600 : 400, color: isLast ? 'var(--accent-strong)' : undefined }}>
                  {label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
