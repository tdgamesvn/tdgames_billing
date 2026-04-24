import React from 'react';
import { MonthlyData } from '../services/dashboardService';

interface Props { trend: MonthlyData[] }

const fmt = (n: number) => Math.round(n).toLocaleString('vi-VN');
const fmtM = (n: number) => {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + ' tỷ';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'tr';
  return fmt(n);
};

const PlTable: React.FC<Props> = ({ trend }) => {
  if (!trend.length) return null;
  return (
    <div className="p-5 rounded-2xl bg-card-dark border border-primary/10">
      <h3 className="text-xs font-black uppercase tracking-widest text-white mb-4">📊 P&L — 6 tháng</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-2 text-neutral-medium font-bold w-28" />
              {trend.map(t => (
                <th key={`${t.month}-${t.year}`} className="text-right py-2 text-neutral-medium font-bold px-2">
                  {t.label}/{t.year}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Revenue */}
            <tr className="border-b border-white/5">
              <td className="py-2.5 text-emerald-400 font-bold">Doanh thu</td>
              {trend.map(t => (
                <td key={t.month} className="text-right py-2.5 text-white font-bold px-2 tabular-nums">
                  {t.revenue > 0 ? fmtM(t.revenue) : '—'}
                </td>
              ))}
            </tr>
            {/* Expense */}
            <tr className="border-b border-white/5">
              <td className="py-2.5 text-red-400 font-bold">Chi phí</td>
              {trend.map(t => (
                <td key={t.month} className="text-right py-2.5 text-red-400 font-bold px-2 tabular-nums">
                  {t.expense > 0 ? `-${fmtM(t.expense)}` : '—'}
                </td>
              ))}
            </tr>
            {/* Separator */}
            <tr><td colSpan={7} className="border-b-2 border-white/20 py-0" /></tr>
            {/* Profit */}
            <tr>
              <td className="py-3 text-white font-black">Lợi nhuận</td>
              {trend.map(t => (
                <td key={t.month} className={`text-right py-3 font-black px-2 tabular-nums ${t.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {t.profit !== 0 ? `${t.profit >= 0 ? '+' : ''}${fmtM(t.profit)}` : '—'}
                </td>
              ))}
            </tr>
            {/* Margin */}
            <tr>
              <td className="py-2 text-neutral-medium font-medium text-[10px]">Biên LN %</td>
              {trend.map(t => {
                const margin = t.revenue > 0 ? (t.profit / t.revenue * 100) : 0;
                return (
                  <td key={t.month} className={`text-right py-2 font-bold px-2 text-[10px] ${margin >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                    {t.revenue > 0 ? `${margin.toFixed(0)}%` : '—'}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PlTable;
