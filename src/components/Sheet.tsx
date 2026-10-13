import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from 'react';
import Icon from './Icon';

/**
 * Accessible bottom-sheet dialog. Centralises the modal behaviour every popup
 * needs so individual screens don't reimplement (and forget) it:
 *   - focuses the sheet on open and restores focus to the opener on close,
 *   - traps Tab focus within the sheet,
 *   - closes on Escape and on backdrop click,
 *   - wires `aria-labelledby` to the title and sets `role="dialog" aria-modal`.
 */
export default function Sheet({
  title,
  onClose,
  children,
  showClose = true,
  className,
  style,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  showClose?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const sheet = sheetRef.current;
    // Move focus into the sheet.
    sheet?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !sheet) return;

      const focusable = sheet.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      // Restore focus to whatever opened the sheet.
      opener?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        // Backdrop (not sheet content) click closes.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={sheetRef}
        className={`modal${className ? ` ${className}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={style}
      >
        <div className="row" style={{ marginBottom: 10 }}>
          <h2
            id={titleId}
            style={{ fontSize: '1.2rem', margin: 0, letterSpacing: '-0.02em' }}
          >
            {title}
          </h2>
          <span className="spacer" />
          {showClose && (
            <button
              type="button"
              className="qty-btn"
              aria-label="Close"
              onClick={onClose}
            >
              <Icon name="close" size={18} />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
