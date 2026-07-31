/**
 * Where the agent panel's open state lives, for layout purposes.
 *
 * It goes on <html> as data-agent-open, for the same reason the theme does: it
 * has to be readable by elements the component that owns the state does not
 * render, and <html> is the one node that is never re-created.
 *
 * That was the bug. AgentConsole used to reach across the tree with
 * querySelectorAll('.main-content') and toggle a class on whatever it found.
 * The effect only re-ran when the panel opened or closed — so the moment the
 * router swapped one page for another, the new .main-content was a brand new
 * element that nobody had told about the panel, and the content sat under it
 * with a 400px overlap until you toggled the panel twice.
 *
 * With the state on <html>, CSS matches whatever is in the tree at the time,
 * and there is nothing to keep in sync.
 *
 * Applied before React mounts as well, so a full page load lays out correctly
 * on the first paint instead of animating into place.
 */

const STORAGE_KEY = 'agentPanelOpen';
const ATTRIBUTE = 'data-agent-open';

export const getStoredAgentOpen = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    // Safari in private mode throws on localStorage access.
    return false;
  }
};

export const applyAgentOpen = (isOpen: boolean, persist = false): void => {
  if (isOpen) {
    document.documentElement.setAttribute(ATTRIBUTE, 'true');
  } else {
    document.documentElement.removeAttribute(ATTRIBUTE);
  }

  if (persist) {
    try {
      localStorage.setItem(STORAGE_KEY, String(isOpen));
    } catch {
      // State is lost on reload; the current page still behaves.
    }
  }
};

/** Reflects the stored state onto <html> without recording anything new. */
export const initAgentLayout = (): void => applyAgentOpen(getStoredAgentOpen());
