/**
 * Carbon theme switching.
 *
 * The attribute goes on <html> rather than <body> so the tokens are in scope
 * for everything, including elements portalled outside the React root.
 *
 * Resolution order on first load: a stored choice wins, because an explicit
 * decision by the user outranks a system default. Only when there is none do
 * we follow prefers-color-scheme. After that the OS is no longer consulted —
 * flipping the laptop to dark should not silently undo a deliberate choice.
 */

export type CarbonTheme = 'g10' | 'g100';

const STORAGE_KEY = 'carbonTheme';
const ATTRIBUTE = 'data-carbon-theme';

const isTheme = (value: unknown): value is CarbonTheme =>
  value === 'g10' || value === 'g100';

/** The stored preference, or null when the user has never chosen. */
export const getStoredTheme = (): CarbonTheme | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isTheme(stored) ? stored : null;
  } catch {
    // Safari in private mode throws on localStorage access.
    return null;
  }
};

const getSystemTheme = (): CarbonTheme =>
  typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
    ? 'g100'
    : 'g10';

export const resolveInitialTheme = (): CarbonTheme =>
  getStoredTheme() ?? getSystemTheme();

/** Whatever is currently on <html>, falling back to a fresh resolution. */
export const getCurrentTheme = (): CarbonTheme => {
  const applied = document.documentElement.getAttribute(ATTRIBUTE);
  return isTheme(applied) ? applied : resolveInitialTheme();
};

/**
 * Applies a theme. Persisting is opt-in so that applying the resolved theme at
 * startup does not write a preference the user never expressed — otherwise the
 * first page load would freeze whatever the OS happened to be set to.
 */
export const applyTheme = (theme: CarbonTheme, persist = false): CarbonTheme => {
  document.documentElement.setAttribute(ATTRIBUTE, theme);

  if (persist) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Preference is lost on reload, but the current page still switches.
    }
  }

  return theme;
};

export const toggleTheme = (): CarbonTheme =>
  applyTheme(getCurrentTheme() === 'g10' ? 'g100' : 'g10', true);

/** Applies the resolved theme without recording it as a choice. */
export const initTheme = (): CarbonTheme => applyTheme(resolveInitialTheme());
