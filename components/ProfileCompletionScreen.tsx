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
  fullWidth?: boolean;
  options?: { value: string; label: string }[];
}

// All profile fields with required/optional flags
const PROFILE_FIELDS: FieldDef[] = [
  { key: 'full_name', label: 'Họ tên', type: 'text', placeholder: 'Nguyễn Văn A', required: true },
  { key: 'email', label: 'Email cá nhân', type: 'email', placeholder: 'email@gmail.com', required: true },
  { key: 'phone', label: 'Số điện thoại', type: 'text', placeholder: '0912 345 678', required: true },
  { key: 'date_of_birth', label: 'Ngày sinh', type: 'date', placeholder: '', required: true },
  { key: 'gender', label: 'Giới tính', type: 'select', required: true, options: [
    { value: 'male', label: 'Nam' },
    { value: 'female', label: 'Nữ' },
    { value: 'other', label: 'Khác' },
  ]},
  { key: 'address', label: 'Địa chỉ thường trú', type: 'text', placeholder: 'Số nhà, đường, quận, TP...', required: true, fullWidth: true },
  { key: 'temp_address', label: 'Địa chỉ tạm trú', type: 'text', placeholder: 'Nếu giống thường trú, điền lại', required: true, fullWidth: true },
  { key: 'id_number', label: 'Số CMND/CCCD', type: 'text', placeholder: '012345678901', required: true },
  { key: 'id_issue_date', label: 'Ngày cấp CCCD', type: 'date', placeholder: '', required: true },
  { key: 'id_issue_place', label: 'Nơi cấp CCCD', type: 'text', placeholder: 'Cục CS QLHC...', required: true },
  { key: 'bank_name', label: 'Tên ngân hàng', type: 'text', placeholder: 'VCB, ACB, MB...', required: true },
  { key: 'bank_account', label: 'Số tài khoản', type: 'text', placeholder: '1234567890', required: true },
  { key: 'bank_branch', label: 'Tên chủ tài khoản', type: 'text', placeholder: 'NGUYEN VAN A', required: true },
  // Optional
  { key: 'tax_code', label: 'Mã số thuế cá nhân', type: 'text', placeholder: 'Nếu có', required: false },
  { key: 'insurance_number', label: 'Số sổ bảo hiểm', type: 'text', placeholder: 'Nếu có', required: false },
];

const ALL_SAVEABLE_KEYS = [...PROFILE_FIELDS.map(f => f.key), 'avatar_url'];

export const ProfileCompletionScreen: React.FC<Props> = ({ currentUser, onComplete }) => {
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!currentUser.employee_id) {
      onComplete();
      return;
    }
    setIsLoading(true);
    fetchMyProfile(currentUser.employee_id)
      .then(data => {
        setProfile(data);
        setForm({ ...data });
      })
      .catch(() => {
        onComplete();
      })
      .finally(() => setIsLoading(false));
  }, [currentUser.employee_id]);

  const updateField = (key: string, value: any) => {
    setForm(f => ({ ...f, [key]: value }));
  };

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

  // Required fields check (text fields + avatar)
  const requiredFields = PROFILE_FIELDS.filter(f => f.required);
  const missingTextFields = requiredFields.filter(f => {
    const v = form[f.key];
    return !v || (typeof v === 'string' && v.trim().length === 0);
  });
  const missingAvatar = !form.avatar_url;
  const allMissingLabels = [
    ...(missingAvatar ? ['Ảnh đại diện'] : []),
    ...missingTextFields.map(f => f.label),
  ];
  const totalRequired = requiredFields.length + 1; // +1 for avatar
  const filledCount = totalRequired - allMissingLabels.length;
  const completionPct = Math.round((filledCount / totalRequired) * 100);

  const handleSubmit = async () => {
    if (allMissingLabels.length > 0) {
      setError(`Vui lòng điền đầy đủ: ${allMissingLabels.join(', ')}`);
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (currentUser.employee_id) {
        const updates: Record<string, any> = {};
        for (const key of ALL_SAVEABLE_KEYS) {
          if (form[key] !== profile?.[key]) {
            updates[key] = form[key];
          }
        }
        if (Object.keys(updates).length > 0) {
          await updateMyProfile(currentUser.employee_id, updates);
        }
      }
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Lỗi cập nhật hồ sơ');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0F0F0F' }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4" style={{ borderColor: '#06B6D4', borderTopColor: 'transparent' }} />
          <p className="text-xs font-black uppercase tracking-widest" style={{ color: '#9D9C9D' }}>Đang tải hồ sơ...</p>
        </div>
      </div>
    );
  }

  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1.5px solid rgba(6,182,212,0.15)',
    color: '#F2F2F2',
    caretColor: '#06B6D4',
  };

  const focusStyle = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.target.style.borderColor = 'rgba(6,182,212,0.55)';
    e.target.style.boxShadow = '0 0 0 4px rgba(6,182,212,0.07)';
  };
  const blurStyle = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.target.style.borderColor = 'rgba(6,182,212,0.15)';
    e.target.style.boxShadow = 'none';
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ backgroundColor: '#0F0F0F' }}>
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute rounded-full blur-[120px] opacity-20"
          style={{ width: '700px', height: '700px', background: 'radial-gradient(circle, #06B6D4 0%, transparent 70%)', top: '-250px', right: '-200px' }} />
        <div className="absolute rounded-full blur-[100px] opacity-10"
          style={{ width: '500px', height: '500px', background: 'radial-gradient(circle, #8B5CF6 0%, transparent 70%)', bottom: '-150px', left: '-150px' }} />
        <div className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: 'linear-gradient(#06B6D4 1px, transparent 1px), linear-gradient(90deg, #06B6D4 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-2xl mx-4 my-8 max-h-[90vh] overflow-y-auto" style={{ animation: 'fadeInUp 0.5s ease-out' }}>
        <div className="rounded-[28px] border p-8 md:p-10"
          style={{ background: 'rgba(26,26,26,0.85)', backdropFilter: 'blur(32px)', borderColor: 'rgba(6,182,212,0.18)', boxShadow: '0 40px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)' }}>

          {/* Header */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(6,182,212,0.1)', border: '1.5px solid rgba(6,182,212,0.35)', boxShadow: '0 0 40px rgba(6,182,212,0.2)' }}>
              <span style={{ fontSize: '32px' }}>📋</span>
            </div>
            <h1 className="text-2xl font-black uppercase tracking-[0.08em] font-montserrat" style={{ color: '#06B6D4' }}>
              Hoàn Thiện Hồ Sơ
            </h1>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] mt-2 text-center"
              style={{ color: 'rgba(157,156,157,0.7)' }}>
              Bắt buộc điền đầy đủ thông tin để sử dụng hệ thống
            </p>
          </div>

          {/* Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#9D9C9D' }}>Hoàn thiện hồ sơ</span>
              <span className="text-sm font-black" style={{ color: completionPct >= 90 ? '#34C759' : completionPct >= 60 ? '#FF9500' : '#FF3B30' }}>
                {completionPct}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${completionPct}%`,
                  background: completionPct >= 90 ? 'linear-gradient(90deg, #34C759, #059669)'
                    : completionPct >= 60 ? 'linear-gradient(90deg, #FF9500, #F59E0B)'
                    : 'linear-gradient(90deg, #FF3B30, #EF4444)',
                }} />
            </div>
          </div>

          <div className="w-full h-px mb-6" style={{ background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.25), transparent)' }} />

          {/* Avatar (required) */}
          <div className="flex flex-col items-center mb-6">
            <label className="block text-[10px] font-black uppercase tracking-[0.15em] mb-2 font-montserrat" style={{ color: '#9D9C9D' }}>
              Ảnh đại diện {!form.avatar_url && <span style={{ color: '#FF3B30' }}>* bắt buộc</span>}
            </label>
            <input type="file" ref={avatarRef} accept=".jpg,.jpeg,.png,.webp" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); }} />
            <div className="cursor-pointer relative group" onClick={() => avatarRef.current?.click()} style={{ width: '100px', height: '100px' }}>
              {form.avatar_url ? (
                <div className="w-full h-full rounded-full overflow-hidden border-2" style={{ borderColor: 'rgba(52,199,89,0.6)' }}>
                  <img src={toPublicUrl(form.avatar_url)} alt="Avatar" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                    <span className="text-white text-xs font-bold">📷 Đổi</span>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full rounded-full flex flex-col items-center justify-center border-2 border-dashed transition-all group-hover:border-cyan-500/50"
                  style={{ borderColor: missingAvatar ? 'rgba(255,59,48,0.4)' : 'rgba(6,182,212,0.2)', background: 'rgba(6,182,212,0.05)' }}>
                  {uploadingAvatar ? (
                    <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                  ) : (
                    <>
                      <span className="text-2xl">👤</span>
                      <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: '#FF3B30' }}>Upload ảnh</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Required fields section ── */}
          <div className="mb-4">
            <h3 className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: '#06B6D4' }}>
              📝 Thông tin bắt buộc
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {requiredFields.map(field => (
                <div key={field.key} className={field.fullWidth ? 'md:col-span-2' : ''}>
                  <label className="block text-[10px] font-black uppercase tracking-[0.15em] mb-2 font-montserrat" style={{ color: '#9D9C9D' }}>
                    {field.label} {!form[field.key] && <span style={{ color: '#FF3B30' }}>*</span>}
                  </label>
                  {field.type === 'select' ? (
                    <select value={form[field.key] || ''} onChange={e => updateField(field.key, e.target.value)}
                      className="w-full rounded-xl px-4 py-3 text-sm font-medium font-montserrat outline-none transition-all"
                      style={inputStyle} onFocus={focusStyle} onBlur={blurStyle}>
                      <option value="">-- Chọn --</option>
                      {field.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  ) : (
                    <input type={field.type} value={form[field.key] || ''} onChange={e => updateField(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full rounded-xl px-4 py-3 text-sm font-medium font-montserrat outline-none transition-all"
                      style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Optional fields section ── */}
          <div className="mb-6">
            <h3 className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: '#9D9C9D' }}>
              📄 Thông tin không bắt buộc <span className="text-[9px] font-bold opacity-50">(nếu có)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PROFILE_FIELDS.filter(f => !f.required).map(field => (
                <div key={field.key}>
                  <label className="block text-[10px] font-black uppercase tracking-[0.15em] mb-2 font-montserrat" style={{ color: '#9D9C9D' }}>
                    {field.label}
                  </label>
                  <input type={field.type} value={form[field.key] || ''} onChange={e => updateField(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full rounded-xl px-4 py-3 text-sm font-medium font-montserrat outline-none transition-all"
                    style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
                </div>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl px-4 py-3 text-xs font-bold flex items-center gap-2 font-montserrat mb-4"
              style={{ background: 'rgba(244,67,54,0.1)', border: '1px solid rgba(244,67,54,0.3)', color: '#F44336' }}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Submit — NO skip button */}
          <button onClick={handleSubmit} disabled={saving}
            className="w-full rounded-xl py-4 text-sm font-black uppercase tracking-[0.12em] font-montserrat transition-all"
            style={{
              background: saving ? 'rgba(6,182,212,0.5)' : 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
              color: '#0F0F0F',
              boxShadow: saving ? 'none' : '0 8px 24px rgba(6,182,212,0.4)',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}>
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Đang lưu...
              </span>
            ) : (
              '✅ Lưu hồ sơ & Bắt đầu sử dụng'
            )}
          </button>

          <p className="text-center text-[9px] font-bold uppercase tracking-[0.2em] mt-6 font-montserrat"
            style={{ color: 'rgba(157,156,157,0.35)' }}>
            TD Games Employee Portal · 2026
          </p>
        </div>
      </div>
    </div>
  );
};
