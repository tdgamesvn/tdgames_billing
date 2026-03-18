import React, { useState, useEffect } from 'react';
import AppBackground from '@/components/AppBackground';
import { AccountUser } from '@/types';
import { Navbar } from '@/apps/invoice/components/Navbar';
import { fetchDashboardMetrics, DashboardMetrics } from '../services/dashboardService';

interface Props {
  currentUser: AccountUser;
  onBack: () => void;
  initialTab?: string | null;
}

const fmt = (n: number) => Math.round(n).toLocaleString('vi-VN');
const fmtM = (n: number) => {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + ' tỷ';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + ' tr';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'k';
  return n.toString();
};

const DashboardApp: React.FC<Props> = ({ currentUser, onBack }) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardMetrics()
      .then(setMetrics)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-bg-dark relative overflow-hidden">
      <AppBackground />
      <Navbar
        theme="dark"
        currentUser={currentUser}
        activeTab="history"
        accessibleTabs={['history']}
        onTabChange={() => {}}
        onLogout={onBack}
        onBack={onBack}
        appName="Dashboard"
        tabLabels={{ history: 'Tổng quan' }}
      />

      <main className="max-w-[1400px] mx-auto px-4 py-6 relative z-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">📊 CEO Dashboard</h1>
          <p className="text-neutral-medium text-sm mt-1">
            Xin chào <span className="text-primary font-bold">{currentUser.username}</span> — tổng quan hệ thống TD Games
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : metrics ? (
          <>
            {/* ── Row 1: Big KPI Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <KpiCard
                icon="📄" label="Doanh thu Invoice"
                value={fmtM(metrics.totalRevenue)} suffix="đ"
                sub={`${metrics.invoiceCount} hoá đơn`}
                gradient="linear-gradient(135deg, #FF9500, #FF5E3A)"
              />
              <KpiCard
                icon="💰" label="Tổng chi phí"
                value={fmtM(metrics.totalExpense)} suffix="đ"
                sub={`${metrics.expenseCount} khoản chi`}
                gradient="linear-gradient(135deg, #34C759, #30D158)"
              />
              <KpiCard
                icon="🧑‍💼" label="Nhân sự"
                value={`${metrics.employeeCount}`} suffix="người"
                sub={`${metrics.departmentCount} phòng ban`}
                gradient="linear-gradient(135deg, #FF375F, #FF6B81)"
              />
              <KpiCard
                icon="💵" label="Quỹ lương"
                value={metrics.latestPayroll ? fmtM(metrics.latestPayroll.totalCompanyCost) : '—'} suffix="đ"
                sub={metrics.latestPayroll ? metrics.latestPayroll.title : 'Chưa có bảng lương'}
                gradient="linear-gradient(135deg, #10B981, #059669)"
              />
            </div>

            {/* ── Row 2: Detail Panels ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              {/* Invoice breakdown */}
              <Panel title="Hoá đơn" icon="📄">
                <div className="space-y-3">
                  <ProgressBar
                    label="Đã thanh toán" value={metrics.invoicePaid}
                    total={metrics.invoiceCount} color="#34C759"
                  />
                  <ProgressBar
                    label="Chờ thanh toán" value={metrics.invoicePending}
                    total={metrics.invoiceCount} color="#FF9500"
                  />
                  <div className="pt-2 border-t border-white/5">
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-medium">Tổng doanh thu</span>
                      <span className="text-white font-bold">{fmt(metrics.totalRevenue)} đ</span>
                    </div>
                  </div>
                </div>
              </Panel>

              {/* Workforce */}
              <Panel title="Workforce" icon="👷">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-medium text-xs">Workers</span>
                    <span className="text-white font-bold text-lg">{metrics.workerCount}</span>
                  </div>
                  <ProgressBar
                    label="Tasks hoàn thành" value={metrics.taskCompleted}
                    total={metrics.taskTotal} color="#5856D6"
                  />
                  <ProgressBar
                    label="Tasks đang làm" value={metrics.taskPending}
                    total={metrics.taskTotal} color="#FF9500"
                  />
                  <div className="pt-2 border-t border-white/5">
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-medium">Tổng giá trị task</span>
                      <span className="text-white font-bold">{fmt(metrics.workforcePayable)} đ</span>
                    </div>
                  </div>
                </div>
              </Panel>

              {/* CRM overview */}
              <Panel title="CRM" icon="👥">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-neutral-medium text-[10px] font-bold uppercase tracking-widest">Khách hàng</p>
                      <p className="text-white font-black text-2xl">{metrics.clientCount}</p>
                    </div>
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center text-2xl">
                      👥
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-neutral-medium text-[10px] font-bold uppercase tracking-widest">Dự án</p>
                      <p className="text-white font-black text-2xl">{metrics.projectCount}</p>
                    </div>
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center text-2xl">
                      📁
                    </div>
                  </div>
                </div>
              </Panel>
            </div>

            {/* ── Row 3: HR + Payroll ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* HR departments */}
              <Panel title="Phòng ban & Nhân sự" icon="🧑‍💼">
                <div className="space-y-2">
                  {metrics.departments.length === 0 ? (
                    <p className="text-neutral-medium text-sm text-center py-4">Chưa có dữ liệu</p>
                  ) : (
                    metrics.departments.map(d => (
                      <div key={d.name} className="flex items-center justify-between py-1.5">
                        <span className="text-white text-sm font-medium">{d.name}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${(d.count / metrics.employeeCount) * 100}%`,
                                background: 'linear-gradient(90deg, #FF375F, #FF6B81)',
                              }}
                            />
                          </div>
                          <span className="text-white font-bold text-xs w-6 text-right">{d.count}</span>
                        </div>
                      </div>
                    ))
                  )}
                  <div className="pt-2 border-t border-white/5 flex justify-between text-xs">
                    <span className="text-neutral-medium">Tổng nhân sự</span>
                    <span className="text-white font-bold">{metrics.employeeCount} người</span>
                  </div>
                </div>
              </Panel>

              {/* Payroll summary */}
              <Panel title="Bảng lương gần nhất" icon="💵">
                {metrics.latestPayroll ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-bold text-sm">{metrics.latestPayroll.title}</span>
                      <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${
                        metrics.latestPayroll.status === 'draft' ? 'bg-yellow-500/20 text-yellow-400' :
                        metrics.latestPayroll.status === 'confirmed' ? 'bg-emerald-500/20 text-emerald-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {metrics.latestPayroll.status === 'draft' ? 'Nháp' : metrics.latestPayroll.status === 'confirmed' ? 'Đã xác nhận' : 'Đã trả'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <MiniStat label="Nhân viên" value={`${metrics.latestPayroll.employeeCount}`} />
                      <MiniStat label="Net thực lĩnh" value={fmtM(metrics.latestPayroll.totalNet)} color="#34D399" />
                      <MiniStat label="Chi phí CT" value={fmtM(metrics.latestPayroll.totalCompanyCost)} color="#0A84FF" />
                    </div>
                    <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/10">
                      <div className="flex justify-between items-center">
                        <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Tổng chi phí công ty</span>
                        <span className="text-white font-black text-lg">{fmt(metrics.latestPayroll.totalCompanyCost)} đ</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-neutral-medium text-sm text-center py-8">Chưa có bảng lương nào</p>
                )}
              </Panel>
            </div>
          </>
        ) : (
          <p className="text-red-400 text-center py-16">Không thể tải dữ liệu dashboard</p>
        )}
      </main>
    </div>
  );
};

// ── Sub-components ──

const KpiCard: React.FC<{
  icon: string; label: string; value: string; suffix: string;
  sub: string; gradient: string;
}> = ({ icon, label, value, suffix, sub, gradient }) => (
  <div className="p-5 rounded-2xl bg-card-dark border border-primary/10 relative overflow-hidden group hover:border-primary/20 transition-all">
    <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity"
      style={{ background: gradient }} />
    <div className="flex items-center gap-2 mb-3">
      <span className="text-xl">{icon}</span>
      <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-medium">{label}</span>
    </div>
    <div className="flex items-baseline gap-1.5">
      <span className="text-2xl font-black text-white">{value}</span>
      <span className="text-xs font-bold text-neutral-medium">{suffix}</span>
    </div>
    <p className="text-[11px] text-neutral-medium mt-1">{sub}</p>
  </div>
);

const Panel: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="p-5 rounded-2xl bg-card-dark border border-primary/10">
    <div className="flex items-center gap-2 mb-4">
      <span className="text-lg">{icon}</span>
      <h3 className="text-xs font-black uppercase tracking-widest text-white">{title}</h3>
    </div>
    {children}
  </div>
);

const ProgressBar: React.FC<{ label: string; value: number; total: number; color: string }> = ({ label, value, total, color }) => {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-neutral-medium text-[11px] font-medium">{label}</span>
        <span className="text-white text-[11px] font-bold">{value}/{total}</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
};

const MiniStat: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <div className="text-center p-2 rounded-xl bg-white/[0.02]">
    <p className="text-[9px] font-bold uppercase tracking-wider text-neutral-medium mb-1">{label}</p>
    <p className="text-sm font-black" style={{ color: color || 'white' }}>{value}</p>
  </div>
);

export default DashboardApp;
