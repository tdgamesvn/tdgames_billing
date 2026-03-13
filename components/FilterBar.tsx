import React from 'react';

const selectStyle = "w-full bg-surface/80 text-neutral-light border border-primary/20 rounded-xl px-4 h-[52px] font-montserrat focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all appearance-none cursor-pointer";
const inputStyle = "w-full bg-surface/80 text-neutral-light border border-primary/20 rounded-xl px-4 h-[52px] font-montserrat focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all";
const labelStyle = "text-neutral-light text-sm font-semibold mb-2 block";
const chevron = (
  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-primary">
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
  </div>
);

export interface FilterBarProps {
  studios: string[];
  clients: string[];
  filterStudio: string; setFilterStudio: (v: string) => void;
  filterClient: string; setFilterClient: (v: string) => void;
  filterDateFrom: string; setFilterDateFrom: (v: string) => void;
  filterDateTo: string; setFilterDateTo: (v: string) => void;
  filteredCount: number;
  totalCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  studios, clients,
  filterStudio, setFilterStudio,
  filterClient, setFilterClient,
  filterDateFrom, setFilterDateFrom,
  filterDateTo, setFilterDateTo,
  filteredCount, totalCount
}) => {
  const hasFilter = filterStudio || filterClient || filterDateFrom || filterDateTo;
  const clearAll = () => { setFilterStudio(''); setFilterClient(''); setFilterDateFrom(''); setFilterDateTo(''); };
  return (
    <div className="p-6 rounded-[24px] border bg-surface border-primary/10">
      <div className="flex flex-wrap gap-5 items-end">
        {/* Studio */}
        <div className="flex flex-col flex-1 min-w-[180px]">
          <label className={labelStyle}>Studio</label>
          <div className="relative">
            <select value={filterStudio} onChange={e => setFilterStudio(e.target.value)} className={selectStyle}>
              <option value="">All Studios</option>
              {studios.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {chevron}
          </div>
        </div>
        {/* Client */}
        <div className="flex flex-col flex-1 min-w-[180px]">
          <label className={labelStyle}>Client</label>
          <div className="relative">
            <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className={selectStyle}>
              <option value="">All Clients</option>
              {clients.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {chevron}
          </div>
        </div>
        {/* From Date */}
        <div className="flex flex-col min-w-[160px]">
          <label className={labelStyle}>From</label>
          <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className={inputStyle} />
        </div>
        {/* To Date */}
        <div className="flex flex-col min-w-[160px]">
          <label className={labelStyle}>To</label>
          <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className={inputStyle} />
        </div>
        {/* Actions */}
        <div className="flex items-center gap-4 self-end mb-[2px]">
          {hasFilter && (
            <button onClick={clearAll}
              className="h-[52px] px-5 rounded-xl text-[11px] font-black uppercase tracking-widest text-status-error border border-status-error/30 hover:bg-status-error/10 transition-all">
              ✕ Clear Filter
            </button>
          )}
          <div className="h-[52px] px-5 rounded-xl border border-primary/10 bg-primary/5 flex flex-col items-center justify-center">
            <span className="text-[18px] font-black text-primary leading-none">{filteredCount}</span>
            <span className="text-[9px] font-black uppercase tracking-widest text-neutral-medium leading-none">/ {totalCount} invoices</span>
          </div>
        </div>
      </div>
    </div>
  );
};
