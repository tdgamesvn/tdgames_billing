import React, { useState, useEffect } from 'react';
import { DEFAULT_INVOICE } from '../constants';
import { InvoiceData, ServiceItem, BankingInfo, ClientInfo, ClientRecord, StudioRecord, StudioInfo, AccountUser } from '../types';
import { createAndPollDraft } from '../services/sePayService';
import {
  saveInvoiceToCloud,
  fetchInvoicesFromCloud,
  updateInvoiceStatusInCloud,
  updateEInvoiceInCloud,
  deleteInvoiceFromCloud,
  getNextInvoiceNumber,
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
} from '../services/supabaseService';

export function useInvoiceState() {
  // ── Core State ──
  const [currentUser, setCurrentUser] = useState<AccountUser | null>(null);
  const [invoice, setInvoice] = useState<InvoiceData>(DEFAULT_INVOICE);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'history' | 'dashboard'>('edit');

  const accessibleTabs: Array<'edit' | 'preview' | 'history' | 'dashboard'> =
    currentUser?.role === 'admin'
      ? ['edit', 'preview', 'history', 'dashboard']
      : ['edit', 'preview'];

  // ── Data State ──
  const [history, setHistory] = useState<InvoiceData[]>([]);
  const [banks, setBanks] = useState<(BankingInfo & { id: string; isDefault: boolean })[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [studios, setStudios] = useState<StudioRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<{ text: string, type: 'success' | 'warning' | 'error' } | null>(null);

  // ── Manager State ──
  const [showBankManager, setShowBankManager] = useState(false);
  const [showStudioManager, setShowStudioManager] = useState(false);
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [editingBankData, setEditingBankData] = useState<BankingInfo | null>(null);
  const [editingStudioId, setEditingStudioId] = useState<string | null>(null);
  const [editingStudioData, setEditingStudioData] = useState<StudioInfo | null>(null);
  const [newStudio, setNewStudio] = useState<StudioInfo>({ name: '', address: '', email: '', taxCode: '' });
  const [newBank, setNewBank] = useState<BankingInfo>({
    alias: '', accountName: '', accountNumber: '', bankName: '',
    branchName: '', bankAddress: '', citadCode: '', swiftCode: ''
  });

  // ── Client Suggestions ──
  const [clientSuggestions, setClientSuggestions] = useState<ClientRecord[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // ── eInvoice State ──
  const [showEInvoiceModal, setShowEInvoiceModal] = useState(false);
  const [eInvoiceProgress, setEInvoiceProgress] = useState<string | null>(null);
  const [eInvoiceResult, setEInvoiceResult] = useState<{ pdf_url: string; reference_code: string; tracking_code: string } | null>(null);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [eInvoiceError, setEInvoiceError] = useState<string | null>(null);
  const [showEInvoicePrompt, setShowEInvoicePrompt] = useState(false);
  const [eInvoiceTargetInvoice, setEInvoiceTargetInvoice] = useState<InvoiceData | null>(null);

  // ── Save-after-export ──
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [pendingInvoiceToSave, setPendingInvoiceToSave] = useState<InvoiceData | null>(null);

  // ── Filters ──
  const [filterStudio, setFilterStudio] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // ── Reset confirm ──
  const [resetConfirmId, setResetConfirmId] = useState<string | null>(null);

  // ── Effects ──
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
    getNextInvoiceNumber().then(nextNum => {
      setInvoice(prev => ({ ...prev, invoiceNumber: nextNum }));
    });
  }, []);

  useEffect(() => {
    if (lastMessage) {
      const timer = setTimeout(() => setLastMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [lastMessage]);

  // ── Data Loading ──
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

  const loadStudios = async () => {
    const data = await fetchStudiosFromCloud();
    setStudios(data);
    return data;
  };

  const notify = (text: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setLastMessage({ text, type });
  };

  // ── Invoice Helpers ──
  const updateInvoice = (path: string, value: any) => {
    setInvoice(prev => {
      const keys = path.split('.');
      if (keys.length === 1) return { ...prev, [keys[0]]: value };
      const newPrev = JSON.parse(JSON.stringify(prev));
      let current = newPrev;
      for (let i = 0; i < keys.length - 1; i++) { current = current[keys[i]]; }
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

  const formatCurrencySimple = (val: number, curr: string) => {
    return new Intl.NumberFormat(curr === 'VND' ? 'vi-VN' : 'en-US', {
      style: 'currency', currency: curr
    }).format(val);
  };

  const filteredHistory = history.filter(inv => {
    if (filterStudio && inv.studioInfo?.name !== filterStudio) return false;
    if (filterClient && inv.clientInfo?.name !== filterClient) return false;
    const issueDate = inv.issueDate || '';
    if (filterDateFrom && issueDate < filterDateFrom) return false;
    if (filterDateTo && issueDate > filterDateTo) return false;
    return true;
  });

  // ── Client Handlers ──
  const handleSaveClient = async () => {
    const ci = invoice.clientInfo;
    if (!ci.name) return notify('Vui lòng nhập tên khách hàng trước.', 'error');
    try {
      const existing = clients.find(c => c.name.toLowerCase() === ci.name.toLowerCase());
      if (existing) { await updateClientInCloud(existing.id, ci); notify('Đã cập nhật thông tin khách hàng!', 'success'); }
      else { await saveClientToCloud(ci); notify('Đã lưu khách hàng mới!', 'success'); }
      await loadClients();
    } catch (e: any) { notify('Lỗi lưu khách hàng: ' + e.message, 'error'); }
  };

  const handleSelectClient = (id: string) => {
    const c = clients.find(cl => cl.id === id);
    if (!c) return;
    const { id: _id, ...info } = c;
    updateInvoice('clientInfo', info);
  };

  // ── Studio Handlers ──
  const handleAddStudio = async () => {
    if (!newStudio.name) return notify('Vui lòng nhập tên công ty.', 'error');
    setIsLoading(true);
    try { await saveStudioToCloud(newStudio); setNewStudio({ name: '', address: '', email: '', taxCode: '' }); await loadStudios(); notify('Đã lưu Studio!', 'success'); }
    catch (e: any) { notify('Lỗi: ' + e.message, 'error'); }
    finally { setIsLoading(false); }
  };

  const handleSetDefaultStudio = async (id: string) => {
    try {
      await setDefaultStudioInCloud(id, studios);
      const updated = await loadStudios();
      const def = updated.find(s => s.id === id);
      if (def) { const { id: _id, isDefault: _d, ...info } = def; updateInvoice('studioInfo', info); }
      notify('Đã đặt Studio mặc định!', 'success');
    } catch (e: any) { notify('Lỗi: ' + e.message, 'error'); }
  };

  const handleDeleteStudio = async (id: string) => {
    if (!confirm('Xoá Studio này?')) return;
    setIsLoading(true);
    try { await deleteStudioFromCloud(id); await loadStudios(); notify('Đã xoá Studio.', 'success'); }
    catch (e: any) { notify('Lỗi: ' + e.message, 'error'); }
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
    try { await updateStudioInCloud(editingStudioId, editingStudioData); setEditingStudioId(null); setEditingStudioData(null); await loadStudios(); notify('Đã cập nhật Studio!', 'success'); }
    catch (e: any) { notify('Lỗi: ' + e.message, 'error'); }
    finally { setIsLoading(false); }
  };

  // ── Bank Handlers ──
  const handleAddBank = async () => {
    if (!newBank.accountName || !newBank.accountNumber || !newBank.alias) return alert("Vui lòng nhập Tên nhận biết, Tên người thụ hưởng và Số tài khoản.");
    setIsLoading(true);
    try {
      await saveBankToCloud(newBank); notify("Đã lưu tài khoản!", "success");
      setNewBank({ alias: '', accountName: '', accountNumber: '', bankName: '', branchName: '', bankAddress: '', citadCode: '', swiftCode: '' });
      await loadBanks();
    } catch (error: any) { notify("Lỗi lưu tài khoản: " + error.message, "error"); }
    finally { setIsLoading(false); }
  };

  const handleDeleteBank = async (id: string) => {
    if (!confirm("Xóa tài khoản ngân hàng này?")) return;
    try { await deleteBankFromCloud(id); await loadBanks(); notify("Đã xóa tài khoản."); }
    catch (error) { notify("Không thể xóa.", "error"); }
  };

  const handleSetDefaultBank = async (id: string) => {
    try {
      await setDefaultBankInCloud(id, banks);
      const updated = await fetchBanksFromCloud(); setBanks(updated);
      const defaultBank = updated.find(b => b.id === id);
      if (defaultBank) { const { id: _id, isDefault: _def, ...bankInfo } = defaultBank; updateInvoice('bankingInfo', bankInfo); }
      notify("Đã đặt tài khoản mặc định!", "success");
    } catch (error: any) { notify("Lỗi đặt mặc định: " + error.message, "error"); }
  };

  const handleEditBank = (bank: BankingInfo & { id: string; isDefault: boolean }) => {
    setEditingBankId(bank.id);
    const { id, isDefault, ...bankInfo } = bank;
    setEditingBankData(bankInfo);
  };

  const handleCancelEdit = () => { setEditingBankId(null); setEditingBankData(null); };

  const handleUpdateBank = async () => {
    if (!editingBankId || !editingBankData) return;
    setIsLoading(true);
    try { await updateBankInCloud(editingBankId, editingBankData); notify("Đã cập nhật tài khoản!", "success"); setEditingBankId(null); setEditingBankData(null); await loadBanks(); }
    catch (error: any) { notify("Lỗi cập nhật: " + error.message, "error"); }
    finally { setIsLoading(false); }
  };

  const handleBankSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const bankId = e.target.value;
    if (!bankId) return;
    const selectedBank = banks.find(b => b.id === bankId);
    if (selectedBank) { const { id, isDefault, ...bankInfo } = selectedBank; updateInvoice('bankingInfo', bankInfo); }
  };

  // ── Invoice CRUD ──
  const handleSaveToCloud = async () => {
    setIsLoading(true);
    try { await saveInvoiceToCloud(invoice); notify("Hóa đơn đã được đồng bộ lên Cloud!", "success"); if (activeTab === 'history') loadHistory(); }
    catch (error: any) { notify("Lỗi lưu hóa đơn: " + error.message, "error"); }
    finally { setIsLoading(false); }
  };

  const toggleStatus = async (id: string, currentStatus: InvoiceData['status']) => {
    const nextStatus = currentStatus === 'paid' ? 'pending' : 'paid';
    const paidDate = nextStatus === 'paid' ? new Date().toISOString().split('T')[0] : undefined;
    try {
      await updateInvoiceStatusInCloud(id, nextStatus, paidDate);
      setHistory(prev => prev.map(inv => inv.id === id ? { ...inv, status: nextStatus, paidDate } : inv));
      notify(nextStatus === 'paid' ? 'Đã xác nhận thanh toán!' : 'Chuyển về Pending.', 'success');
    } catch (error) { notify("Lỗi cập nhật trạng thái.", "error"); }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xoá hoá đơn này không?')) return;
    try { await deleteInvoiceFromCloud(id); setHistory(prev => prev.filter(inv => inv.id !== id)); notify('Đã xoá hoá đơn.', 'success'); }
    catch (e: any) { notify('Lỗi xoá hoá đơn: ' + e.message, 'error'); }
  };

  const loadFromHistory = (item: InvoiceData) => {
    setInvoice(item);
    setActiveTab('edit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /** Clone an invoice: copy all data, reset id + invoice number + dates + eInvoice status */
  const handleDuplicateInvoice = async (item: InvoiceData) => {
    const nextNum = await getNextInvoiceNumber();
    const today = new Date().toISOString().split('T')[0];
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setInvoice({
      ...item,
      id: undefined,
      invoiceNumber: nextNum,
      issueDate: today,
      dueDate,
      status: 'pending',
      paidDate: undefined,
      einvoice_status: undefined,
      einvoice_reference_code: undefined,
      einvoice_tracking_code: undefined,
      einvoice_pdf_url: undefined,
      createdAt: undefined,
    });
    setActiveTab('edit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    notify('Đã clone invoice — chỉnh sửa rồi lưu nhé!', 'success');
  };

  const handleConfirmSave = async () => {
    if (!pendingInvoiceToSave) return;
    try {
      const result = await saveInvoiceToCloud(pendingInvoiceToSave);
      notify('Đã lưu hoá đơn lên Cloud!', 'success');
      const savedInvoice = { ...pendingInvoiceToSave, id: result.id };
      setInvoice(prev => ({ ...prev, id: result.id }));
      if (activeTab === 'history') loadHistory();
      getNextInvoiceNumber().then(nextNum => { setInvoice(prev => ({ ...prev, invoiceNumber: nextNum })); });
      if (!pendingInvoiceToSave.einvoice_status || pendingInvoiceToSave.einvoice_status === 'none' || pendingInvoiceToSave.einvoice_status === '' || pendingInvoiceToSave.einvoice_status === 'failed') {
        setEInvoiceTargetInvoice(savedInvoice);
        setShowEInvoicePrompt(true);
      }
    } catch (e: any) { notify('Lỗi lưu hoá đơn: ' + e.message, 'error'); }
    finally { setShowSaveConfirm(false); setPendingInvoiceToSave(null); }
  };

  const handleDismissSave = () => { setShowSaveConfirm(false); setPendingInvoiceToSave(null); };

  // ── Export ──
  const handleExport = async (format: 'pdf' | 'png' | 'excel' | 'word') => {
    const { exportToPDF, exportToPNG, exportToExcel, exportToWord } = await import('../services/exportService');
    const fileName = `Invoice_${invoice.invoiceNumber}`;
    setIsExporting(format);
    try {
      if (format === 'pdf' || format === 'png' || format === 'word') {
        if (activeTab !== 'preview') { setActiveTab('preview'); await new Promise(resolve => setTimeout(resolve, 1200)); }
      }
      switch (format) {
        case 'pdf': await exportToPDF('invoice-capture', fileName); break;
        case 'png': await exportToPNG('invoice-capture', fileName, invoice.theme); break;
        case 'excel': exportToExcel(invoice, fileName); break;
        case 'word': exportToWord('invoice-capture', fileName); break;
      }
      if (format === 'pdf') { setPendingInvoiceToSave(invoice); setShowSaveConfirm(true); }
    } catch (error) { console.error("Export failed:", error); notify("Lỗi khi xuất file. Vui lòng thử lại.", "error"); }
    finally { setIsExporting(null); }
  };

  // ── eInvoice ──
  const handleCreateEInvoice = async (targetInv?: InvoiceData) => {
    const inv = targetInv || invoice;
    setShowEInvoicePrompt(false);
    setShowEInvoiceModal(true);
    setEInvoiceProgress('Đang khởi tạo...');
    setEInvoiceResult(null);
    setEInvoiceError(null);
    try {
      const result = await createAndPollDraft(inv, (msg) => setEInvoiceProgress(msg));
      setEInvoiceResult(result);
      setEInvoiceProgress(null);
      setInvoice(prev => ({ ...prev, einvoice_status: 'draft', einvoice_reference_code: result.reference_code, einvoice_tracking_code: result.tracking_code, einvoice_pdf_url: result.pdf_url }));
      if (inv.id) {
        try { await updateEInvoiceInCloud(inv.id, { einvoice_status: 'draft', einvoice_reference_code: result.reference_code, einvoice_tracking_code: result.tracking_code, einvoice_pdf_url: result.pdf_url }); loadHistory(); } catch { }
      }
      notify('Đã tạo hóa đơn điện tử nháp thành công!', 'success');
    } catch (err: any) {
      setEInvoiceError(err.message || 'Lỗi không xác định');
      setEInvoiceProgress(null);
      setInvoice(prev => ({ ...prev, einvoice_status: 'failed' }));
      if (inv.id) { try { await updateEInvoiceInCloud(inv.id, { einvoice_status: 'failed' }); } catch { } }
    } finally { setEInvoiceTargetInvoice(null); }
  };

  const handleResetEInvoice = (invId: string) => { setResetConfirmId(invId); };

  const confirmResetEInvoice = async () => {
    if (!resetConfirmId) return;
    const invId = resetConfirmId;
    setResetConfirmId(null);
    try {
      await updateEInvoiceInCloud(invId, { einvoice_status: '', einvoice_reference_code: '', einvoice_tracking_code: '', einvoice_pdf_url: '' });
      loadHistory();
      notify('Đã reset trạng thái eInvoice', 'success');
    } catch (err) { console.error('[Reset] FAILED:', err); notify('Lỗi khi reset eInvoice', 'error'); }
  };

  const handleDownloadEInvoice = (inv: InvoiceData) => {
    const edgeFnUrl = import.meta.env.VITE_SEPAY_EDGE_FUNCTION_URL;
    const params = new URLSearchParams({
      key: import.meta.env.VITE_SEPAY_API_KEY || 'tdgames-sepay-2026',
      action: 'download-pdf',
      reference_code: inv.einvoice_reference_code || '',
      tracking_code: inv.einvoice_tracking_code || '',
      pdf_url: inv.einvoice_pdf_url || '',
      filename: `eInvoice_${inv.einvoice_reference_code || inv.invoiceNumber}`,
    });
    window.open(`${edgeFnUrl}?${params.toString()}`, '_blank');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('edit');
  };

  return {
    // Core
    currentUser, setCurrentUser, invoice, setInvoice, activeTab, setActiveTab, accessibleTabs,
    // Data
    history, banks, clients, studios, isLoading, isExporting, lastMessage, setLastMessage,
    filteredHistory, formatCurrencySimple,
    // Managers
    showBankManager, setShowBankManager, showStudioManager, setShowStudioManager,
    editingBankId, editingBankData, setEditingBankData,
    editingStudioId, setEditingStudioId, editingStudioData, setEditingStudioData,
    newStudio, setNewStudio, newBank, setNewBank,
    // Client suggestions
    clientSuggestions, setClientSuggestions, showSuggestions, setShowSuggestions,
    // eInvoice
    showEInvoiceModal, eInvoiceProgress, eInvoiceResult, eInvoiceError, pdfDownloading,
    showEInvoicePrompt, eInvoiceTargetInvoice,
    setShowEInvoicePrompt, setEInvoiceTargetInvoice, setShowEInvoiceModal, setEInvoiceResult, setEInvoiceError,
    // Save confirm
    showSaveConfirm, pendingInvoiceToSave,
    // Filters
    filterStudio, setFilterStudio, filterClient, setFilterClient,
    filterDateFrom, setFilterDateFrom, filterDateTo, setFilterDateTo,
    // Reset
    resetConfirmId, setResetConfirmId,
    // Handlers
    updateInvoice, updateItem, notify,
    handleLogout, loadHistory,
    handleSaveClient, handleSelectClient,
    handleAddStudio, handleSetDefaultStudio, handleDeleteStudio, handleEditStudio, handleUpdateStudio,
    handleAddBank, handleDeleteBank, handleSetDefaultBank, handleEditBank, handleCancelEdit, handleUpdateBank, handleBankSelect,
    handleSaveToCloud, toggleStatus, handleDeleteInvoice, loadFromHistory, handleDuplicateInvoice,
    handleConfirmSave, handleDismissSave,
    handleExport,
    handleCreateEInvoice, handleResetEInvoice, confirmResetEInvoice, handleDownloadEInvoice,
  };
}
