import React, { useState, useEffect } from 'react';
import { HrDepartment, HrSalaryComponent } from '@/types';
import { supabase } from '@/services/supabaseClient';
import * as svc from '../services/hrService';

interface Props {
  departments: HrDepartment[];
  onSave: (emp: any) => Promise<void> | void;
  onCancel: () => void;
}

const inputCls = "w-full bg-transparent border border-primary/10 rounded-xl px-4 py-3 text-white placeholder-neutral-medium/40 focus:outline-none focus:border-primary/40 transition-all text-sm";
const labelCls = "text-[10px] font-black uppercase tracking-widest text-neutral-medium mb-2 block";
const sectionCls = "rounded-[20px] border border-primary/10 bg-surface p-8 space-y-6";

const QuickAddEmployee: React.FC<Props> = ({ departments, onSave, onCancel }) => {
  const [form, setForm] = useState({
    full_name: '',
    work_email: '',
    department_id: null as string | null,
    position: '',
    level: '',
    start_date: null as string | null,
    probation_end: null as string | null,
  });

  const [salaryComponents, setSalaryComponents] = useState<HrSalaryComponent[]>([]);
  const [salaryAmounts, setSalaryAmounts] = useState<Record<string, number>>({});
  const [loadingSalary, setLoadingSalary] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [workEmailError, setWorkEmailError] = useState('');

  // Load salary components
  useEffect(() => {
    const load = async () => {
      setLoadingSalary(true);
      try {
        const comps = await svc.fetchSalaryComponents();
        setSalaryComponents(comps.filter(c => c.is_active));
      } catch {}
      finally { setLoadingSalary(false); }
    };
    load();
  }, []);

  const requiredFields = [
    { key: 'full_name', label: 'Họ tên' },
    { key: 'work_email', label: 'Email công việc' },
    { key: 'department_id', label: 'Phòng ban' },
    { key: 'position', label: 'Chức danh' },
    { key: 'start_date', label: 'Ngày bắt đầu' },
  ];

  const missingRequired = requiredFields.filter(f => {
    const val = (form as any)[f.key];
    return !val || (typeof val === 'string' && !val.trim());
  });

  const isFieldMissing = (key: string) => showValidation && missingRequired.some(f => f.key === key);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setShowValidation(true);
    setWorkEmailError('');
    if (missingRequired.length > 0) return;

    // Check duplicate work_email
    const { data: existing } = await supabase
      .from('hr_employees')
      .select('id, full_name')
      .eq('work_email', form.work_email.trim().toLowerCase())
      .neq('work_email', '')
      .maybeSingle();
    if (existing) {
      setWorkEmailError(`Email "${form.work_email}" đã tồn tại (${existing.full_name}).`);
      return;
    }

    setSaving(true);
    try {
      const totalGross = (Object.values(salaryAmounts) as number[]).reduce((s, v) => s + (v || 0), 0);
      const empData: any = {
        type: 'fulltime',
        status: 'active',
        full_name: form.full_name.trim(),
        work_email: form.work_email.trim().toLowerCase(),
        department_id: form.department_id,
        position: form.position.trim(),
        level: form.level,
        start_date: form.start_date,
        probation_end: form.probation_end,
        salary: totalGross,
        salary_currency: 'VND',
        // Default empty values for required DB fields
        email: '', phone: '', gender: '', nationality: 'Vietnam',
        address: '', temp_address: '',
        id_number: '', id_issue_date: null, id_issue_place: '',
        id_card_front_url: '', id_card_back_url: '',
        tax_code: '', insurance_number: '',
        avatar_url: '',
        portfolio_url: '', specializations: [], timezone: 'UTC+7',
        rate_type: '', rate_amount: 0, rate_currency: 'USD',
        payment_method: '', payment_details: {},
        bank_name: '', bank_account: '', bank_branch: '',
        notes: '', tags: [],
        _salaryAmounts: salaryAmounts,
      };
      await onSave(empData);
    } catch (err: any) {
      // Error is handled by parent (useHrState shows toast)
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fadeInUp space-y-8 relative">
      {/* ── Full-screen saving overlay ── */}
      {saving && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-6">
          <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <div className="text-center">
            <p className="text-white font-black text-lg uppercase tracking-widest">Đang thêm nhân sự...</p>
            <p className="text-neutral-medium text-sm mt-2">Tạo tài khoản & gửi email mời đăng nhập</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-4xl font-black uppercase tracking-tighter" style={{ color: '#FF375F' }}>
          ⚡ Thêm nhanh nhân sự
        </h2>
        <p className="text-neutral-medium text-sm mt-1">
          Nhập thông tin cơ bản — nhân viên sẽ tự điền phần còn lại qua Employee Portal
        </p>
      </div>

      {/* Info Banner */}
      <div className="rounded-[16px] border border-cyan-500/20 bg-cyan-500/[0.05] p-5 flex items-start gap-4">
        <span className="text-2xl">📬</span>
        <div>
          <p className="text-cyan-400 font-bold text-sm">Luồng tự động sau khi thêm</p>
          <ol className="text-neutral-medium text-xs mt-2 space-y-1 list-decimal list-inside">
            <li>Email mời đăng nhập sẽ được gửi tới <strong className="text-white">email công việc</strong></li>
            <li>Nhân viên nhấn link → đặt mật khẩu lần đầu</li>
            <li>Đăng nhập → tự điền thông tin cá nhân còn thiếu (CCCD, ngân hàng, ảnh...)</li>
          </ol>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* ── Basic Info ── */}
        <div className={sectionCls}>
          <h3 className="text-lg font-black text-white uppercase tracking-tight">👤 Thông tin cơ bản</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelCls}>Họ tên *</label>
              <input
                className={inputCls}
                style={isFieldMissing('full_name') ? { borderColor: '#FF453A' } : {}}
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder="Nguyễn Văn A"
              />
            </div>
            <div>
              <label className={labelCls}>Email công việc *</label>
              <input
                className={inputCls}
                style={isFieldMissing('work_email') || workEmailError ? { borderColor: '#FF453A' } : {}}
                value={form.work_email}
                onChange={e => { setForm(f => ({ ...f, work_email: e.target.value })); setWorkEmailError(''); }}
                placeholder="ten@tdgamestudio.com"
              />
              {workEmailError && <p className="text-red-400 text-xs mt-1 font-bold">⚠️ {workEmailError}</p>}
            </div>
          </div>
        </div>

        {/* ── Position & Department ── */}
        <div className={sectionCls}>
          <h3 className="text-lg font-black text-white uppercase tracking-tight">🏢 Vị trí công việc</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className={labelCls}>Phòng ban *</label>
              <select
                className={inputCls}
                style={isFieldMissing('department_id') ? { borderColor: '#FF453A' } : {}}
                value={form.department_id || ''}
                onChange={e => setForm(f => ({ ...f, department_id: e.target.value || null }))}
              >
                <option value="">-- Chọn --</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Chức danh *</label>
              <input
                className={inputCls}
                style={isFieldMissing('position') ? { borderColor: '#FF453A' } : {}}
                value={form.position}
                onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
                placeholder="Senior Artist"
              />
            </div>
            <div>
              <label className={labelCls}>Cấp bậc</label>
              <select
                className={inputCls}
                value={form.level}
                onChange={e => setForm(f => ({ ...f, level: e.target.value }))}
              >
                <option value="">-- Chọn --</option>
                <option value="Intern">Intern</option>
                <option value="Junior">Junior</option>
                <option value="Mid">Mid</option>
                <option value="Senior">Senior</option>
                <option value="Lead">Lead</option>
                <option value="Manager">Manager</option>
                <option value="Director">Director</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Dates ── */}
        <div className={sectionCls}>
          <h3 className="text-lg font-black text-white uppercase tracking-tight">📅 Ngày làm việc</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelCls}>Ngày bắt đầu *</label>
              <input
                type="date"
                className={inputCls}
                style={isFieldMissing('start_date') ? { borderColor: '#FF453A' } : {}}
                value={form.start_date || ''}
                onChange={e => {
                  const val = e.target.value || null;
                  setForm(f => {
                    const updated = { ...f, start_date: val };
                    if (val) {
                      const d = new Date(val);
                      d.setMonth(d.getMonth() + 2);
                      updated.probation_end = d.toISOString().split('T')[0];
                    }
                    return updated;
                  });
                }}
              />
            </div>
            <div>
              <label className={labelCls}>Ngày hết thử việc</label>
              <input
                type="date"
                className={inputCls}
                value={form.probation_end || ''}
                onChange={e => setForm(f => ({ ...f, probation_end: e.target.value || null }))}
              />
              <p className="text-neutral-medium/50 text-[10px] mt-1">Tự động = ngày bắt đầu + 2 tháng</p>
            </div>
          </div>
        </div>

        {/* ── Salary Structure ── */}
        <div className={sectionCls}>
          <h3 className="text-lg font-black text-white uppercase tracking-tight">💰 Cấu trúc lương</h3>
          {loadingSalary ? (
            <div className="flex justify-center py-6"><div className="w-6 h-6 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>
          ) : (
            <>
              <div className="space-y-3">
                {salaryComponents.map(comp => (
                  <div key={comp.id} className="flex items-center gap-4 p-3 rounded-xl bg-black/20 border border-white/[0.04]">
                    <span className="flex-1 text-white font-bold text-sm">{comp.name}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        className="w-40 px-3 py-2 rounded-lg bg-black/30 border border-primary/10 text-white text-sm text-right outline-none focus:border-emerald-500/40 transition-colors"
                        value={salaryAmounts[comp.id] || ''}
                        onChange={e => setSalaryAmounts(prev => ({ ...prev, [comp.id]: +e.target.value }))}
                        placeholder="0"
                      />
                      <span className="text-neutral-medium text-xs w-8">VNĐ</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t-2 border-emerald-500/20">
                <span className="text-xs font-black uppercase tracking-widest text-emerald-400">Tổng Gross</span>
                <div>
                  <span className="text-white font-black text-xl">{(Object.values(salaryAmounts) as number[]).reduce((s, v) => s + (v || 0), 0).toLocaleString()}</span>
                  <span className="text-neutral-medium text-xs ml-1">VNĐ</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Validation Errors ── */}
        {showValidation && missingRequired.length > 0 && (
          <div className="rounded-[16px] border border-red-500/20 bg-red-500/[0.05] p-5">
            <p className="text-red-400 font-bold text-sm mb-2">⚠️ Vui lòng điền đầy đủ các trường bắt buộc:</p>
            <ul className="text-red-300 text-xs space-y-1 list-disc list-inside">
              {missingRequired.map(f => <li key={f.key}>{f.label}</li>)}
            </ul>
          </div>
        )}

        {/* ── Actions ── */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-8 py-4 rounded-2xl text-white font-black text-sm uppercase tracking-widest hover:opacity-90 transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            style={{ background: 'linear-gradient(135deg, #34C759 0%, #059669 100%)', boxShadow: '0 8px 24px rgba(52,199,89,0.3)' }}
          >
            {saving ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Đang xử lý...</>
            ) : (
              <>✅ Thêm & Gửi email mời</>
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-4 rounded-2xl border border-primary/10 text-neutral-medium font-black text-sm uppercase tracking-widest hover:text-white hover:border-primary/30 transition-all"
          >
            Hủy
          </button>
        </div>
      </form>
    </div>
  );
};

export default QuickAddEmployee;
