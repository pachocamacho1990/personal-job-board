import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { api, apiRequest } from '../../api';
import { Sidebar } from '../../components/Sidebar';
import '../../styles/styles.css';
import '../../styles/layout.css';
import '../../styles/sidebar.css';

interface DashboardSummary {
  interviews: any[];
  newMatches: any[];
}

const DashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary>({ interviews: [], newMatches: [] });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('authToken');
    if (!token) {
      window.location.href = '/jobboard/login.html';
      return;
    }

    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const userObj = JSON.parse(storedUser);
        if (userObj.email) {
          setUserEmail(userObj.email);
        }
      }
    } catch (e) {
      console.error('Error reading user', e);
    }

    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    setError('');

    try {
      const activeBoardId = localStorage.getItem('activeBoardId');
      const endpoint = activeBoardId 
        ? `/dashboard/summary?boardId=${activeBoardId}`
        : '/dashboard/summary';

      const data = await apiRequest<DashboardSummary>(endpoint);
      setSummary(data);
    } catch (err: any) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const username = userEmail ? userEmail.split('@')[0] : 'User';
  const formattedUsername = username.charAt(0).toUpperCase() + username.slice(1);

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar activePage="dashboard" />
      <div className="main-content">
        <div className="page-header">
          <h1 className="page-title" id="welcomeTitle">
            Welcome back, {formattedUsername}
          </h1>
        </div>

        <div className="dashboard-grid">
          {/* Upcoming Interviews */}
          <div className="dashboard-card">
            <div className="card-header">
              <div className="card-title">
                <span>📅</span> Upcoming Interviews
              </div>
            </div>
            <div id="interviewsList">
              {loading ? (
                <div className="loading-spinner">Loading...</div>
              ) : error ? (
                <div className="error-message">{error}</div>
              ) : summary.interviews.length === 0 ? (
                <div className="empty-state">No upcoming interviews scheduled.</div>
              ) : (
                summary.interviews.map((job) => (
                  <div
                    key={job.id}
                    className="list-item"
                    onClick={() => {
                      window.location.href = `jobs.html?openJobId=${job.id}`;
                    }}
                  >
                    <div className="item-icon interview-icon">📅</div>
                    <div className="item-content">
                      <div className="item-title">{job.company}</div>
                      <div className="item-subtitle">{job.position}</div>
                    </div>
                    <div className="item-action">View</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* New AI Matches */}
          <div className="dashboard-card">
            <div className="card-header">
              <div className="card-title">
                <span>🤖</span> New AI Matches
              </div>
            </div>
            <div id="newMatchesList">
              {loading ? (
                <div className="loading-spinner">Loading...</div>
              ) : error ? (
                <div className="error-message">{error}</div>
              ) : summary.newMatches.length === 0 ? (
                <div className="empty-state">No new AI job matches found.</div>
              ) : (
                summary.newMatches.map((job) => (
                  <div
                    key={job.id}
                    className="list-item"
                    onClick={() => {
                      window.location.href = `jobs.html?openJobId=${job.id}`;
                    }}
                  >
                    <div className="item-icon match-icon">🤖</div>
                    <div className="item-content">
                      <div className="item-title">{job.company}</div>
                      <div className="item-subtitle">{job.position}</div>
                    </div>
                    <div className="item-action">Review</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<DashboardPage />);
}
