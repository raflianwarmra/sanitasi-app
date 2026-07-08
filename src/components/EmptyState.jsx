import Icon from './Icon';

// Teaches instead of showing a blank: what's missing, and (optionally) what to do.

export default function EmptyState({ icon = 'info', title, text, action, compact = false }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
      padding: compact ? '18px 16px' : '36px 24px', gap: 8, color: 'var(--ink-3)',
    }}>
      <Icon name={icon} size={compact ? 20 : 26} strokeWidth={1.5} />
      {title && <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-2)' }}>{title}</div>}
      {text && <div style={{ fontSize: 12.5, lineHeight: 1.55, maxWidth: 420 }}>{text}</div>}
      {action && <div style={{ marginTop: 6 }}>{action}</div>}
    </div>
  );
}
