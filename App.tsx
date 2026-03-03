
import React, { useState, useEffect } from 'react';
import { DEFAULT_INVOICE } from './constants';
import { InvoiceData, ServiceItem, BankingInfo, ClientRecord, StudioInfo, StudioRecord } from './types';
import { Button } from './components/Button';
import { Input, TextArea, Select } from './components/FormElements';
import { InvoicePreview } from './components/InvoicePreview';
import { exportToPDF, exportToPNG, exportToExcel, exportToWord } from './services/exportService';
import {
  saveInvoiceToCloud,
  fetchInvoicesFromCloud,
  updateInvoiceStatusInCloud,
  saveBankToCloud,
  fetchBanksFromCloud,
  deleteBankFromCloud,
  updateBankInCloud,
  setDefaultBankInCloud,
  fetchClientsFromCloud,
  saveClientToCloud,
  updateClientInCloud,
  fetchStudiosFromCloud,
  saveStudioToCloud,
  updateStudioInCloud,
  setDefaultStudioInCloud,
  deleteStudioFromCloud,
  SaveResponse
} from './services/nocodbService';


const App: React.FC = () => {
  const [invoice, setInvoice] = useState<InvoiceData>(DEFAULT_INVOICE);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'history' | 'dashboard'>('edit');
  const [history, setHistory] = useState<InvoiceData[]>([]);
  const [banks, setBanks] = useState<(BankingInfo & { id: string; isDefault: boolean })[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [studios, setStudios] = useState<StudioRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [showBankManager, setShowBankManager] = useState(false);
  const [showStudioManager, setShowStudioManager] = useState(false);
  const [lastMessage, setLastMessage] = useState<{ text: string, type: 'success' | 'warning' | 'error' } | null>(null);
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [editingBankData, setEditingBankData] = useState<BankingInfo | null>(null);
  const [editingStudioId, setEditingStudioId] = useState<string | null>(null);
  const [editingStudioData, setEditingStudioData] = useState<StudioInfo | null>(null);
  const [newStudio, setNewStudio] = useState<StudioInfo>({ name: '', address: '', email: '', taxCode: '' });
  const [clientSuggestions, setClientSuggestions] = useState<ClientRecord[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [newBank, setNewBank] = useState<BankingInfo>({
    alias: '',
    accountName: '',
    accountNumber: '',
    bankName: '',
    branchName: '',
    bankAddress: '',
    citadCode: '',
    swiftCode: ''
  });

  useEffect(() => {
    loadBanks(activeTab === 'edit');
    loadClients();
    loadStudios().then(data => {
      if (activeTab === 'edit') {
        const def = data.find(s => s.isDefault);
        if (def) {
          const { id, isDefault, ...info } = def;
          updateInvoice('studioInfo', info);
        }
      }
    });
    if (activeTab === 'history' || activeTab === 'dashboard') loadHistory();
  }, [activeTab]);

  useEffect(() => {
    if (lastMessage) {
      const timer = setTimeout(() => setLastMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [lastMessage]);

  const loadHistory = async () => {
    setIsLoading(true);
    const data = await fetchInvoicesFromCloud();
    setHistory(data);
    setIsLoading(false);
  };

  const loadBanks = async (autoApplyDefault = false) => {
    const data = await fetchBanksFromCloud();
    setBanks(data);
    if (autoApplyDefault) {
      const defaultBank = data.find(b => b.isDefault);
      if (defaultBank) {
        const { id, isDefault, ...bankInfo } = defaultBank;
        updateInvoice('bankingInfo', bankInfo);
      }
    }
  };

  const loadClients = async () => {
    const data = await fetchClientsFromCloud();
    setClients(data);
  };

  const notify = (text: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setLastMessage({ text, type });
  };

  const handleSaveClient = async () => {
    const ci = invoice.clientInfo;
    if (!ci.name) return notify('Vui lòng nhập tên khách hàng trước.', 'error');
    try {
      const existing = clients.find(c => c.name.toLowerCase() === ci.name.toLowerCase());
      if (existing) {
        await updateClientInCloud(existing.id, ci);
        notify('Đã cập nhật thông tin khách hàng!', 'success');
      } else {
        await saveClientToCloud(ci);
        notify('Đã lưu khách hàng mới!', 'success');
      }
      await loadClients();
    } catch (e: any) {
      notify('Lỗi lưu khách hàng: ' + e.message, 'error');
    }
  };

  const handleSelectClient = (id: string) => {
    const c = clients.find(cl => cl.id === id);
    if (!c) return;
    const { id: _id, ...info } = c;
    updateInvoice('clientInfo', info);
  };

  const loadStudios = async () => {
    const data = await fetchStudiosFromCloud();
    setStudios(data);
    return data;
  };

  const handleAddStudio = async () => {
    if (!newStudio.name) return notify('Vui lòng nhập tên công ty.', 'error');
    setIsLoading(true);
    try {
      await saveStudioToCloud(newStudio);
      setNewStudio({ name: '', address: '', email: '', taxCode: '' });
      await loadStudios();
      notify('Đã lưu Studio!', 'success');
    } catch (e: any) { notify('Lỗi: ' + e.message, 'error'); }
    finally { setIsLoading(false); }
  };

  const handleSetDefaultStudio = async (id: string) => {
    try {
      await setDefaultStudioInCloud(id, studios);
      const updated = await loadStudios();
      const def = updated.find(s => s.id === id);
      if (def) {
        const { id: _id, isDefault: _d, ...info } = def;
        updateInvoice('studioInfo', info);
      }
      notify('Đã đặt Studio mặc định!', 'success');
    } catch (e: any) { notify('Lỗi: ' + e.message, 'error'); }
  };

  const handleDeleteStudio = async (id: string) => {
    if (!confirm('Xoá Studio này?')) return;
    setIsLoading(true);
    try {
      await deleteStudioFromCloud(id);
      await loadStudios();
      notify('Đã xoá Studio.', 'success');
    } catch (e: any) { notify('Lỗi: ' + e.message, 'error'); }
    finally { setIsLoading(false); }
  };

  const handleEditStudio = (s: StudioRecord) => {
    setEditingStudioId(s.id);
    const { id, isDefault, ...info } = s;
    setEditingStudioData(info);
  };

  const handleUpdateStudio = async () => {
    if (!editingStudioId || !editingStudioData) return;
    setIsLoading(true);
    try {
      await updateStudioInCloud(editingStudioId, editingStudioData);
      setEditingStudioId(null);
      setEditingStudioData(null);
      await loadStudios();
      notify('Đã cập nhật Studio!', 'success');
    } catch (e: any) { notify('Lỗi: ' + e.message, 'error'); }
    finally { setIsLoading(false); }
  };

  const handleAddBank = async () => {
    if (!newBank.accountName || !newBank.accountNumber || !newBank.alias) {
      return alert("Vui lòng nhập Tên nhận biết, Tên người thụ hưởng và Số tài khoản.");
    }

    setIsLoading(true);
    try {
      await saveBankToCloud(newBank);
      notify("Đã lưu tài khoản lên NocoDB!", "success");
      setNewBank({
        alias: '',
        accountName: '',
        accountNumber: '',
        bankName: '',
        branchName: '',
        bankAddress: '',
        citadCode: '',
        swiftCode: ''
      });
      await loadBanks();
    } catch (error: any) {
      notify("Lỗi lưu tài khoản: " + error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBank = async (id: string) => {
    if (!confirm("Xóa tài khoản ngân hàng này?")) return;
    try {
      await deleteBankFromCloud(id);
      await loadBanks();
      notify("Đã xóa tài khoản.");
    } catch (error) {
      notify("Không thể xóa.", "error");
    }
  };

  const handleSetDefaultBank = async (id: string) => {
    try {
      await setDefaultBankInCloud(id, banks);
      const updated = await fetchBanksFromCloud();
      setBanks(updated);
      const defaultBank = updated.find(b => b.id === id);
      if (defaultBank) {
        const { id: _id, isDefault: _def, ...bankInfo } = defaultBank;
        updateInvoice('bankingInfo', bankInfo);
      }
      notify("Đã đặt tài khoản mặc định!", "success");
    } catch (error: any) {
      notify("Lỗi đặt mặc định: " + error.message, "error");
    }
  };

  const handleEditBank = (bank: BankingInfo & { id: string; isDefault: boolean }) => {
    setEditingBankId(bank.id);
    const { id, isDefault, ...bankInfo } = bank;
    setEditingBankData(bankInfo);
  };

  const handleCancelEdit = () => {
    setEditingBankId(null);
    setEditingBankData(null);
  };

  const handleUpdateBank = async () => {
    if (!editingBankId || !editingBankData) return;
    setIsLoading(true);
    try {
      await updateBankInCloud(editingBankId, editingBankData);
      notify("Đã cập nhật tài khoản!", "success");
      setEditingBankId(null);
      setEditingBankData(null);
      await loadBanks();
    } catch (error: any) {
      notify("Lỗi cập nhật: " + error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToCloud = async () => {
    setIsLoading(true);
    try {
      await saveInvoiceToCloud(invoice);
      notify("Hóa đơn đã được đồng bộ lên Cloud!", "success");
      if (activeTab === 'history') loadHistory();
    } catch (error: any) {
      notify("Lỗi lưu hóa đơn: " + error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: InvoiceData['status']) => {
    const nextStatus = currentStatus === 'paid' ? 'pending' : 'paid';
    const paidDate = nextStatus === 'paid' ? new Date().toISOString().split('T')[0] : undefined;
    try {
      await updateInvoiceStatusInCloud(id, nextStatus, paidDate);
      setHistory(prev => prev.map(inv =>
        inv.id === id ? { ...inv, status: nextStatus, paidDate } : inv
      ));
      notify(nextStatus === 'paid' ? `Đã xác nhận thanh toán!` : 'Chuyển về Pending.', 'success');
    } catch (error) {
      notify("Lỗi cập nhật trạng thái.", "error");
    }
  };

  const loadFromHistory = (item: InvoiceData) => {
    setInvoice(item);
    setActiveTab('edit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateInvoice = (path: string, value: any) => {
    setInvoice(prev => {
      const keys = path.split('.');
      if (keys.length === 1) return { ...prev, [keys[0]]: value };
      const newPrev = JSON.parse(JSON.stringify(prev));
      let current = newPrev;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newPrev;
    });
  };

  const updateItem = (id: string, field: keyof ServiceItem, value: any) => {
    setInvoice(prev => ({
      ...prev,
      items: prev.items.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const handleBankSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const bankId = e.target.value;
    if (!bankId) return;
    const selectedBank = banks.find(b => b.id === bankId);
    if (selectedBank) {
      const { id, isDefault, ...bankInfo } = selectedBank;
      updateInvoice('bankingInfo', bankInfo);
    }
  };

  const formatCurrencySimple = (val: number, curr: string) => {
    return new Intl.NumberFormat(curr === 'VND' ? 'vi-VN' : 'en-US', {
      style: 'currency', currency: curr
    }).format(val);
  };

  const handleExport = async (format: 'pdf' | 'png' | 'excel' | 'word') => {
    const fileName = `Invoice_${invoice.invoiceNumber}`;
    setIsExporting(format);
    try {
      // Auto-save invoice to cloud on export
      saveInvoiceToCloud(invoice).catch(e => console.warn('Auto-save failed:', e.message));

      if (format === 'pdf' || format === 'png' || format === 'word') {
        if (activeTab !== 'preview') {
          setActiveTab('preview');
          await new Promise(resolve => setTimeout(resolve, 1200));
        }
      }
      switch (format) {
        case 'pdf': await exportToPDF('invoice-capture', fileName); break;
        case 'png': await exportToPNG('invoice-capture', fileName, invoice.theme); break;
        case 'excel': exportToExcel(invoice, fileName); break;
        case 'word': exportToWord('invoice-capture', fileName); break;
      }
    } catch (error) {
      console.error("Export failed:", error);
      notify("Lỗi khi xuất file. Vui lòng thử lại.", "error");
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-500" style={{ backgroundColor: invoice.theme === 'dark' ? '#0F0F0F' : '#F5F5F5' }}>
      {/* Toast Notification */}
      {lastMessage && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-2xl shadow-2xl animate-fadeInUp flex items-center gap-3 border ${lastMessage.type === 'success' ? 'bg-status-success text-white border-white/20' :
          lastMessage.type === 'warning' ? 'bg-status-warning text-black border-black/10' :
            'bg-status-error text-white border-white/20'
          }`}>
          <span className="font-bold uppercase text-[10px] tracking-widest">{lastMessage.text}</span>
          <button onClick={() => setLastMessage(null)} className="opacity-60 hover:opacity-100 font-bold">✕</button>
        </div>
      )}

      {/* Navbar */}
      <nav className={`h-20 sticky top-0 backdrop-blur-md border-b flex items-center justify-between px-6 md:px-12 z-50 transition-colors duration-300 ${invoice.theme === 'dark' ? 'bg-[#0F0F0F]/95 border-primary/10' : 'bg-white/95 border-gray-200 shadow-sm'}`}>
        <div className="flex items-center gap-3">
          <img src="https://pub-f0ef2ac3b67c4d4da2fe20c73ab57f83.r2.dev/logo_td.png" alt="Logo" className="w-10 h-10 object-contain" />
          <div className="flex flex-col">
            <span className={`text-lg font-bold uppercase tracking-widest leading-none ${invoice.theme === 'dark' ? 'text-white' : 'text-black'}`}>TD Games Billing</span>
          </div>
        </div>

        <div className={`flex gap-1 p-1 rounded-full border ${invoice.theme === 'dark' ? 'bg-surface border-white/5' : 'bg-gray-100 border-gray-200'}`}>
          {(['edit', 'preview', 'history', 'dashboard'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 md:px-6 py-2 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-primary text-black shadow-btn-glow' : invoice.theme === 'dark' ? 'text-neutral-medium hover:text-white' : 'text-gray-500 hover:text-black'}`}
            >
              {tab === 'dashboard' ? '📊' : ''}{tab}
            </button>
          ))}
        </div>
      </nav>

      <main className="flex-1 p-6 md:p-12 max-w-[1400px] mx-auto w-full">
        {activeTab === 'history' ? (
          <div className="animate-fadeInUp space-y-8">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-4xl font-black text-primary uppercase tracking-tighter">Invoice History</h2>
                <p className={`${invoice.theme === 'dark' ? 'text-neutral-medium' : 'text-gray-500'} text-sm mt-2`}>Synced from NocoDB Cloud</p>
              </div>
              <Button onClick={loadHistory} variant="ghost" size="sm" disabled={isLoading}>{isLoading ? 'Loading...' : 'Refresh'}</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {history.length === 0 && !isLoading && (
                <div className="col-span-full py-20 text-center flex flex-col items-center">
                  <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center mb-6">
                    <svg className="w-10 h-10 text-primary/20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <p className="opacity-50 font-black uppercase tracking-widest text-xs">No invoices found in your history</p>
                </div>
              )}
              {history.map((inv) => (
                <div key={inv.id} className={`p-6 rounded-[24px] border transition-all hover:scale-[1.02] ${invoice.theme === 'dark' ? 'bg-surface border-primary/10' : 'bg-white border-gray-200 shadow-md'} relative overflow-hidden group`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${inv.status === 'paid' ? 'bg-status-success/20 text-status-success' : 'bg-status-warning/20 text-status-warning'}`}>
                        {inv.status}
                      </span>
                      {inv.paidDate && <p className="text-[9px] text-status-success/70 font-bold mt-1">Paid: {inv.paidDate}</p>}
                    </div>
                    <p className="text-[10px] text-neutral-medium font-bold uppercase">{inv.issueDate}</p>
                  </div>
                  <h3 className={`text-xl font-black mb-1 ${invoice.theme === 'dark' ? 'text-white' : 'text-black'}`}>{inv.invoiceNumber}</h3>
                  <p className={`text-sm mb-4 font-medium truncate ${invoice.theme === 'dark' ? 'text-neutral-medium' : 'text-gray-500'}`}>{inv.clientInfo?.name || 'Untitled Client'}</p>
                  <div className="flex justify-between items-center pt-4 border-t border-primary/10">
                    <p className="text-primary font-black">{formatCurrencySimple(inv.items.reduce((a, b) => a + (b.quantity * b.unitPrice), 0), inv.currency)}</p>
                    <div className="flex gap-2">
                      <button onClick={() => loadFromHistory(inv)} title="Load to Editor" className="p-2 hover:text-primary transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
                      <button onClick={() => toggleStatus(inv.id!, inv.status)} title="Mark Paid/Pending" className="p-2 hover:text-primary transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === 'dashboard' ? (
          (() => {
            const calcTotal = (inv: InvoiceData) => {
              const sub = inv.items.reduce((a, i) => a + i.quantity * i.unitPrice, 0);
              const disc = inv.discountType === 'percentage' ? sub * (inv.discountValue / 100) : inv.discountValue;
              return Math.max(0, sub - disc) * (1 + inv.taxRate / 100);
            };
            const pending = history.filter(i => i.status !== 'paid');
            const revenueMap: Record<string, number> = {};
            history.filter(i => i.status === 'paid').forEach(inv => {
              const name = inv.clientInfo?.name || 'Unknown';
              revenueMap[name] = (revenueMap[name] || 0) + calcTotal(inv);
            });
            const revenueList = Object.entries(revenueMap).sort((a, b) => b[1] - a[1]);
            const totalRevenue = Object.values(revenueMap).reduce((a, b) => a + b, 0);
            return (
              <div className="animate-fadeInUp space-y-10">
                <div className="flex justify-between items-end">
                  <div>
                    <h2 className="text-4xl font-black text-primary uppercase tracking-tighter">📊 Dashboard</h2>
                    <p className={`text-sm mt-2 ${invoice.theme === 'dark' ? 'text-neutral-medium' : 'text-gray-500'}`}>Tổng quan doanh thu & công nợ</p>
                  </div>
                  <Button onClick={loadHistory} variant="ghost" size="sm" disabled={isLoading}>{isLoading ? 'Loading...' : 'Refresh'}</Button>
                </div>
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[{ label: 'Tổng doanh thu (đã thu)', value: formatCurrencySimple(totalRevenue, 'USD'), color: 'text-status-success' },
                  { label: 'Chưa thanh toán', value: `${pending.length} hoá đơn`, color: 'text-status-warning' },
                  { label: 'Tổng hoá đơn', value: `${history.length}`, color: 'text-primary' }]
                    .map(k => (
                      <div key={k.label} className={`p-6 rounded-[20px] border ${invoice.theme === 'dark' ? 'bg-surface border-primary/10' : 'bg-white border-gray-200 shadow-md'}`}>
                        <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${invoice.theme === 'dark' ? 'text-neutral-medium' : 'text-gray-400'}`}>{k.label}</p>
                        <p className={`text-2xl font-black ${k.color}`}>{k.value}</p>
                      </div>
                    ))}
                </div>
                {/* Revenue per client */}
                <div className={`p-8 rounded-[24px] border ${invoice.theme === 'dark' ? 'bg-surface border-primary/10' : 'bg-white border-gray-200 shadow-md'}`}>
                  <h3 className="text-xl font-black uppercase tracking-tighter text-primary mb-6">Doanh thu theo khách hàng</h3>
                  {revenueList.length === 0 ? <p className="opacity-30 text-xs font-black uppercase">Chưa có hoá đơn đã thanh toán</p> : (
                    <div className="space-y-4">
                      {revenueList.map(([name, rev]) => (
                        <div key={name}>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-bold">{name}</span>
                            <span className="text-sm font-black text-primary">{formatCurrencySimple(rev, 'USD')}</span>
                          </div>
                          <div className={`h-2 rounded-full ${invoice.theme === 'dark' ? 'bg-white/5' : 'bg-gray-100'}`}>
                            <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${totalRevenue > 0 ? (rev / totalRevenue) * 100 : 0}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Pending invoices */}
                <div className={`p-8 rounded-[24px] border ${invoice.theme === 'dark' ? 'bg-surface border-primary/10' : 'bg-white border-gray-200 shadow-md'}`}>
                  <h3 className="text-xl font-black uppercase tracking-tighter text-status-warning mb-6">⚠️ Chưa thanh toán ({pending.length})</h3>
                  {pending.length === 0 ? <p className="opacity-30 text-xs font-black uppercase">Tất cả đã thanh toán 🎉</p> : (
                    <div className="space-y-3">
                      {pending.map(inv => (
                        <div key={inv.id} className={`flex items-center justify-between p-4 rounded-xl border ${invoice.theme === 'dark' ? 'border-white/5 bg-black/20' : 'border-gray-100 bg-gray-50'}`}>
                          <div>
                            <p className="text-sm font-black">{inv.invoiceNumber}</p>
                            <p className={`text-xs ${invoice.theme === 'dark' ? 'text-neutral-medium' : 'text-gray-500'}`}>{inv.clientInfo?.name} • Due: {inv.dueDate}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="text-primary font-black text-sm">{formatCurrencySimple(calcTotal(inv), inv.currency)}</p>
                            <button onClick={() => toggleStatus(inv.id!, inv.status)} className="px-3 py-1.5 rounded-lg bg-status-success/20 text-status-success text-[10px] font-black uppercase hover:bg-status-success/30 transition-colors">Mark Paid</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-4 space-y-8 h-fit lg:sticky lg:top-32 actions-sidebar no-print">
              <section className={`p-8 rounded-[24px] border shadow-xl ${invoice.theme === 'dark' ? 'bg-surface border-primary/20' : 'bg-white border-gray-100'}`}>
                <h2 className="text-xl font-black uppercase tracking-tighter text-primary mb-6">Actions</h2>
                <div className="space-y-4">
                  <Button onClick={() => handleExport('pdf')} disabled={isExporting !== null} variant="primary" className="w-full text-sm py-4 shadow-btn-glow">
                    {isExporting === 'pdf' ? 'Đang chuẩn bị...' : 'EXPORT PDF'}
                  </Button>
                  <Button onClick={handleSaveToCloud} disabled={isLoading} variant="ghost" className="w-full !py-4 border border-primary/20 hover:bg-primary/5">
                    {isLoading ? 'Syncing...' : 'Save Invoice'}
                  </Button>
                </div>
              </section>

              <section className={`p-8 rounded-[24px] border ${invoice.theme === 'dark' ? 'bg-surface border-primary/20' : 'bg-white border-gray-100'}`}>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-black uppercase tracking-tighter text-primary">Config</h2>
                  <button onClick={() => setShowBankManager(!showBankManager)} className={`p-2 rounded-lg transition-all ${showBankManager ? 'bg-primary text-black' : 'text-primary hover:bg-primary/10'}`}>
                    <svg className={`w-5 h-5 transform transition-transform ${showBankManager ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </button>
                </div>
                <div className="space-y-4">
                  {studios.length > 0 && (
                    <Select label="Studio Profile" onChange={e => { const s = studios.find(x => x.id === e.target.value); if (s) { const { id, isDefault, ...info } = s; updateInvoice('studioInfo', info); } }}>
                      <option value="">-- Chọn công ty --</option>
                      {studios.map(s => <option key={s.id} value={s.id}>{s.name}{s.isDefault ? ' ★' : ''}</option>)}
                    </Select>
                  )}

                  <Select label="Banking Profile" onChange={handleBankSelect}>
                    <option value="">-- Chọn tài khoản --</option>
                    {banks.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.alias || b.accountName}
                      </option>
                    ))}
                  </Select>

                  <Select label="Invoice Theme" value={invoice.theme} onChange={(e) => updateInvoice('theme', e.target.value)}>
                    <option value="dark">Dark Theme</option>
                    <option value="light">Light Theme</option>
                  </Select>
                  <Select label="Status" value={invoice.status} onChange={(e) => updateInvoice('status', e.target.value)}>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                  </Select>
                  <div className="grid grid-cols-2 gap-4">
                    <Select label="Currency" value={invoice.currency} onChange={(e) => updateInvoice('currency', e.target.value)}>
                      <option value="USD">USD</option>
                      <option value="VND">VND</option>
                    </Select>
                    <Input label="Invoice #" value={invoice.invoiceNumber} onChange={(e) => updateInvoice('invoiceNumber', e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Issue Date" type="date" value={invoice.issueDate} onChange={(e) => updateInvoice('issueDate', e.target.value)} />
                    <Input label="Due Date" type="date" value={invoice.dueDate} onChange={(e) => updateInvoice('dueDate', e.target.value)} />
                  </div>
                </div>
              </section>

              {/* Bank Manager Panel */}
              {showBankManager && (
                <section className={`p-8 rounded-[24px] border animate-fadeInUp ${invoice.theme === 'dark' ? 'bg-surface border-primary/20' : 'bg-white border-gray-100 shadow-lg'}`}>
                  <h2 className="text-xl font-black uppercase tracking-tighter text-primary mb-6">Manage Banks</h2>

                  {/* Bank Form */}
                  <div className="space-y-4 mb-8 bg-black/40 p-5 rounded-[20px] border border-white/5">
                    <Input
                      label="Tên nhận biết (Ví dụ: MB Cá Nhân)"
                      value={newBank.alias}
                      onChange={(e) => setNewBank({ ...newBank, alias: e.target.value })}
                      placeholder="Gợi nhớ..."
                    />
                    <Input
                      label="Beneficiary Name"
                      value={newBank.accountName}
                      onChange={(e) => setNewBank({ ...newBank, accountName: e.target.value })}
                    />
                    <Input
                      label="Account Number"
                      value={newBank.accountNumber}
                      onChange={(e) => setNewBank({ ...newBank, accountNumber: e.target.value })}
                    />
                    <Input
                      label="Bank Name"
                      value={newBank.bankName}
                      onChange={(e) => setNewBank({ ...newBank, bankName: e.target.value })}
                    />
                    <Input
                      label="Branch"
                      value={newBank.branchName}
                      onChange={(e) => setNewBank({ ...newBank, branchName: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input label="SWIFT" value={newBank.swiftCode} onChange={(e) => setNewBank({ ...newBank, swiftCode: e.target.value })} />
                      <Input label="CITAD" value={newBank.citadCode} onChange={(e) => setNewBank({ ...newBank, citadCode: e.target.value })} />
                    </div>
                    <Button onClick={handleAddBank} variant="primary" size="sm" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Processing...' : 'Save Profile'}
                    </Button>
                  </div>

                  {/* Saved Banks List */}
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {banks.length === 0 && <p className="text-center py-8 opacity-30 text-[10px] font-black uppercase tracking-widest">Empty Storage</p>}
                    {banks.map(b => (
                      <div key={b.id} className={`rounded-xl border transition-all relative overflow-hidden ${editingBankId === b.id ? (invoice.theme === 'dark' ? 'bg-primary/5 border-primary/50' : 'bg-orange-50 border-primary/40') : invoice.theme === 'dark' ? 'bg-black/20 border-white/5 hover:border-primary/30' : 'bg-gray-50 border-gray-200 hover:border-primary/40'}`}>
                        {editingBankId === b.id && editingBankData ? (
                          /* ── Edit Mode ── */
                          <div className="p-4 space-y-3">
                            <p className="text-[9px] font-black uppercase text-primary/60 mb-2 tracking-widest">✏️ Đang chỉnh sửa</p>
                            <input placeholder="Tên nhận biết" value={editingBankData.alias || ''} onChange={e => setEditingBankData({ ...editingBankData, alias: e.target.value })}
                              className={`w-full text-xs font-bold px-3 py-2 rounded-lg border outline-none bg-transparent focus:border-primary transition-colors ${invoice.theme === 'dark' ? 'border-white/10 text-white' : 'border-gray-300 text-black'}`} />
                            <input placeholder="Beneficiary Name" value={editingBankData.accountName} onChange={e => setEditingBankData({ ...editingBankData, accountName: e.target.value })}
                              className={`w-full text-xs font-bold px-3 py-2 rounded-lg border outline-none bg-transparent focus:border-primary transition-colors ${invoice.theme === 'dark' ? 'border-white/10 text-white' : 'border-gray-300 text-black'}`} />
                            <input placeholder="Account Number" value={editingBankData.accountNumber} onChange={e => setEditingBankData({ ...editingBankData, accountNumber: e.target.value })}
                              className={`w-full text-xs font-bold px-3 py-2 rounded-lg border outline-none bg-transparent focus:border-primary transition-colors ${invoice.theme === 'dark' ? 'border-white/10 text-white' : 'border-gray-300 text-black'}`} />
                            <input placeholder="Bank Name" value={editingBankData.bankName} onChange={e => setEditingBankData({ ...editingBankData, bankName: e.target.value })}
                              className={`w-full text-xs font-bold px-3 py-2 rounded-lg border outline-none bg-transparent focus:border-primary transition-colors ${invoice.theme === 'dark' ? 'border-white/10 text-white' : 'border-gray-300 text-black'}`} />
                            <input placeholder="Branch" value={editingBankData.branchName} onChange={e => setEditingBankData({ ...editingBankData, branchName: e.target.value })}
                              className={`w-full text-xs font-bold px-3 py-2 rounded-lg border outline-none bg-transparent focus:border-primary transition-colors ${invoice.theme === 'dark' ? 'border-white/10 text-white' : 'border-gray-300 text-black'}`} />
                            <div className="grid grid-cols-2 gap-2">
                              <input placeholder="SWIFT" value={editingBankData.swiftCode} onChange={e => setEditingBankData({ ...editingBankData, swiftCode: e.target.value })}
                                className={`w-full text-xs font-bold px-3 py-2 rounded-lg border outline-none bg-transparent focus:border-primary transition-colors ${invoice.theme === 'dark' ? 'border-white/10 text-white' : 'border-gray-300 text-black'}`} />
                              <input placeholder="CITAD" value={editingBankData.citadCode} onChange={e => setEditingBankData({ ...editingBankData, citadCode: e.target.value })}
                                className={`w-full text-xs font-bold px-3 py-2 rounded-lg border outline-none bg-transparent focus:border-primary transition-colors ${invoice.theme === 'dark' ? 'border-white/10 text-white' : 'border-gray-300 text-black'}`} />
                            </div>
                            <div className="flex gap-2 pt-1">
                              <button onClick={handleUpdateBank} disabled={isLoading}
                                className="flex-1 py-2 rounded-lg bg-primary text-black text-[10px] font-black uppercase tracking-widest hover:bg-primary/80 transition-colors">
                                {isLoading ? '...' : 'Lưu'}
                              </button>
                              <button onClick={handleCancelEdit}
                                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-colors ${invoice.theme === 'dark' ? 'border-white/10 text-white/60 hover:text-white' : 'border-gray-300 text-gray-500 hover:text-black'}`}>
                                Hủy
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* ── View Mode ── */
                          <div className="flex items-center p-4 gap-3">
                            <div className="overflow-hidden flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-[7px] font-black uppercase text-primary/60">☁️ CLOUD • NocoDB</p>
                                {b.isDefault && (
                                  <span className="text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary text-black leading-none">DEFAULT</span>
                                )}
                              </div>
                              <p className="text-xs font-black text-primary truncate uppercase">{b.alias || b.accountName}</p>
                              <p className="text-[10px] font-bold opacity-80">{b.accountName}</p>
                              <p className="text-[10px] opacity-40 tabular-nums">{b.accountNumber} • {b.bankName}</p>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              {/* Star: set as default */}
                              <button
                                onClick={() => handleSetDefaultBank(b.id)}
                                title={b.isDefault ? 'Đang là mặc định' : 'Đặt làm mặc định'}
                                className={`p-2 rounded-lg transition-all ${b.isDefault ? 'text-primary bg-primary/10' : invoice.theme === 'dark' ? 'text-white/30 hover:text-primary hover:bg-primary/10' : 'text-gray-300 hover:text-primary hover:bg-primary/10'}`}
                              >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill={b.isDefault ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                              </button>
                              <button onClick={() => handleEditBank(b)} title="Chỉnh sửa"
                                className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                              <button onClick={() => handleDeleteBank(b.id)} title="Xóa"
                                className="p-2 text-status-error hover:bg-status-error/10 rounded-lg transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Studio Manager Panel */}
              <section className={`p-8 rounded-[24px] border ${invoice.theme === 'dark' ? 'bg-surface border-primary/20' : 'bg-white border-gray-100'}`}>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-black uppercase tracking-tighter text-primary">🏢 Studios</h2>
                  <button onClick={() => setShowStudioManager(!showStudioManager)}
                    className={`p-2 rounded-lg transition-all ${showStudioManager ? 'bg-primary text-black' : 'text-primary hover:bg-primary/10'}`}>
                    <svg className={`w-5 h-5 transform transition-transform ${showStudioManager ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                  </button>
                </div>
                {showStudioManager && (
                  <div>
                    {/* Add form */}
                    <div className="space-y-3 mb-6 bg-black/30 p-4 rounded-[16px] border border-white/5">
                      <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${invoice.theme === 'dark' ? 'text-neutral-medium' : 'text-gray-400'}`}>➕ Thêm công ty mới</p>
                      <input placeholder="Tên công ty *" value={newStudio.name} onChange={e => setNewStudio({ ...newStudio, name: e.target.value })}
                        className={`w-full text-xs font-bold px-3 py-2 rounded-lg border outline-none bg-transparent focus:border-primary transition-colors ${invoice.theme === 'dark' ? 'border-white/10 text-white' : 'border-gray-300 text-black'}`} />
                      <input placeholder="Email" value={newStudio.email} onChange={e => setNewStudio({ ...newStudio, email: e.target.value })}
                        className={`w-full text-xs font-bold px-3 py-2 rounded-lg border outline-none bg-transparent focus:border-primary transition-colors ${invoice.theme === 'dark' ? 'border-white/10 text-white' : 'border-gray-300 text-black'}`} />
                      <input placeholder="Mã số thuế" value={newStudio.taxCode} onChange={e => setNewStudio({ ...newStudio, taxCode: e.target.value })}
                        className={`w-full text-xs font-bold px-3 py-2 rounded-lg border outline-none bg-transparent focus:border-primary transition-colors ${invoice.theme === 'dark' ? 'border-white/10 text-white' : 'border-gray-300 text-black'}`} />
                      <textarea placeholder="Địa chỉ" value={newStudio.address} onChange={e => setNewStudio({ ...newStudio, address: e.target.value })} rows={2}
                        className={`w-full text-xs font-bold px-3 py-2 rounded-lg border outline-none bg-transparent focus:border-primary transition-colors resize-none ${invoice.theme === 'dark' ? 'border-white/10 text-white' : 'border-gray-300 text-black'}`} />
                      <Button onClick={handleAddStudio} variant="primary" size="sm" className="w-full" disabled={isLoading}>
                        {isLoading ? 'Đang lưu...' : 'Lưu Studio'}
                      </Button>
                    </div>
                    {/* List */}
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                      {studios.length === 0 && <p className="text-center py-6 opacity-30 text-[10px] font-black uppercase tracking-widest">Chưa có studio nào</p>}
                      {studios.map(s => (
                        <div key={s.id} className={`rounded-xl border transition-all relative overflow-hidden ${editingStudioId === s.id ? (invoice.theme === 'dark' ? 'bg-primary/5 border-primary/50' : 'bg-orange-50 border-primary/40') : invoice.theme === 'dark' ? 'bg-black/20 border-white/5 hover:border-primary/30' : 'bg-gray-50 border-gray-200 hover:border-primary/40'}`}>
                          {editingStudioId === s.id && editingStudioData ? (
                            <div className="p-4 space-y-2">
                              <p className="text-[9px] font-black uppercase text-primary/60 mb-2 tracking-widest">✏️ Đang chỉnh sửa</p>
                              <input placeholder="Tên công ty" value={editingStudioData.name} onChange={e => setEditingStudioData({ ...editingStudioData, name: e.target.value })}
                                className={`w-full text-xs font-bold px-3 py-2 rounded-lg border outline-none bg-transparent focus:border-primary transition-colors ${invoice.theme === 'dark' ? 'border-white/10 text-white' : 'border-gray-300 text-black'}`} />
                              <input placeholder="Email" value={editingStudioData.email} onChange={e => setEditingStudioData({ ...editingStudioData, email: e.target.value })}
                                className={`w-full text-xs font-bold px-3 py-2 rounded-lg border outline-none bg-transparent focus:border-primary transition-colors ${invoice.theme === 'dark' ? 'border-white/10 text-white' : 'border-gray-300 text-black'}`} />
                              <input placeholder="Mã số thuế" value={editingStudioData.taxCode} onChange={e => setEditingStudioData({ ...editingStudioData, taxCode: e.target.value })}
                                className={`w-full text-xs font-bold px-3 py-2 rounded-lg border outline-none bg-transparent focus:border-primary transition-colors ${invoice.theme === 'dark' ? 'border-white/10 text-white' : 'border-gray-300 text-black'}`} />
                              <textarea placeholder="Địa chỉ" value={editingStudioData.address} onChange={e => setEditingStudioData({ ...editingStudioData, address: e.target.value })} rows={2}
                                className={`w-full text-xs font-bold px-3 py-2 rounded-lg border outline-none bg-transparent focus:border-primary transition-colors resize-none ${invoice.theme === 'dark' ? 'border-white/10 text-white' : 'border-gray-300 text-black'}`} />
                              <div className="flex gap-2">
                                <button onClick={handleUpdateStudio} disabled={isLoading} className="flex-1 py-2 rounded-lg bg-primary text-black text-[10px] font-black uppercase">{isLoading ? '...' : 'Lưu'}</button>
                                <button onClick={() => { setEditingStudioId(null); setEditingStudioData(null); }} className="flex-1 py-2 rounded-lg border border-white/10 text-[10px] font-black uppercase opacity-60 hover:opacity-100">Huỷ</button>
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-black truncate">{s.name}</p>
                                  {s.isDefault && <span className="text-[9px] font-black bg-primary/20 text-primary px-2 py-0.5 rounded uppercase tracking-widest">Default</span>}
                                </div>
                                <p className={`text-[11px] truncate ${invoice.theme === 'dark' ? 'text-neutral-medium' : 'text-gray-500'}`}>{s.email} {s.taxCode ? `· MST: ${s.taxCode}` : ''}</p>
                              </div>
                              <div className="flex items-center gap-1 ml-2">
                                <button onClick={() => handleSetDefaultStudio(s.id)} title="Đặt mặc định" className={`p-1.5 rounded-lg transition-colors ${s.isDefault ? 'text-yellow-400' : 'text-neutral-medium hover:text-yellow-400'}`}>
                                  {s.isDefault ? '⭐' : '☆'}
                                </button>
                                <button onClick={() => handleEditStudio(s)} className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                </button>
                                <button onClick={() => handleDeleteStudio(s.id)} className="p-1.5 text-status-error hover:bg-status-error/10 rounded-lg transition-colors">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </div>

            <div className="lg:col-span-8">
              {activeTab === 'edit' ? (
                <div className="space-y-12 animate-fadeInUp">
                  <div className={`p-8 md:p-12 rounded-[24px] border ${invoice.theme === 'dark' ? 'bg-surface border-primary/10' : 'bg-white border-gray-100 shadow-md'}`}>
                    <div className="flex items-center justify-between mb-8">
                      <h2 className="text-2xl font-black uppercase tracking-tighter text-primary flex items-center">
                        <span className="w-8 h-8 bg-primary/20 text-primary rounded-lg flex items-center justify-center mr-4 text-sm">01</span>
                        Client Details
                      </h2>
                      <button onClick={handleSaveClient}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase text-primary border border-primary/30 hover:bg-primary/10 transition-all">
                        💾 Save Client
                      </button>
                    </div>
                    {/* Saved client selector */}
                    {clients.length > 0 && (
                      <div className="mb-6">
                        <Select label="Khách hàng đã lưu" onChange={e => handleSelectClient(e.target.value)}>
                          <option value="">-- Chọn nhanh khách hàng --</option>
                          {clients.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </Select>
                      </div>
                    )}
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Company Name with autocomplete */}
                      <div className="md:col-span-2 relative">
                        <Input
                          label="Company Name"
                          value={invoice.clientInfo.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateInvoice('clientInfo.name', val);
                            if (val.trim().length >= 1) {
                              const filtered = clients.filter(c =>
                                c.name.toLowerCase().includes(val.toLowerCase())
                              );
                              setClientSuggestions(filtered);
                              setShowSuggestions(filtered.length > 0);
                            } else {
                              setShowSuggestions(false);
                            }
                          }}
                          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                          onFocus={() => {
                            if (invoice.clientInfo.name.trim().length >= 1) {
                              const filtered = clients.filter(c =>
                                c.name.toLowerCase().includes(invoice.clientInfo.name.toLowerCase())
                              );
                              setClientSuggestions(filtered);
                              setShowSuggestions(filtered.length > 0);
                            }
                          }}
                          required
                        />
                        {showSuggestions && clientSuggestions.length > 0 && (
                          <div className={`absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border shadow-2xl overflow-hidden ${invoice.theme === 'dark' ? 'bg-[#1A1A1A] border-primary/20' : 'bg-white border-gray-200'}`}>
                            {clientSuggestions.map(c => (
                              <button
                                key={c.id}
                                type="button"
                                onMouseDown={() => {
                                  const { id, ...info } = c;
                                  updateInvoice('clientInfo', info);
                                  setShowSuggestions(false);
                                }}
                                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${invoice.theme === 'dark' ? 'hover:bg-primary/10' : 'hover:bg-orange-50'}`}
                              >
                                <span className="text-primary text-sm">👤</span>
                                <div>
                                  <p className="text-sm font-black">{c.name}</p>
                                  {(c.email || c.taxCode) && (
                                    <p className={`text-[11px] ${invoice.theme === 'dark' ? 'text-neutral-medium' : 'text-gray-500'}`}>
                                      {c.email}{c.taxCode ? ` · MST: ${c.taxCode}` : ''}
                                    </p>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <Input label="Contact Person" value={invoice.clientInfo.contactPerson} onChange={(e) => updateInvoice('clientInfo.contactPerson', e.target.value)} />
                      <Input label="Contact Email" type="email" value={invoice.clientInfo.email} onChange={(e) => updateInvoice('clientInfo.email', e.target.value)} placeholder="example@company.com" />
                      <Input label="Tax ID" value={invoice.clientInfo.taxCode || ''} onChange={(e) => updateInvoice('clientInfo.taxCode', e.target.value)} placeholder="e.g. 0123456789" />
                      <div className="md:col-span-2">
                        <TextArea label="Billing Address" value={invoice.clientInfo.address} onChange={(e) => updateInvoice('clientInfo.address', e.target.value)} />
                      </div>
                    </div>

                  </div>


                  <div className={`rounded-[24px] border overflow-hidden ${invoice.theme === 'dark' ? 'bg-surface border-primary/10' : 'bg-white border-gray-100 shadow-md'}`}>
                    {/* Section Header */}
                    <div className={`flex justify-between items-center px-8 py-6 border-b ${invoice.theme === 'dark' ? 'border-primary/10' : 'border-gray-100'}`}>
                      <h2 className="text-2xl font-black uppercase tracking-tighter text-primary flex items-center">
                        <span className="w-8 h-8 bg-primary/20 text-primary rounded-lg flex items-center justify-center mr-4 text-sm">02</span>
                        Service Items
                      </h2>
                      <button
                        onClick={() => updateInvoice('items', [...invoice.items, { id: Date.now().toString(), description: '', quantity: 1, unitPrice: 0 }])}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase text-primary border border-primary/30 hover:bg-primary/10 transition-all"
                      >
                        <span className="text-lg leading-none">+</span> Add Item
                      </button>
                    </div>

                    {/* Column Headers */}
                    <div className={`grid gap-0 px-8 py-3 text-[10px] font-black uppercase tracking-widest ${invoice.theme === 'dark' ? 'text-neutral-medium bg-black/20' : 'text-gray-400 bg-gray-50'}`}
                      style={{ gridTemplateColumns: '1fr 80px 110px 130px 36px' }}>
                      <span>Description</span>
                      <span className="text-center">Qty</span>
                      <span className="text-right">Unit Price</span>
                      <span className="text-right">Total</span>
                      <span></span>
                    </div>

                    {/* Item Rows */}
                    <div className="divide-y divide-primary/5">
                      {invoice.items.map((item, idx) => (
                        <div
                          key={item.id}
                          className={`grid items-center gap-4 px-8 py-5 group transition-all ${invoice.theme === 'dark' ? 'hover:bg-white/2' : 'hover:bg-gray-50/50'}`}
                          style={{ gridTemplateColumns: '1fr 80px 110px 130px 36px' }}
                        >
                          {/* Description */}
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-black text-primary/50 w-5 text-center shrink-0">{String(idx + 1).padStart(2, '0')}</span>
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                              placeholder="Service description..."
                              className={`w-full bg-transparent text-sm font-bold outline-none border-b border-transparent focus:border-primary/40 transition-colors pb-0.5 ${invoice.theme === 'dark' ? 'text-white placeholder-white/20' : 'text-black placeholder-black/20'
                                }`}
                            />
                          </div>
                          {/* Qty */}
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                            className={`w-full bg-transparent text-sm font-bold text-center outline-none border-b border-transparent focus:border-primary/40 transition-colors pb-0.5 ${invoice.theme === 'dark' ? 'text-white' : 'text-black'
                              }`}
                          />
                          {/* Unit Price */}
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(item.id, 'unitPrice', Number(e.target.value))}
                            className={`w-full bg-transparent text-sm font-bold text-right outline-none border-b border-transparent focus:border-primary/40 transition-colors pb-0.5 ${invoice.theme === 'dark' ? 'text-white' : 'text-black'
                              }`}
                          />
                          {/* Total */}
                          <div className="text-right text-sm font-black text-primary tabular-nums">
                            {formatCurrencySimple(item.quantity * item.unitPrice, invoice.currency)}
                          </div>
                          {/* Delete */}
                          <button
                            onClick={() => invoice.items.length > 1 && updateInvoice('items', invoice.items.filter(i => i.id !== item.id))}
                            className={`opacity-0 group-hover:opacity-100 transition-all p-1 rounded-lg ${invoice.items.length > 1
                              ? 'text-red-400 hover:bg-red-500/10 cursor-pointer'
                              : 'text-white/10 cursor-not-allowed'
                              }`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Subtotal row */}
                    <div className={`flex justify-end items-center gap-4 px-8 py-4 border-t ${invoice.theme === 'dark' ? 'border-primary/10 bg-black/20' : 'border-gray-100 bg-gray-50'
                      }`}>
                      <span className={`text-[11px] font-black uppercase tracking-widest ${invoice.theme === 'dark' ? 'text-neutral-medium' : 'text-gray-400'}`}>Subtotal</span>
                      <span className="text-base font-black tabular-nums text-primary min-w-[130px] text-right">
                        {formatCurrencySimple(invoice.items.reduce((a, i) => a + i.quantity * i.unitPrice, 0), invoice.currency)}
                      </span>
                    </div>
                  </div>
                  <div className={`rounded-[24px] border overflow-hidden ${invoice.theme === 'dark' ? 'bg-surface border-primary/10' : 'bg-white border-gray-100 shadow-md'}`}>
                    <div className={`flex items-center px-8 py-6 border-b ${invoice.theme === 'dark' ? 'border-primary/10' : 'border-gray-100'}`}>
                      <h2 className="text-2xl font-black uppercase tracking-tighter text-primary flex items-center">
                        <span className="w-8 h-8 bg-primary/20 text-primary rounded-lg flex items-center justify-center mr-4 text-sm">03</span>
                        Discount & Tax
                      </h2>
                    </div>

                    <div className="p-8">
                      {/* Two-column layout for discount + tax */}
                      <div className="grid grid-cols-2 gap-6">
                        {/* Discount */}
                        <div className={`rounded-2xl border p-5 space-y-4 ${invoice.theme === 'dark' ? 'border-white/5 bg-black/20' : 'border-gray-100 bg-gray-50'
                          }`}>
                          <div className="flex items-center justify-between">
                            <label className={`text-[11px] font-black uppercase tracking-widest ${invoice.theme === 'dark' ? 'text-neutral-medium' : 'text-gray-400'
                              }`}>Discount</label>
                            {/* Type pill toggle */}
                            <div className={`flex rounded-lg overflow-hidden border text-[10px] font-black ${invoice.theme === 'dark' ? 'border-white/10' : 'border-gray-200'
                              }`}>
                              <button
                                onClick={() => updateInvoice('discountType', 'percentage')}
                                className={`px-3 py-1.5 transition-all ${invoice.discountType === 'percentage' ? 'bg-primary text-black' : invoice.theme === 'dark' ? 'text-white/40 hover:text-white' : 'text-gray-400 hover:text-black'
                                  }`}
                              >%</button>
                              <button
                                onClick={() => updateInvoice('discountType', 'amount')}
                                className={`px-3 py-1.5 transition-all ${invoice.discountType === 'amount' ? 'bg-primary text-black' : invoice.theme === 'dark' ? 'text-white/40 hover:text-white' : 'text-gray-400 hover:text-black'
                                  }`}
                              >{invoice.currency}</button>
                            </div>
                          </div>
                          <div className="relative">
                            <input
                              type="number"
                              value={invoice.discountValue}
                              min="0"
                              onChange={(e) => updateInvoice('discountValue', Number(e.target.value))}
                              className={`w-full text-2xl font-black bg-transparent outline-none border-b-2 pb-2 transition-colors ${invoice.discountValue > 0
                                ? 'border-primary text-primary'
                                : invoice.theme === 'dark' ? 'border-white/10 text-white/30' : 'border-gray-200 text-gray-300'
                                }`}
                              placeholder="0"
                            />
                            <span className={`absolute right-0 bottom-3 text-[11px] font-black ${invoice.discountValue > 0 ? 'text-primary' : 'opacity-30'
                              }`}>
                              {invoice.discountType === 'percentage' ? '%' : invoice.currency}
                            </span>
                          </div>
                          {invoice.discountValue > 0 && (() => {
                            const sub = invoice.items.reduce((a, i) => a + i.quantity * i.unitPrice, 0);
                            const disc = invoice.discountType === 'percentage' ? sub * (invoice.discountValue / 100) : invoice.discountValue;
                            return <p className="text-[11px] font-bold text-[#4CAF50]">− {formatCurrencySimple(disc, invoice.currency)}</p>;
                          })()}
                        </div>

                        {/* Tax */}
                        <div className={`rounded-2xl border p-5 space-y-4 ${invoice.theme === 'dark' ? 'border-white/5 bg-black/20' : 'border-gray-100 bg-gray-50'
                          }`}>
                          <label className={`text-[11px] font-black uppercase tracking-widest block ${invoice.theme === 'dark' ? 'text-neutral-medium' : 'text-gray-400'
                            }`}>Tax Rate</label>
                          <div className="relative">
                            <input
                              type="number"
                              value={invoice.taxRate}
                              min="0"
                              max="100"
                              onChange={(e) => updateInvoice('taxRate', Number(e.target.value))}
                              className={`w-full text-2xl font-black bg-transparent outline-none border-b-2 pb-2 transition-colors ${invoice.taxRate > 0
                                ? 'border-primary text-primary'
                                : invoice.theme === 'dark' ? 'border-white/10 text-white/30' : 'border-gray-200 text-gray-300'
                                }`}
                              placeholder="0"
                            />
                            <span className={`absolute right-0 bottom-3 text-[11px] font-black ${invoice.taxRate > 0 ? 'text-primary' : 'opacity-30'
                              }`}>%</span>
                          </div>
                          {invoice.taxRate > 0 && (() => {
                            const sub = invoice.items.reduce((a, i) => a + i.quantity * i.unitPrice, 0);
                            const disc = invoice.discountType === 'percentage' ? sub * (invoice.discountValue / 100) : invoice.discountValue;
                            const tax = Math.max(0, sub - disc) * (invoice.taxRate / 100);
                            return <p className="text-[11px] font-bold">{formatCurrencySimple(tax, invoice.currency)}</p>;
                          })()}
                        </div>
                      </div>

                      {/* Summary bar — shown only when discount or tax active */}
                      {(invoice.discountValue > 0 || invoice.taxRate > 0) && (() => {
                        const sub = invoice.items.reduce((a, i) => a + i.quantity * i.unitPrice, 0);
                        const disc = invoice.discountType === 'percentage' ? sub * (invoice.discountValue / 100) : invoice.discountValue;
                        const afterDisc = Math.max(0, sub - disc);
                        const tax = afterDisc * (invoice.taxRate / 100);
                        const total = afterDisc + tax;
                        return (
                          <div className={`mt-6 rounded-2xl border px-6 py-5 ${invoice.theme === 'dark' ? 'border-primary/20 bg-primary/5' : 'border-primary/20 bg-orange-50'
                            }`}>
                            <div className="grid grid-cols-4 gap-4 items-center">
                              <div className="text-center">
                                <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${invoice.theme === 'dark' ? 'text-neutral-medium' : 'text-gray-400'
                                  }`}>Subtotal</p>
                                <p className="text-sm font-black tabular-nums">{formatCurrencySimple(sub, invoice.currency)}</p>
                              </div>
                              {invoice.discountValue > 0 && (
                                <div className="text-center">
                                  <p className="text-[9px] font-black uppercase tracking-widest mb-1 text-[#4CAF50]/70">Discount</p>
                                  <p className="text-sm font-black tabular-nums text-[#4CAF50]">− {formatCurrencySimple(disc, invoice.currency)}</p>
                                </div>
                              )}
                              {invoice.taxRate > 0 && (
                                <div className="text-center">
                                  <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${invoice.theme === 'dark' ? 'text-neutral-medium' : 'text-gray-400'
                                    }`}>Tax ({invoice.taxRate}%)</p>
                                  <p className="text-sm font-black tabular-nums">{formatCurrencySimple(tax, invoice.currency)}</p>
                                </div>
                              )}
                              <div className={`col-span-${invoice.discountValue > 0 && invoice.taxRate > 0 ? 1 : invoice.discountValue > 0 || invoice.taxRate > 0 ? 2 : 3} text-right`}>
                                <p className="text-[9px] font-black uppercase tracking-widest mb-1 text-primary">Grand Total</p>
                                <p className="text-xl font-black tabular-nums text-primary">{formatCurrencySimple(total, invoice.currency)}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Studio Info */}
                  <div className={`p-8 md:p-12 rounded-[24px] border ${invoice.theme === 'dark' ? 'bg-surface border-primary/10' : 'bg-white border-gray-100 shadow-md'}`}>
                    <h2 className="text-2xl font-black uppercase tracking-tighter text-primary mb-8 flex items-center">
                      <span className="w-8 h-8 bg-primary/20 text-primary rounded-lg flex items-center justify-center mr-4 text-sm">04</span>
                      Studio Info
                    </h2>
                    <div className="grid md:grid-cols-2 gap-6">
                      <Input className="md:col-span-2" label="Studio Name" value={invoice.studioInfo.name} onChange={(e) => updateInvoice('studioInfo.name', e.target.value)} />
                      <Input label="Email" type="email" value={invoice.studioInfo.email} onChange={(e) => updateInvoice('studioInfo.email', e.target.value)} />
                      <Input label="Tax Code (MST)" value={invoice.studioInfo.taxCode} onChange={(e) => updateInvoice('studioInfo.taxCode', e.target.value)} />
                      <div className="md:col-span-2">
                        <TextArea label="Studio Address" value={invoice.studioInfo.address} onChange={(e) => updateInvoice('studioInfo.address', e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full flex justify-center animate-fadeInUp">
                  <InvoicePreview data={invoice} />
                </div>
              )}
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

export default App;
