import React, { useState, useEffect } from 'react';
import { MonthlyFinancialSummary, getDashboardData, FulltimeKPI, FreelancerPaymentSummary } from '../services/dashboardService';

export const FinancialDashboard: React.FC = () => {
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [exchangeRate, setExchangeRate] = useState<number>(25000);
  const [data, setData] = useState<MonthlyFinancialSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [month, year, exchangeRate]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getDashboardData(month, year, exchangeRate);
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatUSD = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const renderKPIScore = (score: string) => {
    let color = 'bg-neutral-500/20 text-neutral-400';
    if (score === 'A') color = 'bg-emerald-500/20 text-emerald-400';
    else if (score === 'B') color = 'bg-blue-500/20 text-blue-400';
    else if (score === 'C') color = 'bg-amber-500/20 text-amber-400';
    else if (score === 'D') color = 'bg-orange-500/20 text-orange-400';
    else if (score === 'F') color = 'bg-red-500/20 text-red-400';
    
    return (
      <span className={`px-2 py-1 rounded text-xs font-bold ${color}`}>
        {score}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter" style={{ color: '#E5A023' }}>
            Tổng Quan Tài Chính
          </h2>
          <p className="text-neutral-medium text-sm mt-1">Báo cáo doanh thu, chi phí và hiệu suất nhân sự</p>
        </div>
        <div className="flex items-center gap-3 bg-surface border border-primary/10 rounded-xl p-2">
          <div className="flex items-center bg-white/5 border border-primary/10 rounded-lg px-2 text-xs mr-2">
            <span className="text-neutral-medium mr-1 font-bold">1 USD =</span>
            <input 
              type="number" 
              value={exchangeRate}
              onChange={(e) => setExchangeRate(Number(e.target.value))}
              className="bg-transparent text-white font-bold w-16 py-1 focus:outline-none text-right appearance-none"
              step="100"
            />
            <span className="text-neutral-medium ml-1">VND</span>
          </div>

          <select 
            value={month} 
            onChange={(e) => setMonth(Number(e.target.value))}
            className="bg-transparent text-white font-bold px-2 py-1 focus:outline-none cursor-pointer"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m} className="bg-surface text-white">Tháng {m}</option>
            ))}
          </select>
          <span className="text-neutral-medium">/</span>
          <select 
            value={year} 
            onChange={(e) => setYear(Number(e.target.value))}
            className="bg-transparent text-white font-bold px-2 py-1 focus:outline-none cursor-pointer"
          >
            {[year - 1, year, year + 1].map(y => (
              <option key={y} value={y} className="bg-surface text-white">{y}</option>
            ))}
          </select>
          <button onClick={loadData} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
            <svg className="w-4 h-4 text-neutral-medium hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
          <p className="text-red-400 font-bold mb-2">Đã có lỗi xảy ra</p>
          <p className="text-neutral-medium text-sm">{error}</p>
        </div>
      ) : data ? (
        <div className="animate-fadeInUp space-y-6">
          {/* Main KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border border-primary/10 bg-surface relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <p className="text-xs font-black uppercase tracking-widest text-neutral-medium mb-1">Doanh Thu</p>
              <p className="text-3xl font-black text-emerald-400">{formatUSD(data.totalRevenue)}</p>
              <p className="text-xs text-neutral-medium mt-1">≈ {formatVND(data.revenueVND)}</p>
            </div>
            
            <div className="p-5 rounded-2xl border border-primary/10 bg-surface relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <p className="text-xs font-black uppercase tracking-widest text-neutral-medium mb-1">Chi Phí</p>
              <p className="text-3xl font-black text-red-400">{formatVND(data.totalCost)}</p>
              <p className="text-xs text-neutral-medium mt-1">≈ {formatUSD(data.totalCost / exchangeRate)}</p>
            </div>
            
            <div className="p-5 rounded-2xl border border-primary/10 bg-surface relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <p className="text-xs font-black uppercase tracking-widest text-neutral-medium mb-1">Lợi Nhuận</p>
              <p className={`text-3xl font-black ${data.grossProfit >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                {formatVND(data.grossProfit)}
              </p>
              <p className="text-xs text-neutral-medium mt-1">≈ {formatUSD(data.grossProfit / exchangeRate)}</p>
            </div>
            
            <div className="p-5 rounded-2xl border border-primary/10 bg-surface relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <p className="text-xs font-black uppercase tracking-widest text-neutral-medium mb-1">ROI</p>
              <p className={`text-3xl font-black ${data.profitMargin >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
                {data.profitMargin.toFixed(1)}%
              </p>
              <p className="text-xs text-neutral-medium mt-1">
                {data.profitMargin >= 0 ? 'Profitable' : 'Loss'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cost Breakdown */}
            <div className="lg:col-span-1 space-y-4">
              <div className="p-6 rounded-2xl border border-primary/10 bg-surface">
                <h3 className="text-lg font-black uppercase tracking-wider mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Cơ Cấu Chi Phí
                </h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-end border-b border-white/5 pb-3">
                    <div>
                      <p className="text-sm font-bold text-white">Fulltime Payroll</p>
                      <p className="text-[10px] text-neutral-medium mt-0.5">Lương & bảo hiểm (gross)</p>
                    </div>
                    <p className="text-sm font-mono font-bold">{formatVND(data.fulltimePayroll)}</p>
                  </div>
                  
                  <div className="flex justify-between items-end border-b border-white/5 pb-3">
                    <div>
                      <p className="text-sm font-bold text-white">Freelancer Payments</p>
                      <p className="text-[10px] text-neutral-medium mt-0.5">Thanh toán nghiệm thu</p>
                    </div>
                    <p className="text-sm font-mono font-bold">{formatVND(data.freelancerPayments)}</p>
                  </div>
                  
                  <div className="flex justify-between items-end border-b border-white/5 pb-3">
                    <div>
                      <p className="text-sm font-bold text-white">Operational Expenses</p>
                      <p className="text-[10px] text-neutral-medium mt-0.5">Chi phí vận hành khác</p>
                    </div>
                    <p className="text-sm font-mono font-bold">{formatVND(data.operationalExpenses)}</p>
                  </div>
                  
                  <div className="flex justify-between items-center pt-2">
                    <p className="text-xs font-black uppercase text-neutral-medium">Tổng Chi Phí</p>
                    <p className="text-lg font-black text-red-400">{formatVND(data.totalCost)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Fulltime Performance */}
            <div className="lg:col-span-2">
              <div className="p-6 rounded-2xl border border-primary/10 bg-surface h-full">
                <h3 className="text-lg font-black uppercase tracking-wider mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  Hiệu Suất Nhân Sự Fulltime
                </h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead>
                      <tr className="text-[10px] font-black uppercase tracking-widest text-neutral-medium border-b border-primary/10">
                        <th className="pb-3 font-medium">Nhân sự</th>
                        <th className="pb-3 font-medium text-center">Tasks</th>
                        <th className="pb-3 font-medium text-right">Doanh Thu</th>
                        <th className="pb-3 font-medium text-right">Chi Phí</th>
                        <th className="pb-3 font-medium text-right">Lãi/Lỗ</th>
                        <th className="pb-3 font-medium text-center">KPI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-primary/5 text-neutral-light">
                      {data.fulltimeBreakdown.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-neutral-medium text-xs">
                            Không có dữ liệu nhân sự fulltime trong tháng này
                          </td>
                        </tr>
                      ) : (
                        data.fulltimeBreakdown.map(emp => (
                          <tr key={emp.employeeId} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3 font-bold text-white">{emp.fullName}</td>
                            <td className="py-3 text-center">{emp.totalTaskCount}</td>
                            <td className="py-3 text-right font-mono text-emerald-400">{formatUSD(emp.totalTaskRevenue)}</td>
                            <td className="py-3 text-right font-mono text-red-400">{formatVND(emp.totalCompanyCost)}</td>
                            <td className="py-3 text-right font-mono">
                              <span className={emp.profitLoss >= 0 ? 'text-blue-400' : 'text-orange-400'}>
                                {emp.profitLoss >= 0 ? '+' : ''}{formatVND(emp.profitLoss)}
                              </span>
                            </td>
                            <td className="py-3 text-center">
                              {renderKPIScore(emp.kpiScore)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          
          {/* Freelancer Payments Table */}
          <div className="p-6 rounded-2xl border border-primary/10 bg-surface">
             <h3 className="text-lg font-black uppercase tracking-wider mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                Thanh Toán Freelancer (Nghiệm thu)
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead>
                    <tr className="text-[10px] font-black uppercase tracking-widest text-neutral-medium border-b border-primary/10">
                      <th className="pb-3 font-medium">Freelancer</th>
                      <th className="pb-3 font-medium text-center">Tasks</th>
                      <th className="pb-3 font-medium text-right">Tổng Tiền</th>
                      <th className="pb-3 font-medium text-right">Thuế</th>
                      <th className="pb-3 font-medium text-right">Thực Nhận</th>
                      <th className="pb-3 font-medium text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary/5 text-neutral-light">
                    {data.freelancerBreakdown.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-neutral-medium text-xs">
                          Không có phiếu nghiệm thu freelancer trong tháng này
                        </td>
                      </tr>
                    ) : (
                      data.freelancerBreakdown.map((f, i) => (
                        <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 font-bold text-white">{f.workerName}</td>
                          <td className="py-3 text-center">{f.taskCount}</td>
                          <td className="py-3 text-right font-mono">{f.totalAmount.toLocaleString()} {f.currency}</td>
                          <td className="py-3 text-right font-mono text-orange-400">{f.taxAmount.toLocaleString()} {f.currency}</td>
                          <td className="py-3 text-right font-mono font-bold text-blue-400">{formatVND(f.netAmount)}</td>
                          <td className="py-3 text-center">
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                              f.paymentStatus === 'paid' ? 'bg-emerald-500/20 text-emerald-400' :
                              f.paymentStatus === 'partial' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-neutral-500/20 text-neutral-400'
                            }`}>
                              {f.paymentStatus}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
          </div>
          
        </div>
      ) : null}
    </div>
  );
};
