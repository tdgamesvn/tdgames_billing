import React, { useState } from 'react';
import { Worker, WorkforceTask } from '@/types';
import { computeSettlementTotals } from '../../services/workforceService';
import { BackButton } from '../shared/BackButton';

const inputCls = "w-full bg-transparent border border-primary/10 rounded-xl px-4 py-3 text-white placeholder-neutral-medium/40 focus:outline-none focus:border-primary/40 transition-all text-sm";
const labelCls = "text-[10px] font-black uppercase tracking-widest text-neutral-medium mb-2 block";

interface SettlementCreateViewProps {
  workers: Worker[];
  tasks: WorkforceTask[];
  vcbSellRate: number;
  onBack: () => void;
  onCreate: (workerId: string, period: string, taskIds: string[], totalAmount: number, currency: string, notes: string, bonusType: 'percent' | 'amount', bonusValue: number, taxRate: number, accountType: 'company' | 'personal') => void;
}

const fmt = (n: number) => n.toLocaleString();

const SettlementCreateView: React.FC<SettlementCreateViewProps> = ({
  workers, tasks, vcbSellRate, onBack, onCreate,
}) => {
  const [selWorkerId, setSelWorkerId] = useState('');
  const [selPeriod, setSelPeriod] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selNotes, setSelNotes] = useState('');
  const [selTaskIds, setSelTaskIds] = useState<string[]>([]);
  const [selBonusType, setSelBonusType] = useState<'percent' | 'amount'>('amount');
  const [selBonusValue, setSelBonusValue] = useState(0);
  const [selTaxRate, setSelTaxRate] = useState(10);

  // Eligible tasks
  const periodEnd = selPeriod ? new Date(selPeriod + '-01') : null;
  if (periodEnd) { periodEnd.setMonth(periodEnd.getMonth() + 1); periodEnd.setDate(0); }
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
  const previewCalc = computeSettlementTotals(selectedTotal, selBonusType, selBonusValue, selTaxRate);

  const toggleTask = (tid: string) => setSelTaskIds(prev => prev.includes(tid) ? prev.filter(i => i !== tid) : [...prev, tid]);
  const selectAll = () => setSelTaskIds(selTaskIds.length === eligibleTasks.length ? [] : eligibleTasks.map(t => t.id!));

  const handleCreate = () => {
    if (!selWorkerId || selTaskIds.length === 0) return;
    const currency = eligibleTasks[0]?.currency || 'VND';
    const accountType = selTaxRate === 0 ? 'personal' : 'company';
    onCreate(selWorkerId, selPeriod, selTaskIds, selectedTotal, currency, selNotes, selBonusType, selBonusValue, selTaxRate, accountType as 'company' | 'personal');
    onBack();
  };

  return (
    <div className="animate-fadeInUp space-y-6">
      <div className="flex items-center gap-4">
        <BackButton onClick={onBack} />
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
                  const liveRate = vcbSellRate > 0 ? vcbSellRate : t.exchange_rate;
                  const vndPreview = t.currency === 'USD' && liveRate > 0 ? t.price * liveRate : null;
                  return (
                    <label key={t.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected ? 'border-primary/40 bg-primary/5' : 'border-primary/10 hover:border-primary/20'
                    }`}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleTask(t.id!)}
                        className="accent-primary w-4 h-4 shrink-0" />
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
                  <label className={labelCls}>Thanh toán qua</label>
                  <div className="flex gap-2">
                    <button type="button"
                      onClick={() => setSelTaxRate(10)}
                      className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                        selTaxRate === 10
                          ? 'border-primary/40 bg-primary/10 text-primary'
                          : 'border-primary/10 text-neutral-medium hover:border-primary/20'
                      }`}>
                      🏢 Công ty
                      <span className="block text-[9px] mt-0.5 opacity-60">Trừ 10% TNCN</span>
                    </button>
                    <button type="button"
                      onClick={() => setSelTaxRate(0)}
                      className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                        selTaxRate === 0
                          ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-400'
                          : 'border-primary/10 text-neutral-medium hover:border-primary/20'
                      }`}>
                      👤 Cá nhân
                      <span className="block text-[9px] mt-0.5 opacity-60">Không trừ thuế</span>
                    </button>
                  </div>
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
                  {selTaxRate > 0 ? (
                    <div className="flex justify-between text-red-400">
                      <span>− Thuế TNCN ({selTaxRate}%)</span>
                      <span className="font-bold">-{fmt(previewCalc.taxAmount)}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-emerald-400/60">
                      <span>👤 TT cá nhân — Miễn thuế TNCN</span>
                      <span className="font-bold">0</span>
                    </div>
                  )}
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
              <button onClick={handleCreate} disabled={selTaskIds.length === 0}
                className="py-3 px-8 rounded-xl font-black text-xs uppercase tracking-widest bg-gradient-primary text-white shadow-btn-glow transition-all hover:shadow-btn-glow-hover hover:scale-[1.02] disabled:opacity-30 disabled:cursor-not-allowed">
                ✚ Tạo nghiệm thu
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettlementCreateView;
