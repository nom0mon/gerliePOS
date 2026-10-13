import { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import Icon, { type IconName } from './Icon';

interface SidebarLink {
  to: string;
  label: string;
  icon: IconName;
}

const LINKS: SidebarLink[] = [
  { to: '/admin/products', label: 'Products', icon: 'box' },
  { to: '/admin/transactions', label: 'Transactions', icon: 'receipt' },
  { to: '/admin/audit', label: 'Audit (voided)', icon: 'ban' },
];

/**
 * Left-slide admin drawer. Holds the owner/back-office features (full CRUD)
 * separate from the fast cashier bottom nav. Accessible: focuses itself on
 * open, traps Tab, closes on Escape / backdrop click, restores focus on close.
 */
export default function Sidebar({ onClose }: { onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      opener?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="drawer-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Admin menu"
        tabIndex={-1}
      >
        <div className="drawer-head">
          <span className="brand-mark" aria-hidden>
            <Icon name="lock" size={16} />
          </span>
          <strong>Admin</strong>
          <span className="spacer" />
          <button
            type="button"
            className="qty-btn"
            aria-label="Close admin menu"
            onClick={onClose}
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <nav className="drawer-nav" aria-label="Admin sections">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className="drawer-link"
              onClick={onClose}
            >
              <Icon name={link.icon} size={20} />
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
