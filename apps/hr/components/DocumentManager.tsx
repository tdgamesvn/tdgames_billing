import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { HrDocument, HrEmployee } from '@/types';
import * as svc from '../services/hrService';

const ACCEPTED_TYPES = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.zip';

const DOC_CATEGORIES: Record<string, { label: string; icon: string; color: string }> = {
  contract: { label: 'Hợp đồng', icon: '📋', color: '#34C759' },
  id_card: { label: 'CMND/CCCD', icon: '🪪', color: '#0A84FF' },
  certificate: { label: 'Bằng cấp', icon: '🎓', color: '#AF52DE' },
  insurance: { label: 'Bảo hiểm', icon: '🏥', color: '#FF9500' },
  tax: { label: 'Thuế', icon: '🧾', color: '#FFD60A' },
  portfolio: { label: 'Portfolio', icon: '🎨', color: '#FF375F' },
  other: { label: 'Khác', icon: '📎', color: '#888' },
};

const isPreviewable = (url: string) => /\.(jpg|jpeg|png|webp|gif|pdf|svg)/i.test(url);
const isImageUrl = (url: string) => /\.(jpg|jpeg|png|webp|gif|svg)/i.test(url);
const formatSize = (b: number) => {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
};

interface Props {
  employee: HrEmployee;
}

const DocumentManager: React.FC<Props> = ({ employee }) => {
  const [docs, setDocs] = useState<HrDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const emptyForm = { doc_type: 'contract', title: '', file_url: '', file_name: '', file_size: 0, notes: '' };
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    try { setDocs(await svc.fetchDocuments(employee.id)); } catch {}
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [employee.id]);

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const result = await svc.uploadFileToR2(file);
      setForm(f => ({
        ...f,
        file_url: result.url,
        file_name: result.fileName,
        file_size: result.fileSize,
        title: f.title || file.name.replace(/\.[^.]+$/, ''),
      }));
    } catch (err: any) {
      alert('Upload thất bại: ' + (err.message || 'Unknown'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const uploadRef2 = useRef(uploadFile);
  uploadRef2.current = uploadFile;

  const handleSave = async () => {
    if (!form.title.trim()) return;
    try {
      await svc.saveDocument({
        employee_id: employee.id,
        doc_type: form.doc_type,
        title: form.title,
        file_url: form.file_url,
        file_name: form.file_name,
        file_size: form.file_size,
        notes: form.notes,
      });
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err: any) {
      alert('Lưu thất bại: ' + (err.message || 'Unknown'));
    }
  };

  const handleDelete = async (id: string) => {
    try { await svc.deleteDocument(id); setDeleteId(null); load(); }
    catch (err: any) { alert('Xoá thất bại: ' + (err.message || '')); }
  };

  const inputCls = "w-full bg-transparent border border-primary/10 rounded-xl px-4 py-3 text-white placeholder-neutral-medium/40 focus:outline-none focus:border-primary/40 transition-all text-sm";
  const labelCls = "text-[10px] font-black uppercase tracking-widest text-neutral-medium mb-2 block";

  return (
    <div className="space-y-6">
      {/* Preview Modal */}
      {previewUrl && ReactDOM.createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 99999, background: 'rgba(0,0,0,0.97)', display: 'flex', flexDirection: 'column' }}
          onClick={() => setPreviewUrl(null)}>
          <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 20px', background: '#111', borderBottom: '1px solid #333', height: '50px', flexShrink: 0 }}>
            <span style={{ color: '#F5F5F5', fontSize: '14px', fontWeight: 700, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{previewTitle}</span>
            <a href={previewUrl} target="_blank" rel="noopener noreferrer" style={{ padding: '6px 14px', border: 'none', borderRadius: '6px', background: '#0A84FF', color: '#fff', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}>🔗 Mở tab mới</a>
            <button onClick={() => setPreviewUrl(null)} style={{ padding: '6px 14px', border: 'none', borderRadius: '6px', background: '#FF453A', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>✕ Đóng</button>
          </div>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', height: 'calc(100vh - 50px)', overflow: 'hidden' }}>
            {isImageUrl(previewUrl) ? (
              <img src={previewUrl} alt={previewTitle} style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }} />
            ) : (
              <iframe src={previewUrl} title={previewTitle} style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }} />
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-xs font-black uppercase tracking-widest text-neutral-medium">📁 Hồ sơ điện tử ({docs.length})</h3>
        <button onClick={() => { setForm(emptyForm); setShowForm(!showForm); }}
          className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-white hover:opacity-90 transition-all"
          style={{ background: 'linear-gradient(135deg, #FF375F 0%, #FF6B81 100%)' }}>
          ＋ Upload
        </button>
      </div>

      {/* Upload Form */}
      {showForm && (
        <div className="rounded-[16px] border border-primary/10 bg-surface p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Loại tài liệu</label>
              <select className={inputCls} value={form.doc_type} onChange={e => setForm(f => ({ ...f, doc_type: e.target.value }))}>
                {Object.entries(DOC_CATEGORIES).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Tiêu đề *</label>
              <input className={inputCls} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="CMND mặt trước..." />
            </div>
          </div>
          {/* Drop zone */}
          <div ref={dropRef}
            onDragEnter={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={e => { e.preventDefault(); if (dropRef.current && !dropRef.current.contains(e.relatedTarget as Node)) setIsDragging(false); }}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) uploadRef2.current(f); }}>
            <input type="file" ref={fileRef} accept={ACCEPTED_TYPES} onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); }}
              disabled={uploading} style={{ display: 'none' }} id="hr-doc-upload" />
            <label htmlFor="hr-doc-upload" className={`flex flex-col items-center justify-center gap-2 p-6 min-h-[100px] border-2 border-dashed rounded-2xl cursor-pointer transition-all ${isDragging ? 'border-primary bg-primary/5 scale-[1.01]' : form.file_url ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-primary/10 bg-white/[0.02]'}`}>
              {uploading ? (
                <>
                  <div className="w-7 h-7 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <span className="text-xs font-bold text-primary">Đang upload...</span>
                </>
              ) : form.file_url ? (
                <>
                  <span className="text-2xl">✅</span>
                  <span className="text-xs font-bold text-emerald-400 text-center break-all">{form.file_name}</span>
                  {form.file_size > 0 && <span className="text-[11px] text-neutral-medium/60">{formatSize(form.file_size)}</span>}
                </>
              ) : isDragging ? (
                <>
                  <span className="text-3xl">📥</span>
                  <span className="text-sm font-bold text-primary">Thả file vào đây!</span>
                </>
              ) : (
                <>
                  <span className="text-2xl">📤</span>
                  <span className="text-xs text-neutral-medium">Kéo thả file hoặc click để chọn (tối đa 20MB)</span>
                </>
              )}
            </label>
            {form.file_url && (
              <button onClick={() => setForm(f => ({ ...f, file_url: '', file_name: '', file_size: 0 }))}
                className="mt-2 px-3 py-1 rounded-lg text-[11px] font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-all">
                ✕ Xoá file
              </button>
            )}
          </div>
          <div>
            <label className={labelCls}>Ghi chú</label>
            <input className={inputCls} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Ghi chú..." />
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => { setShowForm(false); setForm(emptyForm); }}
              className="px-5 py-2 rounded-xl border border-primary/10 text-neutral-medium text-xs font-black uppercase tracking-widest hover:text-white hover:border-primary/30 transition-all">Hủy</button>
            <button onClick={handleSave} disabled={uploading}
              className="px-5 py-2 rounded-xl text-white text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #FF375F 0%, #FF6B81 100%)' }}>💾 Lưu</button>
          </div>
        </div>
      )}

      {loading && <div className="flex justify-center py-8"><div className="w-6 h-6 border-3 border-primary/30 border-t-primary rounded-full animate-spin" /></div>}

      {/* Document List */}
      {!loading && docs.length === 0 && !showForm && (
        <p className="text-neutral-medium text-sm text-center py-8">Chưa có tài liệu nào</p>
      )}

      {docs.map(doc => {
        const cat = DOC_CATEGORIES[doc.doc_type] || DOC_CATEGORIES.other;
        const hasFile = !!doc.file_url;
        const canPreview = hasFile && isPreviewable(doc.file_url);
        const pubUrl = svc.toPublicUrl(doc.file_url);

        return (
          <div key={doc.id} className="group rounded-[12px] border border-primary/10 bg-surface p-4 flex items-center justify-between hover:border-primary/30 transition-all">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-xl">{cat.icon}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-bold text-sm truncate">{doc.title}</span>
                  <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md" style={{ background: `${cat.color}20`, color: cat.color }}>{cat.label}</span>
                </div>
                <div className="flex gap-3 text-[11px] text-neutral-medium/60 mt-1">
                  {doc.file_name && <span>📄 {doc.file_name}</span>}
                  {doc.file_size > 0 && <span>{formatSize(doc.file_size)}</span>}
                  <span>📅 {new Date(doc.created_at).toLocaleDateString('vi-VN')}</span>
                  {doc.notes && <span>📝 {doc.notes}</span>}
                </div>
              </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
              {hasFile && canPreview && (
                <button onClick={() => { setPreviewUrl(pubUrl); setPreviewTitle(doc.file_name || doc.title); }}
                  className="p-2 rounded-lg hover:bg-white/10 text-blue-400 transition-all" title="Xem">👁️</button>
              )}
              {hasFile && (
                <a href={pubUrl} target="_blank" rel="noopener noreferrer"
                  className="p-2 rounded-lg hover:bg-white/10 text-emerald-400 transition-all" title="Tải">⬇️</a>
              )}
              {deleteId === doc.id ? (
                <div className="flex items-center gap-1">
                  <button onClick={() => handleDelete(doc.id)} className="px-2 py-1 rounded-md text-[10px] font-bold bg-red-500 text-white">Xác nhận</button>
                  <button onClick={() => setDeleteId(null)} className="px-2 py-1 rounded-md text-[10px] font-bold text-neutral-medium border border-primary/10">✕</button>
                </div>
              ) : (
                <button onClick={() => setDeleteId(doc.id)}
                  className="p-2 rounded-lg hover:bg-white/10 text-red-400 transition-all" title="Xoá">🗑️</button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DocumentManager;
