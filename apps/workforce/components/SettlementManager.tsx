import React, { useState, useEffect, useRef } from 'react';
import { Worker, WorkforceTask, Settlement } from '@/types';
import * as svc from '../services/workforceService';
import { computeSettlementTotals } from '../services/workforceService';

interface SettlementManagerProps {
  settlements: Settlement[];
  workers: Worker[];
  tasks: WorkforceTask[];
  vcbSellRate: number;
  onCreateSettlement: (workerId: string, period: string, taskIds: string[], totalAmount: number, currency: string, notes: string, bonusType: 'percent' | 'amount', bonusValue: number, taxRate: number) => void;
  onUpdateSettlement: (id: string, updates: Partial<Settlement>) => void;
  onDeleteSettlement: (id: string) => void;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Bản nháp',
  sent: 'Đã gửi',
  accepted: 'Đã chấp nhận',
  paid: 'Đã thanh toán',
};
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-neutral-dark/30 text-neutral-medium border-neutral-dark/50',
  sent: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  accepted: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  paid: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};
const STATUS_BAR: Record<string, string> = {
  draft: 'from-neutral-dark to-neutral-dark',
  sent: 'from-blue-500 to-blue-600',
  accepted: 'from-yellow-500 to-yellow-600',
  paid: 'from-emerald-500 to-emerald-600',
};
const STATUS_FLOW: Record<string, string> = {
  draft: 'sent',
  sent: 'accepted',
  accepted: 'paid',
};
const STATUS_NEXT_LABEL: Record<string, string> = {
  draft: '📤 Gửi nghiệm thu',
  sent: '✅ Chấp nhận',
  accepted: '💰 Đã thanh toán',
};

const inputCls = "w-full bg-transparent border border-primary/10 rounded-xl px-4 py-3 text-white placeholder-neutral-medium/40 focus:outline-none focus:border-primary/40 transition-all text-sm";
const labelCls = "text-[10px] font-black uppercase tracking-widest text-neutral-medium mb-2 block";

type View = 'list' | 'create' | 'detail';
type CompanyId = 'tdgames' | 'tdconsulting';

const COMPANY_CONFIG: Record<CompanyId, { name: string; logo: string; subtitle: string }> = {
  tdgames: { name: 'TD Games Studio', logo: '/logo_td_notext.png', subtitle: 'CÔNG TY TNHH TD GAMES' },
  tdconsulting: { name: 'TD Consulting', logo: '/logo_tdc.png', subtitle: 'CÔNG TY TNHH TD CONSULTING' },
};

const SettlementManager: React.FC<SettlementManagerProps> = ({
  settlements, workers, tasks, vcbSellRate,
  onCreateSettlement, onUpdateSettlement, onDeleteSettlement,
}) => {
  const [view, setView] = useState<View>('list');
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null);
  const [detailTasks, setDetailTasks] = useState<WorkforceTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [selCompany, setSelCompany] = useState<CompanyId>('tdgames');
  const printRef = useRef<HTMLDivElement>(null);

  // Custom confirmation modal state (replaces native confirm() which is blocked by some browsers)
  const [confirmModal, setConfirmModal] = useState<{
    message: string;
    subMessage?: string;
    onConfirm: () => void;
  } | null>(null);

  // Create form state
  const [selWorkerId, setSelWorkerId] = useState('');
  const [selPeriod, setSelPeriod] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selNotes, setSelNotes] = useState('');
  const [selTaskIds, setSelTaskIds] = useState<string[]>([]);
  const [selBonusType, setSelBonusType] = useState<'percent' | 'amount'>('amount');
  const [selBonusValue, setSelBonusValue] = useState(0);
  const [selTaxRate] = useState(10); // fixed 10% TNCN

  // Eligible tasks for creation
  const periodEnd = selPeriod ? new Date(selPeriod + '-01') : null;
  if (periodEnd) {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    periodEnd.setDate(0);
  }
  const eligibleTasks = tasks.filter(t => {
    if (t.worker_id !== selWorkerId) return false;
    if (t.payment_status === 'paid') return false;
    if (!t.closed_date) return false;
    if (periodEnd && new Date(t.closed_date) > periodEnd) return false;
    return true;
  });

  const selectedTasksData = eligibleTasks.filter(t => selTaskIds.includes(t.id!));
  const selectedTotal = selectedTasksData.reduce((s, t) => s + (t.price || 0), 0);
  const selectedBonusTotal = selectedTasksData.reduce((s, t) => s + (t.bonus || 0), 0);

  // Preview settlement-level bonus + tax
  const previewCalc = computeSettlementTotals(selectedTotal, selBonusType, selBonusValue, selTaxRate);

  const handleCreate = () => {
    if (!selWorkerId || selTaskIds.length === 0) return;
    const currency = eligibleTasks[0]?.currency || 'VND';
    onCreateSettlement(selWorkerId, selPeriod, selTaskIds, selectedTotal, currency, selNotes, selBonusType, selBonusValue, selTaxRate);
    setView('list');
    setSelWorkerId('');
    setSelTaskIds([]);
    setSelNotes('');
    setSelBonusType('amount');
    setSelBonusValue(0);
  };

  const toggleTask = (tid: string) =>
    setSelTaskIds(prev => prev.includes(tid) ? prev.filter(i => i !== tid) : [...prev, tid]);
  const selectAll = () =>
    setSelTaskIds(selTaskIds.length === eligibleTasks.length ? [] : eligibleTasks.map(t => t.id!));

  // Open detail view
  const openDetail = async (s: Settlement) => {
    setSelectedSettlement(s);
    setView('detail');
    setLoadingTasks(true);
    try {
      const tks = await svc.fetchSettlementTasks(s.id!);
      setDetailTasks(tks);
    } catch { setDetailTasks([]); }
    setLoadingTasks(false);
  };

  // PDF Export
  const handleExportPDF = async () => {
    if (!printRef.current || !selectedSettlement) return;
    const workerName = selectedSettlement.worker?.full_name || workers.find(w => w.id === selectedSettlement.worker_id)?.full_name || '???';
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Get selected company config
    const company = COMPANY_CONFIG[selCompany];

    // Convert logo to base64
    let logoBase64 = '';
    try {
      const resp = await fetch(company.logo);
      const blob = await resp.blob();
      logoBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch { /* ignore */ }

    const taskRows = detailTasks.map((t, i) => {
      const vndEquiv = t.currency === 'USD' && t.exchange_rate > 0 ? (t.price * t.exchange_rate).toLocaleString() : '';
      return `<tr>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;color:#666">${i + 1}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;max-width:250px">${t.title}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;white-space:nowrap">${t.clickup_folder_name || ''}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;white-space:nowrap">${t.closed_date || ''}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-weight:600">${t.price > 0 ? t.price.toLocaleString() : '—'}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${t.currency}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;color:#666">${vndEquiv}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;color:#d97706">${t.bonus > 0 ? t.bonus.toLocaleString() : ''}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;color:#666;font-size:11px">${t.bonus_note || ''}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;color:#666;font-size:11px">${t.notes || ''}</td>
      </tr>`;
    }).join('');

    const totalPrice = detailTasks.reduce((s, t) => s + (t.price || 0), 0);
    const totalBonus = detailTasks.reduce((s, t) => s + (t.bonus || 0), 0);
    const totalVND = detailTasks.reduce((s, t) => {
      if (t.currency === 'USD' && t.exchange_rate > 0) return s + t.price * t.exchange_rate;
      if (t.currency === 'VND') return s + t.price;
      return s;
    }, 0);
    const totalBonusVND = detailTasks.reduce((s, t) => {
      if (t.currency === 'USD' && t.exchange_rate > 0) return s + (t.bonus || 0) * t.exchange_rate;
      if (t.currency === 'VND') return s + (t.bonus || 0);
      return s;
    }, 0);

    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Nghiệm thu - ${workerName} - ${selectedSettlement.period}</title>
    <style>
      body{font-family:'Segoe UI',Roboto,sans-serif;margin:40px;color:#222;font-size:13px}
      h1{font-size:24px;margin:0;color:#111}
      h2{font-size:16px;margin:0;color:#555;font-weight:400}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:30px;border-bottom:3px solid #f59e0b;padding-bottom:20px}
      .logo-row{display:flex;align-items:center;gap:12px}
      .logo-row img{width:48px;height:48px;object-fit:contain}
      .meta{display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:14px;color:#555;margin-bottom:10px}
      .meta span{font-weight:700;color:#222;font-size:16px}
      table{width:100%;border-collapse:collapse;margin:20px 0;font-size:12px}
      tr{page-break-inside:avoid;break-inside:avoid}
      thead{display:table-header-group}
      th{padding:10px 8px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#666;border-bottom:2px solid #222;white-space:nowrap}
      .totals{margin-top:20px;text-align:right;font-size:14px;page-break-inside:avoid;break-inside:avoid}
      .totals .row{padding:6px 0;display:flex;justify-content:flex-end;gap:20px}
      .totals .grand{font-size:18px;font-weight:700;color:#f59e0b;border-top:2px solid #222;padding-top:10px;margin-top:5px}
      .footer{margin-top:60px;display:flex;justify-content:space-between;page-break-inside:avoid;break-inside:avoid}
      .sig{text-align:center;width:200px}
      .sig .line{margin-top:60px;border-top:1px solid #333;padding-top:5px;font-weight:600}
      @media print{@page{margin:10mm 12mm}body{margin:0}}
    </style></head><body>
    <div class="header">
      <div class="logo-row">${logoBase64 ? `<img src="${logoBase64}" alt="Logo" />` : ''}<div><h1>NGHIỆM THU CÔNG VIỆC</h1><h2>${company.name}</h2></div></div>
      <div style="text-align:right"><div style="font-size:11px;color:#666">Kỳ nghiệm thu</div>
        <div style="font-size:20px;font-weight:700">${selectedSettlement.period}</div>
        <div style="font-size:11px;color:#666;margin-top:4px">Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}</div>
      </div>
    </div>
    <div class="meta">
      <div>Nhân sự: <span>${workerName}</span></div>
      <div>Trạng thái: <span>${STATUS_LABELS[selectedSettlement.status]}</span></div>
      <div>Số lượng task: <span>${detailTasks.length}</span></div>
      ${selectedSettlement.notes ? `<div>Ghi chú: <span>${selectedSettlement.notes}</span></div>` : ''}
    </div>
    ${(() => {
      const w = selectedSettlement.worker || workers.find(wk => wk.id === selectedSettlement.worker_id);
      return `
    <div style="margin:15px 0;padding:12px 16px;border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#666;margin-bottom:8px;font-weight:700">Thông tin thanh toán</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:13px">
        <div>Ngân hàng: <b>${w?.bank_name || '—'}</b></div>
        <div>Số tài khoản: <b>${w?.bank_account || '—'}</b></div>
        <div>Chủ tài khoản: <b>${w?.full_name || '—'}</b></div>
      </div>
    </div>`;
    })()}
    <table>
      <thead><tr>
        <th style="text-align:center">#</th><th>Task</th><th>Project</th><th>Ngày đóng</th>
        <th style="text-align:right">Giá</th><th style="text-align:center">Tiền tệ</th><th style="text-align:right">Quy đổi VNĐ</th>
        <th style="text-align:right">Bonus</th><th>Lý do</th><th>Ghi chú</th>
      </tr></thead>
      <tbody>${taskRows}</tbody>
    </table>
    <div class="totals">
      <div class="row"><span>Tổng giá tasks:</span><b>${totalPrice.toLocaleString()} ${selectedSettlement.currency}</b></div>
      <div class="row"><span>Tổng bonus task:</span><b>${totalBonus.toLocaleString()} ${selectedSettlement.currency}</b></div>
      ${(selectedSettlement.bonus_amount || 0) > 0 ? `<div class="row" style="color:#d97706"><span>+ Bonus nghiệm thu (${selectedSettlement.bonus_type === 'percent' ? selectedSettlement.bonus_value + '%' : 'cố định'}):</span><b>+${(selectedSettlement.bonus_amount || 0).toLocaleString()} ${selectedSettlement.currency}</b></div>` : ''}
      ${totalVND > 0 ? `<div class="row"><span>Tổng quy đổi VNĐ:</span><b>${(totalVND + totalBonusVND).toLocaleString()} VNĐ</b></div>` : ''}
      <div class="row" style="color:#dc2626"><span>− Thuế TNCN (${selectedSettlement.tax_rate || 10}%):</span><b>-${(selectedSettlement.tax_amount || 0).toLocaleString()} ${selectedSettlement.currency}</b></div>
      <div class="row grand" style="color:#059669"><span>THỰC NHẬN:</span><span>${(selectedSettlement.net_amount || 0).toLocaleString()} ${selectedSettlement.currency}${selectedSettlement.currency !== 'VND' && totalVND > 0 ? ` <span style="font-size:14px;color:#666;font-weight:400">(≈ ${Math.round((totalVND + totalBonusVND) * (1 - (selectedSettlement.tax_rate || 10) / 100)).toLocaleString()} VNĐ)</span>` : ''}</span></div>
    </div>
    <div class="footer">
      <div class="sig"><div style="font-size:11px;color:#666">Người lập</div><div class="line">${company.name}</div></div>
      <div class="sig"><div style="font-size:11px;color:#666">Nhân sự xác nhận</div><div class="line">${workerName}</div></div>
    </div>
    </body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  // Helpers
  const fmt = (n: number) => n.toLocaleString();
  // Convert settlement net_amount to VND (auto-convert USD using vcbSellRate)
  const toVND = (st: Settlement) => {
    const amount = st.net_amount || st.total_amount;
    return st.currency === 'USD' ? Math.round(amount * vcbSellRate) : amount;
  };
  const totalPaidVND = settlements.filter(s => s.status === 'paid').reduce((s, st) => s + toVND(st), 0);
  const totalPendingVND = settlements.filter(s => s.status !== 'paid').reduce((s, st) => s + toVND(st), 0);

  // ─── Render ─────────────────
  // === DETAIL VIEW ===
  if (view === 'detail' && selectedSettlement) {
    const s = selectedSettlement;
    const workerObj = s.worker || workers.find(w => w.id === s.worker_id);
    const workerName = workerObj?.full_name || '???';
    const nextStatus = STATUS_FLOW[s.status];
    const totalPrice = detailTasks.reduce((sum, t) => sum + (t.price || 0), 0);
    const totalBonus = detailTasks.reduce((sum, t) => sum + (t.bonus || 0), 0);
    const totalVND = detailTasks.reduce((sum, t) => {
      if (t.currency === 'USD' && t.exchange_rate > 0) return sum + t.price * t.exchange_rate;
      if (t.currency === 'VND') return sum + t.price;
      return sum;
    }, 0);

    return (
      <>
      {confirmModal && <ConfirmModal message={confirmModal.message} subMessage={confirmModal.subMessage} onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal(null)} />}
      <div className="animate-fadeInUp space-y-6">
        {/* Back + Title */}
        <div className="flex items-center gap-4">
          <button onClick={() => setView('list')} className="p-2 rounded-xl hover:bg-white/5 text-neutral-medium hover:text-white transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex-1">
            <h2 className="text-3xl font-black text-primary uppercase tracking-tighter">Nghiệm Thu</h2>
            <p className="text-neutral-medium text-sm">{workerName} — Kỳ {s.period}</p>
          </div>
          <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border ${STATUS_COLORS[s.status]}`}>
            {STATUS_LABELS[s.status]}
          </span>
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-3 flex-wrap">
          {nextStatus && (
            <button
              onClick={() => {
                if (nextStatus === 'paid') {
                  setConfirmModal({
                    message: 'Xác nhận đã thanh toán?',
                    subMessage: 'Tất cả task sẽ được đánh dấu ĐÃ THANH TOÁN.',
                    onConfirm: () => {
                      onUpdateSettlement(s.id!, { status: nextStatus as any });
                      setSelectedSettlement({ ...s, status: nextStatus as any });
                      setConfirmModal(null);
                    },
                  });
                  return;
                }
                onUpdateSettlement(s.id!, { status: nextStatus as any });
                setSelectedSettlement({ ...s, status: nextStatus as any });
              }}
              className="px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest bg-gradient-primary text-white shadow-btn-glow hover:shadow-btn-glow-hover transition-all hover:scale-[1.02]"
            >{STATUS_NEXT_LABEL[s.status]}</button>
          )}
          {/* Company Selector */}
          <div className="flex items-center rounded-xl border border-primary/10 overflow-hidden">
            <button
              onClick={() => setSelCompany('tdgames')}
              className={`px-4 py-2.5 text-xs font-bold tracking-wider transition-all flex items-center gap-2 ${
                selCompany === 'tdgames'
                  ? 'bg-primary/20 text-primary border-r border-primary/20'
                  : 'text-neutral-medium hover:text-white hover:bg-white/5 border-r border-primary/10'
              }`}
            >
              <img src="/logo_td_notext.png" alt="" className="w-5 h-5 object-contain" />
              TD Games
            </button>
            <button
              onClick={() => setSelCompany('tdconsulting')}
              className={`px-4 py-2.5 text-xs font-bold tracking-wider transition-all flex items-center gap-2 ${
                selCompany === 'tdconsulting'
                  ? 'bg-pink-500/20 text-pink-400'
                  : 'text-neutral-medium hover:text-white hover:bg-white/5'
              }`}
            >
              <img src="/logo_tdc.png" alt="" className="w-5 h-5 object-contain" />
              TD Consulting
            </button>
          </div>
          <button onClick={handleExportPDF}
            className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest border border-primary/20 text-primary hover:bg-primary/10 transition-all">
            📄 Export PDF
          </button>
          <button
            onClick={() => {
              setConfirmModal({
                message: 'Xóa nghiệm thu này?',
                subMessage: 'Task sẽ được rollback về CHƯA THANH TOÁN.',
                onConfirm: () => {
                  onDeleteSettlement(s.id!);
                  setView('list');
                  setConfirmModal(null);
                },
              });
            }}
            className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all ml-auto"
          >🗑 Xóa</button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="p-4 rounded-[16px] border border-primary/10 bg-surface">
            <p className="text-[9px] font-black uppercase tracking-widest text-neutral-medium mb-1">Số task</p>
            <p className="text-2xl font-black text-white">{detailTasks.length}</p>
          </div>
          <div className="p-4 rounded-[16px] border border-primary/10 bg-surface">
            <p className="text-[9px] font-black uppercase tracking-widest text-neutral-medium mb-1">Tổng giá tasks</p>
            <p className="text-2xl font-black text-primary">{fmt(totalPrice)}</p>
          </div>
          <div className="p-4 rounded-[16px] border border-primary/10 bg-surface">
            <p className="text-[9px] font-black uppercase tracking-widest text-neutral-medium mb-1">Bonus ({s.bonus_type === 'percent' ? `${s.bonus_value}%` : 'Cố định'})</p>
            <p className="text-2xl font-black text-yellow-400">+{fmt(s.bonus_amount || 0)}</p>
          </div>
          <div className="p-4 rounded-[16px] border border-primary/10 bg-surface">
            <p className="text-[9px] font-black uppercase tracking-widest text-neutral-medium mb-1">Thuế TNCN ({s.tax_rate || 10}%)</p>
            <p className="text-2xl font-black text-red-400">-{fmt(s.tax_amount || 0)}</p>
          </div>
          <div className="p-4 rounded-[16px] border border-primary/10 bg-surface border-emerald-500/30">
            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-1">THỰC NHẬN</p>
            <p className="text-2xl font-black text-emerald-400">{fmt(s.net_amount || 0)}</p>
          </div>
          <div className="p-4 rounded-[16px] border border-primary/10 bg-surface">
            <p className="text-[9px] font-black uppercase tracking-widest text-neutral-medium mb-1">Quy đổi VNĐ</p>
            <p className="text-xl font-black text-neutral-medium">{fmt(totalVND)}</p>
          </div>
        </div>

        {s.notes && (
          <div className="px-4 py-3 rounded-xl border border-primary/10 bg-surface text-neutral-medium text-sm">
            📝 <span className="italic">{s.notes}</span>
          </div>
        )}

        {/* Bank info — always show */}
        <div className="px-5 py-4 rounded-[16px] border border-primary/10 bg-surface">
          <p className="text-[9px] font-black uppercase tracking-widest text-neutral-medium mb-3">🏦 Thông tin thanh toán</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] text-neutral-medium/60 uppercase tracking-wider">Ngân hàng</p>
              <p className="text-white font-bold text-sm mt-0.5">{workerObj?.bank_name || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-neutral-medium/60 uppercase tracking-wider">Số tài khoản</p>
              <p className="text-white font-bold text-sm mt-0.5 font-mono">{workerObj?.bank_account || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-neutral-medium/60 uppercase tracking-wider">Chủ tài khoản</p>
              <p className="text-white font-bold text-sm mt-0.5">{workerObj?.full_name || '—'}</p>
            </div>
          </div>
        </div>

        {/* Task table */}
        <div ref={printRef} className="rounded-[20px] border border-primary/10 bg-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary/10">
                  <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-neutral-medium w-8">#</th>
                  <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-neutral-medium min-w-[200px]">Task</th>
                  <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-neutral-medium">Project</th>
                  <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-neutral-medium whitespace-nowrap">Ngày đóng</th>
                  <th className="text-right px-4 py-3 text-[9px] font-black uppercase tracking-widest text-neutral-medium">Giá</th>
                  <th className="text-center px-4 py-3 text-[9px] font-black uppercase tracking-widest text-neutral-medium">Tiền tệ</th>
                  <th className="text-right px-4 py-3 text-[9px] font-black uppercase tracking-widest text-neutral-medium whitespace-nowrap">VNĐ</th>
                  <th className="text-right px-4 py-3 text-[9px] font-black uppercase tracking-widest text-neutral-medium">Bonus</th>
                  <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-neutral-medium whitespace-nowrap">Lý do Bonus</th>
                  <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-neutral-medium">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {loadingTasks ? (
                  <tr><td colSpan={10} className="text-center py-8 text-neutral-medium">Đang tải...</td></tr>
                ) : detailTasks.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-8 text-neutral-medium">Không có task</td></tr>
                ) : detailTasks.map((t, i) => {
                  const vndEquiv = t.currency === 'USD' && t.exchange_rate > 0 ? t.price * t.exchange_rate : null;
                  return (
                    <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-neutral-medium/50">{i + 1}</td>
                      <td className="px-4 py-3 text-white font-medium">{t.title}</td>
                      <td className="px-4 py-3 text-neutral-medium text-xs">{t.clickup_folder_name || '—'}</td>
                      <td className="px-4 py-3 text-neutral-medium text-xs whitespace-nowrap">{t.closed_date || '—'}</td>
                      <td className="px-4 py-3 text-right text-primary font-bold">{t.price > 0 ? fmt(t.price) : '—'}</td>
                      <td className="px-4 py-3 text-center text-neutral-medium text-xs">{t.currency}</td>
                      <td className="px-4 py-3 text-right text-emerald-400/80 text-xs">{vndEquiv ? fmt(vndEquiv) : ''}</td>
                      <td className="px-4 py-3 text-right text-yellow-400 font-bold">{t.bonus > 0 ? fmt(t.bonus) : ''}</td>
                      <td className="px-4 py-3 text-neutral-medium/60 text-xs max-w-[120px] truncate">{t.bonus_note || ''}</td>
                      <td className="px-4 py-3 text-neutral-medium/60 text-xs max-w-[120px] truncate">{t.notes || ''}</td>
                    </tr>
                  );
                })}
              </tbody>
              {detailTasks.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-primary/20">
                    <td colSpan={4} className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-neutral-medium">Tổng giá tasks</td>
                    <td className="px-4 py-3 text-right text-primary font-black text-base">{fmt(totalPrice)}</td>
                    <td></td>
                    <td className="px-4 py-3 text-right text-emerald-400 font-bold text-xs">{totalVND > 0 ? fmt(totalVND) : ''}</td>
                    <td className="px-4 py-3 text-right text-yellow-400 font-black">{totalBonus > 0 ? fmt(totalBonus) : ''}</td>
                    <td colSpan={2}></td>
                  </tr>
                  {(s.bonus_amount || 0) > 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-2 text-right text-[10px] font-black uppercase tracking-widest text-yellow-400">+ Bonus ({s.bonus_type === 'percent' ? `${s.bonus_value}%` : 'Cố định'})</td>
                      <td colSpan={2} className="px-4 py-2 text-right text-yellow-400 font-bold">+{fmt(s.bonus_amount || 0)} <span className="text-xs text-neutral-medium">{s.currency}</span></td>
                      <td colSpan={4}></td>
                    </tr>
                  )}
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-right text-[10px] font-black uppercase tracking-widest text-red-400">− Thuế TNCN ({s.tax_rate || 10}%)</td>
                    <td colSpan={2} className="px-4 py-2 text-right text-red-400 font-bold">-{fmt(s.tax_amount || 0)} <span className="text-xs text-neutral-medium">{s.currency}</span></td>
                    <td colSpan={4}></td>
                  </tr>
                  <tr className="border-t-2 border-emerald-500/30">
                    <td colSpan={4} className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-emerald-400">💰 THỰC NHẬN</td>
                    <td colSpan={2} className="px-4 py-3 text-right">
                      <span className="text-emerald-400 font-black text-xl">{fmt(s.net_amount || 0)} <span className="text-xs text-neutral-medium">{s.currency}</span></span>
                      {s.currency !== 'VND' && totalVND > 0 && (
                        <div className="text-neutral-medium text-xs mt-0.5">≈ {fmt(Math.round((totalVND) * (1 - (s.tax_rate || 10) / 100)))} VNĐ</div>
                      )}
                    </td>
                    <td colSpan={4}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        <p className="text-neutral-medium/30 text-[10px] text-right">Tạo lúc: {s.created_at ? new Date(s.created_at).toLocaleString('vi-VN') : '—'}</p>
      </div>
      </>
    );
  }

  // === CREATE VIEW ===
  if (view === 'create') {
    return (
      <>
      {confirmModal && <ConfirmModal message={confirmModal.message} subMessage={confirmModal.subMessage} onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal(null)} />}
      <div className="animate-fadeInUp space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setView('list')} className="p-2 rounded-xl hover:bg-white/5 text-neutral-medium hover:text-white transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h2 className="text-3xl font-black text-primary uppercase tracking-tighter">Tạo Nghiệm Thu</h2>
        </div>

        <div className="rounded-[20px] border border-primary/10 bg-surface p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Nhân sự *</label>
              <select className={inputCls} value={selWorkerId} onChange={e => { setSelWorkerId(e.target.value); setSelTaskIds([]); }}>
                <option value="">-- Chọn nhân sự --</option>
                {workers.filter(w => w.is_active).map(w => (
                  <option key={w.id} value={w.id}>{w.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Kỳ nghiệm thu</label>
              <input type="month" className={inputCls} value={selPeriod} onChange={e => setSelPeriod(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Ghi chú</label>
              <input className={inputCls} value={selNotes} onChange={e => setSelNotes(e.target.value)} placeholder="Ghi chú..." />
            </div>
          </div>

          {/* Task Selection */}
          {selWorkerId && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-widest text-neutral-medium">
                  Chọn task ({selTaskIds.length}/{eligibleTasks.length})
                </p>
                <button onClick={selectAll} className="text-xs text-primary hover:text-primary-dark transition-colors font-bold">
                  {selTaskIds.length === eligibleTasks.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                </button>
              </div>

              {eligibleTasks.length === 0 ? (
                <p className="text-neutral-medium text-sm py-4 text-center">Không có task khả dụng cho nhân sự này trong kỳ {selPeriod}</p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {eligibleTasks.map(t => {
                    const isSelected = selTaskIds.includes(t.id!);
                    const vndPreview = t.currency === 'USD' && t.exchange_rate > 0 ? t.price * t.exchange_rate : null;
                    return (
                      <label key={t.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected ? 'border-primary/40 bg-primary/5' : 'border-primary/10 hover:border-primary/20'
                      }`}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleTask(t.id!)}
                          className="accent-primary w-4 h-4 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{t.title}</p>
                          <div className="flex items-center gap-1.5 text-[10px] text-neutral-medium/50 mt-0.5">
                            {t.clickup_space_name && <span>{t.clickup_space_name}</span>}
                            {t.clickup_space_name && t.clickup_folder_name && <span>|</span>}
                            {t.clickup_folder_name && <span>{t.clickup_folder_name}</span>}
                            {t.closed_date && <span className="ml-1">• Closed: {t.closed_date}</span>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-primary font-bold text-sm">{t.price > 0 ? fmt(t.price) : '—'} <span className="text-[10px] text-neutral-medium">{t.currency}</span></p>
                          {vndPreview && <p className="text-emerald-400/60 text-[10px]">≈ {fmt(vndPreview)} VNĐ</p>}
                          {t.bonus > 0 && <p className="text-yellow-400/60 text-[10px]">+{fmt(t.bonus)} bonus</p>}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Bonus + Tax Settings */}
              <div className="mt-4 p-4 rounded-xl border border-primary/10 bg-white/[0.02] space-y-4">
                <p className="text-xs font-black uppercase tracking-widest text-neutral-medium">💰 Bonus & Thuế TNCN</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelCls}>Loại Bonus</label>
                    <select className={inputCls} value={selBonusType} onChange={e => setSelBonusType(e.target.value as any)}>
                      <option value="amount">Số tiền cụ thể</option>
                      <option value="percent">Theo %</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>{selBonusType === 'percent' ? 'Bonus (%)' : 'Bonus (số tiền)'}</label>
                    <input type="number" className={inputCls} value={selBonusValue || ''} onChange={e => setSelBonusValue(Number(e.target.value) || 0)} placeholder={selBonusType === 'percent' ? 'VD: 5' : 'VD: 500000'} />
                  </div>
                  <div>
                    <label className={labelCls}>Thuế TNCN (%)</label>
                    <input type="number" className={inputCls} value={selTaxRate} disabled title="Mặc định 10%" />
                  </div>
                </div>

                {/* Preview Calculation */}
                {selTaskIds.length > 0 && (
                  <div className="mt-3 p-4 rounded-xl bg-black/30 space-y-2 text-sm">
                    <div className="flex justify-between text-neutral-medium">
                      <span>Tổng giá tasks ({selTaskIds.length} tasks)</span>
                      <span className="text-primary font-bold">{fmt(selectedTotal)} {eligibleTasks[0]?.currency || 'VND'}</span>
                    </div>
                    {previewCalc.bonusAmount > 0 && (
                      <div className="flex justify-between text-yellow-400">
                        <span>+ Bonus {selBonusType === 'percent' ? `(${selBonusValue}%)` : '(cố định)'}</span>
                        <span className="font-bold">+{fmt(previewCalc.bonusAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-red-400">
                      <span>− Thuế TNCN ({selTaxRate}%)</span>
                      <span className="font-bold">-{fmt(previewCalc.taxAmount)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-400 font-black text-base pt-2 border-t border-white/10">
                      <span>💰 THỰC NHẬN</span>
                      <span>{fmt(previewCalc.netAmount)} {eligibleTasks[0]?.currency || 'VND'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="flex items-center justify-between pt-4 border-t border-primary/10">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-neutral-medium">Thực nhận</p>
                  <p className="text-2xl font-black text-emerald-400">{fmt(previewCalc.netAmount)} <span className="text-xs text-neutral-medium">{eligibleTasks[0]?.currency || 'VND'}</span></p>
                  {selectedBonusTotal > 0 && (
                    <p className="text-yellow-400/60 text-[10px]">+ Bonus task: {fmt(selectedBonusTotal)}</p>
                  )}
                </div>
                <button
                  onClick={handleCreate}
                  disabled={selTaskIds.length === 0}
                  className="py-3 px-8 rounded-xl font-black text-xs uppercase tracking-widest bg-gradient-primary text-white shadow-btn-glow transition-all hover:shadow-btn-glow-hover hover:scale-[1.02] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ✚ Tạo nghiệm thu
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      </>
    );
  }

  // === LIST VIEW (default) ===
  return (
    <>
    {confirmModal && <ConfirmModal message={confirmModal.message} subMessage={confirmModal.subMessage} onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal(null)} />}
    <div className="animate-fadeInUp space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-primary uppercase tracking-tighter">Nghiệm Thu</h2>
          <p className="text-neutral-medium text-sm mt-1">Tổng hợp & thanh toán theo tháng</p>
        </div>
        <button
          onClick={() => setView('create')}
          className="px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest bg-gradient-primary text-white shadow-btn-glow hover:shadow-btn-glow-hover transition-all hover:scale-[1.02]"
        >✚ Tạo nghiệm thu</button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-[20px] border border-primary/10 bg-surface">
          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-medium mb-2">Tổng nghiệm thu</p>
          <p className="text-3xl font-black text-white">{settlements.length}</p>
        </div>
        <div className="p-5 rounded-[20px] border border-primary/10 bg-surface">
          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-medium mb-2">Đã thanh toán</p>
          <p className="text-3xl font-black text-emerald-400">{settlements.filter(s => s.status === 'paid').length}</p>
        </div>
        <div className="p-5 rounded-[20px] border border-primary/10 bg-surface">
          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-medium mb-2">Đã chi</p>
          <p className="text-2xl font-black text-primary">{fmt(totalPaidVND)} <span className="text-sm text-neutral-medium">VNĐ</span></p>
        </div>
        <div className="p-5 rounded-[20px] border border-primary/10 bg-surface">
          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-medium mb-2">Chưa thanh toán</p>
          <p className="text-2xl font-black text-amber-400">{fmt(totalPendingVND)} <span className="text-sm text-neutral-medium">VNĐ</span></p>
        </div>
      </div>

      {/* Settlement List */}
      {settlements.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="w-10 h-10 text-primary/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
          <p className="text-neutral-medium text-sm">Chưa có nghiệm thu nào</p>
          <p className="text-neutral-medium/60 text-xs mt-2">Nhấn "✚ Tạo nghiệm thu" để bắt đầu</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {settlements.map(s => {
            const workerName = s.worker?.full_name || workers.find(w => w.id === s.worker_id)?.full_name || '???';
            return (
              <div
                key={s.id}
                className="group relative rounded-[20px] border border-primary/10 bg-surface overflow-hidden hover:border-primary/30 transition-all duration-300 hover:shadow-card-glow cursor-pointer"
                onClick={() => openDetail(s)}
              >
                <div className={`h-1 w-full bg-gradient-to-r ${STATUS_BAR[s.status]}`} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-white font-bold text-base">{workerName}</p>
                      <p className="text-neutral-medium text-xs mt-0.5">Kỳ: {s.period}</p>
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${STATUS_COLORS[s.status]}`}>
                      {STATUS_LABELS[s.status]}
                    </span>
                  </div>
                  <p className="text-neutral-medium text-xs">{s.total_tasks} tasks</p>
                  <p className="text-emerald-400 font-black text-2xl mt-3">{fmt(s.net_amount || s.total_amount)} <span className="text-xs text-neutral-medium">{s.currency}</span></p>
                  {(s.tax_amount || 0) > 0 && <p className="text-neutral-medium/50 text-[10px] line-through">{fmt(s.total_amount + (s.bonus_amount || 0))} (trước thuế)</p>}
                  {s.notes && <p className="text-neutral-medium/60 text-[11px] mt-2 line-clamp-1 italic">📝 {s.notes}</p>}
                  <p className="text-neutral-medium/30 text-[9px] mt-2">🔄 {s.created_at ? new Date(s.created_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}</p>
                </div>

                {/* Delete action */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setConfirmModal({
                      message: 'Xóa nghiệm thu?',
                      subMessage: 'Task sẽ rollback về CHƯA THANH TOÁN.',
                      onConfirm: () => {
                        onDeleteSettlement(s.id!);
                        setConfirmModal(null);
                      },
                    });
                  }}
                  className="absolute bottom-4 right-4 z-20 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400/60 hover:text-red-400 text-[10px] font-bold uppercase tracking-wider transition-all opacity-0 group-hover:opacity-100 flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  Xóa
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
    </>
  );
};

// Custom Confirmation Modal component
const ConfirmModal: React.FC<{
  message: string;
  subMessage?: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ message, subMessage, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center" onClick={onCancel}>
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
    <div
      className="relative z-10 rounded-[20px] border border-red-500/30 bg-[#1a1a1a] p-8 max-w-sm w-full mx-4 shadow-2xl"
      onClick={e => e.stopPropagation()}
      style={{ animation: 'fadeInUp 0.2s ease-out' }}
    >
      <div className="flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
          <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <p className="text-white font-bold text-base">{message}</p>
        {subMessage && <p className="text-neutral-medium text-sm -mt-2">{subMessage}</p>}
        <div className="flex gap-3 w-full mt-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-primary/20 text-neutral-medium font-black text-xs uppercase tracking-widest hover:text-white hover:border-primary/40 transition-all"
          >Hủy</button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl bg-red-500 text-white font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-all"
          >Xác nhận</button>
        </div>
      </div>
    </div>
  </div>
);

export default SettlementManager;
