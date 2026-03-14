import React from 'react';
import { AccountUser } from '@/types';
import { ToastNotification } from '@/components/ToastNotification';
import { Navbar } from '@/apps/invoice/components/Navbar';
import { useExpenseState, ExpenseTab } from '../hooks/useExpenseState';
import ExpenseList from './ExpenseList';
import ExpenseForm from './ExpenseForm';
import ExpenseRecurring from './ExpenseRecurring';
import ExpenseCategoryManager from './ExpenseCategoryManager';

interface ExpenseAppProps {
  currentUser: AccountUser;
  onBack: () => void;
}

const TAB_MAP: Record<ExpenseTab, string> = {
  list: 'history',
  add: 'edit',
  recurring: 'recurring',
  categories: 'activity',
};

const TAB_LABELS: Record<string, string> = {
  history: 'Danh sách',
  edit: 'Thêm mới',
  recurring: 'Định kỳ',
  activity: 'Danh mục',
};

const REVERSE_TAB: Record<string, ExpenseTab> = {
  history: 'list',
  edit: 'add',
  recurring: 'recurring',
  activity: 'categories',
};

const ExpenseApp: React.FC<ExpenseAppProps> = ({ currentUser, onBack }) => {
  const state = useExpenseState(currentUser.username);

  const navbarTab = TAB_MAP[state.activeTab];
  const accessibleTabs = (['history', 'edit', 'recurring', 'activity'] as const).map(t => t);

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-500" style={{ backgroundColor: '#0F0F0F' }}>
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
          if (expTab === 'add') state.setEditingExpense(null);
          state.setActiveTab(expTab);
        }}
        onLogout={onBack}
        vcbRate={null}
        vcbRateLoading={false}
        onBack={onBack}
        appName="Expense"
        tabLabels={TAB_LABELS}
      />

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-12 max-w-[1400px] mx-auto w-full">
        {state.activeTab === 'list' && (
          <ExpenseList
            expenses={state.filteredExpenses}
            categories={state.categories}
            isLoading={state.isLoading}
            filterCategory={state.filterCategory} setFilterCategory={state.setFilterCategory}
            filterDateFrom={state.filterDateFrom} setFilterDateFrom={state.setFilterDateFrom}
            filterDateTo={state.filterDateTo} setFilterDateTo={state.setFilterDateTo}
            filterStatus={state.filterStatus} setFilterStatus={state.setFilterStatus}
            totalVND={state.totalVND} totalUSD={state.totalUSD}
            onEdit={(exp) => { state.setEditingExpense(exp); state.setActiveTab('add'); }}
            onDelete={state.handleDeleteExpense}
            onToggleStatus={state.handleToggleStatus}
            onRefresh={state.loadAll}
          />
        )}
        {state.activeTab === 'add' && (
          <ExpenseForm
            categories={state.categories}
            editingExpense={state.editingExpense}
            onSave={state.handleSaveExpense}
            onUpdate={state.handleUpdateExpense}
            onCancel={() => { state.setEditingExpense(null); state.setActiveTab('list'); }}
          />
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
