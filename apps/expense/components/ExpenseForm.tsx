import React, { useState, useEffect } from 'react';
import { ExpenseRecord, ExpenseCategory } from '@/types';

interface Props {
  categories: ExpenseCategory[];
  editingExpense: ExpenseRecord | null;
  onSave: (data: Omit<ExpenseRecord, 'id' | 'created_at' | 'updated_at' | 'category'>) => void;
  onUpdate: (id: string, data: Partial<ExpenseRecord>) => void;
  onCancel: () => void;
}

const PAYMENT_METHODS = [
  { value: 'CK', label: 'Chuyển khoản' },
  { value: 'TM', label: 'Tiền mặt' },
  { value: 'CARD', label: 'Thẻ tín dụng' },
  { value: 'KHAC', label: 'Khác' },
];

const getToday = () => new Date().toISOString().split('T')[0];

const EMPTY: Omit<ExpenseRecord, 'id' | 'created_at' | 'updated_at' | 'category'> = {
  title: '',
  amount: 0,
  currency: 'VND',
  expense_date: getToday(),
  category_id: null,
  project: '',
  client_name: '',
  vendor: '',
  payment_method: 'CK',
  status: 'pending',
  notes: '',
  receipt_url: '',
  created_by: '',
};

const ExpenseForm: React.FC<Props> = ({ categories, editingExpense, onSave, onUpdate, onCancel }) => {
  const [form, setForm] = useState(EMPTY);
  const isEditing = !!editingExpense;

  useEffect(() => {
    if (editingExpense) {
      const { id, created_at, updated_at, category, ...rest } = editingExpense;
      setForm(rest as any);
    } else {
      setForm({ ...EMPTY, expense_date: getToday() });
    }
  }, [editingExpense]);

  const update = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (isEditing) {
      onUpdate(editingExpense.id!, form);
    } else {
      onSave(form);
    }
  };

  const inputClass = "w-full bg-transparent border border-primary/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all";
  const labelClass = "block text-[10px] font-black uppercase tracking-widest text-neutral-medium mb-2";

  return (
    <div className="animate-fadeInUp space-y-8">
      {/* Page Header — consistent with HistoryTab / ExpenseList */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-primary uppercase tracking-tighter">
            {isEditing ? 'Edit Expense' : 'New Expense'}
          </h2>
          <p className="text-neutral-medium text-sm mt-2">
            {isEditing ? 'Chỉnh sửa chi phí hiện tại' : 'Nhập thông tin chi phí mới'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="rounded-[24px] border border-primary/10 p-8 bg-surface">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Title */}
            <div className="md:col-span-2">
              <label className={labelClass}>Mô tả chi phí *</label>
              <input type="text" value={form.title} onChange={e => update('title', e.target.value)} className={inputClass} placeholder="Ví dụ: Thuê freelancer design..." required />
            </div>

            {/* Amount + Currency */}
            <div>
              <label className={labelClass}>Số tiền *</label>
              <input type="number" value={form.amount || ''} onChange={e => update('amount', Number(e.target.value))} className={inputClass} placeholder="0" min="0" step="0.01" required />
            </div>
            <div>
              <label className={labelClass}>Đơn vị tiền tệ</label>
              <select value={form.currency} onChange={e => update('currency', e.target.value)} className={inputClass}>
                <option value="VND">VND (₫)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>

            {/* Date + Category */}
            <div>
              <label className={labelClass}>Ngày chi</label>
              <input type="date" value={form.expense_date} onChange={e => update('expense_date', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Danh mục</label>
              <select value={form.category_id || ''} onChange={e => update('category_id', e.target.value || null)} className={inputClass}>
                <option value="">-- Chọn danh mục --</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>

            {/* Project + Client */}
            <div>
              <label className={labelClass}>Dự án</label>
              <input type="text" value={form.project} onChange={e => update('project', e.target.value)} className={inputClass} placeholder="Tên dự án..." />
            </div>
            <div>
              <label className={labelClass}>Khách hàng</label>
              <input type="text" value={form.client_name} onChange={e => update('client_name', e.target.value)} className={inputClass} placeholder="Tên khách hàng..." />
            </div>

            {/* Vendor + Payment */}
            <div>
              <label className={labelClass}>Chi cho (Vendor)</label>
              <input type="text" value={form.vendor} onChange={e => update('vendor', e.target.value)} className={inputClass} placeholder="Người / Công ty nhận tiền..." />
            </div>
            <div>
              <label className={labelClass}>Phương thức thanh toán</label>
              <select value={form.payment_method} onChange={e => update('payment_method', e.target.value)} className={inputClass}>
                {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className={labelClass}>Trạng thái</label>
              <select value={form.status} onChange={e => update('status', e.target.value)} className={inputClass}>
                <option value="pending">Chờ duyệt</option>
                <option value="approved">Đã duyệt</option>
                <option value="paid">Đã trả</option>
              </select>
            </div>

            {/* Receipt URL */}
            <div>
              <label className={labelClass}>URL Hoá đơn / Receipt</label>
              <input type="url" value={form.receipt_url} onChange={e => update('receipt_url', e.target.value)} className={inputClass} placeholder="https://..." />
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label className={labelClass}>Ghi chú</label>
              <textarea value={form.notes} onChange={e => update('notes', e.target.value)} className={`${inputClass} resize-none`} rows={3} placeholder="Ghi chú thêm..." />
            </div>
          </div>

          {/* Actions — matching Invoice modal button pattern */}
          <div className="flex gap-3 mt-8">
            <button type="button" onClick={onCancel}
              className="flex-1 py-4 rounded-2xl text-sm font-black uppercase tracking-widest border border-white/10 text-white/60 hover:text-white hover:border-white/30 transition-all hover:scale-[1.01]">
              Huỷ
            </button>
            <button type="submit"
              className="flex-1 py-4 rounded-2xl text-sm font-black uppercase tracking-widest bg-primary text-black transition-all hover:scale-[1.01] shadow-btn-glow">
              {isEditing ? '💾 Cập nhật' : '➕ Thêm chi phí'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ExpenseForm;
