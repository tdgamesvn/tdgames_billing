
import React from 'react';
import { LoginScreen } from './components/LoginScreen';
import { useInvoiceState } from './hooks/useInvoiceState';

// Components
import { ToastNotification } from './components/ToastNotification';
import { Navbar } from './components/Navbar';
import { HistoryTab } from './components/HistoryTab';
import { DashboardTab } from './components/DashboardTab';
import { InvoiceEditor } from './components/InvoiceEditor';
import { EInvoiceModals } from './components/EInvoiceModals';

const App: React.FC = () => {
  const state = useInvoiceState();

  // ── Render ──────────────────────────────────────────────────
  if (!state.currentUser) return <LoginScreen onLogin={state.setCurrentUser} />;

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-500" style={{ backgroundColor: state.invoice.theme === 'dark' ? '#0F0F0F' : '#F5F5F5' }}>
      <ToastNotification message={state.lastMessage} onDismiss={() => state.setLastMessage(null)} />

      <Navbar
        theme={state.invoice.theme}
        currentUser={state.currentUser}
        activeTab={state.activeTab}
        accessibleTabs={state.accessibleTabs}
        onTabChange={state.setActiveTab}
        onLogout={state.handleLogout}
      />

      <main className="flex-1 p-6 md:p-12 max-w-[1400px] mx-auto w-full">
        {state.activeTab === 'history' ? (
          <HistoryTab
            theme={state.invoice.theme} history={state.history} filteredHistory={state.filteredHistory} isLoading={state.isLoading}
            filterStudio={state.filterStudio} setFilterStudio={state.setFilterStudio}
            filterClient={state.filterClient} setFilterClient={state.setFilterClient}
            filterDateFrom={state.filterDateFrom} setFilterDateFrom={state.setFilterDateFrom}
            filterDateTo={state.filterDateTo} setFilterDateTo={state.setFilterDateTo}
            resetConfirmId={state.resetConfirmId}
            formatCurrencySimple={state.formatCurrencySimple}
            onRefresh={state.loadHistory} onLoadFromHistory={state.loadFromHistory}
            onDuplicateInvoice={state.handleDuplicateInvoice}
            onCreateEInvoice={state.handleCreateEInvoice} onDownloadEInvoice={state.handleDownloadEInvoice}
            onToggleStatus={state.toggleStatus} onDeleteInvoice={state.handleDeleteInvoice}
            onResetEInvoice={state.handleResetEInvoice} onConfirmResetEInvoice={state.confirmResetEInvoice}
            onCancelResetEInvoice={() => state.setResetConfirmId(null)}
          />
        ) : state.activeTab === 'dashboard' ? (
          <DashboardTab
            theme={state.invoice.theme} history={state.history} filteredHistory={state.filteredHistory} isLoading={state.isLoading}
            filterStudio={state.filterStudio} setFilterStudio={state.setFilterStudio}
            filterClient={state.filterClient} setFilterClient={state.setFilterClient}
            filterDateFrom={state.filterDateFrom} setFilterDateFrom={state.setFilterDateFrom}
            filterDateTo={state.filterDateTo} setFilterDateTo={state.setFilterDateTo}
            formatCurrencySimple={state.formatCurrencySimple}
            onRefresh={state.loadHistory} onToggleStatus={state.toggleStatus}
          />
        ) : (
          <InvoiceEditor
            invoice={state.invoice} activeTab={state.activeTab}
            studios={state.studios} banks={state.banks} clients={state.clients}
            isLoading={state.isLoading} isExporting={state.isExporting}
            showBankManager={state.showBankManager} showStudioManager={state.showStudioManager}
            editingBankId={state.editingBankId} editingBankData={state.editingBankData}
            editingStudioId={state.editingStudioId} editingStudioData={state.editingStudioData}
            newStudio={state.newStudio} newBank={state.newBank}
            clientSuggestions={state.clientSuggestions} showSuggestions={state.showSuggestions}
            eInvoiceProgress={state.eInvoiceProgress}
            updateInvoice={state.updateInvoice} updateItem={state.updateItem} formatCurrencySimple={state.formatCurrencySimple}
            onExport={state.handleExport} onSaveToCloud={state.handleSaveToCloud}
            onCreateEInvoice={() => state.handleCreateEInvoice()} onBankSelect={state.handleBankSelect}
            onSaveClient={state.handleSaveClient} onSelectClient={state.handleSelectClient}
            setShowSuggestions={state.setShowSuggestions} setClientSuggestions={state.setClientSuggestions}
            setShowBankManager={state.setShowBankManager} setNewBank={state.setNewBank}
            onAddBank={state.handleAddBank} onDeleteBank={state.handleDeleteBank}
            onSetDefaultBank={state.handleSetDefaultBank} onEditBank={state.handleEditBank}
            onCancelEditBank={state.handleCancelEdit} onUpdateBank={state.handleUpdateBank}
            setEditingBankData={state.setEditingBankData}
            setShowStudioManager={state.setShowStudioManager} setNewStudio={state.setNewStudio}
            onAddStudio={state.handleAddStudio} onDeleteStudio={state.handleDeleteStudio}
            onSetDefaultStudio={state.handleSetDefaultStudio} onEditStudio={state.handleEditStudio}
            onUpdateStudio={state.handleUpdateStudio}
            setEditingStudioId={state.setEditingStudioId} setEditingStudioData={state.setEditingStudioData}
          />
        )}
      </main>

      <footer className="py-12 border-t text-center opacity-30 text-[9px] font-black uppercase tracking-[0.5em]">
        TD Consulting • Enterprise Billing Engine • v2.1
      </footer>

      <EInvoiceModals
        theme={state.invoice.theme} invoice={state.invoice}
        showSaveConfirm={state.showSaveConfirm} pendingInvoiceToSave={state.pendingInvoiceToSave}
        onConfirmSave={state.handleConfirmSave} onDismissSave={state.handleDismissSave}
        showEInvoicePrompt={state.showEInvoicePrompt} eInvoiceTargetInvoice={state.eInvoiceTargetInvoice}
        onCreateEInvoice={state.handleCreateEInvoice}
        onDismissEInvoicePrompt={() => { state.setShowEInvoicePrompt(false); state.setEInvoiceTargetInvoice(null); }}
        showEInvoiceModal={state.showEInvoiceModal}
        eInvoiceProgress={state.eInvoiceProgress} eInvoiceResult={state.eInvoiceResult}
        eInvoiceError={state.eInvoiceError} pdfDownloading={state.pdfDownloading}
        onCloseEInvoiceModal={() => { state.setShowEInvoiceModal(false); state.setEInvoiceResult(null); state.setEInvoiceError(null); }}
      />
    </div>
  );
};

export default App;
