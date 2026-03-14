import React, { useState } from 'react';
import { ExpenseRecord, ExpenseCategory } from '@/types';
import { Button } from '@/components/Button';

interface Props {
  expenses: ExpenseRecord[];
  categories: ExpenseCategory[];
  isLoading: boolean;
  filterCategory: string; setFilterCategory: (v: string) => void;
  filterDateFrom: string; setFilterDateFrom: (v: string) => void;
  filterDateTo: string; setFilterDateTo: (v: string) => void;
  filterStatus: string; setFilterStatus: (v: string) => void;
  totalVND: number; totalUSD: number;
  onEdit: (exp: ExpenseRecord) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (exp: ExpenseRecord) => void;
  onRefresh: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-400',
  approved: 'bg-blue-500/15 text-blue-400',
  paid: 'bg-emerald-500/15 text-emerald-400',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  paid: 'Đã trả',
};

const ExpenseList: React.FC<Props> = ({
  expenses, categories, isLoading,
  filterCategory, setFilterCategory,
  filterDateFrom, setFilterDateFrom,
  filterDateTo, setFilterDateTo,
  filterStatus, setFilterStatus,
  totalVND, totalUSD,
  onEdit, onDelete, onToggleStatus, onRefresh,
}) => {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const theme = 'dark';

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === 'VND') return amount.toLocaleString('vi-VN') + ' ₫';
    return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2 });
  };

  return (
    <div className="animate-fadeInUp space-y-8">
      {/* Page Header — same pattern as HistoryTab */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-primary uppercase tracking-tighter">Expense History</h2>
          <p className="text-neutral-medium text-sm mt-2">Synced from Supabase</p>
        </div>
        <Button onClick={onRefresh} variant="ghost" size="sm" disabled={isLoading}>
          {isLoading ? '⏳ Loading...' : '🔄 Refresh'}
        </Button>
      </div>

      {/* Summary Cards — 3 columns like Invoice Dashboard stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-[20px] border bg-surface border-primary/10 transition-all hover:border-primary/25">
          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-medium mb-2">Tổng chi (VND)</p>
          <p className="text-2xl font-black text-primary tabular-nums">{totalVND.toLocaleString('vi-VN')} ₫</p>
        </div>
        <div className="p-6 rounded-[20px] border bg-surface border-primary/10 transition-all hover:border-primary/25">
          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-medium mb-2">Tổng chi (USD)</p>
          <p className="text-2xl font-black text-primary tabular-nums">${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="p-6 rounded-[20px] border bg-surface border-primary/10 transition-all hover:border-primary/25">
          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-medium mb-2">Số lượng</p>
          <p className="text-2xl font-black text-white tabular-nums">{expenses.length}</p>
        </div>
      </div>

      {/* Filters — same rounded-xl bg-surface style */}
      <div className="flex flex-wrap gap-3 items-center">
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          className="bg-surface border border-primary/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-primary/30 transition-colors">
          <option value="">Tất cả danh mục</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="bg-surface border border-primary/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-primary/30 transition-colors">
          <option value="">Tất cả trạng thái</option>
          <option value="pending">Chờ duyệt</option>
          <option value="approved">Đã duyệt</option>
          <option value="paid">Đã trả</option>
        </select>
        <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
          className="bg-surface border border-primary/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-primary/30 transition-colors" />
        <span className="text-neutral-medium text-sm">→</span>
        <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
          className="bg-surface border border-primary/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-primary/30 transition-colors" />
        {(filterCategory || filterStatus || filterDateFrom || filterDateTo) && (
          <button onClick={() => { setFilterCategory(''); setFilterStatus(''); setFilterDateFrom(''); setFilterDateTo(''); }}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-amber-400 hover:bg-amber-400/10 transition-colors">
            ✕ Reset
          </button>
        )}
      </div>

      {/* Card Grid — same as Invoice History cards */}
      {isLoading ? (
        <div className="py-20 text-center flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center mb-6 animate-pulse">
            <svg className="w-10 h-10 text-primary/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <p className="opacity-50 font-black uppercase tracking-widest text-xs">Loading expenses...</p>
        </div>
      ) : expenses.length === 0 ? (
        <div className="col-span-full py-20 text-center flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-primary/20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <p className="opacity-50 font-black uppercase tracking-widest text-xs">No expenses found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {expenses.map((exp) => (
            <div key={exp.id} className={`rounded-[20px] border transition-all hover:scale-[1.01] bg-surface border-primary/10 hover:border-primary/25 relative overflow-hidden group`}>
              {/* Status accent bar — same as Invoice history cards */}
              <div className={`h-1 w-full ${exp.status === 'paid' ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : exp.status === 'approved' ? 'bg-gradient-to-r from-blue-500 to-blue-400' : 'bg-gradient-to-r from-amber-500 to-amber-400'}`} />

              <div className="p-5">
                {/* Row 1: Title + Date */}
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-black tracking-tight text-white truncate pr-3">{exp.title}</h3>
                  <span className="text-[10px] font-bold tabular-nums text-neutral-medium whitespace-nowrap">{exp.expense_date}</span>
                </div>

                {/* Row 2: Vendor + Project */}
                <p className="text-sm font-semibold truncate text-white/70">{exp.vendor || 'Không có vendor'}</p>
                {exp.project && <p className="text-[10px] truncate mt-0.5 text-neutral-medium/50">📁 {exp.project}</p>}

                {/* Row 3: Badges */}
                <div className="flex items-center gap-2 mt-3">
                  <button onClick={() => onToggleStatus(exp)}
                    className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-all hover:scale-105 ${STATUS_COLORS[exp.status]}`}>
                    {STATUS_LABELS[exp.status]}
                  </button>
                  {exp.category && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black" style={{ backgroundColor: exp.category.color + '15', color: exp.category.color }}>
                      {exp.category.icon} {exp.category.name}
                    </span>
                  )}
                </div>

                {/* Row 4: Amount */}
                <div className="mt-4 pt-3 border-t border-primary/5">
                  <p className="text-xl font-black text-primary tabular-nums">{formatCurrency(exp.amount, exp.currency)}</p>
                </div>

                {/* Action bar — visible on hover, same as Invoice */}
                <div className="flex items-center justify-end gap-1.5 mt-3 pt-3 border-t border-primary/5 opacity-40 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onEdit(exp)} title="Sửa" className="p-2 rounded-lg transition-colors hover:bg-white/5 hover:text-primary">
                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                  <div className="w-px h-5 mx-0.5 bg-white/10" />
                  {deleteConfirm === exp.id ? (
                    <div className="flex gap-1">
                      <button onClick={() => { onDelete(exp.id!); setDeleteConfirm(null); }} className="px-2.5 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-wider">Xoá</button>
                      <button onClick={() => setDeleteConfirm(null)} className="px-2.5 py-1.5 rounded-lg bg-white/5 text-white/60 text-[10px] font-black uppercase tracking-wider">Huỷ</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirm(exp.id!)} title="Xoá" className="p-2 rounded-lg transition-colors text-red-500/50 hover:text-red-400 hover:bg-red-500/10">
                      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExpenseList;
