import { useEffect, useState } from 'react';

/**
 * Navigates to a client-side route without reloading the page.
 * Dispatches a popstate event to trigger state updates in the router hook.
 */
export function navigateTo(path: string) {
  window.history.pushState(null, '', path);
  const event = new PopStateEvent('popstate');
  window.dispatchEvent(event);
}

/**
 * Custom React hook that tracks window.location.pathname.
 * Updates state when popstate events (e.g. back/forward button clicks, navigateTo calls) fire.
 */
export function useCurrentPath() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return path;
}
