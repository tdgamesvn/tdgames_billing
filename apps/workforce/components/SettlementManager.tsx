import React, { useState, useEffect, useRef } from 'react';
import { Worker, WorkforceTask, Settlement } from '@/types';
import * as svc from '../services/workforceService';

interface SettlementManagerProps {
  settlements: Settlement[];
  workers: Worker[];
  tasks: WorkforceTask[];
  vcbSellRate: number;
  onCreateSettlement: (workerId: string, period: string, taskIds: string[], totalAmount: number, currency: string, notes: string) => void;
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

const SettlementManager: React.FC<SettlementManagerProps> = ({
  settlements, workers, tasks, vcbSellRate,
  onCreateSettlement, onUpdateSettlement, onDeleteSettlement,
}) => {
  const [view, setView] = useState<View>('list');
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null);
  const [detailTasks, setDetailTasks] = useState<WorkforceTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Create form state
  const [selWorkerId, setSelWorkerId] = useState('');
  const [selPeriod, setSelPeriod] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selNotes, setSelNotes] = useState('');
  const [selTaskIds, setSelTaskIds] = useState<string[]>([]);

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

  const handleCreate = () => {
    if (!selWorkerId || selTaskIds.length === 0) return;
    const currency = eligibleTasks[0]?.currency || 'VND';
    onCreateSettlement(selWorkerId, selPeriod, selTaskIds, selectedTotal, currency, selNotes);
    setView('list');
    setSelWorkerId('');
    setSelTaskIds([]);
    setSelNotes('');
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

    // Convert logo to base64
    let logoBase64 = '';
    try {
      const resp = await fetch('/logo_td_notext.png');
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
      <div class="logo-row">${logoBase64 ? `<img src="${logoBase64}" alt="Logo" />` : ''}<div><h1>NGHIỆM THU CÔNG VIỆC</h1><h2>TD Games Studio</h2></div></div>
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
    <table>
      <thead><tr>
        <th style="text-align:center">#</th><th>Task</th><th>Project</th><th>Ngày đóng</th>
        <th style="text-align:right">Giá</th><th style="text-align:center">Tiền tệ</th><th style="text-align:right">Quy đổi VNĐ</th>
        <th style="text-align:right">Bonus</th><th>Lý do</th><th>Ghi chú</th>
      </tr></thead>
      <tbody>${taskRows}</tbody>
    </table>
    <div class="totals">
      <div class="row"><span>Tổng giá:</span><b>${totalPrice.toLocaleString()} ${selectedSettlement.currency}</b></div>
      <div class="row"><span>Tổng bonus:</span><b>${totalBonus.toLocaleString()} ${selectedSettlement.currency}</b></div>
      ${totalVND > 0 ? `<div class="row"><span>Tổng quy đổi VNĐ:</span><b>${(totalVND + totalBonusVND).toLocaleString()} VNĐ</b></div>` : ''}
      <div class="row grand"><span>TỔNG CỘNG:</span><span>${(totalPrice + totalBonus).toLocaleString()} ${selectedSettlement.currency}</span></div>
    </div>
    <div class="footer">
      <div class="sig"><div style="font-size:11px;color:#666">Người lập</div><div class="line">TD Games</div></div>
      <div class="sig"><div style="font-size:11px;color:#666">Nhân sự xác nhận</div><div class="line">${workerName}</div></div>
    </div>
    </body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  // Helpers
  const fmt = (n: number) => n.toLocaleString();
  const totalPaid = settlements.filter(s => s.status === 'paid').reduce((s, st) => s + st.total_amount, 0);
  const totalPending = settlements.filter(s => s.status !== 'paid').reduce((s, st) => s + st.total_amount, 0);

  // ─── Render ─────────────────
  // === DETAIL VIEW ===
  if (view === 'detail' && selectedSettlement) {
    const s = selectedSettlement;
    const workerName = s.worker?.full_name || workers.find(w => w.id === s.worker_id)?.full_name || '???';
    const nextStatus = STATUS_FLOW[s.status];
    const totalPrice = detailTasks.reduce((sum, t) => sum + (t.price || 0), 0);
    const totalBonus = detailTasks.reduce((sum, t) => sum + (t.bonus || 0), 0);
    const totalVND = detailTasks.reduce((sum, t) => {
      if (t.currency === 'USD' && t.exchange_rate > 0) return sum + t.price * t.exchange_rate;
      if (t.currency === 'VND') return sum + t.price;
      return sum;
    }, 0);

    return (
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
                if (nextStatus === 'paid' && !confirm('Xác nhận đã thanh toán? Tất cả task sẽ được đánh dấu ĐÃ THANH TOÁN.')) return;
                onUpdateSettlement(s.id!, { status: nextStatus as any });
                setSelectedSettlement({ ...s, status: nextStatus as any });
              }}
              className="px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest bg-gradient-primary text-white shadow-btn-glow hover:shadow-btn-glow-hover transition-all hover:scale-[1.02]"
            >{STATUS_NEXT_LABEL[s.status]}</button>
          )}
          <button onClick={handleExportPDF}
            className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest border border-primary/20 text-primary hover:bg-primary/10 transition-all">
            📄 Export PDF
          </button>
          <button
            onClick={() => {
              if (!confirm('Xóa nghiệm thu này? Task sẽ được rollback về CHƯA THANH TOÁN.')) return;
              onDeleteSettlement(s.id!);
              setView('list');
            }}
            className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all ml-auto"
          >🗑 Xóa</button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-[16px] border border-primary/10 bg-surface">
            <p className="text-[9px] font-black uppercase tracking-widest text-neutral-medium mb-1">Số task</p>
            <p className="text-2xl font-black text-white">{detailTasks.length}</p>
          </div>
          <div className="p-4 rounded-[16px] border border-primary/10 bg-surface">
            <p className="text-[9px] font-black uppercase tracking-widest text-neutral-medium mb-1">Tổng giá</p>
            <p className="text-2xl font-black text-primary">{fmt(totalPrice)}</p>
          </div>
          <div className="p-4 rounded-[16px] border border-primary/10 bg-surface">
            <p className="text-[9px] font-black uppercase tracking-widest text-neutral-medium mb-1">Tổng Bonus</p>
            <p className="text-2xl font-black text-yellow-400">{fmt(totalBonus)}</p>
          </div>
          <div className="p-4 rounded-[16px] border border-primary/10 bg-surface">
            <p className="text-[9px] font-black uppercase tracking-widest text-neutral-medium mb-1">Quy đổi VNĐ</p>
            <p className="text-xl font-black text-emerald-400">{fmt(totalVND)}</p>
          </div>
        </div>

        {s.notes && (
          <div className="px-4 py-3 rounded-xl border border-primary/10 bg-surface text-neutral-medium text-sm">
            📝 <span className="italic">{s.notes}</span>
          </div>
        )}

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
                    <td colSpan={4} className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-neutral-medium">TỔNG CỘNG</td>
                    <td className="px-4 py-3 text-right text-primary font-black text-base">{fmt(totalPrice)}</td>
                    <td></td>
                    <td className="px-4 py-3 text-right text-emerald-400 font-bold text-xs">{totalVND > 0 ? fmt(totalVND) : ''}</td>
                    <td className="px-4 py-3 text-right text-yellow-400 font-black">{totalBonus > 0 ? fmt(totalBonus) : ''}</td>
                    <td colSpan={2}></td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-right text-[10px] font-black uppercase tracking-widest text-primary">GRAND TOTAL (Giá + Bonus)</td>
                    <td colSpan={2} className="px-4 py-2 text-right text-primary font-black text-xl">{fmt(totalPrice + totalBonus)} <span className="text-xs text-neutral-medium">{detailTasks[0]?.currency || 'VND'}</span></td>
                    <td colSpan={4}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        <p className="text-neutral-medium/30 text-[10px] text-right">Tạo lúc: {s.created_at ? new Date(s.created_at).toLocaleString('vi-VN') : '—'}</p>
      </div>
    );
  }

  // === CREATE VIEW ===
  if (view === 'create') {
    return (
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

              {/* Total + Submit */}
              <div className="flex items-center justify-between pt-4 border-t border-primary/10">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-neutral-medium">Tổng nghiệm thu</p>
                  <p className="text-2xl font-black text-primary">{fmt(selectedTotal)} <span className="text-xs text-neutral-medium">{eligibleTasks[0]?.currency || 'VND'}</span></p>
                  {selectedBonusTotal > 0 && (
                    <p className="text-yellow-400 text-xs font-bold">+ Bonus: {fmt(selectedBonusTotal)}</p>
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
    );
  }

  // === LIST VIEW (default) ===
  return (
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
          <p className="text-2xl font-black text-primary">{fmt(totalPaid)}</p>
        </div>
        <div className="p-5 rounded-[20px] border border-primary/10 bg-surface">
          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-medium mb-2">Chưa thanh toán</p>
          <p className="text-2xl font-black text-amber-400">{fmt(totalPending)}</p>
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
                  <p className="text-primary font-black text-2xl mt-3">{fmt(s.total_amount)} <span className="text-xs text-neutral-medium">{s.currency}</span></p>
                  {s.notes && <p className="text-neutral-medium/60 text-[11px] mt-2 line-clamp-1 italic">📝 {s.notes}</p>}
                  <p className="text-neutral-medium/30 text-[9px] mt-2">🔄 {s.created_at ? new Date(s.created_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}</p>
                </div>

                {/* Delete action */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (!confirm('Xóa nghiệm thu? Task sẽ rollback về CHƯA THANH TOÁN.')) return;
                    onDeleteSettlement(s.id!);
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
  );
};

export default SettlementManager;
