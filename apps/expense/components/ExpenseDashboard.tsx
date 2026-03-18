import React, { useMemo } from 'react';
import { ExpenseRecord, ExpenseCategory } from '@/types';

interface Props {
  expenses: ExpenseRecord[];
  categories: ExpenseCategory[];
  isLoading: boolean;
  onNavigateToList: () => void;
}

// ── Helpers ─────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString('vi-VN');
const fmtUSD = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2 });

function getMonthLabel(y: number, m: number) {
  return `T${String(m + 1).padStart(2, '0')}/${y}`;
}

function getLast6Months(): { year: number; month: number; label: string }[] {
  const now = new Date();
  const months: { year: number; month: number; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth(), label: getMonthLabel(d.getFullYear(), d.getMonth()) });
  }
  return months;
}

// ---- Component ----
const ExpenseDashboard: React.FC<Props> = ({ expenses, categories, isLoading, onNavigateToList }) => {
  const months = useMemo(() => getLast6Months(), []);
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  // ── Stats this month vs last month ──
  const thisMonthExpenses = useMemo(() =>
    expenses.filter(e => {
      const d = new Date(e.expense_date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }), [expenses, currentMonth, currentYear]);

  const prevMonthExpenses = useMemo(() =>
    expenses.filter(e => {
      const d = new Date(e.expense_date);
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
    }), [expenses, prevMonth, prevYear]);

  const thisVND = thisMonthExpenses.filter(e => e.currency === 'VND').reduce((s, e) => s + e.amount, 0);
  const thisUSD = thisMonthExpenses.filter(e => e.currency === 'USD').reduce((s, e) => s + e.amount, 0);
  const prevVND = prevMonthExpenses.filter(e => e.currency === 'VND').reduce((s, e) => s + e.amount, 0);

  const changePercent = prevVND > 0 ? ((thisVND - prevVND) / prevVND * 100) : (thisVND > 0 ? 100 : 0);

  // ── Monthly totals (VND) for bar chart ──
  const monthlyData = useMemo(() => {
    return months.map(m => {
      const total = expenses
        .filter(e => {
          const d = new Date(e.expense_date);
          return d.getMonth() === m.month && d.getFullYear() === m.year && e.currency === 'VND';
        })
        .reduce((s, e) => s + e.amount, 0);
      return { ...m, total };
    });
  }, [expenses, months]);

  const maxMonthly = Math.max(...monthlyData.map(m => m.total), 1);

  // ── Category breakdown ──
  const categoryData = useMemo(() => {
    const map = new Map<string, { name: string; color: string; icon: string; total: number }>();
    let uncategorized = 0;

    expenses.filter(e => e.currency === 'VND').forEach(e => {
      if (e.category_id && e.category) {
        const cur = map.get(e.category_id) || { name: e.category.name, color: e.category.color, icon: e.category.icon, total: 0 };
        cur.total += e.amount;
        map.set(e.category_id, cur);
      } else {
        uncategorized += e.amount;
      }
    });

    const sorted = [...map.values()].sort((a, b) => b.total - a.total);
    if (uncategorized > 0) sorted.push({ name: 'Chưa phân loại', color: '#6B7280', icon: '❓', total: uncategorized });
    return sorted;
  }, [expenses]);

  const totalCategoryVND = categoryData.reduce((s, c) => s + c.total, 0);

  // ── Top 5 expenses ──
  const topExpenses = useMemo(() =>
    [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 5),
    [expenses]);

  // ── Receipt coverage ──
  const withReceipt = expenses.filter(e => e.receipt_url).length;
  const receiptPct = expenses.length > 0 ? Math.round(withReceipt / expenses.length * 100) : 0;

  if (isLoading) {
    return (
      <div className="animate-fadeInUp py-20 text-center flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center mb-6 animate-pulse">
          <svg className="w-10 h-10 text-primary/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
        </div>
        <p className="opacity-50 font-black uppercase tracking-widest text-xs">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="animate-fadeInUp space-y-8">
      {/* Page Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-primary uppercase tracking-tighter">Dashboard</h2>
          <p className="text-neutral-medium text-sm mt-2">Tổng quan chi phí • {months[months.length - 1].label}</p>
        </div>
        <button onClick={onNavigateToList}
          className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border border-primary/20 text-primary hover:bg-primary/5 transition-all">
          📋 Xem danh sách
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* VND this month */}
        <div className="p-5 rounded-[20px] border bg-surface border-primary/10 transition-all hover:border-primary/25 group">
          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-medium mb-2">Chi phí tháng này (VND)</p>
          <p className="text-2xl font-black text-primary tabular-nums">{fmt(thisVND)} ₫</p>
          <div className="flex items-center gap-1 mt-2">
            {changePercent > 0 ? (
              <span className="text-[10px] font-bold text-red-400">▲ +{changePercent.toFixed(1)}%</span>
            ) : changePercent < 0 ? (
              <span className="text-[10px] font-bold text-emerald-400">▼ {changePercent.toFixed(1)}%</span>
            ) : (
              <span className="text-[10px] font-bold text-neutral-medium">— so tháng trước</span>
            )}
          </div>
        </div>

        {/* USD this month */}
        <div className="p-5 rounded-[20px] border bg-surface border-primary/10 transition-all hover:border-primary/25 group">
          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-medium mb-2">Chi phí tháng này (USD)</p>
          <p className="text-2xl font-black text-primary tabular-nums">{fmtUSD(thisUSD)}</p>
        </div>

        {/* Transaction count */}
        <div className="p-5 rounded-[20px] border bg-surface border-primary/10 transition-all hover:border-primary/25 group">
          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-medium mb-2">Giao dịch tháng này</p>
          <p className="text-2xl font-black text-white tabular-nums">{thisMonthExpenses.length}</p>
          <p className="text-[10px] text-neutral-medium mt-2">Tổng: {expenses.length} giao dịch</p>
        </div>

        {/* Receipt coverage */}
        <div className="p-5 rounded-[20px] border bg-surface border-primary/10 transition-all hover:border-primary/25 group">
          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-medium mb-2">Có biên lai</p>
          <p className="text-2xl font-black text-white tabular-nums">{receiptPct}%</p>
          <p className="text-[10px] text-neutral-medium mt-2">{withReceipt}/{expenses.length} giao dịch đính kèm</p>
        </div>
      </div>

      {/* ── Monthly Bar Chart + Category Breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Bar Chart — 3 cols */}
        <div className="lg:col-span-3 rounded-[20px] border bg-surface border-primary/10 p-6">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-medium mb-6">Chi phí 6 tháng gần nhất (VND)</h3>
          {monthlyData.every(m => m.total === 0) ? (
            <div className="py-10 text-center">
              <p className="text-neutral-medium text-sm">Chưa có dữ liệu chi phí</p>
            </div>
          ) : (
            <div className="space-y-3">
              {monthlyData.map((m, i) => {
                const pct = maxMonthly > 0 ? (m.total / maxMonthly * 100) : 0;
                const isCurrentMonth = m.month === currentMonth && m.year === currentYear;
                return (
                  <div key={i} className="flex items-center gap-3 group/bar">
                    <span className={`text-[11px] font-bold tabular-nums w-16 flex-shrink-0 ${isCurrentMonth ? 'text-primary' : 'text-neutral-medium'}`}>
                      {m.label}
                    </span>
                    <div className="flex-1 h-8 bg-white/[0.03] rounded-lg overflow-hidden relative">
                      <div
                        className={`h-full rounded-lg transition-all duration-700 ease-out ${isCurrentMonth ? 'bg-gradient-to-r from-primary/80 to-primary' : 'bg-gradient-to-r from-white/10 to-white/20'}`}
                        style={{
                          width: `${Math.max(pct, 1)}%`,
                          animation: `barGrow 0.8s ease-out ${i * 0.1}s both`,
                        }}
                      />
                      {m.total > 0 && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white/60 tabular-nums opacity-0 group-hover/bar:opacity-100 transition-opacity">
                          {fmt(m.total)} ₫
                        </span>
                      )}
                    </div>
                    <span className={`text-[11px] font-bold tabular-nums w-28 text-right flex-shrink-0 ${isCurrentMonth ? 'text-primary' : 'text-white/60'}`}>
                      {m.total > 0 ? fmt(m.total) + ' ₫' : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Category Breakdown — 2 cols */}
        <div className="lg:col-span-2 rounded-[20px] border bg-surface border-primary/10 p-6">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-medium mb-6">Phân bổ theo danh mục</h3>
          {categoryData.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-neutral-medium text-sm">Chưa có dữ liệu</p>
            </div>
          ) : (
            <>
              {/* Stacked Bar */}
              <div className="h-4 rounded-full overflow-hidden flex mb-6">
                {categoryData.map((c, i) => {
                  const pct = totalCategoryVND > 0 ? (c.total / totalCategoryVND * 100) : 0;
                  return (
                    <div
                      key={i}
                      className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
                      style={{
                        width: `${Math.max(pct, 1)}%`,
                        backgroundColor: c.color,
                        opacity: 0.8,
                        animation: `barGrow 0.6s ease-out ${i * 0.1}s both`,
                      }}
                      title={`${c.icon} ${c.name}: ${fmt(c.total)} ₫ (${pct.toFixed(1)}%)`}
                    />
                  );
                })}
              </div>

              {/* Legend */}
              <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                {categoryData.map((c, i) => {
                  const pct = totalCategoryVND > 0 ? (c.total / totalCategoryVND * 100) : 0;
                  return (
                    <div key={i} className="flex items-center justify-between gap-3 py-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-3 h-3 rounded flex-shrink-0" style={{ backgroundColor: c.color }} />
                        <span className="text-xs font-bold text-white truncate">{c.icon} {c.name}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-[10px] font-bold text-neutral-medium tabular-nums">{pct.toFixed(1)}%</span>
                        <span className="text-xs font-bold text-white/70 tabular-nums">{fmt(c.total)} ₫</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Top 5 Expenses ── */}
      <div className="rounded-[20px] border bg-surface border-primary/10 p-6">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-medium mb-6">Top 5 chi phí lớn nhất</h3>
        {topExpenses.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-neutral-medium text-sm">Chưa có giao dịch nào</p>
          </div>
        ) : (
          <div className="space-y-2">
            {topExpenses.map((exp, i) => (
              <div key={exp.id} className="flex items-center gap-4 py-3 px-4 rounded-xl hover:bg-white/[0.03] transition-colors group">
                <span className="text-lg font-black text-white/20 tabular-nums w-6 text-center">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{exp.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-neutral-medium tabular-nums">{exp.expense_date}</span>
                    {exp.category && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: exp.category.color + '15', color: exp.category.color }}>
                        {exp.category.icon} {exp.category.name}
                      </span>
                    )}
                    {exp.receipt_url && (
                      <a href={exp.receipt_url} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] text-primary/60 hover:text-primary transition-colors">📎 Biên lai</a>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-black text-primary tabular-nums">
                    {exp.currency === 'VND' ? fmt(exp.amount) + ' ₫' : fmtUSD(exp.amount)}
                  </p>
                  <p className="text-[9px] font-bold text-neutral-medium">{exp.vendor || exp.client_name || '—'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CSS animation */}
      <style>{`
        @keyframes barGrow {
          from { width: 0%; opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default ExpenseDashboard;
