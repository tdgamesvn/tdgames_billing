import React, { useState, useEffect, useRef } from 'react';
import { DEFAULT_INVOICE } from '../constants';
import { InvoiceData, ServiceItem, BankingInfo, ClientInfo, ClientRecord, StudioRecord, StudioInfo, AccountUser } from '../types';
import { supabase } from '../services/supabaseClient';
import { createAndPollDraft, getEInvoiceDetail } from '../services/sePayService';
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
  const [invoice, setInvoice] = useState<InvoiceData>(DEFAULT_INVOICE);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'history' | 'dashboard' | 'activity' | 'recurring'>('edit');

  const accessibleTabs: Array<'edit' | 'preview' | 'history' | 'dashboard' | 'activity' | 'recurring'> =
    currentUser?.role === 'admin'
      ? ['edit', 'preview', 'history', 'dashboard', 'activity', 'recurring']
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

  // ── Exchange Rate (USD→VND for eInvoice) ──
  const [showExchangeRateModal, setShowExchangeRateModal] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number>(25400);
  const [exchangeRateTarget, setExchangeRateTarget] = useState<InvoiceData | null>(null);

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

  // ── Email modal (P3-4) ──
  const [emailInvoice, setEmailInvoice] = useState<InvoiceData | null>(null);

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

  // ── Realtime Subscription (P3-1) ──
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!currentUser) {
      // Cleanup if user logged out
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
      return;
    }

    // Subscribe to invoice_invoices changes
    const channel = supabase
      .channel('invoice-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invoice_invoices' },
        (payload) => {
          // Auto-refresh history data
          loadHistory();

          // Show toast based on event type
          const eventLabels: Record<string, string> = {
            INSERT: '📥 Hoá đơn mới được tạo',
            UPDATE: '✏️ Hoá đơn đã được cập nhật',
            DELETE: '🗑️ Hoá đơn đã bị xoá',
          };
          const msg = eventLabels[payload.eventType] || 'Dữ liệu đã thay đổi';
          setLastMessage({ text: msg, type: 'success' });
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      realtimeChannelRef.current = null;
    };
  }, [currentUser]);

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

  // ── Payment Modal State ──
  const [paymentModal, setPaymentModal] = useState<{
    id: string;
    invoiceTotal: number;
    currency: string;
    amountReceived: number;
    transferFee: number;
  } | null>(null);

  /** Calculate invoice total from items, discount, tax */
  const calcInvoiceTotal = (inv: InvoiceData): number => {
    const items = typeof inv.items === 'string' ? JSON.parse(inv.items) : (inv.items || []);
    const subtotal = items.reduce((a: number, i: any) => a + i.quantity * i.unitPrice, 0);
    const disc = inv.discountType === 'percentage' ? subtotal * (inv.discountValue / 100) : inv.discountValue;
    const afterDisc = Math.max(0, subtotal - disc);
    const tax = afterDisc * (inv.taxRate / 100);
    return afterDisc + tax;
  };

  const toggleStatus = async (id: string, currentStatus: InvoiceData['status']) => {
    if (currentStatus === 'paid') {
      // Revert to pending — no modal needed
      try {
        await updateInvoiceStatusInCloud(id, 'pending');
        setHistory(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'pending', paidDate: undefined, amount_received: undefined, transfer_fee: undefined } : inv));
        notify('Chuyển về Pending.', 'success');
      } catch { notify('Lỗi cập nhật trạng thái.', 'error'); }
      return;
    }
    // Mark as paid — show payment modal
    const inv = history.find(h => h.id === id);
    if (!inv) return;
    const total = calcInvoiceTotal(inv);
    setPaymentModal({
      id,
      invoiceTotal: total,
      currency: inv.currency || 'USD',
      amountReceived: total, // default = full amount
      transferFee: 0,
    });
  };

  const confirmPayment = async () => {
    if (!paymentModal) return;
    const { id, amountReceived, transferFee } = paymentModal;
    const paidDate = new Date().toISOString().split('T')[0];
    try {
      await updateInvoiceStatusInCloud(id, 'paid', paidDate, amountReceived, transferFee);
      setHistory(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'paid' as const, paidDate, amount_received: amountReceived, transfer_fee: transferFee } : inv));
      notify('Đã xác nhận thanh toán!', 'success');
    } catch { notify('Lỗi cập nhật trạng thái.', 'error'); }
    setPaymentModal(null);
  };

  // ── Delete confirm (custom modal instead of native confirm) ──
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; hasDraft: boolean } | null>(null);

  const handleDeleteInvoice = (id: string) => {
    const inv = history.find(h => h.id === id);
    const hasDraft = inv?.einvoice_status === 'draft';
    setDeleteConfirm({ id, hasDraft });
  };

  const confirmDeleteInvoice = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteInvoiceFromCloud(deleteConfirm.id);
      setHistory(prev => prev.filter(inv => inv.id !== deleteConfirm.id));
      notify('Đã xoá hoá đơn.', 'success');
    } catch (e: any) {
      notify('Lỗi xoá hoá đơn: ' + e.message, 'error');
    } finally {
      setDeleteConfirm(null);
    }
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

    // If invoice is in USD, show exchange rate modal first
    if (inv.currency === 'USD') {
      setExchangeRateTarget(inv);
      setShowExchangeRateModal(true);
      return;
    }

    // VND invoice — proceed directly
    await executeCreateEInvoice(inv);
  };

  /** Called after exchange rate is confirmed for USD invoices, or directly for VND */
  const confirmCreateEInvoiceWithRate = async () => {
    if (!exchangeRateTarget) return;
    setShowExchangeRateModal(false);
    await executeCreateEInvoice(exchangeRateTarget, exchangeRate);
    setExchangeRateTarget(null);
  };

  const executeCreateEInvoice = async (inv: InvoiceData, rate?: number) => {
    setShowEInvoiceModal(true);
    setEInvoiceProgress('Đang khởi tạo...');
    setEInvoiceResult(null);
    setEInvoiceError(null);
    try {
      const result = await createAndPollDraft(inv, (msg) => setEInvoiceProgress(msg), rate);
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
    const params = new URLSearchParams({
      reference_code: inv.einvoice_reference_code || '',
      tracking_code: inv.einvoice_tracking_code || '',
      pdf_url: inv.einvoice_pdf_url || '',
      filename: `eInvoice_${inv.einvoice_reference_code || inv.invoiceNumber}`,
    });
    window.open(`https://n8n.tdconsulting.vn/webhook/sepay-invoice-download?${params.toString()}`, '_blank');
  };

  // ── Sync eInvoice statuses from SePay ─────────────────────────
  const [isSyncingEInvoices, setIsSyncingEInvoices] = useState(false);

  const syncEInvoiceStatuses = async () => {
    // Use latest history from DB
    await loadHistory();
    // Wait a tick for state to settle, then sync from the fetched data
    setIsSyncingEInvoices(true);
  };

  // Effect: when isSyncingEInvoices turns true, do the actual sync using latest history
  useEffect(() => {
    if (!isSyncingEInvoices) return;
    const doSync = async () => {
      const drafts = history.filter(inv => inv.einvoice_status === 'draft' && inv.einvoice_reference_code);
      if (drafts.length === 0) {
        setIsSyncingEInvoices(false);
        notify('Không có hoá đơn nháp cần sync', 'warning');
        return;
      }

      let updated = 0;
      let deleted = 0;
      let errors = 0;

      for (const inv of drafts) {
        try {
          const detail = await getEInvoiceDetail(inv.einvoice_reference_code!);
          if (detail === null) {
            await updateEInvoiceInCloud(inv.id!, { einvoice_status: '', einvoice_reference_code: '', einvoice_tracking_code: '', einvoice_pdf_url: '', einvoice_invoice_number: '' });
            deleted++;
          } else if (detail.status === 'issued') {
            await updateEInvoiceInCloud(inv.id!, {
              einvoice_status: 'issued',
              einvoice_reference_code: inv.einvoice_reference_code,
              einvoice_tracking_code: inv.einvoice_tracking_code,
              einvoice_pdf_url: detail.pdf_url || inv.einvoice_pdf_url,
              einvoice_invoice_number: detail.invoice_number || '',
            });
            updated++;
          } else if (detail.status === 'cancelled') {
            await updateEInvoiceInCloud(inv.id!, { einvoice_status: '', einvoice_reference_code: '', einvoice_tracking_code: '', einvoice_pdf_url: '', einvoice_invoice_number: '' });
            deleted++;
          }
        } catch (err) {
          console.error(`[Sync] Error checking ${inv.einvoice_reference_code}:`, err);
          errors++;
        }
      }

      setIsSyncingEInvoices(false);
      loadHistory();
      const parts = [];
      if (updated > 0) parts.push(`${updated} đã ký`);
      if (deleted > 0) parts.push(`${deleted} đã xoá`);
      if (errors > 0) parts.push(`${errors} lỗi`);
      notify(parts.length > 0 ? `Sync: ${parts.join(', ')}` : `${drafts.length} hoá đơn nháp — chưa có thay đổi`, parts.length > 0 ? 'success' : 'warning');
    };
    doSync();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSyncingEInvoices]);

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
    // Payment modal
    paymentModal, setPaymentModal, confirmPayment,
    deleteConfirm, setDeleteConfirm, confirmDeleteInvoice,
    handleConfirmSave, handleDismissSave,
    handleExport,
    handleCreateEInvoice, handleResetEInvoice, confirmResetEInvoice, handleDownloadEInvoice,
    // Sync eInvoice
    syncEInvoiceStatuses, isSyncingEInvoices,
    // Exchange rate (USD→VND)
    showExchangeRateModal, setShowExchangeRateModal, exchangeRate, setExchangeRate, exchangeRateTarget, confirmCreateEInvoiceWithRate,
    // Email (P3-4)
    emailInvoice, setEmailInvoice,
  };
}
