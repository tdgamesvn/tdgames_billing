import React, { useState } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { AccountUser } from './types';
import HomeScreen from './components/HomeScreen';
import InvoiceApp from './apps/invoice/components/InvoiceApp';
import ExpenseApp from './apps/expense/components/ExpenseApp';
import WorkforceApp from './apps/workforce/components/WorkforceApp';

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

  // ── App Router State ──
  const [activeApp, setActiveApp] = useState<string | null>(null);

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
    return <InvoiceApp currentUser={currentUser} onBack={handleBack} />;
  }

  if (activeApp === 'expense') {
    return <ExpenseApp currentUser={currentUser} onBack={handleBack} />;
  }

  if (activeApp === 'workforce') {
    return <WorkforceApp currentUser={currentUser} onBack={handleBack} />;
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

