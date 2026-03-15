import { supabase } from '@/services/supabaseClient';
import { Worker, WorkerContract, WorkforceTask, Settlement } from '@/types';

// ── Workers ───────────────────────────────────────────────────
export async function fetchWorkers(): Promise<Worker[]> {
  const { data, error } = await supabase
    .from('wf_workers')
    .select('*')
    .order('full_name');
  if (error) throw error;
  return data || [];
}

export async function saveWorker(w: Omit<Worker, 'id' | 'created_at'>): Promise<Worker> {
  const { data, error } = await supabase
    .from('wf_workers')
    .insert(w)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateWorker(id: string, updates: Partial<Worker>): Promise<void> {
  const { error } = await supabase.from('wf_workers').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteWorker(id: string): Promise<void> {
  const { error } = await supabase.from('wf_workers').delete().eq('id', id);
  if (error) throw error;
}

// ── Contracts ─────────────────────────────────────────────────
export async function fetchContracts(workerId?: string): Promise<WorkerContract[]> {
  let q = supabase.from('wf_contracts').select('*').order('start_date', { ascending: false });
  if (workerId) q = q.eq('worker_id', workerId);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function saveContract(c: Omit<WorkerContract, 'id' | 'created_at'>): Promise<WorkerContract> {
  const { data, error } = await supabase
    .from('wf_contracts')
    .insert(c)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateContract(id: string, updates: Partial<WorkerContract>): Promise<void> {
  const { error } = await supabase.from('wf_contracts').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteContract(id: string): Promise<void> {
  const { error } = await supabase.from('wf_contracts').delete().eq('id', id);
  if (error) throw error;
}

// ── Tasks ─────────────────────────────────────────────────────
export async function fetchTasks(): Promise<WorkforceTask[]> {
  const { data, error } = await supabase
    .from('wf_tasks')
    .select('*, worker:wf_workers(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function saveTask(t: Omit<WorkforceTask, 'id' | 'created_at' | 'updated_at' | 'worker'>): Promise<WorkforceTask> {
  const { data, error } = await supabase
    .from('wf_tasks')
    .insert(t)
    .select('*, worker:wf_workers(*)')
    .single();
  if (error) throw error;
  return data;
}

export async function updateTask(id: string, updates: Partial<WorkforceTask>): Promise<void> {
  const { worker, ...clean } = updates as any;
  const { error } = await supabase
    .from('wf_tasks')
    .update({ ...clean, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('wf_tasks').delete().eq('id', id);
  if (error) throw error;
}

// ── Settlements ───────────────────────────────────────────────
export async function fetchSettlements(): Promise<Settlement[]> {
  const { data, error } = await supabase
    .from('wf_settlements')
    .select('*, worker:wf_workers(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createSettlement(
  workerId: string,
  period: string,
  taskIds: string[],
  totalAmount: number,
  currency: string,
  notes: string
): Promise<Settlement> {
  // 1. Create settlement
  const { data: settlement, error: sErr } = await supabase
    .from('wf_settlements')
    .insert({
      worker_id: workerId,
      period,
      total_tasks: taskIds.length,
      total_amount: totalAmount,
      currency,
      notes,
    })
    .select('*, worker:wf_workers(*)')
    .single();
  if (sErr) throw sErr;

  // 2. Link tasks (NO auto-mark paid — user decides when to mark paid)
  if (taskIds.length > 0) {
    const links = taskIds.map(tid => ({
      settlement_id: settlement.id,
      task_id: tid,
    }));
    const { error: lErr } = await supabase.from('wf_settlement_tasks').insert(links);
    if (lErr) throw lErr;
  }

  return settlement;
}

export async function updateSettlement(id: string, updates: Partial<Settlement>): Promise<void> {
  const { worker, tasks, ...clean } = updates as any;
  const { error } = await supabase.from('wf_settlements').update(clean).eq('id', id);
  if (error) throw error;

  // When marking as 'paid', also mark all linked tasks as paid
  if (updates.status === 'paid') {
    const { data: links } = await supabase.from('wf_settlement_tasks').select('task_id').eq('settlement_id', id);
    if (links && links.length > 0) {
      const taskIds = links.map((l: any) => l.task_id);
      await supabase
        .from('wf_tasks')
        .update({ payment_status: 'paid', updated_at: new Date().toISOString() })
        .in('id', taskIds);
    }
  }
}

export async function deleteSettlement(id: string): Promise<void> {
  // 1. Get linked task IDs before deleting
  const { data: links } = await supabase.from('wf_settlement_tasks').select('task_id').eq('settlement_id', id);

  // 2. Delete link records
  await supabase.from('wf_settlement_tasks').delete().eq('settlement_id', id);

  // 3. Rollback linked tasks to unpaid
  if (links && links.length > 0) {
    const taskIds = links.map((l: any) => l.task_id);
    await supabase
      .from('wf_tasks')
      .update({ payment_status: 'unpaid', updated_at: new Date().toISOString() })
      .in('id', taskIds);
  }

  // 4. Delete settlement
  const { error } = await supabase.from('wf_settlements').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchSettlementTasks(settlementId: string): Promise<WorkforceTask[]> {
  const { data, error } = await supabase
    .from('wf_settlement_tasks')
    .select('task:wf_tasks(*, worker:wf_workers(*))')
    .eq('settlement_id', settlementId);
  if (error) throw error;
  return (data || []).map((d: any) => d.task);
}
