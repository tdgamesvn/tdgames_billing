import React from 'react';
import { InvoiceData } from '../types';
import { Button } from './Button';
import { FilterBar } from './FilterBar';

interface HistoryTabProps {
  theme: string;
  history: InvoiceData[];
  filteredHistory: InvoiceData[];
  isLoading: boolean;
  filterStudio: string; setFilterStudio: (v: string) => void;
  filterClient: string; setFilterClient: (v: string) => void;
  filterDateFrom: string; setFilterDateFrom: (v: string) => void;
  filterDateTo: string; setFilterDateTo: (v: string) => void;
  resetConfirmId: string | null;
  formatCurrencySimple: (val: number, curr: string) => string;
  onRefresh: () => void;
  onLoadFromHistory: (inv: InvoiceData) => void;
  onDuplicateInvoice: (inv: InvoiceData) => void;
  onCreateEInvoice: (inv: InvoiceData) => void;
  onDownloadEInvoice: (inv: InvoiceData) => void;
  onToggleStatus: (id: string, status: InvoiceData['status']) => void;
  onDeleteInvoice: (id: string) => void;
  onResetEInvoice: (id: string) => void;
  onConfirmResetEInvoice: () => void;
  onCancelResetEInvoice: () => void;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  theme, history, filteredHistory, isLoading,
  filterStudio, setFilterStudio, filterClient, setFilterClient,
  filterDateFrom, setFilterDateFrom, filterDateTo, setFilterDateTo,
  resetConfirmId,
  formatCurrencySimple, onRefresh, onLoadFromHistory, onDuplicateInvoice,
  onCreateEInvoice, onDownloadEInvoice, onToggleStatus, onDeleteInvoice,
  onResetEInvoice, onConfirmResetEInvoice, onCancelResetEInvoice,
}) => (
  <div className="animate-fadeInUp space-y-8">
    <div className="flex justify-between items-end">
      <div>
        <h2 className="text-4xl font-black text-primary uppercase tracking-tighter">Invoice History</h2>
        <p className={`${theme === 'dark' ? 'text-neutral-medium' : 'text-gray-500'} text-sm mt-2`}>Synced from Supabase</p>
      </div>
      <Button onClick={onRefresh} variant="ghost" size="sm" disabled={isLoading}>{isLoading ? 'Loading...' : 'Refresh'}</Button>
    </div>

    <FilterBar
      studios={[...new Set(history.map(i => i.studioInfo?.name).filter(Boolean) as string[])]}
      clients={[...new Set(history.map(i => i.clientInfo?.name).filter(Boolean) as string[])]}
      filterStudio={filterStudio} setFilterStudio={setFilterStudio}
      filterClient={filterClient} setFilterClient={setFilterClient}
      filterDateFrom={filterDateFrom} setFilterDateFrom={setFilterDateFrom}
      filterDateTo={filterDateTo} setFilterDateTo={setFilterDateTo}
      filteredCount={filteredHistory.length} totalCount={history.length}
    />

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredHistory.length === 0 && !isLoading && (
        <div className="col-span-full py-20 text-center flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-primary/20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <p className="opacity-50 font-black uppercase tracking-widest text-xs">No invoices found</p>
        </div>
      )}
      {filteredHistory.map((inv) => (
        <div key={inv.id} className={`p-6 rounded-[24px] border transition-all hover:scale-[1.02] ${theme === 'dark' ? 'bg-surface border-primary/10' : 'bg-white border-gray-200 shadow-md'} relative overflow-hidden group`}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${inv.status === 'paid' ? 'bg-status-success/20 text-status-success' : 'bg-status-warning/20 text-status-warning'}`}>
                {inv.status}
              </span>
              {inv.paidDate && <p className="text-[9px] text-status-success/70 font-bold mt-1">Paid: {inv.paidDate}</p>}
              {inv.einvoice_status === 'draft' && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onResetEInvoice(inv.id!); }}
                  title="Click để reset eInvoice"
                  className="inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 hover:bg-red-500/20 hover:text-red-400 transition-colors cursor-pointer border-none relative z-10"
                >
                  eInvoice ✓ ×
                </button>
              )}
              {inv.einvoice_status === 'failed' && <span className="inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-black uppercase bg-red-500/20 text-red-400">eInvoice ✗</span>}
            </div>
            <p className="text-[10px] text-neutral-medium font-bold uppercase">{inv.issueDate}</p>
          </div>
          <h3 className={`text-xl font-black mb-1 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{inv.invoiceNumber}</h3>
          <p className={`text-sm mb-1 font-medium truncate ${theme === 'dark' ? 'text-neutral-medium' : 'text-gray-500'}`}>{inv.clientInfo?.name || 'Untitled Client'}</p>
          {inv.studioInfo?.name && <p className={`text-[10px] mb-3 truncate ${theme === 'dark' ? 'text-neutral-medium/60' : 'text-gray-400'}`}>🏢 {inv.studioInfo.name}</p>}
          <div className="flex justify-between items-center pt-4 border-t border-primary/10">
            <p className="text-primary font-black">{formatCurrencySimple(inv.items.reduce((a, b) => a + (b.quantity * b.unitPrice), 0), inv.currency)}</p>
            <div className="flex gap-2">
              <button onClick={() => onDuplicateInvoice(inv)} title="Clone Invoice" className="p-2 hover:text-blue-400 transition-colors text-blue-500/40">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <button onClick={() => onLoadFromHistory(inv)} title="Load to Editor" className="p-2 hover:text-primary transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              {(!inv.einvoice_status || inv.einvoice_status === 'none' || inv.einvoice_status === 'failed') ? (
                <button onClick={() => onCreateEInvoice(inv)} title="Xuất HĐ Điện Tử" className="p-2 hover:text-emerald-400 transition-colors text-emerald-500/40">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              ) : inv.einvoice_status === 'draft' ? (
                <button onClick={() => onDownloadEInvoice(inv)} title="Tải HĐ Điện Tử" className="p-2 hover:text-emerald-400 transition-colors text-emerald-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              ) : null}
              <button onClick={() => onToggleStatus(inv.id!, inv.status)} title="Mark Paid/Pending" className="p-2 hover:text-primary transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <button onClick={() => onDeleteInvoice(inv.id!)} title="Xoá hoá đơn" className="p-2 hover:text-status-error transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>

    {/* Reset eInvoice Confirmation Popup */}
    {resetConfirmId && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
        <div className={`w-full max-w-sm p-8 rounded-[28px] border shadow-2xl animate-fadeInUp ${theme === 'dark' ? 'bg-[#1A1A1A] border-red-500/20' : 'bg-white border-gray-200'}`}>
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">⚠️</span>
          </div>
          <h3 className={`text-lg font-black uppercase tracking-tighter text-center mb-2 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Reset eInvoice?</h3>
          <p className={`text-sm text-center mb-8 ${theme === 'dark' ? 'text-neutral-medium' : 'text-gray-500'}`}>
            Xoá trạng thái eInvoice để xuất lại hoá đơn điện tử mới. Chỉ làm điều này nếu đã xoá hoá đơn nháp trên SePay Portal.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={onCancelResetEInvoice}
              className={`py-4 rounded-2xl text-sm font-black uppercase tracking-widest border transition-all hover:scale-[1.02] ${theme === 'dark' ? 'border-white/10 text-white/60 hover:text-white hover:border-white/30' : 'border-gray-200 text-gray-500 hover:text-black hover:border-gray-400'}`}>
              Huỷ
            </button>
            <button onClick={onConfirmResetEInvoice}
              className="py-4 rounded-2xl text-sm font-black uppercase tracking-widest bg-red-500 text-white transition-all hover:scale-[1.02] hover:bg-red-600 shadow-lg">
              Xoá eInvoice
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
);
