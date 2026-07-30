import React, { useEffect } from 'react';

interface DrawerProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  /**
   * Things stacked above the drawer — a confirmation dialog, a file preview.
   * While any of them is open, Escape belongs to that layer, not to us.
   * Truthiness is what matters, so both booleans and ids can be passed.
   */
  blockedBy?: unknown[];
  /** Passed through to the form wrapper, which differs between the two panels. */
  children: React.ReactNode;
}

/**
 * The right-hand editing drawer, shared by the job and business detail panels.
 *
 * Both had grown their own copy of this shell: the same aside, the same
 * positioning inline styles, the same header with a title and a close button,
 * and the same Escape handler. The only real difference was which overlays
 * suppressed Escape, which is now a prop.
 *
 * All of it keeps the original ids and class names, because the Playwright
 * specs and styles.css both select on them.
 */
export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  title,
  onClose,
  blockedBy = [],
  children,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !blockedBy.some(Boolean)) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // blockedBy is spread so the effect tracks each blocker rather than the
    // array identity, which changes on every render.
  }, [isOpen, onClose, ...blockedBy]);

  return (
    <aside id="detailPanel" className={`detail-panel ${isOpen ? 'open' : ''}`}>
      <div className="panel-content">
        <div className="panel-header">
          <h2 id="panelTitle">{title}</h2>
          <button id="closePanel" className="btn-icon" aria-label="Close panel" onClick={onClose}>
            &times;
          </button>
        </div>
        {children}
      </div>
    </aside>
  );
};
