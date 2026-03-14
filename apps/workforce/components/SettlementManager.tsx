import React, { useState } from 'react';
import { Worker, WorkforceTask, Settlement } from '@/types';

interface SettlementManagerProps {
  settlements: Settlement[];
  workers: Worker[];
  tasks: WorkforceTask[];
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
  draft: 'bg-neutral-dark/30 text-neutral-medium',
  sent: 'bg-blue-500/20 text-blue-400',
  accepted: 'bg-yellow-500/20 text-yellow-400',
  paid: 'bg-emerald-500/20 text-emerald-400',
};

const inputCls = "w-full bg-transparent border border-primary/10 rounded-xl px-4 py-3 text-white placeholder-neutral-medium/40 focus:outline-none focus:border-primary/40 transition-all text-sm";
const labelCls = "text-[10px] font-black uppercase tracking-widest text-neutral-medium mb-2 block";

const SettlementManager: React.FC<SettlementManagerProps> = ({
  settlements, workers, tasks,
  onCreateSettlement, onUpdateSettlement, onDeleteSettlement,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [selWorkerId, setSelWorkerId] = useState('');
  const [selPeriod, setSelPeriod] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selNotes, setSelNotes] = useState('');
  const [selTaskIds, setSelTaskIds] = useState<string[]>([]);

  // Eligible tasks: completed status, belong to selected worker
  const eligibleTasks = tasks.filter(t =>
    t.worker_id === selWorkerId &&
    (t.status === 'completed' || t.status === 'in_progress')
  );

  const selectedTotal = eligibleTasks
    .filter(t => selTaskIds.includes(t.id!))
    .reduce((s, t) => s + (t.price || 0), 0);

  const handleCreate = () => {
    if (!selWorkerId || selTaskIds.length === 0) return;
    const currency = eligibleTasks[0]?.currency || 'VND';
    onCreateSettlement(selWorkerId, selPeriod, selTaskIds, selectedTotal, currency, selNotes);
    setShowForm(false);
    setSelWorkerId('');
    setSelTaskIds([]);
    setSelNotes('');
  };

  const toggleTask = (tid: string) => {
    setSelTaskIds(prev => prev.includes(tid) ? prev.filter(i => i !== tid) : [...prev, tid]);
  };

  const selectAll = () => {
    if (selTaskIds.length === eligibleTasks.length) {
      setSelTaskIds([]);
    } else {
      setSelTaskIds(eligibleTasks.map(t => t.id!));
    }
  };

  const totalPaid = settlements.filter(s => s.status === 'paid').reduce((s, st) => s + st.total_amount, 0);

  return (
    <div className="animate-fadeInUp space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-primary uppercase tracking-tighter">Nghiệm Thu</h2>
          <p className="text-neutral-medium text-sm mt-1">Tổng hợp & thanh toán theo tháng</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest bg-gradient-primary text-white shadow-btn-glow hover:shadow-btn-glow-hover transition-all hover:scale-[1.02]"
        >
          {showForm ? '✕ Đóng' : '✚ Tạo nghiệm thu'}
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-5 rounded-[20px] border border-primary/10 bg-surface">
          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-medium mb-2">Tổng nghiệm thu</p>
          <p className="text-3xl font-black text-white">{settlements.length}</p>
        </div>
        <div className="p-5 rounded-[20px] border border-primary/10 bg-surface">
          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-medium mb-2">Đã thanh toán</p>
          <p className="text-3xl font-black text-emerald-400">{settlements.filter(s => s.status === 'paid').length}</p>
        </div>
        <div className="p-5 rounded-[20px] border border-primary/10 bg-surface">
          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-medium mb-2">Tổng đã chi</p>
          <p className="text-2xl font-black text-primary">{totalPaid.toLocaleString()}</p>
        </div>
      </div>

      {/* Create Settlement Form */}
      {showForm && (
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
                <p className="text-neutral-medium text-sm py-4 text-center">Không có task khả dụng cho nhân sự này</p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {eligibleTasks.map(t => (
                    <label key={t.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      selTaskIds.includes(t.id!) ? 'border-primary/40 bg-primary/5' : 'border-primary/10 hover:border-primary/20'
                    }`}>
                      <input
                        type="checkbox"
                        checked={selTaskIds.includes(t.id!)}
                        onChange={() => toggleTask(t.id!)}
                        className="accent-primary w-4 h-4"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{t.title}</p>
                        <p className="text-neutral-medium text-[11px]">{t.project} {t.client_name ? `• ${t.client_name}` : ''}</p>
                      </div>
                      <span className="text-primary font-bold text-sm shrink-0">{t.price.toLocaleString()} {t.currency}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Total + Submit */}
              <div className="flex items-center justify-between pt-3 border-t border-primary/10">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-neutral-medium">Tổng nghiệm thu</p>
                  <p className="text-2xl font-black text-primary">{selectedTotal.toLocaleString()} VND</p>
                </div>
                <button
                  onClick={handleCreate}
                  disabled={selTaskIds.length === 0}
                  className="py-3 px-8 rounded-xl font-black text-xs uppercase tracking-widest bg-gradient-primary text-white shadow-btn-glow transition-all hover:shadow-btn-glow-hover disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ✚ Tạo nghiệm thu
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Settlement List */}
      {settlements.length === 0 && !showForm && (
        <div className="text-center py-20">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="w-10 h-10 text-primary/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
          <p className="text-neutral-medium text-sm">Chưa có nghiệm thu nào</p>
        </div>
      )}

      {settlements.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {settlements.map(s => {
            const workerName = s.worker?.full_name || workers.find(w => w.id === s.worker_id)?.full_name || '???';
            return (
              <div key={s.id} className="group relative rounded-[20px] border border-primary/10 bg-surface overflow-hidden hover:border-primary/30 transition-all duration-300 hover:shadow-card-glow">
                <div className={`h-1 w-full bg-gradient-to-r ${
                  s.status === 'paid' ? 'from-emerald-500 to-emerald-600' :
                  s.status === 'accepted' ? 'from-yellow-500 to-yellow-600' :
                  s.status === 'sent' ? 'from-blue-500 to-blue-600' :
                  'from-neutral-dark to-neutral-dark'
                }`} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-white font-bold text-base">{workerName}</p>
                      <p className="text-neutral-medium text-xs mt-0.5">Kỳ: {s.period}</p>
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${STATUS_COLORS[s.status]}`}>
                      {STATUS_LABELS[s.status]}
                    </span>
                  </div>
                  <p className="text-neutral-medium text-xs">{s.total_tasks} tasks</p>
                  <p className="text-primary font-black text-2xl mt-3">{s.total_amount.toLocaleString()} <span className="text-xs text-neutral-medium">{s.currency}</span></p>
                  {s.notes && <p className="text-neutral-medium/60 text-[11px] mt-2 line-clamp-1">{s.notes}</p>}
                </div>

                {/* Actions */}
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {s.status === 'draft' && (
                    <button onClick={() => onUpdateSettlement(s.id!, { status: 'sent' })}
                      className="p-1.5 rounded-lg hover:bg-white/5 text-neutral-medium hover:text-blue-400 transition-all" title="Gửi">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    </button>
                  )}
                  {(s.status === 'sent' || s.status === 'accepted') && (
                    <button onClick={() => onUpdateSettlement(s.id!, { status: s.status === 'sent' ? 'accepted' : 'paid' })}
                      className="p-1.5 rounded-lg hover:bg-white/5 text-neutral-medium hover:text-emerald-400 transition-all" title={s.status === 'sent' ? 'Chấp nhận' : 'Thanh toán'}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                    </button>
                  )}
                  {s.status === 'draft' && (
                    <button onClick={() => { if (confirm('Xóa nghiệm thu?')) onDeleteSettlement(s.id!); }}
                      className="p-1.5 rounded-lg hover:bg-white/5 text-neutral-medium hover:text-red-400 transition-all" title="Xóa">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SettlementManager;
