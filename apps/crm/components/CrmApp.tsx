import React, { useState, useEffect } from 'react';
import { AccountUser } from '@/types';
import { ToastNotification } from '@/components/ToastNotification';
import { Navbar } from '@/apps/invoice/components/Navbar';
import { useCrmState, CrmTab } from '../hooks/useCrmState';
import ClientList from './ClientList';
import ClientForm from './ClientForm';
import ProjectList from './ProjectList';
import DocumentList from './DocumentList';
import PaymentTracker from './PaymentTracker';

interface CrmAppProps {
  currentUser: AccountUser;
  onBack: () => void;
  initialTab?: string | null;
}

const TAB_MAP: Record<CrmTab, string> = {
  clients:  'history',
  projects: 'tasks',
  documents:'settings',
  payments: 'activity',
  stats:    'board',
};

const TAB_LABELS: Record<string, string> = {
  history:  'Khách hàng',
  tasks:    'Dự án',
  settings: 'Tài liệu',
  activity: 'Thanh toán',
  board:    'Thống kê',
};

const REVERSE_TAB: Record<string, CrmTab> = {
  history:  'clients',
  tasks:    'projects',
  settings: 'documents',
  activity: 'payments',
  board:    'stats',
};

const CrmApp: React.FC<CrmAppProps> = ({ currentUser, onBack, initialTab }) => {
  const state = useCrmState(initialTab);
  const [showForm, setShowForm] = useState(false);

  const navbarTab = TAB_MAP[state.activeTab];
  const accessibleTabs = ['history', 'tasks', 'settings', 'activity', 'board'];

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-500" style={{ backgroundColor: '#0F0F0F' }}>
      {/* Toast */}
      {state.toast && (
        <ToastNotification
          message={{ text: state.toast.message, type: state.toast.type }}
          onDismiss={() => state.setToast(null)}
        />
      )}

      {/* Navbar */}
      <Navbar
        theme="dark"
        currentUser={currentUser}
        activeTab={navbarTab as any}
        accessibleTabs={accessibleTabs as any}
        onTabChange={(tab) => {
          const crmTab = REVERSE_TAB[tab];
          if (crmTab) {
            setShowForm(false);
            state.setEditingClient(null);
            state.setActiveTab(crmTab);
          }
        }}
        onLogout={onBack}
        onBack={onBack}
        appName="CRM"
        tabLabels={TAB_LABELS}
      />

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-12 max-w-[1400px] mx-auto w-full">
        {/* ── Clients Tab ── */}
        {state.activeTab === 'clients' && (
          <>
            {showForm || state.editingClient ? (
              <ClientForm
                editingClient={state.editingClient}
                onSave={async (data) => { const c = await state.handleCreateClient(data); setShowForm(false); return c; }}
                onUpdate={(id, data) => { state.handleUpdateClient(id, data); setShowForm(false); state.setEditingClient(null); }}
                onCancel={() => { setShowForm(false); state.setEditingClient(null); }}
                onCreateContact={state.handleCreateContact}
                onUpdateContact={state.handleUpdateContact}
                onDeleteContact={state.handleDeleteContact}
              />
            ) : (
              <ClientList
                clients={state.filteredClients}
                isLoading={state.isLoading}
                searchQuery={state.searchQuery} setSearchQuery={state.setSearchQuery}
                filterStatus={state.filterStatus} setFilterStatus={state.setFilterStatus}
                filterIndustry={state.filterIndustry} setFilterIndustry={state.setFilterIndustry}
                industries={state.industries}
                statusCounts={state.statusCounts}
                totalClients={state.clients.length}
                onEdit={(c) => state.setEditingClient(c)}
                onDelete={state.handleDeleteClient}
                onRefresh={state.loadClients}
                onAdd={() => { state.setEditingClient(null); setShowForm(true); }}
              />
            )}
          </>
        )}

        {/* ── Projects Tab ── */}
        {state.activeTab === 'projects' && (
          <ProjectList clients={state.clients} />
        )}

        {/* ── Documents Tab ── */}
        {state.activeTab === 'documents' && (
          <DocumentList clients={state.clients} />
        )}

        {/* ── Payments Tab ── */}
        {state.activeTab === 'payments' && (
          <PaymentTracker clients={state.clients} />
        )}

        {/* ── Stats Tab ── */}
        {state.activeTab === 'stats' && (
          <div className="animate-fadeInUp" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#FF9500', textTransform: 'uppercase', letterSpacing: '-0.03em' }}>
              Thống kê khách hàng
            </h2>

            {/* Lead Source breakdown */}
            <div style={{ background: '#161616', border: '1px solid #222', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888', marginBottom: '16px' }}>
                Nguồn khách hàng
              </h3>
              {(() => {
                const sources = [...new Set(state.clients.map(c => c.lead_source).filter(Boolean))];
                if (sources.length === 0) return <p style={{ color: '#666', fontSize: '14px' }}>Chưa có dữ liệu nguồn</p>;
                return (
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {sources.map(s => {
                      const count = state.clients.filter(c => c.lead_source === s).length;
                      return (
                        <div key={s} style={{
                          background: '#1A1A1A', border: '1px solid #333', borderRadius: '10px', padding: '14px 20px',
                          textAlign: 'center', minWidth: '100px',
                        }}>
                          <p style={{ fontSize: '22px', fontWeight: 900, color: '#0A84FF' }}>{count}</p>
                          <p style={{ fontSize: '12px', color: '#888', fontWeight: 600, marginTop: '2px' }}>{s}</p>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Direction breakdown */}
            <div style={{ background: '#161616', border: '1px solid #222', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888', marginBottom: '16px' }}>
                Hướng tiếp cận
              </h3>
              <div style={{ display: 'flex', gap: '16px' }}>
                {[
                  { key: 'inbound', label: '📥 Khách tìm mình', color: '#34C759' },
                  { key: 'outbound', label: '📤 Mình tìm khách', color: '#FF9500' },
                ].map(d => (
                  <div key={d.key} style={{
                    background: '#1A1A1A', border: '1px solid #333', borderRadius: '10px', padding: '20px 28px',
                    textAlign: 'center', flex: 1,
                  }}>
                    <p style={{ fontSize: '28px', fontWeight: 900, color: d.color }}>
                      {state.clients.filter(c => c.lead_direction === d.key).length}
                    </p>
                    <p style={{ fontSize: '12px', color: '#888', fontWeight: 600, marginTop: '4px' }}>{d.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Industry breakdown */}
            <div style={{ background: '#161616', border: '1px solid #222', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888', marginBottom: '16px' }}>
                Theo ngành nghề
              </h3>
              {state.industries.length === 0 ? (
                <p style={{ color: '#666', fontSize: '14px' }}>Chưa có dữ liệu ngành nghề</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {state.industries.map(ind => {
                    const count = state.clients.filter(c => c.industry === ind).length;
                    const pct = Math.round((count / state.clients.length) * 100);
                    return (
                      <div key={ind} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ width: '160px', fontSize: '13px', color: '#ccc', fontWeight: 600 }}>{ind}</span>
                        <div style={{ flex: 1, height: '8px', background: '#222', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: '#FF9500', borderRadius: '4px', transition: 'width 0.5s' }} />
                        </div>
                        <span style={{ fontSize: '13px', color: '#FF9500', fontWeight: 700, minWidth: '40px', textAlign: 'right' }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Country breakdown */}
            <div style={{ background: '#161616', border: '1px solid #222', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888', marginBottom: '16px' }}>
                Theo quốc gia
              </h3>
              {(() => {
                const countries = [...new Set(state.clients.map(c => c.country).filter(Boolean))];
                if (countries.length === 0) return <p style={{ color: '#666', fontSize: '14px' }}>Chưa có dữ liệu quốc gia</p>;
                return (
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {countries.map(c => {
                      const count = state.clients.filter(cl => cl.country === c).length;
                      return (
                        <div key={c} style={{
                          background: '#1A1A1A', border: '1px solid #333', borderRadius: '10px', padding: '14px 20px',
                          textAlign: 'center', minWidth: '100px',
                        }}>
                          <p style={{ fontSize: '22px', fontWeight: 900, color: '#FF9500' }}>{count}</p>
                          <p style={{ fontSize: '12px', color: '#888', fontWeight: 600, marginTop: '2px' }}>{c}</p>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </main>

      <footer className="py-12 border-t text-center opacity-30 text-[9px] font-black uppercase tracking-[0.5em]">
        TD Consulting • Enterprise Billing Engine • v2.1
      </footer>
    </div>
  );
};

export default CrmApp;
