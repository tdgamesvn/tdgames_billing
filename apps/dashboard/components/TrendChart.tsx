import React from 'react';
import { MonthlyData } from '../services/dashboardService';

interface Props { data: MonthlyData[] }

const fmtM = (n: number) => {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + ' tỷ';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'tr';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'k';
  return n.toString();
};

const TrendChart: React.FC<Props> = ({ data }) => {
  if (!data.length) return null;
  const maxVal = Math.max(...data.map(d => Math.max(d.revenue, d.expense)), 1);
  const W = 600, H = 220, PAD = 50, PADT = 20, PADB = 30;
  const chartW = W - PAD * 2, chartH = H - PADT - PADB;
  const barW = chartW / data.length;

  const scaleY = (v: number) => PADT + chartH - (v / maxVal) * chartH;
  const gridLines = 4;

  // Revenue line points
  const revPoints = data.map((d, i) => `${PAD + i * barW + barW / 2},${scaleY(d.revenue)}`).join(' ');
  const expPoints = data.map((d, i) => `${PAD + i * barW + barW / 2},${scaleY(d.expense)}`).join(' ');

  return (
    <div className="p-5 rounded-2xl bg-card-dark border border-primary/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-white">📈 Doanh thu & Chi phí — 6 tháng</h3>
        <div className="flex gap-4 text-[10px] font-bold">
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-400 inline-block rounded" /> Doanh thu</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-400 inline-block rounded" /> Chi phí</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-500/20 inline-block rounded" /> Lợi nhuận</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 240 }}>
        {/* Grid */}
        {Array.from({ length: gridLines + 1 }).map((_, i) => {
          const y = PADT + (chartH / gridLines) * i;
          const val = maxVal - (maxVal / gridLines) * i;
          return (
            <g key={i}>
              <line x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="rgba(255,255,255,0.05)" />
              <text x={PAD - 6} y={y + 3} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize="9">{fmtM(val)}</text>
            </g>
          );
        })}

        {/* Profit bars */}
        {data.map((d, i) => {
          const x = PAD + i * barW + barW * 0.15;
          const w = barW * 0.7;
          const profit = Math.max(0, d.profit);
          const h = (profit / maxVal) * chartH;
          return (
            <rect key={`bar-${i}`} x={x} y={scaleY(profit)} width={w} height={h}
              rx={4} fill={d.profit >= 0 ? 'rgba(52,199,89,0.15)' : 'rgba(255,59,48,0.15)'} />
          );
        })}

        {/* Revenue line */}
        <polyline points={revPoints} fill="none" stroke="#34C759" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => (
          <circle key={`rv-${i}`} cx={PAD + i * barW + barW / 2} cy={scaleY(d.revenue)} r="4"
            fill="#1a1a2e" stroke="#34C759" strokeWidth="2" />
        ))}

        {/* Expense line */}
        <polyline points={expPoints} fill="none" stroke="#FF3B30" strokeWidth="2" strokeDasharray="6 3" strokeLinecap="round" />
        {data.map((d, i) => (
          <circle key={`ex-${i}`} cx={PAD + i * barW + barW / 2} cy={scaleY(d.expense)} r="3"
            fill="#1a1a2e" stroke="#FF3B30" strokeWidth="2" />
        ))}

        {/* X labels */}
        {data.map((d, i) => (
          <text key={`lb-${i}`} x={PAD + i * barW + barW / 2} y={H - 5}
            textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="11" fontWeight="700">{d.label}</text>
        ))}

        {/* Value labels on revenue points */}
        {data.map((d, i) => (
          <text key={`vl-${i}`} x={PAD + i * barW + barW / 2} y={scaleY(d.revenue) - 10}
            textAnchor="middle" fill="#34C759" fontSize="8" fontWeight="700">{d.revenue > 0 ? fmtM(d.revenue) : ''}</text>
        ))}
      </svg>
    </div>
  );
};

export default TrendChart;
