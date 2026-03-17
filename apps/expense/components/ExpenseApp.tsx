import React, { useState, useEffect } from 'react';
import AppBackground from '@/components/AppBackground';
import { AccountUser } from '@/types';
import { ToastNotification } from '@/components/ToastNotification';
import { Navbar } from '@/apps/invoice/components/Navbar';
import { useExpenseState, ExpenseTab } from '../hooks/useExpenseState';
import { fetchExchangeRate, ExchangeRateData } from '@/apps/invoice/services/exchangeRateService';
import ExpenseList from './ExpenseList';
import ExpenseForm from './ExpenseForm';
import ExpenseRecurring from './ExpenseRecurring';
import ExpenseCategoryManager from './ExpenseCategoryManager';

interface ExpenseAppProps {
  currentUser: AccountUser;
  onBack: () => void;
  initialTab?: string | null;
}

const TAB_MAP: Record<ExpenseTab, string> = {
  list: 'history',
  add: 'history',
  recurring: 'recurring',
  categories: 'activity',
};

const TAB_LABELS: Record<string, string> = {
  history: 'Danh sách',
  recurring: 'Định kỳ',
  activity: 'Danh mục',
};

const REVERSE_TAB: Record<string, ExpenseTab> = {
  history: 'list',
  recurring: 'recurring',
  activity: 'categories',
};

const ExpenseApp: React.FC<ExpenseAppProps> = ({ currentUser, onBack, initialTab }) => {
  const state = useExpenseState(currentUser.username, initialTab);
  const [showForm, setShowForm] = useState(false);

  // ── Live VCB Exchange Rate ──
  const [vcbRate, setVcbRate] = useState<ExchangeRateData | null>(null);
  const [vcbRateLoading, setVcbRateLoading] = useState(false);

  useEffect(() => {
    const loadRate = async () => {
      setVcbRateLoading(true);
      try {
        const data = await fetchExchangeRate();
        setVcbRate(data);
      } catch (err) {
        console.warn('[VCB Rate] Failed to fetch:', err);
      } finally {
        setVcbRateLoading(false);
      }
    };
    loadRate();
    const interval = setInterval(loadRate, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const navbarTab = TAB_MAP[state.activeTab];
  const accessibleTabs = (['history', 'recurring', 'activity'] as const).map(t => t);

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden transition-colors duration-500" style={{ backgroundColor: '#0F0F0F' }}>
      <AppBackground />
      {/* Toast */}
      {state.toast && (
        <ToastNotification
          message={{ text: state.toast.message, type: state.toast.type }}
          onDismiss={() => state.setToast(null)}
        />
      )}

      {/* Shared Navbar — same as Invoice */}
      <Navbar
        theme="dark"
        currentUser={currentUser}
        activeTab={navbarTab as any}
        accessibleTabs={accessibleTabs as any}
        onTabChange={(tab) => {
          const expTab = REVERSE_TAB[tab];
          if (expTab) {
            setShowForm(false);
            state.setEditingExpense(null);
            state.setActiveTab(expTab);
          }
        }}
        onLogout={onBack}
        vcbRate={vcbRate}
        vcbRateLoading={vcbRateLoading}
        onBack={onBack}
        appName="Expense"
        tabLabels={TAB_LABELS}
      />

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-12 max-w-[1400px] mx-auto w-full">
        {state.activeTab === 'list' && (
          <>
            {showForm || state.editingExpense ? (
              <ExpenseForm
                categories={state.categories}
                editingExpense={state.editingExpense}
                onSave={(data) => { state.handleSaveExpense(data); setShowForm(false); }}
                onUpdate={(id, data) => { state.handleUpdateExpense(id, data); setShowForm(false); state.setEditingExpense(null); }}
                onCancel={() => { setShowForm(false); state.setEditingExpense(null); }}
              />
            ) : (
              <ExpenseList
                expenses={state.filteredExpenses}
                categories={state.categories}
                isLoading={state.isLoading}
                filterCategory={state.filterCategory} setFilterCategory={state.setFilterCategory}
                filterDateFrom={state.filterDateFrom} setFilterDateFrom={state.setFilterDateFrom}
                filterDateTo={state.filterDateTo} setFilterDateTo={state.setFilterDateTo}
                filterStatus={state.filterStatus} setFilterStatus={state.setFilterStatus}
                totalVND={state.totalVND} totalUSD={state.totalUSD}
                onEdit={(exp) => { state.setEditingExpense(exp); }}
                onDelete={state.handleDeleteExpense}
                onToggleStatus={state.handleToggleStatus}
                onRefresh={state.loadAll}
                onAdd={() => { state.setEditingExpense(null); setShowForm(true); }}
              />
            )}
          </>
        )}
        {state.activeTab === 'recurring' && (
          <ExpenseRecurring
            recurring={state.recurring}
            categories={state.categories}
            onSave={state.handleSaveRecurring}
            onUpdate={state.handleUpdateRecurring}
            onDelete={state.handleDeleteRecurring}
          />
        )}
        {state.activeTab === 'categories' && (
          <ExpenseCategoryManager
            categories={state.categories}
            onSave={state.handleSaveCategory}
            onUpdate={state.handleUpdateCategory}
            onDelete={state.handleDeleteCategory}
          />
        )}
      </main>

      <footer className="py-12 border-t text-center opacity-30 text-[9px] font-black uppercase tracking-[0.5em]">
        TD Consulting • Enterprise Billing Engine • v2.1
      </footer>
    </div>
  );
};

export default ExpenseApp;
