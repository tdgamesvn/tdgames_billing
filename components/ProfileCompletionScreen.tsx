import React, { useState, useEffect, useRef } from 'react';
import { AccountUser } from '@/types';
import { fetchMyProfile, updateMyProfile } from '@/apps/portal/services/portalService';
import { uploadFileToR2, toPublicUrl } from '@/apps/hr/services/hrService';

interface Props {
  currentUser: AccountUser;
  onComplete: () => void;
}

interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'date' | 'select' | 'email';
  placeholder?: string;
  required: boolean;
  options?: { value: string; label: string }[];
}

const REQUIRED_FIELDS: FieldDef[] = [
  { key: 'full_name', label: 'Họ tên', type: 'text', placeholder: 'Nguyễn Văn A', required: true },
  { key: 'email', label: 'Email cá nhân', type: 'email', placeholder: 'email@gmail.com', required: true },
  { key: 'phone', label: 'Số điện thoại', type: 'text', placeholder: '0912 345 678', required: true },
  { key: 'date_of_birth', label: 'Ngày sinh', type: 'date', placeholder: '', required: true },
  { key: 'gender', label: 'Giới tính', type: 'select', required: true, options: [
    { value: 'male', label: 'Nam' }, { value: 'female', label: 'Nữ' }, { value: 'other', label: 'Khác' },
  ]},
  { key: 'address', label: 'Địa chỉ thường trú', type: 'text', placeholder: 'Số nhà, đường, quận, TP...', required: true },
  { key: 'temp_address', label: 'Địa chỉ tạm trú', type: 'text', placeholder: 'Nếu giống thường trú, điền lại', required: true },
  { key: 'id_number', label: 'Số CMND/CCCD', type: 'text', placeholder: '012345678901', required: true },
  { key: 'id_issue_date', label: 'Ngày cấp CCCD', type: 'date', placeholder: '', required: true },
  { key: 'id_issue_place', label: 'Nơi cấp CCCD', type: 'text', placeholder: 'Cục CS QLHC...', required: true },
  { key: 'bank_name', label: 'Tên ngân hàng', type: 'text', placeholder: 'VCB, ACB, MB...', required: true },
  { key: 'bank_account', label: 'Số tài khoản', type: 'text', placeholder: '1234567890', required: true },
  { key: 'bank_branch', label: 'Tên chủ tài khoản', type: 'text', placeholder: 'NGUYEN VAN A', required: true },
];

const OPTIONAL_FIELDS: FieldDef[] = [
  { key: 'tax_code', label: 'Mã số thuế', type: 'text', placeholder: 'Nếu có', required: false },
  { key: 'insurance_number', label: 'Số sổ bảo hiểm', type: 'text', placeholder: 'Nếu có', required: false },
];

const ALL_KEYS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].map(f => f.key).concat('avatar_url');

export const ProfileCompletionScreen: React.FC<Props> = ({ currentUser, onComplete }) => {
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!currentUser.employee_id) { onComplete(); return; }
    setIsLoading(true);
    fetchMyProfile(currentUser.employee_id)
      .then(data => { setProfile(data); setForm({ ...data }); })
      .catch(() => onComplete())
      .finally(() => setIsLoading(false));
  }, [currentUser.employee_id]);

  const updateField = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }));

  const handleAvatarUpload = async (file: File) => {
    setUploadingAvatar(true);
    try {
      const result = await uploadFileToR2(file);
      updateField('avatar_url', result.url);
    } catch (err: any) {
      setError('Upload ảnh thất bại: ' + (err.message || ''));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const missingRequired = REQUIRED_FIELDS.filter(f => {
    const v = form[f.key]; return !v || (typeof v === 'string' && !v.trim());
  });
  const missingAvatar = !form.avatar_url;
  const allMissing = [...(missingAvatar ? ['Ảnh đại diện'] : []), ...missingRequired.map(f => f.label)];
  const total = REQUIRED_FIELDS.length + 1;
  const pct = Math.round(((total - allMissing.length) / total) * 100);

  const handleSubmit = async () => {
    if (allMissing.length > 0) { setError(`Vui lòng điền đầy đủ: ${allMissing.join(', ')}`); return; }
    setSaving(true); setError('');
    try {
      if (currentUser.employee_id) {
        const updates: Record<string, any> = {};
        for (const key of ALL_KEYS) { if (form[key] !== profile?.[key]) updates[key] = form[key]; }
        if (Object.keys(updates).length > 0) await updateMyProfile(currentUser.employee_id, updates);
      }
      onComplete();
    } catch (err: any) { setError(err.message || 'Lỗi cập nhật'); }
    finally { setSaving(false); }
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0F0F0F' }}>
      <div className="text-center">
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-3" style={{ borderColor: '#06B6D4', borderTopColor: 'transparent' }} />
        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#666' }}>Đang tải hồ sơ...</p>
      </div>
    </div>
  );

  const iS: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(6,182,212,0.12)', color: '#F2F2F2', caretColor: '#06B6D4', fontSize: '14px', padding: '10px 14px', borderRadius: '12px', outline: 'none', width: '100%', transition: 'all 0.2s' };
  const lS: React.CSSProperties = { color: '#888', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '6px', display: 'block' };
  const onF = (e: any) => { e.target.style.borderColor = 'rgba(6,182,212,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(6,182,212,0.06)'; };
  const onB = (e: any) => { e.target.style.borderColor = 'rgba(6,182,212,0.12)'; e.target.style.boxShadow = 'none'; };

  const renderField = (f: FieldDef) => (
    <div key={f.key}>
      <label style={lS}>{f.label} {f.required && !form[f.key] && <span style={{ color: '#FF3B30' }}>*</span>}</label>
      {f.type === 'select' ? (
        <select value={form[f.key] || ''} onChange={e => updateField(f.key, e.target.value)} style={iS} onFocus={onF} onBlur={onB}>
          <option value="">-- Chọn --</option>
          {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input type={f.type} value={form[f.key] || ''} onChange={e => updateField(f.key, e.target.value)} placeholder={f.placeholder} style={iS} onFocus={onF} onBlur={onB} />
      )}
    </div>
  );

  const pctColor = pct >= 90 ? '#34C759' : pct >= 60 ? '#FF9500' : '#FF3B30';

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: '#0F0F0F' }}>
      {/* BG */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute rounded-full blur-[120px] opacity-15" style={{ width: '600px', height: '600px', background: 'radial-gradient(circle, #06B6D4 0%, transparent 70%)', top: '-200px', right: '-150px' }} />
        <div className="absolute rounded-full blur-[100px] opacity-10" style={{ width: '400px', height: '400px', background: 'radial-gradient(circle, #8B5CF6 0%, transparent 70%)', bottom: '-100px', left: '-100px' }} />
      </div>

      {/* Desktop: flex center, no scroll | Mobile: scrollable */}
      <div className="relative z-10 md:h-screen md:flex md:items-center md:justify-center p-4 md:p-8">
        <div className="w-full max-w-[1400px]">
          {/* Card */}
          <div className="rounded-[24px] border p-6 md:p-10" style={{ background: 'rgba(22,22,22,0.9)', backdropFilter: 'blur(24px)', borderColor: 'rgba(6,182,212,0.15)', boxShadow: '0 32px 64px rgba(0,0,0,0.5)' }}>

            {/* ── Top bar: branding + avatar + progress ── */}
            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8 mb-6">
              {/* Branding */}
              <div className="flex items-center gap-3 flex-1">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)' }}>
                  <span style={{ fontSize: '24px' }}>📋</span>
                </div>
                <div>
                  <h1 className="text-xl font-black uppercase tracking-wide" style={{ color: '#06B6D4', lineHeight: 1.1 }}>Hoàn Thiện Hồ Sơ</h1>
                  <p style={{ color: '#555', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Bắt buộc điền đầy đủ</p>
                </div>
              </div>

              {/* Avatar */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <input type="file" ref={avatarRef} accept=".jpg,.jpeg,.png,.webp" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); }} />
                <div className="cursor-pointer relative group" onClick={() => avatarRef.current?.click()} style={{ width: '64px', height: '64px' }}>
                  {form.avatar_url ? (
                    <div className="w-full h-full rounded-full overflow-hidden border-2" style={{ borderColor: '#34C759' }}>
                      <img src={toPublicUrl(form.avatar_url)} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                        <span className="text-white text-[10px] font-bold">📷</span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full rounded-full flex flex-col items-center justify-center border-2 border-dashed transition-all group-hover:border-cyan-500/50"
                      style={{ borderColor: 'rgba(255,59,48,0.4)', background: 'rgba(6,182,212,0.05)' }}>
                      {uploadingAvatar ? <div className="w-5 h-5 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                        : <span className="text-lg">👤</span>}
                    </div>
                  )}
                </div>
                <div>
                  <span style={{ ...lS, marginBottom: 0 }}>Ảnh đại diện</span>
                  {missingAvatar && <span style={{ color: '#FF3B30', fontSize: '9px', fontWeight: 800 }}> * bắt buộc</span>}
                </div>
              </div>

              {/* Progress */}
              <div className="md:w-[220px] flex-shrink-0">
                <div className="flex items-center justify-between mb-1">
                  <span style={{ color: '#666', fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Hoàn thiện</span>
                  <span style={{ color: pctColor, fontSize: '13px', fontWeight: 900 }}>{pct}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${pctColor}, ${pctColor}80)` }} />
                </div>
              </div>
            </div>

            {/* ── Divider ── */}
            <div className="h-px mb-5" style={{ background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.2), transparent)' }} />

            {/* ── Required fields — 3 columns on desktop ── */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <span style={{ color: '#06B6D4', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>📝 Thông tin bắt buộc</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-4">
                {REQUIRED_FIELDS.map(renderField)}
              </div>
            </div>

            {/* ── Optional fields — inline ── */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <span style={{ color: '#666', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>📄 Không bắt buộc</span>
                <span style={{ color: '#444', fontSize: '10px' }}>(nếu có)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-4">
                {OPTIONAL_FIELDS.map(renderField)}
              </div>
            </div>

            {/* ── Error ── */}
            {error && (
              <div className="rounded-xl px-4 py-2.5 text-xs font-bold flex items-center gap-2 mb-3"
                style={{ background: 'rgba(244,67,54,0.1)', border: '1px solid rgba(244,67,54,0.25)', color: '#F44336' }}>
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="truncate">{error}</span>
              </div>
            )}

            {/* ── Submit ── */}
            <button onClick={handleSubmit} disabled={saving}
              className="w-full rounded-xl py-3 text-sm font-black uppercase tracking-widest transition-all"
              style={{
                background: saving ? 'rgba(6,182,212,0.4)' : 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
                color: '#0F0F0F', boxShadow: saving ? 'none' : '0 6px 20px rgba(6,182,212,0.35)', cursor: saving ? 'not-allowed' : 'pointer',
              }}>
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Đang lưu...
                </span>
              ) : '✅ Lưu hồ sơ & Bắt đầu sử dụng'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
