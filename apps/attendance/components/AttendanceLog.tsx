import React from 'react';
import { AttRecord, HrEmployee } from '@/types';

interface Props {
  records: AttRecord[];
  employees: HrEmployee[];
  selectedDate: string;
  setSelectedDate: (d: string) => void;
  isLoading: boolean;
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  present: { label: 'Đúng giờ', cls: 'bg-green-500/10 text-green-400' },
  late: { label: 'Đi muộn', cls: 'bg-orange-500/10 text-orange-400' },
  early_leave: { label: 'Về sớm', cls: 'bg-yellow-500/10 text-yellow-400' },
  absent: { label: 'Vắng', cls: 'bg-red-500/10 text-red-400' },
  half_day: { label: 'Nửa ngày', cls: 'bg-purple-500/10 text-purple-400' },
};

const AttendanceLog: React.FC<Props> = ({ records, employees, selectedDate, setSelectedDate, isLoading }) => {
  const cardCls = 'rounded-[20px] border border-white/[0.06] bg-white/[0.03] p-6 backdrop-blur-xl';

  const formatTime = (ts: string | null) => {
    if (!ts) return '—';
    return new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const calcDuration = (cin: string | null, cout: string | null) => {
    if (!cin || !cout) return '—';
    const diff = new Date(cout).getTime() - new Date(cin).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.round((diff % 3600000) / 60000);
    return `${h}h${m > 0 ? m + 'p' : ''}`;
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent uppercase tracking-tight">
            ✅ Log chấm công
          </h1>
          <p className="text-neutral-medium text-sm mt-1">{records.length} bản ghi</p>
        </div>
        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
          className="px-4 py-2 rounded-xl bg-surface border border-primary/10 text-white text-sm" />
      </div>

      <div className={cardCls}>
        {isLoading ? (
          <div className="text-center py-12 opacity-40">Đang tải...</div>
        ) : records.length === 0 ? (
          <div className="text-center py-12 opacity-40">
            <div className="text-4xl mb-3">📋</div>
            <div className="font-bold">Không có dữ liệu chấm công</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-neutral-medium text-xs uppercase tracking-wider">
                  <th className="text-left py-3 px-2">Nhân viên</th>
                  <th className="text-left py-3 px-2">Ngày</th>
                  <th className="text-left py-3 px-2">Check-in</th>
                  <th className="text-left py-3 px-2">Check-out</th>
                  <th className="text-left py-3 px-2">Thời gian</th>
                  <th className="text-left py-3 px-2">Phương thức</th>
                  <th className="text-left py-3 px-2">Trạng thái</th>
                  <th className="text-left py-3 px-2">OT</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => {
                  const st = STATUS_MAP[r.status] || STATUS_MAP.present;
                  return (
                    <tr key={r.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="py-3 px-2 text-white font-semibold">{r.employee?.full_name || '—'}</td>
                      <td className="py-3 px-2 text-neutral-medium">{r.date}</td>
                      <td className="py-3 px-2 text-green-400">{formatTime(r.check_in)}</td>
                      <td className="py-3 px-2 text-blue-400">{formatTime(r.check_out)}</td>
                      <td className="py-3 px-2 text-white font-bold">{calcDuration(r.check_in, r.check_out)}</td>
                      <td className="py-3 px-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-primary/10 text-primary">{r.method}</span>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${st.cls}`}>
                          {st.label}{r.late_minutes > 0 ? ` ${r.late_minutes}p` : ''}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-purple-400 font-bold">{r.overtime_minutes > 0 ? `${r.overtime_minutes}p` : ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceLog;
