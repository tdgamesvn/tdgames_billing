import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CrmClient, CrmOutreachLead, CrmEmailTemplate, CrmEmailLog } from '@/types';
import * as svc from '../services/outreachService';
import type { PipelineStats } from '../services/outreachService';

// ══════════════════════════════════════════════════════════════
// ── Constants ─────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════

const STATUS_CFG: Record<string, { label: string; color: string; icon: string }> = {
  pending:        { label: 'Chờ gửi',     color: '#888',    icon: '⏳' },
  initial_sent:   { label: 'Đã gửi',      color: '#0A84FF', icon: '📤' },
  followup1_sent: { label: 'Follow-up 1', color: '#FF9500', icon: '📨' },
  followup2_sent: { label: 'Follow-up 2', color: '#BF5AF2', icon: '📩' },
  replied:        { label: 'Đã phản hồi', color: '#34C759', icon: '💬' },
  bounced:        { label: 'Bị bounce',   color: '#FF453A', icon: '⚠️' },
  invalid_email:  { label: 'Email lỗi',   color: '#FF3B30', icon: '❌' },
  unsubscribed:   { label: 'Huỷ',         color: '#555',    icon: '🚫' },
};

const TIER_CFG: Record<number, { label: string; color: string; icon: string; desc: string }> = {
  1: { label: 'Tier 1', color: '#FFD60A', icon: '⭐', desc: 'Art Director / Outsource Manager' },
  2: { label: 'Tier 2', color: '#FF9500', icon: '★',  desc: 'Producer / Lead Artist' },
  3: { label: 'Tier 3', color: '#888',    icon: '☆',  desc: 'CEO / BD Manager' },
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', background: '#1A1A1A', border: '1px solid #333',
  borderRadius: '8px', color: '#F5F5F5', fontSize: '13px', outline: 'none',
};
const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888',
};

type SubTab = 'dashboard' | 'leads' | 'discovery' | 'emails';

// ══════════════════════════════════════════════════════════════
// ── Main Component ────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════

interface Props { clients: CrmClient[]; }

const EmailOutreach: React.FC<Props> = ({ clients }) => {
  const [tab, setTab] = useState<SubTab>('dashboard');
  const [leads, setLeads] = useState<CrmOutreachLead[]>([]);
  const [templates, setTemplates] = useState<CrmEmailTemplate[]>([]);
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  // Filters
  const [searchQ, setSearchQ] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTier, setFilterTier] = useState<number | ''>('');

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [l, t, s] = await Promise.all([
        svc.fetchLeads({ search: searchQ || undefined, status: filterStatus || undefined, tier: filterTier || undefined }),
        svc.fetchTemplates(),
        svc.getPipelineStats(),
      ]);
      setLeads(l); setTemplates(t); setStats(s);
    } catch { } finally { setIsLoading(false); }
  }, [searchQ, filterStatus, filterTier]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const tabs: { key: SubTab; icon: string; label: string }[] = [
    { key: 'dashboard', icon: '📊', label: 'Dashboard' },
    { key: 'leads',     icon: '👥', label: `Leads (${stats?.total || 0})` },
    { key: 'discovery', icon: '🔍', label: 'Discovery' },
    { key: 'emails',    icon: '📧', label: `Templates (${templates.length})` },
  ];

  return (
    <>
      <div className="animate-fadeInUp" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Header */}
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#FF9500', textTransform: 'uppercase', letterSpacing: '-0.03em' }}>
            📧 Email Outreach
          </h2>
          <p style={{ color: '#888', fontSize: '14px', marginTop: '4px' }}>Lead Discovery + Cold Email Pipeline — TD Games Outsourcing</p>
        </div>

        {/* Sub-tabs */}
        <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #222' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '10px 20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
              background: tab === t.key ? '#222' : 'transparent',
              color: tab === t.key ? '#FF9500' : '#888',
              border: 'none', borderBottom: tab === t.key ? '2px solid #FF9500' : '2px solid transparent',
              borderRadius: '8px 8px 0 0', transition: 'all 0.2s',
            }}>{t.icon} {t.label}</button>
          ))}
        </div>

        {/* ── DASHBOARD ── */}
        {tab === 'dashboard' && stats && <DashboardTab stats={stats} />}

        {/* ── LEADS ── */}
        {tab === 'leads' && (
          <LeadsTab
            leads={leads} clients={clients} isLoading={isLoading} templates={templates}
            searchQ={searchQ} setSearchQ={setSearchQ}
            filterStatus={filterStatus} setFilterStatus={setFilterStatus}
            filterTier={filterTier} setFilterTier={setFilterTier}
            onRefresh={loadAll}
          />
        )}

        {/* ── DISCOVERY ── */}
        {tab === 'discovery' && <DiscoveryTab onRefresh={loadAll} />}

        {/* ── EMAILS/TEMPLATES ── */}
        {tab === 'emails' && <TemplatesTab templates={templates} onRefresh={loadAll} onPreview={setPreviewHtml} />}
      </div>

      {/* Preview Modal — rendered OUTSIDE animate-fadeInUp to avoid CSS transform breaking position:fixed */}
      {previewHtml && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 99999,
          background: 'rgba(0,0,0,0.92)', display: 'flex', flexDirection: 'column',
        }} onClick={() => setPreviewHtml(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            display: 'flex', alignItems: 'center', gap: '12px', padding: '0 20px',
            background: '#111', borderBottom: '1px solid #333', height: '50px', flexShrink: 0,
          }}>
            <span style={{ color: '#F5F5F5', fontSize: '14px', fontWeight: 700, flex: 1 }}>📧 Email Preview</span>
            <button onClick={() => setPreviewHtml(null)} style={{
              padding: '6px 14px', border: 'none', borderRadius: '6px', background: '#FF453A',
              color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
            }}>✕ Đóng</button>
          </div>
          <div onClick={e => e.stopPropagation()} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '20px', overflow: 'auto' }}>
            <iframe srcDoc={previewHtml} style={{ width: '650px', height: '100%', minHeight: '600px', border: 'none', borderRadius: '12px', background: '#fff' }} title="Email Preview" />
          </div>
        </div>
      )}
    </>
  );
};

// ══════════════════════════════════════════════════════════════
// ── DASHBOARD TAB ─────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════

const DashboardTab: React.FC<{ stats: PipelineStats }> = ({ stats }) => {
  const pipelineSteps = [
    { label: 'Pending', count: stats.pending, color: '#888', pct: stats.total > 0 ? (stats.pending / stats.total) * 100 : 0 },
    { label: 'Initial Sent', count: stats.initial_sent, color: '#0A84FF', pct: stats.total > 0 ? (stats.initial_sent / stats.total) * 100 : 0 },
    { label: 'Follow-up 1', count: stats.followup1_sent, color: '#FF9500', pct: stats.total > 0 ? (stats.followup1_sent / stats.total) * 100 : 0 },
    { label: 'Follow-up 2', count: stats.followup2_sent, color: '#BF5AF2', pct: stats.total > 0 ? (stats.followup2_sent / stats.total) * 100 : 0 },
    { label: 'Replied! 🎉', count: stats.replied, color: '#34C759', pct: stats.total > 0 ? (stats.replied / stats.total) * 100 : 0 },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        {[
          { label: 'Tổng Leads', value: stats.total, color: '#FF9500' },
          { label: '⭐ Tier 1', value: stats.tier1, color: '#FFD60A' },
          { label: '★ Tier 2', value: stats.tier2, color: '#FF9500' },
          { label: '☆ Tier 3', value: stats.tier3, color: '#888' },
        ].map((s, i) => (
          <div key={i} style={{ background: '#161616', border: '1px solid #222', borderRadius: '12px', padding: '16px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888' }}>{s.label}</p>
            <p style={{ fontSize: '28px', fontWeight: 900, color: s.color, marginTop: '4px' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Pipeline Funnel */}
      <div style={{ background: '#161616', border: '1px solid #222', borderRadius: '12px', padding: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#F5F5F5', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Pipeline Funnel
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {pipelineSteps.map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ width: '120px', fontSize: '12px', fontWeight: 700, color: step.color, textAlign: 'right' }}>{step.label}</span>
              <div style={{ flex: 1, height: '28px', background: '#222', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
                <div style={{
                  width: `${Math.max(step.pct, step.count > 0 ? 2 : 0)}%`,
                  height: '100%', background: step.color, borderRadius: '6px',
                  transition: 'width 0.8s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px',
                }}>
                  {step.count > 0 && (
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#fff' }}>{step.count}</span>
                  )}
                </div>
              </div>
              <span style={{ width: '50px', fontSize: '11px', color: '#555', textAlign: 'right' }}>{step.pct.toFixed(1)}%</span>
            </div>
          ))}
        </div>

        {/* Bounce row */}
        {stats.bounced > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px', opacity: 0.6 }}>
            <span style={{ width: '120px', fontSize: '12px', fontWeight: 700, color: '#FF453A', textAlign: 'right' }}>Bounced</span>
            <div style={{ flex: 1, height: '28px', background: '#222', borderRadius: '6px', overflow: 'hidden' }}>
              <div style={{ width: `${(stats.bounced / stats.total) * 100}%`, height: '100%', background: '#FF453A', borderRadius: '6px' }} />
            </div>
            <span style={{ width: '50px', fontSize: '11px', color: '#555', textAlign: 'right' }}>{stats.bounced}</span>
          </div>
        )}
      </div>

      {/* Key metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        {[
          { label: 'Đã gửi email', value: stats.total - stats.pending, total: stats.total, color: '#0A84FF' },
          { label: 'Reply Rate', value: stats.replied, total: stats.total - stats.pending || 1, color: '#34C759', isPct: true },
          { label: 'Bounce Rate', value: stats.bounced, total: stats.total - stats.pending || 1, color: '#FF453A', isPct: true },
        ].map((m, i) => (
          <div key={i} style={{ background: '#161616', border: '1px solid #222', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888', marginBottom: '8px' }}>{m.label}</p>
            <p style={{ fontSize: '32px', fontWeight: 900, color: m.color }}>
              {m.isPct ? `${m.total > 0 ? ((m.value / m.total) * 100).toFixed(1) : 0}%` : m.value}
            </p>
            {!m.isPct && <p style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>/ {m.total} leads</p>}
          </div>
        ))}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// ── LEADS TAB ─────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════

interface QuotaStatus { sent_today: number; daily_limit: number; remaining: number; }

async function fetchQuota(): Promise<QuotaStatus> {
  const API = import.meta.env.VITE_OUTREACH_API_URL;
  if (!API) return { sent_today: 0, daily_limit: 30, remaining: 30 };
  try {
    const res = await fetch(`${API}/api/email/status`);
    if (!res.ok) throw new Error();
    return res.json();
  } catch { return { sent_today: 0, daily_limit: 30, remaining: 30 }; }
}

interface LeadsProps {
  leads: CrmOutreachLead[]; clients: CrmClient[]; isLoading: boolean;
  templates: CrmEmailTemplate[];
  searchQ: string; setSearchQ: (v: string) => void;
  filterStatus: string; setFilterStatus: (v: string) => void;
  filterTier: number | ''; setFilterTier: (v: number | '') => void;
  onRefresh: () => void;
}

const LeadsTab: React.FC<LeadsProps> = ({ leads, clients, isLoading, templates, searchQ, setSearchQ, filterStatus, setFilterStatus, filterTier, setFilterTier, onRefresh }) => {
  const [showImport, setShowImport] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ studio_name: '', contact_name: '', first_name: '', email: '', job_title: '', linkedin_url: '', tier: 1 });
  const fileRef = useRef<HTMLInputElement>(null);
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ verified: number; valid: number; invalid: number } | null>(null);

  useEffect(() => { fetchQuota().then(setQuota); }, []);

  // Send email to a single lead
  const handleSendEmail = async (leadId: string, templateName: string = 'initial_outreach') => {
    const API = import.meta.env.VITE_OUTREACH_API_URL;
    if (!API) { alert('VITE_OUTREACH_API_URL chưa cấu hình'); return; }
    setSendingId(leadId);
    try {
      const res = await fetch(`${API}/api/email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId, template_name: templateName }),
      });
      if (res.status === 429) { alert('Đã đạt giới hạn email/ngày. Thử lại ngày mai.'); return; }
      if (!res.ok) { const err = await res.json().catch(() => ({})); alert(`Gửi thất bại: ${err.detail || res.status}`); return; }
      const data = await res.json();
      alert(`✅ Đã gửi tới ${data.to}!\nSubject: ${data.subject}`);
      onRefresh();
      fetchQuota().then(setQuota);
    } catch (err: any) { alert(`Lỗi: ${err.message}`); } finally { setSendingId(null); }
  };

  // Bulk send via server-side batch (with 2-5 min delay between each email)
  const handleBulkSend = async () => {
    const API = import.meta.env.VITE_OUTREACH_API_URL;
    if (!API) { alert('VITE_OUTREACH_API_URL chưa cấu hình'); return; }
    const pendingCount = leads.filter(l => l.outreach_status === 'pending').length;
    const remaining = quota?.remaining || 30;
    const batchSize = Math.min(pendingCount, remaining);
    if (batchSize === 0) { alert(remaining <= 0 ? 'Đã hết quota hôm nay.' : 'Không có leads pending.'); return; }
    const estTime = Math.round(batchSize * 3.5); // avg 3.5 min per email
    if (!confirm(`Gửi email initial cho ${batchSize} leads?\n\n⏱ Ước tính: ~${estTime} phút (delay 2-5 phút giữa mỗi email)\n🔒 Server tự xử lý — bạn có thể đóng tab.`)) return;
    
    // Trigger server-side batch
    try {
      const res = await fetch(`${API}/api/email/batch`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_name: 'initial_outreach', limit: batchSize, min_delay: 120, max_delay: 300 }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); alert(`Lỗi: ${err.error || err.detail || res.status}`); return; }
      const data = await res.json();
      if (data.error) { alert(data.error); return; }
      setBulkSending(true);
      setBulkProgress({ current: 0, total: data.count, success: 0, failed: 0 });
      
      // Poll for status every 10 seconds
      const pollInterval = setInterval(async () => {
        try {
          const sr = await fetch(`${API}/api/email/batch-status`);
          if (!sr.ok) return;
          const st = await sr.json();
          setBulkProgress({ current: st.current, total: st.total, success: st.success, failed: st.failed });
          if (!st.running) {
            clearInterval(pollInterval);
            setBulkSending(false);
            alert(`✅ Batch hoàn thành!\nThành công: ${st.success}\nThất bại: ${st.failed}`);
            onRefresh();
            fetchQuota().then(setQuota);
          }
        } catch { /* ignore poll errors */ }
      }, 10000);
    } catch (err: any) { alert(`Lỗi kết nối: ${err.message}`); }
    onRefresh();
    fetchQuota().then(setQuota);
  };

  // Verify pending emails before sending
  const handleVerifyEmails = async () => {
    const API = import.meta.env.VITE_OUTREACH_API_URL;
    if (!API) { alert('VITE_OUTREACH_API_URL chưa cấu hình'); return; }
    const pendingCount = leads.filter(l => l.outreach_status === 'pending').length;
    if (pendingCount === 0) { alert('Không có leads pending cần verify.'); return; }
    if (!confirm(`Verify ${Math.min(pendingCount, 100)} email addresses?\n\nEmail không hợp lệ sẽ được đánh dấu "invalid_email".`)) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await fetch(`${API}/api/email/verify-pending`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 100 }),
      });
      if (!res.ok) { alert(`Lỗi: ${res.status}`); return; }
      const data = await res.json();
      setVerifyResult({ verified: data.verified, valid: data.valid, invalid: data.invalid });
      alert(`✅ Verify hoàn thành!\n\nĐã kiểm tra: ${data.verified}\nHợp lệ: ${data.valid}\nKhông hợp lệ: ${data.invalid} (đã đánh dấu)`);
      onRefresh();
    } catch (err: any) { alert(`Lỗi: ${err.message}`); } finally { setVerifying(false); }
  };

  // CSV Import
  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const text = await file.text();
    const parsed = svc.parseCsvLeads(text);
    if (parsed.length === 0) { alert('Không tìm thấy leads hợp lệ'); return; }
    try {
      await svc.createLeadsBatch(parsed);
      onRefresh(); setShowImport(false);
      alert(`Đã import ${parsed.length} leads!`);
    } catch (err: any) { alert('Error: ' + err.message); }
    if (fileRef.current) fileRef.current.value = '';
  };

  // CRM Import
  const handleCrmImport = async () => {
    const newLeads: Omit<CrmOutreachLead, 'id' | 'created_at' | 'updated_at'>[] = [];
    clients.forEach(c => {
      (c.contacts || []).forEach(ct => {
        if (ct.email && !leads.some(l => l.email === ct.email)) {
          newLeads.push({
            client_id: c.id, studio_name: c.name, contact_name: ct.name,
            first_name: ct.name.split(' ')[0] || '', email: ct.email,
            job_title: ct.role || '', linkedin_url: '', tier: 3,
            outreach_status: 'pending', initial_sent_at: null, followup1_sent_at: null,
            followup2_sent_at: null, replied_at: null, source: 'crm_import', tags: [], notes: '',
          });
        }
      });
      if (c.email && !leads.some(l => l.email === c.email) && !newLeads.some(l => l.email === c.email)) {
        newLeads.push({
          client_id: c.id, studio_name: c.name,
          contact_name: c.contact_person || c.name, first_name: (c.contact_person || c.name).split(' ')[0],
          email: c.email, job_title: '', linkedin_url: '', tier: 3,
          outreach_status: 'pending', initial_sent_at: null, followup1_sent_at: null,
          followup2_sent_at: null, replied_at: null, source: 'crm_import', tags: [], notes: '',
        });
      }
    });
    if (newLeads.length === 0) { alert('Không có contacts mới'); return; }
    try {
      await svc.createLeadsBatch(newLeads);
      onRefresh(); setShowImport(false);
      alert(`Đã import ${newLeads.length} leads từ CRM!`);
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  // Add single lead
  const handleAdd = async () => {
    if (!addForm.email.trim()) return;
    try {
      await svc.createLead({
        ...addForm, client_id: null, outreach_status: 'pending',
        initial_sent_at: null, followup1_sent_at: null, followup2_sent_at: null,
        replied_at: null, source: 'manual', tags: [], notes: '',
      });
      setShowAddForm(false);
      setAddForm({ studio_name: '', contact_name: '', first_name: '', email: '', job_title: '', linkedin_url: '', tier: 1 });
      onRefresh();
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  // Status update
  const handleStatusChange = async (id: string, status: string) => {
    try { await svc.updateLead(id, { outreach_status: status } as any); onRefresh(); } catch { }
  };

  // Delete
  const handleDelete = async (id: string) => {
    try { await svc.deleteLead(id); onRefresh(); } catch { }
  };

  // Determine next template for a lead
  const getNextTemplate = (lead: CrmOutreachLead): { name: string; label: string } | null => {
    if (lead.outreach_status === 'pending') return { name: 'initial_outreach', label: 'Gửi Initial' };
    if (lead.outreach_status === 'initial_sent') return { name: 'followup_1', label: 'Gửi FU1' };
    if (lead.outreach_status === 'followup1_sent') return { name: 'followup_2', label: 'Gửi FU2' };
    return null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Quota Bar */}
      {quota && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 20px',
          background: '#161616', border: '1px solid #222', borderRadius: '12px',
        }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#888' }}>📊 Quota hôm nay</span>
          <div style={{ flex: 1, height: '8px', background: '#222', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${(quota.sent_today / quota.daily_limit) * 100}%`, height: '100%', background: quota.remaining > 10 ? '#34C759' : quota.remaining > 0 ? '#FF9500' : '#FF453A', borderRadius: '4px', transition: 'width 0.5s' }} />
          </div>
          <span style={{ fontSize: '13px', fontWeight: 800, color: quota.remaining > 10 ? '#34C759' : quota.remaining > 0 ? '#FF9500' : '#FF453A' }}>
            {quota.sent_today}/{quota.daily_limit}
          </span>
          <span style={{ fontSize: '11px', color: '#555' }}>({quota.remaining} còn lại)</span>
          {leads.filter(l => l.outreach_status === 'pending').length > 0 && quota.remaining > 0 && (
            <button onClick={handleBulkSend} disabled={bulkSending} style={{
              padding: '8px 16px', border: 'none', borderRadius: '8px',
              background: bulkSending ? '#333' : '#34C759', color: bulkSending ? '#888' : '#000',
              fontSize: '11px', fontWeight: 800, cursor: bulkSending ? 'wait' : 'pointer', whiteSpace: 'nowrap',
            }}>{bulkSending ? `⏳ ${bulkProgress.current}/${bulkProgress.total}` : `🚀 Gửi batch (${Math.min(leads.filter(l => l.outreach_status === 'pending').length, quota.remaining)})`}</button>
          )}
        </div>
      )}

      {/* Bulk Progress */}
      {bulkSending && (
        <div style={{ background: '#0A84FF10', border: '1px solid #0A84FF30', borderRadius: '10px', padding: '14px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0A84FF' }}>📧 Đang gửi email...</span>
            <span style={{ fontSize: '12px', color: '#888' }}>{bulkProgress.current}/{bulkProgress.total}</span>
          </div>
          <div style={{ height: '6px', background: '#222', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%`, height: '100%', background: '#0A84FF', borderRadius: '3px', transition: 'width 0.3s' }} />
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '6px' }}>
            <span style={{ fontSize: '11px', color: '#34C759' }}>✅ {bulkProgress.success}</span>
            <span style={{ fontSize: '11px', color: '#FF453A' }}>❌ {bulkProgress.failed}</span>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <input style={{ ...inputStyle, flex: 1, minWidth: '220px' }} placeholder="🔍 Tìm tên, email, studio..."
          value={searchQ} onChange={e => setSearchQ(e.target.value)} />
        <select style={{ ...inputStyle, width: '160px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
        </select>
        <select style={{ ...inputStyle, width: '120px' }} value={filterTier} onChange={e => setFilterTier(e.target.value ? +e.target.value : '')}>
          <option value="">Tất cả tier</option>
          {[1, 2, 3].map(t => <option key={t} value={t}>{TIER_CFG[t].icon} Tier {t}</option>)}
        </select>
        <button onClick={() => setShowImport(!showImport)} style={{
          padding: '10px 16px', border: 'none', borderRadius: '8px', background: '#0A84FF',
          color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
        }}>📥 Import</button>
        <button onClick={() => setShowAddForm(!showAddForm)} style={{
          padding: '10px 16px', border: 'none', borderRadius: '8px', background: '#FF9500',
          color: '#000', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
        }}>＋ Thêm Lead</button>
        <button onClick={handleVerifyEmails} disabled={verifying} style={{
          padding: '10px 16px', border: 'none', borderRadius: '8px',
          background: verifying ? '#555' : '#34C759',
          color: '#fff', fontSize: '12px', fontWeight: 700, cursor: verifying ? 'not-allowed' : 'pointer',
        }}>{verifying ? '⏳ Đang verify...' : '🔍 Verify Emails'}</button>
      </div>
      {verifyResult && (
        <div style={{ padding: '8px 14px', background: 'rgba(52,199,89,0.1)', border: '1px solid rgba(52,199,89,0.3)', borderRadius: '8px', fontSize: '12px', color: '#34C759', marginTop: '8px' }}>
          ✅ Đã verify: {verifyResult.verified} | Hợp lệ: {verifyResult.valid} | ❌ Lỗi: {verifyResult.invalid}
        </div>
      )}

      {/* Import Panel */}
      {showImport && (
        <div style={{ background: '#161616', border: '1px solid #0A84FF', borderRadius: '12px', padding: '20px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#F5F5F5', marginBottom: '16px' }}>Import Leads</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ background: '#1A1A1A', borderRadius: '10px', padding: '20px', border: '1px solid #333', textAlign: 'center' }}>
              <p style={{ fontSize: '32px', marginBottom: '8px' }}>📄</p>
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#F5F5F5', marginBottom: '6px' }}>Upload CSV</p>
              <p style={{ fontSize: '11px', color: '#888', marginBottom: '14px', lineHeight: 1.5 }}>
                Hỗ trợ SalesQL format: Studio, Contact_Name, Work_Email, Job_Title, Tier
              </p>
              <input type="file" ref={fileRef} accept=".csv" onChange={handleCsvImport} style={{ display: 'none' }} id="csv-imp" />
              <label htmlFor="csv-imp" style={{
                padding: '10px 20px', borderRadius: '8px', background: '#FF9500', color: '#000',
                fontSize: '12px', fontWeight: 800, cursor: 'pointer', display: 'inline-block',
              }}>Chọn file CSV</label>
            </div>
            <div style={{ background: '#1A1A1A', borderRadius: '10px', padding: '20px', border: '1px solid #333', textAlign: 'center' }}>
              <p style={{ fontSize: '32px', marginBottom: '8px' }}>👥</p>
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#F5F5F5', marginBottom: '6px' }}>Từ CRM Clients</p>
              <p style={{ fontSize: '11px', color: '#888', marginBottom: '14px', lineHeight: 1.5 }}>
                Import {clients.length} khách hàng + contacts (bỏ qua trùng email)
              </p>
              <button onClick={handleCrmImport} style={{
                padding: '10px 20px', borderRadius: '8px', background: '#0A84FF', color: '#fff',
                fontSize: '12px', fontWeight: 800, cursor: 'pointer', border: 'none',
              }}>Import từ CRM</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Lead Form */}
      {showAddForm && (
        <div style={{ background: '#161616', border: '1px solid #FF9500', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div><label style={labelStyle}>Studio *</label><input style={inputStyle} value={addForm.studio_name} onChange={e => setAddForm({ ...addForm, studio_name: e.target.value })} /></div>
            <div><label style={labelStyle}>Contact Name *</label><input style={inputStyle} value={addForm.contact_name} onChange={e => setAddForm({ ...addForm, contact_name: e.target.value, first_name: e.target.value.split(' ')[0] })} /></div>
            <div><label style={labelStyle}>Email *</label><input style={inputStyle} value={addForm.email} onChange={e => setAddForm({ ...addForm, email: e.target.value })} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div><label style={labelStyle}>Job Title</label><input style={inputStyle} value={addForm.job_title} onChange={e => setAddForm({ ...addForm, job_title: e.target.value })} /></div>
            <div><label style={labelStyle}>LinkedIn URL</label><input style={inputStyle} value={addForm.linkedin_url} onChange={e => setAddForm({ ...addForm, linkedin_url: e.target.value })} /></div>
            <div><label style={labelStyle}>Tier</label>
              <select style={inputStyle} value={addForm.tier} onChange={e => setAddForm({ ...addForm, tier: +e.target.value })}>
                {[1, 2, 3].map(t => <option key={t} value={t}>{TIER_CFG[t].icon} {TIER_CFG[t].label} — {TIER_CFG[t].desc}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowAddForm(false)} style={{ padding: '8px 16px', border: '1px solid #333', borderRadius: '8px', background: 'transparent', color: '#ccc', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Huỷ</button>
            <button onClick={handleAdd} style={{ padding: '8px 16px', border: 'none', borderRadius: '8px', background: '#FF9500', color: '#000', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}>Thêm Lead</button>
          </div>
        </div>
      )}

      {/* Status pills */}
      {leads.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {Object.entries(STATUS_CFG).map(([key, cfg]) => {
            const count = leads.filter(l => l.outreach_status === key).length;
            if (count === 0 && filterStatus !== key) return null;
            return (
              <button key={key} onClick={() => setFilterStatus(filterStatus === key ? '' : key)} style={{
                padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                background: filterStatus === key ? cfg.color + '20' : '#161616',
                border: `1px solid ${filterStatus === key ? cfg.color + '40' : '#333'}`,
                color: filterStatus === key ? cfg.color : '#888', cursor: 'pointer',
              }}>{cfg.icon} {cfg.label} ({count})</button>
            );
          })}
        </div>
      )}

      {/* Leads Table */}
      {isLoading ? (
        <p style={{ color: '#666', textAlign: 'center', padding: '40px' }}>Đang tải...</p>
      ) : leads.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', background: '#161616', border: '1px solid #222', borderRadius: '12px' }}>
          <p style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.4 }}>👥</p>
          <p style={{ fontSize: '14px', color: '#888', fontWeight: 700 }}>Chưa có leads</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333' }}>
                {['Tier', 'Contact', 'Email', 'Studio', 'Chức vụ', 'Trạng thái', 'Nguồn', 'Actions'].map((h, i) => (
                  <th key={i} style={{ padding: '10px 10px', textAlign: 'left', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#666' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map(lead => {
                const tc = TIER_CFG[lead.tier] || TIER_CFG[3];
                const sc = STATUS_CFG[lead.outreach_status] || STATUS_CFG.pending;
                return (
                  <tr key={lead.id} style={{ borderBottom: '1px solid #1A1A1A', transition: 'background 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#161616'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                    <td style={{ padding: '10px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: tc.color + '15', color: tc.color }}>{tc.icon} {tc.label}</span>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <div style={{ fontWeight: 600, color: '#F5F5F5' }}>{lead.contact_name || '—'}</div>
                      {lead.linkedin_url && <a href={lead.linkedin_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '10px', color: '#0A84FF' }}>LinkedIn ↗</a>}
                    </td>
                    <td style={{ padding: '10px', color: '#0A84FF', fontSize: '12px' }}>{lead.email}</td>
                    <td style={{ padding: '10px', color: '#ccc' }}>{lead.studio_name || '—'}</td>
                    <td style={{ padding: '10px', color: '#888', fontSize: '12px' }}>{lead.job_title || '—'}</td>
                    <td style={{ padding: '10px' }}>
                      <select value={lead.outreach_status} onChange={e => handleStatusChange(lead.id, e.target.value)} style={{
                        fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px',
                        background: sc.color + '15', color: sc.color, border: `1px solid ${sc.color}30`, cursor: 'pointer', outline: 'none',
                      }}>
                        {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k} style={{ background: '#1A1A1A', color: v.color }}>{v.label}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '10px', fontSize: '10px', color: '#555' }}>{lead.source}</td>
                    <td style={{ padding: '10px' }}>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        {(() => {
                          const next = getNextTemplate(lead);
                          if (!next) return null;
                          return (
                            <button
                              onClick={() => { if (confirm(`Gửi "${next.label}" tới ${lead.email}?`)) handleSendEmail(lead.id, next.name); }}
                              disabled={sendingId === lead.id}
                              style={{
                                padding: '4px 10px', border: 'none', borderRadius: '4px',
                                background: sendingId === lead.id ? '#333' : 'rgba(52,199,89,0.15)',
                                color: sendingId === lead.id ? '#888' : '#34C759',
                                fontSize: '10px', fontWeight: 700, cursor: sendingId === lead.id ? 'wait' : 'pointer', whiteSpace: 'nowrap',
                              }}
                            >{sendingId === lead.id ? '⏳...' : `📧 ${next.label}`}</button>
                          );
                        })()}
                        <button onClick={() => { if (confirm('Xoá lead?')) handleDelete(lead.id); }} style={{
                          padding: '4px 8px', border: 'none', borderRadius: '4px', background: 'rgba(255,69,58,0.1)',
                          color: '#FF453A', fontSize: '11px', cursor: 'pointer',
                        }}>✕</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// ── DISCOVERY TAB ─────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════

const DiscoveryTab: React.FC<{ onRefresh: () => void }> = ({ onRefresh }) => {
  const [company, setCompany] = useState('');
  const [domain, setDomain] = useState('');
  const [discovering, setDiscovering] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [error, setError] = useState('');

  const handleDiscover = async () => {
    if (!company.trim()) return;
    setDiscovering(true); setError(''); setResults(null);
    try {
      const contacts = await svc.discoverContacts(company, domain);
      setResults(contacts);
    } catch (err: any) {
      setError(err.message || 'Discovery failed');
    } finally { setDiscovering(false); }
  };

  const handleAddToLeads = async (contact: any) => {
    try {
      await svc.createLead({
        client_id: null,
        studio_name: company,
        contact_name: contact.name || '',
        first_name: (contact.name || '').split(' ')[0],
        email: contact.email || '',
        job_title: contact.title || '',
        linkedin_url: contact.linkedin_url || '',
        tier: contact.tier_num || 3,
        outreach_status: 'pending',
        initial_sent_at: null, followup1_sent_at: null, followup2_sent_at: null, replied_at: null,
        source: 'discovery', tags: [], notes: '',
      });
      onRefresh();
      alert(`Đã thêm ${contact.name} vào leads!`);
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Info box */}
      <div style={{ background: '#161616', border: '1px solid #FF950030', borderRadius: '12px', padding: '20px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#F5F5F5', marginBottom: '8px' }}>🔍 Lead Discovery Pipeline</h4>
        <p style={{ fontSize: '13px', color: '#888', lineHeight: 1.6, marginBottom: '16px' }}>
          Nhập tên công ty + domain → Hệ thống tự động tìm contacts qua Web Scraping, Google CSE, và SalesQL Enrichment.
          Contacts được phân loại theo 3-tier: ⭐Tier 1 (Art Director), ★Tier 2 (Producer), ☆Tier 3 (CEO/BD).
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr auto', gap: '12px', alignItems: 'end' }}>
          <div><label style={labelStyle}>Company Name *</label>
            <input style={inputStyle} value={company} onChange={e => setCompany(e.target.value)} placeholder="Supercell" /></div>
          <div><label style={labelStyle}>Domain (optional)</label>
            <input style={inputStyle} value={domain} onChange={e => setDomain(e.target.value)} placeholder="supercell.com" /></div>
          <button onClick={handleDiscover} disabled={discovering || !company.trim()} style={{
            padding: '10px 24px', border: 'none', borderRadius: '8px',
            background: discovering ? '#333' : '#FF9500', color: discovering ? '#888' : '#000',
            fontSize: '12px', fontWeight: 800, cursor: discovering ? 'wait' : 'pointer', whiteSpace: 'nowrap',
            height: '42px',
          }}>{discovering ? '⏳ Đang tìm...' : '🔍 Discover'}</button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#FF453A15', border: '1px solid #FF453A30', borderRadius: '10px', padding: '14px 20px' }}>
          <p style={{ fontSize: '13px', color: '#FF453A', fontWeight: 600 }}>⚠️ {error}</p>
          {error.includes('VITE_OUTREACH_API_URL') && (
            <p style={{ fontSize: '12px', color: '#888', marginTop: '6px' }}>
              FastAPI chưa deploy trên VPS. Cần triển khai Phase 2 để sử dụng tính năng này.
            </p>
          )}
        </div>
      )}

      {/* Results */}
      {results && results.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#555' }}>Không tìm thấy contacts</div>
      )}
      {results && results.length > 0 && (
        <div style={{ background: '#161616', border: '1px solid #222', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #222' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#F5F5F5' }}>Kết quả: {results.length} contacts</h4>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333' }}>
                {['Tier', 'Name', 'Title', 'Email', 'LinkedIn', ''].map((h, i) => (
                  <th key={i} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#666' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((c: any, i: number) => {
                const tc = TIER_CFG[c.tier_num] || TIER_CFG[3];
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #1A1A1A' }}>
                    <td style={{ padding: '8px 12px' }}><span style={{ fontSize: '11px', fontWeight: 700, color: tc.color }}>{tc.icon} {tc.label}</span></td>
                    <td style={{ padding: '8px 12px', color: '#F5F5F5', fontWeight: 600 }}>{c.name}</td>
                    <td style={{ padding: '8px 12px', color: '#888', fontSize: '12px' }}>{c.title}</td>
                    <td style={{ padding: '8px 12px', color: '#0A84FF', fontSize: '12px' }}>{c.email}</td>
                    <td style={{ padding: '8px 12px' }}>
                      {c.linkedin_url && <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: '#0A84FF' }}>↗</a>}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <button onClick={() => handleAddToLeads(c)} style={{
                        padding: '4px 10px', border: 'none', borderRadius: '6px', background: '#34C75920',
                        color: '#34C759', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                      }}>＋ Add</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// ── TEMPLATES TAB ─────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════

const TemplatesTab: React.FC<{ templates: CrmEmailTemplate[]; onRefresh: () => void; onPreview: (html: string) => void }> = ({ templates, onRefresh, onPreview }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ subject_lines: [''], html_content: '', delay_days: 0 });

  const handleEdit = (tpl: CrmEmailTemplate) => {
    setEditingId(tpl.id);
    setEditForm({
      subject_lines: tpl.subject_lines.length > 0 ? [...tpl.subject_lines] : [''],
      html_content: tpl.html_content,
      delay_days: tpl.delay_days,
    });
  };

  const handleSave = async () => {
    if (!editingId) return;
    try {
      await svc.updateTemplate(editingId, {
        subject_lines: editForm.subject_lines.filter(s => s.trim()),
        html_content: editForm.html_content,
        delay_days: editForm.delay_days,
      });
      setEditingId(null); onRefresh();
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  const STEP_NAMES: Record<string, { step: number; desc: string; icon: string }> = {
    'initial_outreach': { step: 1, desc: 'First Contact — Giới thiệu TD Games + Free Trial', icon: '📤' },
    'followup_1':       { step: 2, desc: 'Follow-up — Portfolio highlights + Case study', icon: '📨' },
    'followup_2':       { step: 3, desc: 'Breakup — Standing offer + Wish well', icon: '📩' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <p style={{ fontSize: '13px', color: '#888' }}>
        Email sequence 3 bước. Mỗi step có delay tính từ step trước. Dùng biến: {'{contact_name}'}, {'{studio_name}'}, {'{company}'}.
      </p>

      {/* Sequence Timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {templates.map((tpl, idx) => {
          const info = STEP_NAMES[tpl.name] || { step: idx + 1, desc: tpl.name, icon: '📧' };
          const isEditing = editingId === tpl.id;

          return (
            <div key={tpl.id} style={{
              background: '#161616', border: `1px solid ${isEditing ? '#FF9500' : '#222'}`, borderRadius: '12px', overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', padding: '16px 20px' }}>
                {/* Step number */}
                <div style={{
                  width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  background: '#FF950015', border: '1px solid #FF950025',
                }}>
                  <span style={{ fontSize: '12px' }}>{info.icon}</span>
                  <span style={{ fontSize: '14px', fontWeight: 900, color: '#FF9500' }}>{info.step}</span>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px', color: '#F5F5F5' }}>Step {info.step}: {tpl.name.replace(/_/g, ' ')}</span>
                    {tpl.delay_days > 0 && <span style={{ fontSize: '11px', color: '#FF9500', fontWeight: 600 }}>⏰ +{tpl.delay_days} ngày</span>}
                    <span style={{
                      fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px',
                      background: tpl.is_active ? '#34C75915' : '#FF453A15',
                      color: tpl.is_active ? '#34C759' : '#FF453A',
                    }}>{tpl.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#888', marginBottom: '6px' }}>{info.desc}</p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {tpl.subject_lines.map((s, si) => (
                      <span key={si} style={{
                        fontSize: '11px', padding: '3px 8px', borderRadius: '4px',
                        background: '#0A84FF15', color: '#0A84FF', fontWeight: 600, maxWidth: '300px',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>📧 {s}</span>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  {tpl.html_content && tpl.html_content !== 'placeholder' && (
                    <button onClick={() => onPreview(tpl.html_content)} style={{
                      padding: '6px 10px', border: '1px solid #0A84FF30', borderRadius: '6px',
                      background: 'rgba(10,132,255,0.1)', color: '#0A84FF', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                    }}>👁️ Preview</button>
                  )}
                  <button onClick={() => isEditing ? setEditingId(null) : handleEdit(tpl)} style={{
                    padding: '6px 10px', border: '1px solid #FF950030', borderRadius: '6px',
                    background: 'rgba(255,149,0,0.1)', color: '#FF9500', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                  }}>{isEditing ? '✕ Đóng' : '✏️ Sửa'}</button>
                </div>
              </div>

              {/* Edit Form */}
              {isEditing && (
                <div style={{ borderTop: '1px solid #222', padding: '20px', background: '#111' }}>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={labelStyle}>Subject Lines (A/B test)</label>
                    {editForm.subject_lines.map((s, i) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                        <input style={{ ...inputStyle, flex: 1 }} value={s}
                          onChange={e => { const arr = [...editForm.subject_lines]; arr[i] = e.target.value; setEditForm({ ...editForm, subject_lines: arr }); }}
                          placeholder={`Subject variant ${i + 1}...`} />
                        {editForm.subject_lines.length > 1 && (
                          <button onClick={() => setEditForm({ ...editForm, subject_lines: editForm.subject_lines.filter((_, idx) => idx !== i) })}
                            style={{ padding: '0 10px', border: 'none', borderRadius: '6px', background: 'rgba(255,69,58,0.1)', color: '#FF453A', cursor: 'pointer' }}>✕</button>
                        )}
                      </div>
                    ))}
                    <button onClick={() => setEditForm({ ...editForm, subject_lines: [...editForm.subject_lines, ''] })}
                      style={{ padding: '4px 12px', border: '1px dashed #555', borderRadius: '6px', background: 'transparent', color: '#888', fontSize: '11px', cursor: 'pointer' }}>+ Thêm variant</button>
                  </div>

                  <div style={{ display: 'flex', gap: '14px', marginBottom: '14px' }}>
                    <div style={{ width: '120px' }}><label style={labelStyle}>Delay (ngày)</label>
                      <input type="number" min={0} style={inputStyle} value={editForm.delay_days} onChange={e => setEditForm({ ...editForm, delay_days: +e.target.value })} /></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <label style={{ ...labelStyle, marginBottom: 0 }}>HTML Content</label>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {['{contact_name}', '{studio_name}', '{company}'].map(v => (
                            <button key={v} onClick={() => setEditForm({ ...editForm, html_content: editForm.html_content + v })} style={{
                              padding: '2px 6px', border: '1px solid #444', borderRadius: '4px', background: 'transparent',
                              color: '#FF9500', fontSize: '9px', fontWeight: 700, cursor: 'pointer',
                            }}>{v}</button>
                          ))}
                        </div>
                      </div>
                      <textarea style={{ ...inputStyle, minHeight: '160px', fontFamily: 'monospace', fontSize: '11px' }}
                        value={editForm.html_content} onChange={e => setEditForm({ ...editForm, html_content: e.target.value })} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={() => setEditingId(null)} style={{ padding: '8px 16px', border: '1px solid #333', borderRadius: '8px', background: 'transparent', color: '#ccc', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Huỷ</button>
                    {editForm.html_content && editForm.html_content !== 'placeholder' && (
                      <button onClick={() => onPreview(editForm.html_content)} style={{ padding: '8px 16px', border: '1px solid #0A84FF', borderRadius: '8px', background: 'transparent', color: '#0A84FF', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>👁️ Preview</button>
                    )}
                    <button onClick={handleSave} style={{ padding: '8px 16px', border: 'none', borderRadius: '8px', background: '#FF9500', color: '#000', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}>💾 Lưu</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Arrow connectors between steps */}
      {templates.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px', color: '#555' }}>
          <p style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.4 }}>📝</p>
          <p style={{ fontSize: '14px', fontWeight: 700, color: '#888' }}>Chưa có template nào</p>
        </div>
      )}


    </div>
  );
};

export default EmailOutreach;
