import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { HrEmployee, HrDepartment, HrContract, HrEvaluation, HrProjectHistory } from '@/types';
import * as svc from '../services/hrService';
import { uploadFileToR2, toPublicUrl } from '../services/hrService';
import DocumentManager from './DocumentManager';

interface Props {
  employee: HrEmployee;
  departments: HrDepartment[];
  onBack: () => void;
  onEdit: (e: HrEmployee) => void;
}

type DetailTab = 'info' | 'contracts' | 'evaluations' | 'projects' | 'documents';

const EmployeeDetail: React.FC<Props> = ({ employee, departments, onBack, onEdit }) => {
  const [activeTab, setActiveTab] = useState<DetailTab>('info');
  const [contracts, setContracts] = useState<HrContract[]>([]);
  const [evaluations, setEvaluations] = useState<HrEvaluation[]>([]);
  const [projectHistory, setProjectHistory] = useState<HrProjectHistory[]>([]);
  const [loading, setLoading] = useState(false);

  // CCCD upload state
  const [cccdFront, setCccdFront] = useState(employee.id_card_front_url || '');
  const [cccdBack, setCccdBack] = useState(employee.id_card_back_url || '');
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);
  const [cccdPreview, setCccdPreview] = useState<string | null>(null);
  const [cccdPreviewLabel, setCccdPreviewLabel] = useState('');
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState(employee.avatar_url || '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleAvatarUpload = async (file: File) => {
    setUploadingAvatar(true);
    try {
      const result = await uploadFileToR2(file);
      setAvatarUrl(result.url);
      await svc.updateEmployee(employee.id, { avatar_url: result.url });
    } catch (err: any) { alert('Upload thất bại: ' + (err.message || '')); }
    finally { setUploadingAvatar(false); if (avatarRef.current) avatarRef.current.value = ''; }
  };

  const handleCccdUpload = async (side: 'front' | 'back', file: File) => {
    if (side === 'front') setUploadingFront(true); else setUploadingBack(true);
    try {
      const result = await uploadFileToR2(file);
      const url = result.url;
      if (side === 'front') { setCccdFront(url); await svc.updateEmployee(employee.id, { id_card_front_url: url }); }
      else { setCccdBack(url); await svc.updateEmployee(employee.id, { id_card_back_url: url }); }
    } catch (err: any) { alert('Upload thất bại: ' + (err.message || '')); }
    finally {
      if (side === 'front') { setUploadingFront(false); if (frontRef.current) frontRef.current.value = ''; }
      else { setUploadingBack(false); if (backRef.current) backRef.current.value = ''; }
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [c, e, p] = await Promise.all([
          svc.fetchContracts(employee.id),
          svc.fetchEvaluations(employee.id),
          svc.fetchProjectHistory(employee.id),
        ]);
        setContracts(c);
        setEvaluations(e);
        setProjectHistory(p);
      } catch {}
      finally { setLoading(false); }
    };
    load();
  }, [employee.id]);



  const dept = departments.find(d => d.id === employee.department_id);
  const tabCls = (t: DetailTab) => `px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-white/10 text-white' : 'text-neutral-medium hover:text-white hover:bg-white/5'}`;

  const infoPair = (label: string, value: string | number | null | undefined) => {
    if (!value && value !== 0) return null;
    return (
      <div className="flex justify-between items-start py-2 border-b border-white/5">
        <span className="text-neutral-medium text-xs font-bold uppercase tracking-wide">{label}</span>
        <span className="text-white text-sm text-right max-w-[60%]">{typeof value === 'number' ? value.toLocaleString() : value}</span>
      </div>
    );
  };

  return (
    <div className="animate-fadeInUp space-y-8">
      {/* Header Card */}
      <div className="rounded-[24px] border border-primary/10 bg-surface overflow-hidden">
        <div className="h-2 w-full" style={{
          background: employee.type === 'fulltime' ? 'linear-gradient(90deg, #34C759, #30D158)' :
            employee.type === 'freelancer' ? 'linear-gradient(90deg, #0A84FF, #5E5CE6)' :
            'linear-gradient(90deg, #FF9500, #FF6B00)',
        }} />
        <div className="p-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              <input type="file" ref={avatarRef} accept=".jpg,.jpeg,.png,.webp" style={{ display: 'none' }} id="avatar-upload"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); }} />
              <div className="relative group w-20 h-20 rounded-[20px] overflow-hidden cursor-pointer flex-shrink-0"
                onClick={() => avatarRef.current?.click()}>
                {uploadingAvatar ? (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FF375F 0%, #FF6B81 100%)' }}>
                    <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  </div>
                ) : avatarUrl ? (
                  <>
                    <img src={toPublicUrl(avatarUrl)} alt={employee.full_name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                      <span className="text-white text-xs font-bold">📷 Đổi ảnh</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-full h-full flex items-center justify-center text-3xl font-black text-white" style={{ background: 'linear-gradient(135deg, #FF375F 0%, #FF6B81 100%)' }}>
                      {employee.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                      <span className="text-white text-xs font-bold">📷 Thêm ảnh</span>
                    </div>
                  </>
                )}
              </div>
              <div>
                <h2 className="text-3xl font-black text-white">{employee.full_name}</h2>
                <p className="text-neutral-medium/60 text-sm font-mono mt-1">{employee.employee_code}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${employee.type === 'fulltime' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>{employee.type}</span>
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${employee.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{employee.status}</span>
                  {employee.position && <span className="text-[11px] text-neutral-medium">• {employee.position}</span>}
                  {dept && <span className="text-[11px] text-neutral-medium">• {dept.name}</span>}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => onEdit(employee)} className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all hover:opacity-80" style={{ background: 'linear-gradient(135deg, #FF375F 0%, #FF6B81 100%)' }}>✏️ Sửa</button>
              <button onClick={onBack} className="px-4 py-2 rounded-xl border border-primary/10 text-neutral-medium text-xs font-black uppercase tracking-widest hover:text-white hover:border-primary/30 transition-all">← Quay lại</button>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2">
        <button className={tabCls('info')} onClick={() => setActiveTab('info')}>📋 Thông tin</button>
        <button className={tabCls('contracts')} onClick={() => setActiveTab('contracts')}>📄 Hợp đồng ({contracts.length})</button>
        <button className={tabCls('evaluations')} onClick={() => setActiveTab('evaluations')}>⭐ Đánh giá ({evaluations.length})</button>
        <button className={tabCls('projects')} onClick={() => setActiveTab('projects')}>📁 Dự án ({projectHistory.length})</button>
        <button className={tabCls('documents')} onClick={() => setActiveTab('documents')}>🗂️ Hồ sơ</button>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {/* CCCD Preview Modal */}
      {cccdPreview && ReactDOM.createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 99999, background: 'rgba(0,0,0,0.97)', display: 'flex', flexDirection: 'column' }}
          onClick={() => setCccdPreview(null)}>
          <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 20px', background: '#111', borderBottom: '1px solid #333', height: '50px', flexShrink: 0 }}>
            <span style={{ color: '#F5F5F5', fontSize: '14px', fontWeight: 700, flex: 1 }}>{cccdPreviewLabel}</span>
            <a href={cccdPreview} target="_blank" rel="noopener noreferrer" style={{ padding: '6px 14px', borderRadius: '6px', background: '#0A84FF', color: '#fff', fontSize: '12px', fontWeight: 700, textDecoration: 'none', border: 'none' }}>🔗 Mở tab mới</a>
            <button onClick={() => setCccdPreview(null)} style={{ padding: '6px 14px', borderRadius: '6px', background: '#FF453A', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', border: 'none' }}>✕ Đóng</button>
          </div>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', height: 'calc(100vh - 50px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={cccdPreview} alt={cccdPreviewLabel} style={{ maxWidth: '95%', maxHeight: '95%', objectFit: 'contain' }} />
          </div>
        </div>,
        document.body
      )}

      {/* Info Tab */}
      {!loading && activeTab === 'info' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-[20px] border border-primary/10 bg-surface p-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-neutral-medium mb-4">Thông tin cá nhân</h3>
            {infoPair('Email', employee.email)}
            {infoPair('Điện thoại', employee.phone)}
            {infoPair('Ngày sinh', employee.date_of_birth)}
            {infoPair('Giới tính', employee.gender === 'male' ? 'Nam' : employee.gender === 'female' ? 'Nữ' : employee.gender)}
            {infoPair('Quốc tịch', employee.nationality)}
            {infoPair('Địa chỉ', employee.address)}
          </div>
          <div className="rounded-[20px] border border-primary/10 bg-surface p-6">
            {employee.type === 'fulltime' ? (
              <>
                <h3 className="text-xs font-black uppercase tracking-widest text-neutral-medium mb-4">Fulltime</h3>
                {infoPair('CMND/CCCD', employee.id_number)}
                {infoPair('MST cá nhân', employee.tax_code)}
                {infoPair('Số sổ BH', employee.insurance_number)}
                {infoPair('Phòng ban', dept?.name)}
                {infoPair('Chức danh', employee.position)}
                {infoPair('Cấp bậc', employee.level)}
                {infoPair('Lương', `${employee.salary.toLocaleString()} ${employee.salary_currency}`)}
                {infoPair('Ngày bắt đầu', employee.start_date)}
                {infoPair('Hết thử việc', employee.probation_end)}
              </>
            ) : (
              <>
                <h3 className="text-xs font-black uppercase tracking-widest text-neutral-medium mb-4">Freelancer</h3>
                {infoPair('Portfolio', employee.portfolio_url)}
                {infoPair('Chuyên môn', employee.specializations?.join(', '))}
                {infoPair('Múi giờ', employee.timezone)}
                {infoPair('Rate', employee.rate_amount > 0 ? `${employee.rate_amount.toLocaleString()} ${employee.rate_currency}/${employee.rate_type}` : '')}
                {infoPair('Thanh toán', employee.payment_method)}
              </>
            )}
          </div>
          <div className="rounded-[20px] border border-primary/10 bg-surface p-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-neutral-medium mb-4">Ngân hàng</h3>
            {infoPair('Ngân hàng', employee.bank_name)}
            {infoPair('Số TK', employee.bank_account)}
            {infoPair('Tên chủ TK', employee.bank_branch)}
          </div>
          {employee.notes && (
            <div className="rounded-[20px] border border-primary/10 bg-surface p-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-neutral-medium mb-4">Ghi chú</h3>
              <p className="text-neutral-light text-sm whitespace-pre-wrap">{employee.notes}</p>
              {employee.tags && employee.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {employee.tags.map(t => (
                    <span key={t} className="px-3 py-1 rounded-full bg-white/5 text-neutral-medium text-xs">{t}</span>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* CCCD Photos */}
          <div className="rounded-[20px] border border-primary/10 bg-surface p-6 md:col-span-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-neutral-medium mb-4">🪪 CMND / CCCD</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Front */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-medium mb-2">Mặt trước</p>
                <input type="file" ref={frontRef} accept=".jpg,.jpeg,.png,.webp" style={{ display: 'none' }} id="cccd-front"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleCccdUpload('front', f); }} />
                {cccdFront ? (
                  <div className="relative group rounded-xl overflow-hidden border border-primary/10 cursor-pointer" style={{ aspectRatio: '1.6/1' }}
                    onClick={() => { setCccdPreview(toPublicUrl(cccdFront)); setCccdPreviewLabel('CCCD — Mặt trước'); }}>
                    <img src={toPublicUrl(cccdFront)} alt="CCCD Mặt trước" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-all">
                      <button onClick={e => { e.stopPropagation(); setCccdPreview(toPublicUrl(cccdFront)); setCccdPreviewLabel('CCCD — Mặt trước'); }}
                        className="px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-bold">👁️ Xem</button>
                      <label htmlFor="cccd-front" onClick={e => e.stopPropagation()}
                        className="px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-bold cursor-pointer">🔄 Thay</label>
                    </div>
                  </div>
                ) : (
                  <label htmlFor="cccd-front" className={`flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all hover:border-primary/40 ${uploadingFront ? 'border-primary/30 bg-primary/5' : 'border-primary/10 bg-white/[0.02]'}`}
                    style={{ aspectRatio: '1.6/1' }}>
                    {uploadingFront ? (
                      <><div className="w-6 h-6 border-3 border-primary/30 border-t-primary rounded-full animate-spin" /><span className="text-xs font-bold text-primary">Đang upload...</span></>
                    ) : (
                      <><span className="text-2xl">📷</span><span className="text-xs text-neutral-medium">Upload mặt trước</span></>
                    )}
                  </label>
                )}
              </div>
              {/* Back */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-medium mb-2">Mặt sau</p>
                <input type="file" ref={backRef} accept=".jpg,.jpeg,.png,.webp" style={{ display: 'none' }} id="cccd-back"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleCccdUpload('back', f); }} />
                {cccdBack ? (
                  <div className="relative group rounded-xl overflow-hidden border border-primary/10 cursor-pointer" style={{ aspectRatio: '1.6/1' }}
                    onClick={() => { setCccdPreview(toPublicUrl(cccdBack)); setCccdPreviewLabel('CCCD — Mặt sau'); }}>
                    <img src={toPublicUrl(cccdBack)} alt="CCCD Mặt sau" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-all">
                      <button onClick={e => { e.stopPropagation(); setCccdPreview(toPublicUrl(cccdBack)); setCccdPreviewLabel('CCCD — Mặt sau'); }}
                        className="px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-bold">👁️ Xem</button>
                      <label htmlFor="cccd-back" onClick={e => e.stopPropagation()}
                        className="px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-bold cursor-pointer">🔄 Thay</label>
                    </div>
                  </div>
                ) : (
                  <label htmlFor="cccd-back" className={`flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all hover:border-primary/40 ${uploadingBack ? 'border-primary/30 bg-primary/5' : 'border-primary/10 bg-white/[0.02]'}`}
                    style={{ aspectRatio: '1.6/1' }}>
                    {uploadingBack ? (
                      <><div className="w-6 h-6 border-3 border-primary/30 border-t-primary rounded-full animate-spin" /><span className="text-xs font-bold text-primary">Đang upload...</span></>
                    ) : (
                      <><span className="text-2xl">📷</span><span className="text-xs text-neutral-medium">Upload mặt sau</span></>
                    )}
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contracts Tab */}
      {!loading && activeTab === 'contracts' && (
        <div className="space-y-4">
          {contracts.length === 0 ? (
            <p className="text-neutral-medium text-sm text-center py-12">Chưa có hợp đồng</p>
          ) : contracts.map(c => (
            <div key={c.id} className="rounded-[16px] border border-primary/10 bg-surface p-5 flex items-center justify-between">
              <div>
                <p className="text-white font-bold">{c.title}</p>
                <p className="text-neutral-medium text-xs mt-1">{c.contract_type === 'labor' ? 'HĐ Lao động' : c.contract_type === 'service' ? 'HĐ Dịch vụ' : c.contract_type.toUpperCase()}{c.contract_number && ` — ${c.contract_number}`}</p>
                <p className="text-neutral-medium/60 text-[11px] mt-1">{c.start_date} → {c.end_date || '∞'}</p>
              </div>
              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${c.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : c.status === 'expired' ? 'bg-orange-500/20 text-orange-400' : 'bg-red-500/20 text-red-400'}`}>{c.status}</span>
            </div>
          ))}
        </div>
      )}

      {/* Evaluations Tab */}
      {!loading && activeTab === 'evaluations' && (
        <div className="space-y-4">
          {evaluations.length === 0 ? (
            <p className="text-neutral-medium text-sm text-center py-12">Chưa có đánh giá</p>
          ) : evaluations.map(ev => (
            <div key={ev.id} className="rounded-[16px] border border-primary/10 bg-surface p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-white font-bold">{ev.period}</p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <span key={s} className={`text-lg ${s <= ev.score ? 'text-yellow-400' : 'text-neutral-medium/20'}`}>★</span>
                  ))}
                </div>
              </div>
              {ev.evaluator && <p className="text-neutral-medium text-xs">Người đánh giá: {ev.evaluator}</p>}
              {ev.strengths && <p className="text-emerald-400/80 text-xs mt-2">💪 {ev.strengths}</p>}
              {ev.weaknesses && <p className="text-orange-400/80 text-xs mt-1">📌 {ev.weaknesses}</p>}
              {ev.notes && <p className="text-neutral-medium/60 text-xs mt-1">{ev.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Projects Tab */}
      {!loading && activeTab === 'projects' && (
        <div className="space-y-4">
          {projectHistory.length === 0 ? (
            <p className="text-neutral-medium text-sm text-center py-12">Chưa có lịch sử dự án</p>
          ) : projectHistory.map(p => (
            <div key={p.id} className="rounded-[16px] border border-primary/10 bg-surface p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-bold">{p.project_name}</p>
                  {p.role && <p className="text-neutral-medium text-xs mt-1">Vai trò: {p.role}</p>}
                </div>
                <p className="text-neutral-medium/60 text-[11px]">{p.start_date} → {p.end_date || 'Hiện tại'}</p>
              </div>
              {p.performance_note && <p className="text-neutral-medium/60 text-xs mt-2">{p.performance_note}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Documents Tab */}
      {!loading && activeTab === 'documents' && (
        <DocumentManager employee={employee} />
      )}
    </div>
  );
};

export default EmployeeDetail;
