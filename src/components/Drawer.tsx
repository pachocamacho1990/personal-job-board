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
 * The editing dialog behind the job detail panel.
 *
 * It used to be a drawer pinned to the right edge — the same 400px strip the
 * agent panel occupies. With the agent open, opening a card put one on top of
 * the other and the form was simply unreachable. Two things fighting for one
 * strip is not a z-index problem, it is a layout that assumed only one of them
 * would ever exist.
 *
 * So it is a centred dialog now, matching the read-only peek that opens from
 * the same card. Nothing on the right edge, nothing to collide with, and the
 * form gets the width its two-column layout wanted anyway.
 *
 * The ids and class names are unchanged: the Playwright specs and styles.css
 * both select on them, and the element's job is the same even though its
 * position is not.
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
    <aside
      id="detailPanel"
      className={`detail-panel ${isOpen ? 'open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="panelTitle"
      /* Clicking the backdrop dismisses; clicking inside the card must not.
         Comparing against currentTarget is what distinguishes the two. */
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !blockedBy.some(Boolean)) onClose();
      }}
    >
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
