import React, { useState, useEffect, useCallback } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { AccountUser } from './types';
import HomeScreen from './components/HomeScreen';
import InvoiceApp from './apps/invoice/components/InvoiceApp';
import ExpenseApp from './apps/expense/components/ExpenseApp';
import WorkforceApp from './apps/workforce/components/WorkforceApp';

const VALID_APPS = ['invoice', 'expense', 'workforce'];

/** Parse hash like #workforce/tasks → { app: 'workforce', tab: 'tasks' } */
const parseHash = (): { app: string | null; tab: string | null } => {
  const hash = window.location.hash.replace('#', '');
  const [app, tab] = hash.split('/');
  return {
    app: VALID_APPS.includes(app) ? app : null,
    tab: tab || null,
  };
};

/** Helper for child apps to update just the tab portion of the hash */
export const setHashTab = (tab: string) => {
  const { app } = parseHash();
  if (app) {
    window.location.hash = `${app}/${tab}`;
  }
};

const App: React.FC = () => {
  // ── Auth State ──
  const [currentUser, _setCurrentUser] = useState<AccountUser | null>(() => {
    try {
      const saved = localStorage.getItem('invoice_user');
      if (!saved) return null;
      const { user, expiresAt } = JSON.parse(saved);
      if (Date.now() > expiresAt) { localStorage.removeItem('invoice_user'); return null; }
      return user as AccountUser;
    } catch { return null; }
  });

  const setCurrentUser = (user: AccountUser | null) => {
    _setCurrentUser(user);
    if (user) {
      localStorage.setItem('invoice_user', JSON.stringify({ user, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 }));
    } else {
      localStorage.removeItem('invoice_user');
    }
  };

  // ── App Router State (synced with URL hash) ──
  const [activeApp, _setActiveApp] = useState<string | null>(() => parseHash().app);
  const [initialTab, setInitialTab] = useState<string | null>(() => parseHash().tab);

  const setActiveApp = useCallback((app: string | null) => {
    _setActiveApp(app);
    setInitialTab(null);
    if (app) {
      window.location.hash = app;
    } else {
      history.pushState(null, '', window.location.pathname);
    }
  }, []);

  // Listen for browser back/forward
  useEffect(() => {
    const onHashChange = () => {
      const { app, tab } = parseHash();
      _setActiveApp(app);
      setInitialTab(tab);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveApp(null);
  };

  const handleBack = () => {
    setActiveApp(null);
  };

  // ── Not logged in ──
  if (!currentUser) return <LoginScreen onLogin={setCurrentUser} />;

  // ── App Router ──
  if (activeApp === 'invoice') {
    return <InvoiceApp currentUser={currentUser} onBack={handleBack} initialTab={initialTab} />;
  }

  if (activeApp === 'expense') {
    return <ExpenseApp currentUser={currentUser} onBack={handleBack} initialTab={initialTab} />;
  }

  if (activeApp === 'workforce') {
    return <WorkforceApp currentUser={currentUser} onBack={handleBack} initialTab={initialTab} />;
  }

  // ── Home Screen ──
  return (
    <HomeScreen
      currentUser={currentUser}
      onSelectApp={setActiveApp}
      onLogout={handleLogout}
    />
  );
};

export default App;
