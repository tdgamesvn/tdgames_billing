import React, { useState } from 'react';
import { AttRequest, HrEmployee } from '@/types';

interface Props {
  requests: AttRequest[];
  employees: HrEmployee[];
  onSave: (req: Omit<AttRequest, 'id' | 'created_at' | 'approved_at' | 'employee'>) => void;
  onApprove: (id: string, note?: string) => void;
  onReject: (id: string, note?: string) => void;
}

const TYPE_MAP: Record<string, { label: string; icon: string; color: string }> = {
  leave: { label: 'Nghỉ phép', icon: '🏖️', color: 'text-blue-400' },
  late: { label: 'Đi muộn', icon: '⏰', color: 'text-orange-400' },
  early: { label: 'Về sớm', icon: '🏃', color: 'text-yellow-400' },
  forgot: { label: 'Quên chấm', icon: '😅', color: 'text-purple-400' },
  overtime: { label: 'Tăng ca', icon: '💪', color: 'text-green-400' },
};

const STATUS_CLS: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-400',
  approved: 'bg-green-500/10 text-green-400',
  rejected: 'bg-red-500/10 text-red-400',
};

const RequestManager: React.FC<Props> = ({ requests, employees, onSave, onApprove, onReject }) => {
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [form, setForm] = useState({
    employee_id: '', request_type: 'leave', date_from: new Date().toISOString().split('T')[0],
    date_to: new Date().toISOString().split('T')[0], reason: '', status: 'pending' as const,
    approved_by: null as string | null, reviewer_note: '',
  });

  const cardCls = 'rounded-[20px] border border-white/[0.06] bg-white/[0.03] p-6 backdrop-blur-xl';
  const inputCls = 'w-full px-4 py-3 rounded-xl bg-black/30 border border-primary/10 text-white text-sm focus:border-primary/40 outline-none transition-colors';
  const labelCls = 'block text-[10px] font-black uppercase tracking-widest text-neutral-medium mb-1';

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);

  const handleSubmit = () => {
    if (!form.employee_id || !form.request_type) return;
    onSave(form);
    setForm({ employee_id: '', request_type: 'leave', date_from: new Date().toISOString().split('T')[0], date_to: new Date().toISOString().split('T')[0], reason: '', status: 'pending', approved_by: null, reviewer_note: '' });
    setShowForm(false);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent uppercase tracking-tight">
            📝 Đơn từ
          </h1>
          <p className="text-neutral-medium text-sm mt-1">{filtered.length} đơn</p>
        </div>
        <div className="flex gap-3">
          {/* Filter */}
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="px-4 py-2 rounded-xl bg-surface border border-primary/10 text-white text-sm">
            <option value="all">Tất cả</option>
            <option value="pending">Chờ duyệt</option>
            <option value="approved">Đã duyệt</option>
            <option value="rejected">Từ chối</option>
          </select>
          <button onClick={() => setShowForm(!showForm)}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-black text-sm uppercase tracking-wide hover:scale-105 transition-all">
            + Tạo đơn
          </button>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <div className={cardCls}>
          <h3 className="text-lg font-black text-white uppercase mb-4">➕ Tạo đơn mới</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className={labelCls}>Nhân viên *</label>
              <select className={inputCls} value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}>
                <option value="">-- Chọn --</option>
                {employees.filter(e => e.status === 'active').map(e => (
                  <option key={e.id} value={e.id}>{e.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Loại đơn *</label>
              <select className={inputCls} value={form.request_type} onChange={e => setForm(f => ({ ...f, request_type: e.target.value }))}>
                {Object.entries(TYPE_MAP).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Từ ngày *</label>
              <input type="date" className={inputCls} value={form.date_from} onChange={e => setForm(f => ({ ...f, date_from: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Đến ngày *</label>
              <input type="date" className={inputCls} value={form.date_to} onChange={e => setForm(f => ({ ...f, date_to: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Lý do</label>
              <input className={inputCls} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Nhập lý do..." />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSubmit} disabled={!form.employee_id}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-black text-sm disabled:opacity-30">
              📤 Gửi đơn
            </button>
            <button onClick={() => setShowForm(false)} className="px-6 py-3 rounded-xl bg-white/[0.05] text-neutral-medium font-bold text-sm">Hủy</button>
          </div>
        </div>
      )}

      {/* Request list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 opacity-40">
          <div className="text-5xl mb-4">📝</div>
          <div className="text-lg font-bold">Không có đơn nào</div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => {
            const type = TYPE_MAP[r.request_type] || TYPE_MAP.leave;
            return (
              <div key={r.id} className={cardCls + ' flex flex-col md:flex-row md:items-center gap-4'}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{type.icon}</span>
                    <span className={`font-black ${type.color}`}>{type.label}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_CLS[r.status]}`}>
                      {r.status === 'pending' ? 'Chờ duyệt' : r.status === 'approved' ? 'Đã duyệt' : 'Từ chối'}
                    </span>
                  </div>
                  <div className="text-sm text-white font-semibold">{r.employee?.full_name || '—'}</div>
                  <div className="text-xs text-neutral-medium mt-1">
                    📅 {r.date_from} → {r.date_to}
                    {r.reason && <span className="ml-3">💬 {r.reason}</span>}
                  </div>
                  {r.reviewer_note && <div className="text-xs text-blue-400 mt-1">📌 {r.reviewer_note}</div>}
                </div>
                {r.status === 'pending' && (
                  <div className="flex gap-2">
                    <button onClick={() => onApprove(r.id)}
                      className="px-4 py-2 rounded-xl bg-green-500/20 text-green-400 font-bold text-xs hover:bg-green-500/30 transition-all">
                      ✅ Duyệt
                    </button>
                    <button onClick={() => onReject(r.id)}
                      className="px-4 py-2 rounded-xl bg-red-500/20 text-red-400 font-bold text-xs hover:bg-red-500/30 transition-all">
                      ❌ Từ chối
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RequestManager;
