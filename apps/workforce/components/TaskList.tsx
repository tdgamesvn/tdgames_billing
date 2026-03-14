import React, { useState, useEffect } from 'react';
import { Worker, WorkforceTask } from '@/types';
import * as clickup from '../services/clickupService';
import { ClickUpConfig, ClickUpSpace, ClickUpList } from '../services/clickupService';
import * as wfSvc from '../services/workforceService';

interface TaskListProps {
  tasks: WorkforceTask[];
  workers: Worker[];
  isLoading: boolean;
  filterStatus: string;
  setFilterStatus: (v: string) => void;
  filterWorker: string;
  setFilterWorker: (v: string) => void;
  onUpdate: (id: string, updates: Partial<WorkforceTask>) => void;
  onRefresh: () => void;
  onToast: (msg: string, type: 'success' | 'error') => void;
}

const STATUS_LABELS: Record<string, string> = {
  in_progress: 'Đang làm',
  completed: 'Hoàn thành',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
};

const TaskList: React.FC<TaskListProps> = ({
  tasks, workers, isLoading,
  filterStatus, setFilterStatus,
  filterWorker, setFilterWorker,
  onUpdate, onRefresh, onToast,
}) => {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; skipped: number; total: number } | null>(null);
  const [config, setConfig] = useState<ClickUpConfig | null>(null);

  useEffect(() => {
    clickup.loadConfig().then(c => setConfig(c)).catch(() => {});
  }, []);

  const totalPrice = tasks.reduce((s, t) => s + (t.price || 0), 0);
  const approvedCount = tasks.filter(t => t.status === 'approved').length;

  // ── Map ClickUp status → our status ──
  const mapStatus = (clickupStatus: string): WorkforceTask['status'] => {
    const lower = clickupStatus.toLowerCase();
    if (['closed', 'done', 'complete', 'approved'].some(s => lower.includes(s))) return 'approved';
    if (['review', 'qa', 'testing'].some(s => lower.includes(s))) return 'completed';
    if (['rejected', 'cancelled', 'canceled'].some(s => lower.includes(s))) return 'rejected';
    return 'in_progress';
  };

  // ── Sync from ClickUp ──
  const handleSync = async () => {
    if (!config) {
      onToast('Chưa cấu hình ClickUp — vào tab Cấu hình để thiết lập', 'error');
      return;
    }

    const selectedListIds = config.spaces
      .flatMap((sp: ClickUpSpace) => sp.lists.filter((l: ClickUpList) => l.selected).map((l: ClickUpList) => l.id));

    if (selectedListIds.length === 0) {
      onToast('Chưa chọn list nào — vào tab Cấu hình để chọn lists', 'error');
      return;
    }

    setSyncing(true);
    setSyncResult(null);
    try {
      // 1. Fetch tasks from ClickUp
      const data = await clickup.syncTasks(config.api_token, config.team_id, selectedListIds);
      const clickupTasks = data.tasks;

      // 2. Build worker email → worker map
      const emailToWorker = new Map<string, Worker>();
      for (const w of workers) {
        if (w.email) emailToWorker.set(w.email.toLowerCase(), w);
      }

      // 3. Upsert tasks matched by email
      let synced = 0;
      let skipped = 0;

      for (const ct of clickupTasks) {
        // Find matching worker by email
        let matchedWorker: Worker | undefined;
        for (const email of ct.assignee_emails) {
          matchedWorker = emailToWorker.get(email);
          if (matchedWorker) break;
        }

        if (!matchedWorker) {
          skipped++;
          continue;
        }

        // Check if task already exists
        const existing = tasks.find(t => t.clickup_task_id === ct.clickup_task_id);
        const ourStatus = mapStatus(ct.clickup_status);
        const completedAt = ct.date_done ? ct.date_done.split('T')[0] : null;

        if (existing) {
          // Update existing
          await wfSvc.updateTask(existing.id!, {
            title: ct.title,
            clickup_status: ct.clickup_status,
            status: ourStatus,
            completed_at: completedAt,
            synced_at: new Date().toISOString(),
            worker_id: matchedWorker.id!,
          });
        } else {
          // Insert new
          await wfSvc.saveTask({
            worker_id: matchedWorker.id!,
            project: ct.list_name || '',
            client_name: '',
            title: ct.title,
            clickup_task_id: ct.clickup_task_id,
            clickup_list_id: ct.clickup_list_id,
            clickup_status: ct.clickup_status,
            status: ourStatus,
            price: 0,
            currency: 'VND',
            completed_at: completedAt,
            approved_at: ourStatus === 'approved' ? (completedAt || new Date().toISOString().split('T')[0]) : null,
            notes: '',
            synced_at: new Date().toISOString(),
          });
        }
        synced++;
      }

      // 4. Update last sync time
      await clickup.updateConfigSyncTime();
      setSyncResult({ synced, skipped, total: clickupTasks.length });
      onToast(`Đồng bộ xong: ${synced} tasks synced, ${skipped} bỏ qua (không match email)`, 'success');
      onRefresh();
    } catch (e: any) {
      onToast(`Lỗi sync: ${e.message}`, 'error');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="animate-fadeInUp space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-primary uppercase tracking-tighter">Task</h2>
          <p className="text-neutral-medium text-sm mt-1">Đồng bộ task từ ClickUp theo email nhân sự</p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest bg-gradient-primary text-white shadow-btn-glow hover:shadow-btn-glow-hover transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {syncing ? '⏳ Đang sync...' : '🔄 Sync ClickUp'}
        </button>
      </div>

      {/* Sync Result */}
      {syncResult && (
        <div className="rounded-[16px] border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center gap-3">
          <span className="text-emerald-400 text-lg">✅</span>
          <div>
            <p className="text-white text-sm font-bold">Sync hoàn tất</p>
            <p className="text-neutral-medium text-xs">
              Tổng: {syncResult.total} tasks | Synced: {syncResult.synced} | Bỏ qua: {syncResult.skipped} (email không match)
            </p>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-5 rounded-[20px] border border-primary/10 bg-surface">
          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-medium mb-2">Tổng task</p>
          <p className="text-3xl font-black text-white">{tasks.length}</p>
        </div>
        <div className="p-5 rounded-[20px] border border-primary/10 bg-surface">
          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-medium mb-2">Đã duyệt</p>
          <p className="text-3xl font-black text-emerald-400">{approvedCount}</p>
        </div>
        <div className="p-5 rounded-[20px] border border-primary/10 bg-surface">
          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-medium mb-2">Tổng giá trị</p>
          <p className="text-2xl font-black text-primary">{totalPrice.toLocaleString()}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <select className="bg-surface border border-primary/10 text-neutral-light rounded-xl px-4 h-[44px] text-sm focus:outline-none focus:border-primary/40 transition-all" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="in_progress">Đang làm</option>
          <option value="completed">Hoàn thành</option>
          <option value="approved">Đã duyệt</option>
          <option value="rejected">Từ chối</option>
        </select>
        <select className="bg-surface border border-primary/10 text-neutral-light rounded-xl px-4 h-[44px] text-sm focus:outline-none focus:border-primary/40 transition-all" value={filterWorker} onChange={e => setFilterWorker(e.target.value)}>
          <option value="">Tất cả nhân sự</option>
          {workers.map(w => <option key={w.id} value={w.id}>{w.full_name}</option>)}
        </select>
        <span className="text-neutral-medium text-xs ml-auto">{tasks.length} tasks</span>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {/* Empty */}
      {!isLoading && tasks.length === 0 && (
        <div className="text-center py-20">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="w-10 h-10 text-primary/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
          </div>
          <p className="text-neutral-medium text-sm">Chưa có task nào</p>
          <p className="text-neutral-medium/60 text-xs mt-2">Nhấn "🔄 Sync ClickUp" để đồng bộ task từ ClickUp</p>
        </div>
      )}

      {/* Task Cards */}
      {!isLoading && tasks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tasks.map(t => {
            const workerName = t.worker?.full_name || workers.find(w => w.id === t.worker_id)?.full_name || 'Chưa assign';
            const isFromClickUp = !!t.clickup_task_id;
            return (
              <div key={t.id} className="group relative rounded-[20px] border border-primary/10 bg-surface overflow-hidden hover:border-primary/30 transition-all duration-300 hover:shadow-card-glow">
                <div className={`h-1 w-full bg-gradient-to-r ${
                  t.status === 'approved' ? 'from-emerald-500 to-emerald-600' :
                  t.status === 'completed' ? 'from-yellow-500 to-yellow-600' :
                  t.status === 'rejected' ? 'from-red-500 to-red-600' :
                  'from-blue-500 to-blue-600'
                }`} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-white font-bold text-sm line-clamp-2 pr-2">{t.title}</h3>
                    <span className={`shrink-0 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                      t.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                      t.status === 'completed' ? 'bg-yellow-500/20 text-yellow-400' :
                      t.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>{STATUS_LABELS[t.status]}</span>
                  </div>
                  <p className="text-neutral-medium text-xs mb-1">👤 {workerName}</p>
                  {t.project && <p className="text-neutral-medium/60 text-xs">📁 {t.project}</p>}
                  {t.client_name && <p className="text-neutral-medium/60 text-xs">🏢 {t.client_name}</p>}
                  {isFromClickUp && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-400">ClickUp</span>
                      {t.clickup_status && <span className="text-neutral-medium/50 text-[10px]">{t.clickup_status}</span>}
                    </div>
                  )}
                  <p className="text-primary font-black text-lg mt-3">
                    {t.price > 0 ? `${t.price.toLocaleString()} ` : '— '}
                    <span className="text-xs text-neutral-medium">{t.currency}</span>
                  </p>
                  {t.synced_at && (
                    <p className="text-neutral-medium/40 text-[10px] mt-1">🔄 {new Date(t.synced_at).toLocaleString('vi-VN')}</p>
                  )}
                </div>


              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TaskList;
