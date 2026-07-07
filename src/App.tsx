import React from 'react';
import { useCurrentPath, navigateTo } from './router';
import { LoginPage } from './pages/login/main';
import { DashboardPage } from './pages/index/main';
import { JobsPage } from './pages/jobs/main';
import { BusinessPage } from './pages/business/main';
import { DocsPage } from './pages/docs/main';
import { ProfilePage } from './pages/profile/main';
import { AgentConsole } from './components/agent/AgentConsole';

// Helper to determine the active page based on current URL path
const getPageFromPath = (path: string): 'dashboard' | 'jobs' | 'business' | 'docs' | 'login' | 'profile' => {
  const p = path.toLowerCase();
  if (p.includes('/login')) return 'login';
  if (p.includes('/jobs')) return 'jobs';
  if (p.includes('/business')) return 'business';
  if (p.includes('/docs')) return 'docs';
  if (p.includes('/profile')) return 'profile';
  return 'dashboard'; // fallback default
};

export const App: React.FC = () => {
  const path = useCurrentPath();
  const page = getPageFromPath(path);

  // Check authentication status (except for login page)
  React.useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (page !== 'login' && !token) {
      navigateTo('/jobboard/login.html');
    } else if (page === 'login' && token) {
      navigateTo('/jobboard/index.html');
    }
  }, [page]);

  return (
    <>
      {page === 'login' && <LoginPage />}
      {page === 'dashboard' && <DashboardPage />}
      {page === 'jobs' && <JobsPage />}
      {page === 'business' && <BusinessPage />}
      {page === 'docs' && <DocsPage />}
      {page === 'profile' && <ProfilePage />}

      {/* Global persistent Agent Console */}
      {page !== 'login' && <AgentConsole />}
    </>
  );
};
