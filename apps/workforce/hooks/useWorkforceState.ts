import { useState, useEffect, useCallback } from 'react';
import { Worker, WorkerContract, WorkforceTask, Settlement } from '@/types';
import * as svc from '../services/workforceService';

export type WorkforceTab = 'workers' | 'workerForm' | 'tasks' | 'settlements' | 'config';

export function useWorkforceState(currentUsername: string) {
  const [activeTab, setActiveTab] = useState<WorkforceTab>('workers');
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // ── Data ──
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [contracts, setContracts] = useState<WorkerContract[]>([]);
  const [tasks, setTasks] = useState<WorkforceTask[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);

  // ── Edit state ──
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);

  // ── Filters ──
  const [filterWorkerType, setFilterWorkerType] = useState('');
  const [filterTaskStatus, setFilterTaskStatus] = useState('');
  const [filterTaskWorker, setFilterTaskWorker] = useState('');

  // ── Load ──
  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [w, t, s] = await Promise.all([
        svc.fetchWorkers(),
        svc.fetchTasks(),
        svc.fetchSettlements(),
      ]);
      setWorkers(w);
      setTasks(t);
      setSettlements(s);
    } catch (e: any) {
      setToast({ message: e.message || 'Lỗi tải dữ liệu', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const loadContracts = useCallback(async (workerId: string) => {
    try {
      const c = await svc.fetchContracts(workerId);
      setContracts(c);
    } catch (e: any) {
      setToast({ message: e.message, type: 'error' });
    }
  }, []);

  // ── Worker CRUD ──
  const handleSaveWorker = async (w: Omit<Worker, 'id' | 'created_at'>) => {
    try {
      const saved = await svc.saveWorker(w);
      setWorkers(prev => [...prev, saved].sort((a, b) => a.full_name.localeCompare(b.full_name)));
      setToast({ message: 'Đã thêm nhân sự', type: 'success' });
      setActiveTab('workers');
    } catch (e: any) {
      setToast({ message: e.message, type: 'error' });
    }
  };

  const handleUpdateWorker = async (id: string, updates: Partial<Worker>) => {
    try {
      await svc.updateWorker(id, updates);
      setWorkers(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
      setToast({ message: 'Đã cập nhật', type: 'success' });
      setEditingWorker(null);
      setActiveTab('workers');
    } catch (e: any) {
      setToast({ message: e.message, type: 'error' });
    }
  };

  const handleDeleteWorker = async (id: string) => {
    try {
      await svc.deleteWorker(id);
      setWorkers(prev => prev.filter(w => w.id !== id));
      setToast({ message: 'Đã xóa', type: 'success' });
    } catch (e: any) {
      setToast({ message: e.message, type: 'error' });
    }
  };

  // ── Contract CRUD ──
  const handleSaveContract = async (c: Omit<WorkerContract, 'id' | 'created_at'>) => {
    try {
      const saved = await svc.saveContract(c);
      setContracts(prev => [saved, ...prev]);
      setToast({ message: 'Đã thêm hợp đồng', type: 'success' });
    } catch (e: any) {
      setToast({ message: e.message, type: 'error' });
    }
  };

  const handleUpdateContract = async (id: string, updates: Partial<WorkerContract>) => {
    try {
      await svc.updateContract(id, updates);
      setContracts(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
      setToast({ message: 'Đã cập nhật hợp đồng', type: 'success' });
    } catch (e: any) {
      setToast({ message: e.message, type: 'error' });
    }
  };

  const handleDeleteContract = async (id: string) => {
    try {
      await svc.deleteContract(id);
      setContracts(prev => prev.filter(c => c.id !== id));
      setToast({ message: 'Đã xóa hợp đồng', type: 'success' });
    } catch (e: any) {
      setToast({ message: e.message, type: 'error' });
    }
  };

  // ── Task CRUD ──
  const handleSaveTask = async (t: Omit<WorkforceTask, 'id' | 'created_at' | 'updated_at' | 'worker'>) => {
    try {
      const saved = await svc.saveTask(t);
      setTasks(prev => [saved, ...prev]);
      setToast({ message: 'Đã thêm task', type: 'success' });
    } catch (e: any) {
      setToast({ message: e.message, type: 'error' });
    }
  };

  const handleUpdateTask = async (id: string, updates: Partial<WorkforceTask>) => {
    try {
      await svc.updateTask(id, updates);
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
      setToast({ message: 'Đã cập nhật task', type: 'success' });
    } catch (e: any) {
      setToast({ message: e.message, type: 'error' });
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await svc.deleteTask(id);
      setTasks(prev => prev.filter(t => t.id !== id));
      setToast({ message: 'Đã xóa task', type: 'success' });
    } catch (e: any) {
      setToast({ message: e.message, type: 'error' });
    }
  };

  // ── Settlement ──
  const handleCreateSettlement = async (
    workerId: string,
    period: string,
    taskIds: string[],
    totalAmount: number,
    currency: string,
    notes: string
  ) => {
    try {
      const saved = await svc.createSettlement(workerId, period, taskIds, totalAmount, currency, notes);
      setSettlements(prev => [saved, ...prev]);
      // Refresh tasks since they've been marked approved
      const updatedTasks = await svc.fetchTasks();
      setTasks(updatedTasks);
      setToast({ message: 'Đã tạo nghiệm thu', type: 'success' });
    } catch (e: any) {
      setToast({ message: e.message, type: 'error' });
    }
  };

  const handleUpdateSettlement = async (id: string, updates: Partial<Settlement>) => {
    try {
      await svc.updateSettlement(id, updates);
      setSettlements(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
      setToast({ message: 'Đã cập nhật nghiệm thu', type: 'success' });
    } catch (e: any) {
      setToast({ message: e.message, type: 'error' });
    }
  };

  const handleDeleteSettlement = async (id: string) => {
    try {
      await svc.deleteSettlement(id);
      setSettlements(prev => prev.filter(s => s.id !== id));
      setToast({ message: 'Đã xóa nghiệm thu', type: 'success' });
    } catch (e: any) {
      setToast({ message: e.message, type: 'error' });
    }
  };

  // ── Filtered data ──
  const filteredWorkers = workers.filter(w => {
    if (filterWorkerType && w.type !== filterWorkerType) return false;
    return true;
  });

  const filteredTasks = tasks.filter(t => {
    if (filterTaskStatus && t.status !== filterTaskStatus) return false;
    if (filterTaskWorker && t.worker_id !== filterTaskWorker) return false;
    return true;
  });

  return {
    activeTab, setActiveTab,
    isLoading, toast, setToast,
    workers, filteredWorkers,
    contracts, loadContracts,
    tasks, filteredTasks,
    settlements,
    editingWorker, setEditingWorker,
    selectedWorkerId, setSelectedWorkerId,
    filterWorkerType, setFilterWorkerType,
    filterTaskStatus, setFilterTaskStatus,
    filterTaskWorker, setFilterTaskWorker,
    handleSaveWorker, handleUpdateWorker, handleDeleteWorker,
    handleSaveContract, handleUpdateContract, handleDeleteContract,
    handleSaveTask, handleUpdateTask, handleDeleteTask,
    handleCreateSettlement, handleUpdateSettlement, handleDeleteSettlement,
    loadAll,
  };
}
