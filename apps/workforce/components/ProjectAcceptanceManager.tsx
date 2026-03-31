import React, { useState, useRef } from 'react';
import { WorkforceTask, ProjectAcceptance } from '@/types';
import * as paSvc from '../services/projectAcceptanceService';

type AcceptanceTask = WorkforceTask & { client_price: number; acceptance_note: string };

interface ProjectAcceptanceManagerProps {
  acceptances: ProjectAcceptance[];
  tasks: WorkforceTask[];
  vcbSellRate: number;
  onCreateAcceptance: (projectName: string, clientName: string, period: string, taskIds: string[], totalAmount: number, currency: string, notes: string, clientPrices?: Record<string, number>) => void;
  onUpdateAcceptance: (id: string, updates: Partial<ProjectAcceptance>) => void;
  onDeleteAcceptance: (id: string) => void;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
};
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-neutral-dark/30 text-neutral-medium border-neutral-dark/50',
  sent: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  accepted: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};
const STATUS_BAR: Record<string, string> = {
  draft: 'from-neutral-dark to-neutral-dark',
  sent: 'from-blue-500 to-blue-600',
  accepted: 'from-emerald-500 to-emerald-600',
};
const STATUS_FLOW: Record<string, string> = {
  draft: 'sent',
  sent: 'accepted',
};
const STATUS_NEXT_LABEL: Record<string, string> = {
  draft: '📤 Send to Client',
  sent: '✅ Client Accepted',
};

const inputCls = "w-full bg-transparent border border-primary/10 rounded-xl px-4 py-3 text-white placeholder-neutral-medium/40 focus:outline-none focus:border-primary/40 transition-all text-sm";
const labelCls = "text-[10px] font-black uppercase tracking-widest text-neutral-medium mb-2 block";

// Internal task status labels and colors (for display)
const TASK_STATUS_LABELS: Record<string, string> = {
  in_progress: 'In Progress',
  completed: 'Completed',
  approved: 'Approved',
  rejected: 'Rejected',
};
const TASK_STATUS_COLORS: Record<string, string> = {
  in_progress: 'bg-blue-500/20 text-blue-400',
  completed: 'bg-yellow-500/20 text-yellow-400',
  approved: 'bg-emerald-500/20 text-emerald-400',
  rejected: 'bg-red-500/20 text-red-400',
};

// ClickUp status color palette (auto-assigned by index)
const CLICKUP_STATUS_PALETTE = [
  'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'bg-pink-500/20 text-pink-400 border-pink-500/30',
  'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'bg-red-500/20 text-red-400 border-red-500/30',
  'bg-teal-500/20 text-teal-400 border-teal-500/30',
  'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
];

// Known ClickUp status → fixed color map for consistency
const CLICKUP_STATUS_COLORS: Record<string, { bg: string; text: string; hex: string }> = {
  'approved':       { bg: 'bg-emerald-500/20', text: 'text-emerald-400', hex: '#10b981' },
  'complete':       { bg: 'bg-emerald-500/20', text: 'text-emerald-400', hex: '#10b981' },
  'closed':         { bg: 'bg-emerald-500/20', text: 'text-emerald-400', hex: '#10b981' },
  'client_review':  { bg: 'bg-amber-500/20',   text: 'text-amber-400',   hex: '#f59e0b' },
  'review':         { bg: 'bg-yellow-500/20',  text: 'text-yellow-400',  hex: '#eab308' },
  'lead_check':     { bg: 'bg-orange-500/20',  text: 'text-orange-400',  hex: '#f97316' },
  'in progess':     { bg: 'bg-blue-500/20',    text: 'text-blue-400',    hex: '#3b82f6' },
  'in progress':    { bg: 'bg-blue-500/20',    text: 'text-blue-400',    hex: '#3b82f6' },
  'fix':            { bg: 'bg-red-500/20',     text: 'text-red-400',     hex: '#ef4444' },
  'new request':    { bg: 'bg-purple-500/20',  text: 'text-purple-400',  hex: '#a855f7' },
};

const getClickupStatusStyle = (status: string) => {
  const lower = status.toLowerCase();
  const known = CLICKUP_STATUS_COLORS[lower];
  if (known) return { className: `${known.bg} ${known.text}`, hex: known.hex };
  // Fallback: hash-based color from palette
  const hash = lower.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return { className: 'bg-neutral-500/20 text-neutral-400', hex: '#9ca3af' };
};

type View = 'list' | 'create' | 'detail';
type CompanyId = 'tdgames' | 'tdconsulting';

const COMPANY_CONFIG: Record<CompanyId, { name: string; logo: string; subtitle: string }> = {
  tdgames: { name: 'TD Games Studio', logo: '/logo_td_notext.png', subtitle: 'TD GAMES CO., LTD' },
  tdconsulting: { name: 'TD Consulting', logo: '/logo_tdc.png', subtitle: 'TD CONSULTING CO., LTD' },
};

const ProjectAcceptanceManager: React.FC<ProjectAcceptanceManagerProps> = ({
  acceptances, tasks, vcbSellRate,
  onCreateAcceptance, onUpdateAcceptance, onDeleteAcceptance,
}) => {
  const [view, setView] = useState<View>('list');
  const [selectedAcceptance, setSelectedAcceptance] = useState<ProjectAcceptance | null>(null);
  const [detailTasks, setDetailTasks] = useState<AcceptanceTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [selCompany, setSelCompany] = useState<CompanyId>('tdgames');
  const printRef = useRef<HTMLDivElement>(null);

  // Confirm modal
  const [confirmModal, setConfirmModal] = useState<{
    message: string;
    subMessage?: string;
    onConfirm: () => void;
  } | null>(null);

  // Create form state
  const [selClient, setSelClient] = useState('');
  const [selProject, setSelProject] = useState('');
  const [selPeriod, setSelPeriod] = useState('');
  const [selNotes, setSelNotes] = useState('');
  const [selTaskIds, setSelTaskIds] = useState<string[]>([]);
  // ClickUp status filter for task selection during create (dynamic per project)
  const [selClickupStatusFilter, setSelClickupStatusFilter] = useState<string[]>([]);
  // Custom client prices per task (different from freelancer price)
  const [customPrices, setCustomPrices] = useState<Record<string, number>>({});

  // Get unique clients and projects (no status pre-filter — show all)
  const uniqueClients = [...new Set(tasks.map(t => t.clickup_space_name).filter(Boolean))].sort() as string[];
  const uniqueProjects = [...new Set(
    tasks
      .filter(t => !selClient || t.clickup_space_name === selClient)
      .map(t => t.clickup_folder_name)
      .filter(Boolean)
  )].sort() as string[];

  // Tasks scoped to selected client/project (before clickup_status filter)
  const scopedTasks = tasks.filter(t => {
    if (selClient && t.clickup_space_name !== selClient) return false;
    if (selProject && t.clickup_folder_name !== selProject) return false;
    return true;
  });

  // All unique ClickUp statuses available in the current scope
  const availableClickupStatuses = [...new Set(
    scopedTasks.map(t => t.clickup_status).filter(Boolean)
  )].sort() as string[];

  // Eligible tasks = scoped + filtered by selected ClickUp statuses
  const eligibleTasks = scopedTasks.filter(t => {
    if (selClickupStatusFilter.length === 0) return true; // no filter = show all
    return selClickupStatusFilter.includes(t.clickup_status || '');
  });

  // Toggle clickup status filter
  const toggleStatusFilter = (status: string) => {
    setSelClickupStatusFilter(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
    setSelTaskIds([]);
    setCustomPrices({});
  };

  // Select all / deselect all statuses
  const selectAllStatuses = () => {
    setSelClickupStatusFilter([...availableClickupStatuses]);
    setSelTaskIds([]);
    setCustomPrices({});
  };
  const deselectAllStatuses = () => {
    setSelClickupStatusFilter([]);
    setSelTaskIds([]);
    setCustomPrices({});
  };

  const selectedTasksData = eligibleTasks.filter(t => selTaskIds.includes(t.id!));
  const selectedTotal = selectedTasksData.reduce((s, t) => s + (customPrices[t.id!] ?? 0), 0);

  const handleCreate = () => {
    if (!selProject || selTaskIds.length === 0) return;
    const clientName = selClient || selectedTasksData[0]?.clickup_space_name || '';
    onCreateAcceptance(selProject, clientName, selPeriod, selTaskIds, selectedTotal, 'USD', selNotes, customPrices);
    setView('list');
    setSelClient('');
    setSelProject('');
    setSelPeriod('');
    setSelTaskIds([]);
    setSelNotes('');
    setCustomPrices({});
    setSelClickupStatusFilter([]);
  };

  const toggleTask = (tid: string) =>
    setSelTaskIds(prev => prev.includes(tid) ? prev.filter(i => i !== tid) : [...prev, tid]);
  const selectAll = () =>
    setSelTaskIds(selTaskIds.length === eligibleTasks.length ? [] : eligibleTasks.map(t => t.id!));

  const setCustomPrice = (taskId: string, price: number) => {
    setCustomPrices(prev => ({ ...prev, [taskId]: price }));
  };

  // Open detail view
  const openDetail = async (a: ProjectAcceptance) => {
    setSelectedAcceptance(a);
    setView('detail');
    setLoadingTasks(true);
    try {
      const tks = await paSvc.fetchProjectAcceptanceTasks(a.id!);
      setDetailTasks(tks);
    } catch { setDetailTasks([]); }
    setLoadingTasks(false);
  };

  // Update client_price for a task inline in detail view
  const handleUpdateDetailPrice = async (taskId: string, newPrice: number) => {
    if (!selectedAcceptance) return;
    // Optimistic update
    setDetailTasks(prev => prev.map(t => t.id === taskId ? { ...t, client_price: newPrice } : t));
    try {
      await paSvc.updateAcceptanceTaskClientPrice(selectedAcceptance.id!, taskId, newPrice);
      const newTotal = await paSvc.recalcAcceptanceTotal(selectedAcceptance.id!);
      setSelectedAcceptance(prev => prev ? { ...prev, total_amount: newTotal } : prev);
      // Also update in the list
      onUpdateAcceptance(selectedAcceptance.id!, { total_amount: newTotal });
    } catch { /* revert if needed */ }
  };

  // Update note for a task inline in detail view
  const handleUpdateDetailNote = async (taskId: string, newNote: string) => {
    if (!selectedAcceptance) return;
    // Optimistic update
    setDetailTasks(prev => prev.map(t => t.id === taskId ? { ...t, acceptance_note: newNote } : t));
    try {
      await paSvc.updateAcceptanceTaskNote(selectedAcceptance.id!, taskId, newNote);
    } catch { /* revert if needed */ }
  };

  // PDF Export — English, client-facing, no worker info, USD only, uses client_price
  const handleExportPDF = async () => {
    if (!selectedAcceptance) return;
    const a = selectedAcceptance;
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

    // Group tasks by clickup_list_name
    const pdfListGroups = new Map<string, typeof detailTasks>();
    detailTasks.forEach(t => {
      const listName = t.clickup_list_name || 'Other';
      if (!pdfListGroups.has(listName)) pdfListGroups.set(listName, []);
      pdfListGroups.get(listName)!.push(t);
    });

    let rowIdx = 0;
    const taskRows = Array.from(pdfListGroups.entries()).map(([listName, groupTasks]) => {
      const groupSub = groupTasks.reduce((s, t) => s + (t.client_price || 0), 0);
      const hdr = `<tr><td colspan="6" style="padding:10px 8px 6px;font-weight:800;font-size:12px;color:#1e293b;border-bottom:2px solid #e2e8f0;text-transform:uppercase;letter-spacing:1px;background:#f8fafc">${listName} <span style="font-weight:400;font-size:10px;color:#94a3b8;margin-left:8px">${groupTasks.length} tasks</span></td></tr>`;
      const rows = groupTasks.map(t => {
        rowIdx++;
        const price = t.client_price || 0;
        const cs = t.clickup_status || t.status || '';
        const ss = getClickupStatusStyle(cs);
        return `<tr>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;color:#666">${rowIdx}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;max-width:380px">${t.title}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;white-space:nowrap"><span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;background:${ss.hex}15;color:${ss.hex};text-transform:capitalize">${cs}</span></td>
          <td style="padding:8px;border-bottom:1px solid #eee;white-space:nowrap">${t.closed_date || ''}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-weight:600">${price > 0 ? '$' + price.toLocaleString('en-US') : ''}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;color:#888;font-size:11px">${t.acceptance_note || ''}</td>
        </tr>`;
      }).join('');
      return hdr + rows;
    }).join('');

    const totalClientPrice = detailTasks.reduce((s, t) => s + (t.client_price || 0), 0);
    const discountAmt = a.discount_type === 'percent'
      ? totalClientPrice * (a.discount_value || 0) / 100
      : (a.discount_value || 0);
    const netTotal = Math.max(0, totalClientPrice - discountAmt);

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Discount rows for PDF
    const hasDiscount = (a.discount_value || 0) > 0;
    const discountRowHtml = hasDiscount ? `
      <div class="row"><span>Subtotal:</span><span>$${totalClientPrice.toLocaleString('en-US')}</span></div>
      <div class="row" style="color:#e74c3c"><span>Discount${a.discount_type === 'percent' ? ` (${a.discount_value}%)` : ''}:</span><span>-$${discountAmt.toLocaleString('en-US')}</span></div>
    ` : '';

    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Project Acceptance - ${a.project_name}</title>
    <style>
      body{font-family:'Segoe UI',Roboto,sans-serif;margin:40px;color:#222;font-size:13px}
      h1{font-size:24px;margin:0;color:#111}
      h2{font-size:16px;margin:0;color:#555;font-weight:400}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:30px;border-bottom:3px solid #3b82f6;padding-bottom:20px}
      .logo-row{display:flex;align-items:center;gap:12px}
      .logo-row img{width:48px;height:48px;object-fit:contain}
      .meta{display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:14px;color:#555;margin-bottom:20px}
      .meta span{font-weight:700;color:#222;font-size:16px}
      table{width:100%;border-collapse:collapse;margin:20px 0;font-size:12px}
      tr{page-break-inside:avoid;break-inside:avoid}
      thead{display:table-header-group}
      th{padding:10px 8px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#666;border-bottom:2px solid #222;white-space:nowrap}
      .totals{margin-top:20px;text-align:right;font-size:14px;page-break-inside:avoid;break-inside:avoid}
      .totals .row{padding:6px 0;display:flex;justify-content:flex-end;gap:20px}
      .totals .grand{font-size:18px;font-weight:700;color:#3b82f6;border-top:2px solid #222;padding-top:10px;margin-top:5px}
      .footer{margin-top:60px;display:flex;justify-content:space-between;page-break-inside:avoid;break-inside:avoid}
      .sig{text-align:center;width:200px}
      .sig .line{margin-top:60px;border-top:1px solid #333;padding-top:5px;font-weight:600}
      @media print{@page{margin:10mm 12mm}body{margin:0}}
    </style></head><body>
    <div class="header">
      <div class="logo-row">${logoBase64 ? `<img src="${logoBase64}" alt="Logo" />` : ''}<div><h1>PROJECT ACCEPTANCE</h1><h2>${company.name}</h2></div></div>
      <div style="text-align:right"><div style="font-size:11px;color:#666">Date</div>
        <div style="font-size:16px;font-weight:700">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        ${a.period ? `<div style="font-size:11px;color:#666;margin-top:4px">Period: ${a.period}</div>` : ''}
      </div>
    </div>
    <div class="meta">
      <div>Client: <span>${a.client_name}</span></div>
      <div>Project: <span>${a.project_name}</span></div>
      <div>Total Tasks: <span>${detailTasks.length}</span></div>
      <div>Status: <span>${STATUS_LABELS[a.status]}</span></div>
      ${a.notes ? `<div style="grid-column:span 2">Notes: <span>${a.notes}</span></div>` : ''}
    </div>
    <table>
      <thead><tr>
        <th style="text-align:center">#</th><th>Task Description</th><th>Status</th><th>Completed</th>
        <th style="text-align:right">Amount (USD)</th><th>Notes</th>
      </tr></thead>
      <tbody>${taskRows}</tbody>
    </table>
    <div class="totals">
      ${discountRowHtml}
      <div class="row grand"><span>TOTAL:</span><span>$${netTotal.toLocaleString('en-US')}</span></div>
    </div>
    <div class="footer">
      <div class="sig"><div style="font-size:11px;color:#666">Service Provider</div><div class="line">${company.name}</div></div>
      <div class="sig"><div style="font-size:11px;color:#666">Client</div><div class="line">${a.client_name}</div></div>
    </div>
    </body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  // Helpers
  const fmt = (n: number) => n.toLocaleString('en-US');
  const fmtUSD = (n: number) => `$${n.toLocaleString('en-US')}`;
  const totalAccepted = acceptances.filter(a => a.status === 'accepted').reduce((s, a) => s + a.total_amount, 0);
  const totalPending = acceptances.filter(a => a.status !== 'accepted').reduce((s, a) => s + a.total_amount, 0);

  // ─── Discount helpers ───────
  const calcDiscount = (subtotal: number, type: string, value: number) =>
    type === 'percent' ? subtotal * (value || 0) / 100 : (value || 0);

  // ─── DETAIL VIEW ───────────
  if (view === 'detail' && selectedAcceptance) {
    const a = selectedAcceptance;
    const nextStatus = STATUS_FLOW[a.status];
    const totalClientPrice = detailTasks.reduce((sum, t) => sum + (t.client_price || 0), 0);
    const discountAmount = calcDiscount(totalClientPrice, a.discount_type, a.discount_value);
    const netTotal = Math.max(0, totalClientPrice - discountAmount);

    const handleDiscountChange = (field: 'discount_type' | 'discount_value', val: any) => {
      const updates = { [field]: val };
      onUpdateAcceptance(a.id!, updates);
      setSelectedAcceptance(prev => prev ? { ...prev, ...updates } : prev);
    };

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
            <h2 className="text-3xl font-black text-blue-400 uppercase tracking-tighter">Project Acceptance</h2>
            <p className="text-neutral-medium text-sm">{a.client_name} — {a.project_name}{a.period ? ` — Period ${a.period}` : ''}</p>
          </div>
          <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border ${STATUS_COLORS[a.status]}`}>
            {STATUS_LABELS[a.status]}
          </span>
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-3 flex-wrap">
          {nextStatus && (
            <button
              onClick={() => {
                onUpdateAcceptance(a.id!, { status: nextStatus as any });
                setSelectedAcceptance({ ...a, status: nextStatus as any });
              }}
              className="px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
            >{STATUS_NEXT_LABEL[a.status]}</button>
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
            className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest border border-blue-500/20 text-blue-400 hover:bg-blue-500/10 transition-all">
            📄 Export PDF
          </button>
          <button
            onClick={() => {
              setConfirmModal({
                message: 'Delete this project acceptance?',
                onConfirm: () => {
                  onDeleteAcceptance(a.id!);
                  setView('list');
                  setConfirmModal(null);
                },
              });
            }}
            className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all ml-auto"
          >🗑 Delete</button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-[16px] border border-blue-500/10 bg-surface">
            <p className="text-[9px] font-black uppercase tracking-widest text-neutral-medium mb-1">Client</p>
            <p className="text-lg font-black text-white truncate">{a.client_name}</p>
          </div>
          <div className="p-4 rounded-[16px] border border-blue-500/10 bg-surface">
            <p className="text-[9px] font-black uppercase tracking-widest text-neutral-medium mb-1">Project</p>
            <p className="text-lg font-black text-blue-400 truncate">{a.project_name}</p>
          </div>
          <div className="p-4 rounded-[16px] border border-blue-500/10 bg-surface">
            <p className="text-[9px] font-black uppercase tracking-widest text-neutral-medium mb-1">Tasks</p>
            <p className="text-2xl font-black text-white">{detailTasks.length}</p>
          </div>
          <div className="p-4 rounded-[16px] border border-blue-500/10 bg-surface border-blue-500/30">
            <p className="text-[9px] font-black uppercase tracking-widest text-blue-400 mb-1">NET TOTAL</p>
            <p className="text-2xl font-black text-blue-400">{fmtUSD(netTotal)}</p>
            {(a.discount_value || 0) > 0 && (
              <p className="text-[10px] text-neutral-medium/50 mt-0.5">
                Subtotal: {fmtUSD(totalClientPrice)} − Discount: {fmtUSD(discountAmount)}
              </p>
            )}
          </div>
        </div>

        {a.notes && (
          <div className="px-4 py-3 rounded-xl border border-primary/10 bg-surface text-neutral-medium text-sm">
            📝 <span className="italic">{a.notes}</span>
          </div>
        )}

        {/* Task table — editable client_price */}
        <div ref={printRef} className="rounded-[20px] border border-primary/10 bg-surface overflow-hidden">
          <div className="px-4 py-3 border-b border-primary/10 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-medium">Tasks — Client Pricing (USD)</p>
            <p className="text-[10px] text-neutral-medium/50">Click any price to edit</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary/10">
                  <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-neutral-medium w-8">#</th>
                  <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-neutral-medium min-w-[250px]">Task Description</th>
                  <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-neutral-medium whitespace-nowrap">Status</th>
                  <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-neutral-medium whitespace-nowrap">Completed</th>
                  <th className="text-right px-4 py-3 text-[9px] font-black uppercase tracking-widest text-neutral-medium">Client Price (USD)</th>
                  <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-neutral-medium min-w-[150px]">Notes</th>
                </tr>
              </thead>
              <tbody>
                {loadingTasks ? (
                  <tr><td colSpan={6} className="text-center py-8 text-neutral-medium">Loading...</td></tr>
                ) : detailTasks.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-neutral-medium">No tasks</td></tr>
                ) : (() => {
                  const listGroups = new Map<string, AcceptanceTask[]>();
                  detailTasks.forEach(t => {
                    const ln = t.clickup_list_name || 'Other';
                    if (!listGroups.has(ln)) listGroups.set(ln, []);
                    listGroups.get(ln)!.push(t);
                  });
                  let idx = 0;
                  return Array.from(listGroups.entries()).map(([listName, groupTasks]) => {
                    const sub = groupTasks.reduce((s, t) => s + (t.client_price || 0), 0);
                    return (
                      <React.Fragment key={listName}>
                        <tr className="bg-white/[0.03]">
                          <td colSpan={6} className="px-4 py-2.5 border-b border-primary/20">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">
                                {listName}
                                <span className="text-neutral-medium/50 font-medium ml-2 normal-case tracking-normal">
                                  {groupTasks.length} tasks
                                </span>
                              </span>
                              <span className="text-[10px] font-bold text-blue-400/70">
                                {fmtUSD(sub)}
                              </span>
                            </div>
                          </td>
                        </tr>
                        {groupTasks.map(t => {
                          idx++;
                          const clickupStatus = t.clickup_status || t.status || '';
                          const style = getClickupStatusStyle(clickupStatus);
                          return (
                            <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                              <td className="px-4 py-3 text-neutral-medium/50">{idx}</td>
                              <td className="px-4 py-3 text-white font-medium">{t.title}</td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md capitalize ${style.className}`}>
                                  {clickupStatus}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-neutral-medium text-xs whitespace-nowrap">{t.closed_date || '\u2014'}</td>
                              <td className="px-4 py-2 text-right">
                                <div className="inline-flex items-center gap-1.5 justify-end">
                                  <span className="text-neutral-medium/40 text-xs">$</span>
                                  <input type="number" min="0" step="1" defaultValue={t.client_price || ''}
                                    onBlur={e => { const v = parseFloat(e.target.value) || 0; if (v !== t.client_price) handleUpdateDetailPrice(t.id!, v); }}
                                    onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                    placeholder="0"
                                    className="w-28 bg-transparent border border-primary/10 rounded-lg px-3 py-1.5 text-blue-400 font-bold text-sm text-right focus:outline-none focus:border-blue-500/40 transition-all placeholder-neutral-medium/20 hover:border-primary/20"
                                  />
                                </div>
                              </td>
                              <td className="px-4 py-2">
                                <input type="text" defaultValue={t.acceptance_note || ''}
                                  onBlur={e => { const v = e.target.value.trim(); if (v !== (t.acceptance_note || '')) handleUpdateDetailNote(t.id!, v); }}
                                  onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                  placeholder="Add note..."
                                  className="w-full bg-transparent border border-primary/10 rounded-lg px-3 py-1.5 text-neutral-medium text-xs focus:outline-none focus:border-blue-500/40 transition-all placeholder-neutral-medium/20 hover:border-primary/20"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  });
                })()}
              </tbody>
              {detailTasks.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-blue-500/20">
                    <td colSpan={5} className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-neutral-medium">Subtotal</td>
                    <td className="px-4 py-3 text-right text-blue-400 font-black text-base">{fmtUSD(totalClientPrice)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Discount controls */}
        <div className="rounded-[20px] border border-primary/10 bg-surface p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-medium mb-4">Discount</p>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center rounded-xl border border-primary/10 overflow-hidden">
              <button
                onClick={() => handleDiscountChange('discount_type', 'amount')}
                className={`px-4 py-2.5 text-xs font-bold tracking-wider transition-all ${
                  a.discount_type === 'amount'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-neutral-medium hover:text-white hover:bg-white/5'
                }`}
              >$ Fixed Amount</button>
              <button
                onClick={() => handleDiscountChange('discount_type', 'percent')}
                className={`px-4 py-2.5 text-xs font-bold tracking-wider transition-all ${
                  a.discount_type === 'percent'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-neutral-medium hover:text-white hover:bg-white/5'
                }`}
              >% Percentage</button>
            </div>
            <div className="flex items-center gap-2">
              {a.discount_type === 'amount' && <span className="text-neutral-medium/40 text-sm">$</span>}
              <input
                type="number"
                min="0"
                step="1"
                defaultValue={a.discount_value || ''}
                key={`disc-${a.discount_type}`}
                onBlur={e => {
                  const val = parseFloat(e.target.value) || 0;
                  handleDiscountChange('discount_value', val);
                }}
                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                placeholder="0"
                className="w-32 bg-transparent border border-primary/10 rounded-lg px-3 py-2 text-blue-400 font-bold text-sm text-right focus:outline-none focus:border-blue-500/40 transition-all placeholder-neutral-medium/20"
              />
              {a.discount_type === 'percent' && <span className="text-neutral-medium/40 text-sm">%</span>}
            </div>
            {(a.discount_value || 0) > 0 && (
              <div className="ml-auto flex items-center gap-6">
                <div className="text-right">
                  <p className="text-[9px] font-black uppercase tracking-widest text-neutral-medium">Discount</p>
                  <p className="text-red-400 font-bold text-lg">-{fmtUSD(discountAmount)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black uppercase tracking-widest text-blue-400">Net Total</p>
                  <p className="text-blue-400 font-black text-2xl">{fmtUSD(netTotal)}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="text-neutral-medium/30 text-[10px] text-right">Created: {a.created_at ? new Date(a.created_at).toLocaleString('en-US') : '—'}</p>
      </div>
      </>
    );
  }

  // ─── CREATE VIEW ───────────
  if (view === 'create') {
    return (
      <>
      {confirmModal && <ConfirmModal message={confirmModal.message} subMessage={confirmModal.subMessage} onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal(null)} />}
      <div className="animate-fadeInUp space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setView('list')} className="p-2 rounded-xl hover:bg-white/5 text-neutral-medium hover:text-white transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h2 className="text-3xl font-black text-blue-400 uppercase tracking-tighter">New Project Acceptance</h2>
        </div>

        <div className="rounded-[20px] border border-primary/10 bg-surface p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className={labelCls}>Client (Space)</label>
              <select className={inputCls} value={selClient} onChange={e => { setSelClient(e.target.value); setSelProject(''); setSelTaskIds([]); setCustomPrices({}); setSelClickupStatusFilter([]); }}>
                <option value="">-- All clients --</option>
                {uniqueClients.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Project (Folder) *</label>
              <select className={inputCls} value={selProject} onChange={e => { setSelProject(e.target.value); setSelTaskIds([]); setCustomPrices({}); setSelClickupStatusFilter([]); }}>
                <option value="">-- Select project --</option>
                {uniqueProjects.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Period</label>
              <input type="month" className={inputCls} value={selPeriod} onChange={e => setSelPeriod(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Notes</label>
              <input className={inputCls} value={selNotes} onChange={e => setSelNotes(e.target.value)} placeholder="Notes for client..." />
            </div>
          </div>

          {/* ClickUp Status Filter — dynamic per project */}
          {(selProject || selClient) && availableClickupStatuses.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={labelCls + ' !mb-0'}>Filter by ClickUp Status ({selClickupStatusFilter.length}/{availableClickupStatuses.length})</label>
                <div className="flex gap-2">
                  <button onClick={selectAllStatuses} className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors font-bold">Select all</button>
                  <span className="text-neutral-medium/30">|</span>
                  <button onClick={deselectAllStatuses} className="text-[10px] text-neutral-medium hover:text-white transition-colors font-bold">Clear</button>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {availableClickupStatuses.map((status, idx) => {
                  const isActive = selClickupStatusFilter.includes(status);
                  const colorCls = CLICKUP_STATUS_PALETTE[idx % CLICKUP_STATUS_PALETTE.length];
                  const count = scopedTasks.filter(t => t.clickup_status === status).length;
                  return (
                    <button
                      key={status}
                      onClick={() => toggleStatusFilter(status)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold tracking-wider transition-all border ${
                        isActive
                          ? colorCls
                          : 'text-neutral-medium/50 border-primary/10 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {isActive ? '✓ ' : ''}{status} <span className="opacity-50 ml-1">({count})</span>
                    </button>
                  );
                })}
              </div>
              {selClickupStatusFilter.length === 0 && (
                <p className="text-neutral-medium/40 text-[10px] mt-1.5">💡 No filter applied — showing all {scopedTasks.length} tasks</p>
              )}
            </div>
          )}

          {/* Task Selection — editable client price */}
          {(selProject || selClient) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-widest text-neutral-medium">
                  Select tasks ({selTaskIds.length}/{eligibleTasks.length})
                </p>
                <button onClick={selectAll} className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-bold">
                  {selTaskIds.length === eligibleTasks.length ? 'Deselect all' : 'Select all'}
                </button>
              </div>

              {eligibleTasks.length === 0 ? (
                <p className="text-neutral-medium text-sm py-4 text-center">No tasks match the current filter</p>
              ) : (
                <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
                  {(() => {
                    const createListGroups = new Map<string, WorkforceTask[]>();
                    eligibleTasks.forEach(t => {
                      const ln = t.clickup_list_name || 'Other';
                      if (!createListGroups.has(ln)) createListGroups.set(ln, []);
                      createListGroups.get(ln)!.push(t);
                    });
                    return Array.from(createListGroups.entries()).map(([listName, groupTasks]) => (
                      <div key={listName} className="mb-3">
                        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.03] border border-primary/10 mb-1.5">
                          <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">
                            {listName}
                            <span className="text-neutral-medium/50 font-medium ml-2 normal-case tracking-normal">
                              {groupTasks.length} tasks
                            </span>
                          </span>
                          <span className="text-[10px] text-neutral-medium/50">
                            {groupTasks.filter(t => selTaskIds.includes(t.id!)).length} selected
                          </span>
                        </div>
                        <div className="space-y-1.5 pl-1">
                          {groupTasks.map(t => {
                            const isSelected = selTaskIds.includes(t.id!);
                            const clientPrice = customPrices[t.id!] ?? 0;
                            const clickupStatus = t.clickup_status || t.status || '';
                            const statusStyle = getClickupStatusStyle(clickupStatus);
                            return (
                              <div key={t.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                isSelected ? 'border-blue-500/40 bg-blue-500/5' : 'border-primary/10 hover:border-primary/20'
                              }`}>
                                <input type="checkbox" checked={isSelected} onChange={() => toggleTask(t.id!)}
                                  className="accent-blue-500 w-4 h-4 shrink-0 cursor-pointer" />
                                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleTask(t.id!)}>
                                  <div className="flex items-center gap-2">
                                    <p className="text-white text-sm font-medium truncate">{t.title}</p>
                                    <span className={`shrink-0 text-[10px] font-bold px-2.5 py-0.5 rounded-md capitalize ${statusStyle.className}`}>
                                      {clickupStatus}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[10px] text-neutral-medium/50 mt-0.5">
                                    {t.closed_date && <span>Closed: {t.closed_date}</span>}
                                  </div>
                                </div>
                                <div className="shrink-0 flex items-center gap-2">
                                  <span className="text-neutral-medium/40 text-xs">$</span>
                                  <input type="number" min="0" step="1" value={clientPrice || ''}
                                    onChange={e => setCustomPrice(t.id!, parseFloat(e.target.value) || 0)}
                                    placeholder="0"
                                    className="w-24 bg-transparent border border-primary/10 rounded-lg px-3 py-1.5 text-blue-400 font-bold text-sm text-right focus:outline-none focus:border-blue-500/40 transition-all placeholder-neutral-medium/20"
                                  />
                                  <span className="text-neutral-medium/40 text-[10px]">USD</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}

              {/* Submit */}
              <div className="flex items-center justify-between pt-4 border-t border-primary/10">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-neutral-medium">Total Client Amount</p>
                  <p className="text-2xl font-black text-blue-400">{fmtUSD(selectedTotal)}</p>
                </div>
                <button
                  onClick={handleCreate}
                  disabled={selTaskIds.length === 0 || !selProject}
                  className="py-3 px-8 rounded-xl font-black text-xs uppercase tracking-widest bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ✚ Create Acceptance
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      </>
    );
  }

  // ─── LIST VIEW (default) ───────────
  return (
    <>
    {confirmModal && <ConfirmModal message={confirmModal.message} subMessage={confirmModal.subMessage} onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal(null)} />}
    <div className="animate-fadeInUp space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-blue-400 uppercase tracking-tighter">Project Acceptance</h2>
          <p className="text-neutral-medium text-sm mt-1">Completed task acceptance by project — for clients</p>
        </div>
        <button
          onClick={() => setView('create')}
          className="px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
        >✚ New Acceptance</button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-[20px] border border-blue-500/10 bg-surface">
          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-medium mb-2">Total Acceptances</p>
          <p className="text-3xl font-black text-white">{acceptances.length}</p>
        </div>
        <div className="p-5 rounded-[20px] border border-blue-500/10 bg-surface">
          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-medium mb-2">Accepted</p>
          <p className="text-3xl font-black text-emerald-400">{acceptances.filter(a => a.status === 'accepted').length}</p>
        </div>
        <div className="p-5 rounded-[20px] border border-blue-500/10 bg-surface">
          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-medium mb-2">Accepted Value</p>
          <p className="text-2xl font-black text-blue-400">{fmtUSD(totalAccepted)}</p>
        </div>
        <div className="p-5 rounded-[20px] border border-blue-500/10 bg-surface">
          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-medium mb-2">Pending</p>
          <p className="text-2xl font-black text-amber-400">{fmtUSD(totalPending)}</p>
        </div>
      </div>

      {/* Acceptance List */}
      {acceptances.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-500/10 flex items-center justify-center">
            <svg className="w-10 h-10 text-blue-400/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
          <p className="text-neutral-medium text-sm">No project acceptances yet</p>
          <p className="text-neutral-medium/60 text-xs mt-2">Click "✚ New Acceptance" to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {acceptances.map(a => (
            <div
              key={a.id}
              className="group relative rounded-[20px] border border-blue-500/10 bg-surface overflow-hidden hover:border-blue-500/30 transition-all duration-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.1)] cursor-pointer"
              onClick={() => openDetail(a)}
            >
              <div className={`h-1 w-full bg-gradient-to-r ${STATUS_BAR[a.status]}`} />
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-bold text-base truncate">{a.project_name}</p>
                    <p className="text-neutral-medium text-xs mt-0.5 truncate">🏢 {a.client_name}{a.period ? ` — Period ${a.period}` : ''}</p>
                  </div>
                  <span className={`shrink-0 ml-2 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${STATUS_COLORS[a.status]}`}>
                    {STATUS_LABELS[a.status]}
                  </span>
                </div>
                <p className="text-neutral-medium text-xs">{a.total_tasks} tasks</p>
                <p className="text-blue-400 font-black text-2xl mt-3">{fmtUSD(a.total_amount)}</p>
                {a.notes && <p className="text-neutral-medium/60 text-[11px] mt-2 line-clamp-1 italic">📝 {a.notes}</p>}
                <p className="text-neutral-medium/30 text-[9px] mt-2">🔄 {a.created_at ? new Date(a.created_at).toLocaleString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}</p>
              </div>

              {/* Delete action */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setConfirmModal({
                    message: 'Delete this project acceptance?',
                    onConfirm: () => {
                      onDeleteAcceptance(a.id!);
                      setConfirmModal(null);
                    },
                  });
                }}
                className="absolute bottom-4 right-4 z-20 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400/60 hover:text-red-400 text-[10px] font-bold uppercase tracking-wider transition-all opacity-0 group-hover:opacity-100 flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Delete
              </button>
            </div>
          ))}
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
          >Cancel</button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl bg-red-500 text-white font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-all"
          >Confirm</button>
        </div>
      </div>
    </div>
  </div>
);

export default ProjectAcceptanceManager;
