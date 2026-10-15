import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { subscribeToasts } from '../lib/toast';
import Icon from './Icon';

// Completion / error confirmations. Each toast materializes up from the
// bottom edge and leaves the same way; one polite live region announces it.
const LIFE = 2800;
const EXIT = 320;

export default function Toaster() {
  const [items, setItems] = useState([]);

  useEffect(() => subscribeToasts((t) => {
    setItems((list) => [...list.slice(-2), { ...t, state: 'open' }]);
    setTimeout(() => setItems((list) => list.map((x) => (x.id === t.id ? { ...x, state: 'closed' } : x))), LIFE);
    setTimeout(() => setItems((list) => list.filter((x) => x.id !== t.id)), LIFE + EXIT);
  }), []);

  return createPortal(
    <div className="toaster" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className="toast" data-state={t.state} data-tone={t.tone}>
          <span className="toast-icon" aria-hidden="true"><Icon name={t.tone === 'bad' ? 'alert' : 'check'} size={14} strokeWidth={2.4} /></span>
          <span>
            <span className="toast-title">{t.message}</span>
            {t.detail && <span className="toast-detail">{t.detail}</span>}
          </span>
        </div>
      ))}
    </div>,
    document.body,
  );
}
