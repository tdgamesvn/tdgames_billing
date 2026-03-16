import React, { useState } from 'react';
import { HrEmployee, AttRecord, AttShift, AttEmployeeShift } from '@/types';

interface Props {
  employees: HrEmployee[];
  todayRecords: AttRecord[];
  shifts: AttShift[];
  employeeShifts: AttEmployeeShift[];
  selectedDate: string;
  setSelectedDate: (d: string) => void;
  checkedInCount: number;
  completedCount: number;
  lateCount: number;
  pendingRequestsCount: number;
  onCheckIn: (employeeId: string, method?: string, shiftId?: string) => void;
  isLoading: boolean;
}

const Dashboard: React.FC<Props> = ({
  employees, todayRecords, shifts, employeeShifts, selectedDate, setSelectedDate,
  checkedInCount, completedCount, lateCount, pendingRequestsCount, onCheckIn, isLoading,
}) => {
  const [quickEmpId, setQuickEmpId] = useState('');

  const absentEmployees = employees.filter(e =>
    e.status === 'active' && !todayRecords.find(r => r.employee_id === e.id)
  );

  const statCards = [
    { label: 'Đã check-in', value: checkedInCount, icon: '✅', color: '#34C759' },
    { label: 'Hoàn thành', value: completedCount, icon: '🏁', color: '#0A84FF' },
    { label: 'Đi muộn', value: lateCount, icon: '⏰', color: '#FF9500' },
    { label: 'Chưa chấm', value: absentEmployees.length, icon: '❌', color: '#FF3B30' },
    { label: 'Đơn chờ duyệt', value: pendingRequestsCount, icon: '📝', color: '#AF52DE' },
  ];

  const cardCls = 'rounded-[20px] border border-white/[0.06] bg-white/[0.03] p-6 backdrop-blur-xl';

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent uppercase tracking-tight">
            📊 Dashboard Chấm công
          </h1>
          <p className="text-neutral-medium text-sm mt-1">Tổng quan chấm công hôm nay</p>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="px-4 py-2 rounded-xl bg-surface border border-primary/10 text-white text-sm"
        />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statCards.map(s => (
          <div key={s.label} className={cardCls + ' text-center'}>
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-3xl font-black" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-neutral-medium mt-1 uppercase tracking-wide font-bold">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Check-in */}
      <div className={cardCls}>
        <h3 className="text-lg font-black text-white uppercase tracking-tight mb-4">⚡ Check-in nhanh</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={quickEmpId}
            onChange={e => setQuickEmpId(e.target.value)}
            className="flex-1 px-4 py-3 rounded-xl bg-black/30 border border-primary/10 text-white text-sm"
          >
            <option value="">-- Chọn nhân viên --</option>
            {employees.filter(e => e.status === 'active').map(e => (
              <option key={e.id} value={e.id}>{e.full_name} ({e.employee_code})</option>
            ))}
          </select>
          <button
            disabled={!quickEmpId}
            onClick={() => { if (quickEmpId) { onCheckIn(quickEmpId); setQuickEmpId(''); } }}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-black uppercase tracking-wide text-sm disabled:opacity-30 transition-all hover:scale-105"
          >
            ✅ Check-in / Check-out
          </button>
        </div>
      </div>

      {/* Today's records */}
      <div className={cardCls}>
        <h3 className="text-lg font-black text-white uppercase tracking-tight mb-4">📋 Chấm công hôm nay ({todayRecords.length})</h3>
        {isLoading ? (
          <div className="text-center py-8 opacity-40">Đang tải...</div>
        ) : todayRecords.length === 0 ? (
          <div className="text-center py-8 opacity-40">Chưa có bản ghi chấm công nào</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-neutral-medium text-xs uppercase tracking-wider">
                  <th className="text-left py-3 px-2">Nhân viên</th>
                  <th className="text-left py-3 px-2">Check-in</th>
                  <th className="text-left py-3 px-2">Check-out</th>
                  <th className="text-left py-3 px-2">Phương thức</th>
                  <th className="text-left py-3 px-2">Trạng thái</th>
                  <th className="text-left py-3 px-2">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {todayRecords.map(r => (
                  <tr key={r.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="py-3 px-2 text-white font-semibold">{r.employee?.full_name || '—'}</td>
                    <td className="py-3 px-2 text-green-400">{r.check_in ? new Date(r.check_in).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    <td className="py-3 px-2 text-blue-400">{r.check_out ? new Date(r.check_out).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    <td className="py-3 px-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-primary/10 text-primary">
                        {r.method}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        r.status === 'present' ? 'bg-green-500/10 text-green-400' :
                        r.status === 'late' ? 'bg-orange-500/10 text-orange-400' :
                        'bg-red-500/10 text-red-400'
                      }`}>
                        {r.status === 'present' ? 'Đúng giờ' : r.status === 'late' ? `Muộn ${r.late_minutes}p` : r.status}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-neutral-medium">{r.note || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Absent employees */}
      {absentEmployees.length > 0 && (
        <div className={cardCls}>
          <h3 className="text-lg font-black text-white uppercase tracking-tight mb-4">❌ Chưa chấm công ({absentEmployees.length})</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {absentEmployees.map(e => (
              <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 text-xs font-black">
                  {e.full_name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{e.full_name}</div>
                  <div className="text-[10px] text-neutral-medium">{e.employee_code}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
