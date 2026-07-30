import React from 'react';

export type NotificationKind = 'error' | 'success' | 'info' | 'warning';

interface InlineNotificationProps {
  kind: NotificationKind;
  /** Optional lead-in, rendered bold before the message. */
  title?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Carbon's inline notification: a subtle fill, a solid status bar down the
 * leading edge, and text that meets AA against that fill.
 *
 * It replaces three separate ad-hoc banners — profile's error and success
 * divs, both styled inline with Tailwind rgba, and the Claude hint banner,
 * which had its own class. They differed only in colour, so they were the same
 * component written three times.
 *
 * The colour lives entirely in the modifier class. Nothing here takes a colour
 * prop or an inline style, which is the point: a caller cannot invent a fifth
 * kind that skips the contrast checks.
 */
export const InlineNotification: React.FC<InlineNotificationProps> = ({
  kind,
  title,
  children,
  className = '',
}) => (
  <div className={`inline-notification inline-notification--${kind} ${className}`.trim()} role={kind === 'error' ? 'alert' : 'status'}>
    <div className="inline-notification-content">
      {title && <strong className="inline-notification-title">{title}</strong>}
      <span className="inline-notification-body">{children}</span>
    </div>
  </div>
);
