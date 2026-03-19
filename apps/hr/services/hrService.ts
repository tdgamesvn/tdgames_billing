import { supabase } from '@/services/supabaseClient';
import {
  HrEmployee, HrDepartment, HrContract, HrPositionHistory,
  HrEvaluation, HrProjectHistory, HrDocument, HrReminder,
  HrSalaryComponent, HrEmployeeSalary,
  HrDependent, HrDependentDocument,
} from '@/types';

// ══════════════════════════════════════════════════════════════
// ── Employees ─────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════

export async function fetchEmployees(): Promise<HrEmployee[]> {
  const { data, error } = await supabase
    .from('hr_employees')
    .select('*, department:hr_departments!hr_employees_department_id_fkey(*)')
    .order('full_name');
  if (error) throw error;
  return data || [];
}

export async function saveEmployee(
  emp: Omit<HrEmployee, 'id' | 'employee_code' | 'created_at' | 'updated_at' | 'department'>
): Promise<HrEmployee> {
  const { data, error } = await supabase
    .from('hr_employees')
    .insert(emp)
    .select('*, department:hr_departments!hr_employees_department_id_fkey(*)')
    .single();
  if (error) throw error;

  // Auto-create Supabase Auth account for fulltime/parttime employees using work_email
  if (data.work_email && (data.type === 'fulltime' || data.type === 'parttime')) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-employee-auth`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ email: data.work_email, full_name: data.full_name, employee_id: data.id }),
        }
      );
      const result = await res.json();
      if (result.success) {
        if (result.invited) {
          console.log(`[Auth] Invite email sent to ${data.work_email}`);
        } else {
          console.log(`[Auth] Account already exists for ${data.work_email}, metadata updated`);
        }
      } else if (result.error) {
        console.warn(`[Auth] Failed to invite ${data.work_email}:`, result.error);
      }
    } catch (authErr) {
      console.warn('[Auth] Failed to auto-create auth account:', authErr);
    }
  }

  return data;
}

export async function updateEmployee(id: string, updates: Partial<HrEmployee>): Promise<void> {
  const { department, ...clean } = updates as any;
  const { error } = await supabase
    .from('hr_employees')
    .update({ ...clean, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteEmployee(id: string): Promise<void> {
  const { error } = await supabase.from('hr_employees').delete().eq('id', id);
  if (error) throw error;
}

// ══════════════════════════════════════════════════════════════
// ── Departments ───────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════

export async function fetchDepartments(): Promise<HrDepartment[]> {
  const { data, error } = await supabase
    .from('hr_departments')
    .select('*')
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function saveDepartment(
  dept: Omit<HrDepartment, 'id' | 'created_at'>
): Promise<HrDepartment> {
  const { data, error } = await supabase
    .from('hr_departments')
    .insert(dept)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateDepartment(id: string, updates: Partial<HrDepartment>): Promise<void> {
  const { error } = await supabase.from('hr_departments').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteDepartment(id: string): Promise<void> {
  const { error } = await supabase.from('hr_departments').delete().eq('id', id);
  if (error) throw error;
}

// ══════════════════════════════════════════════════════════════
// ── Contracts ─────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════

export async function fetchContracts(employeeId?: string): Promise<HrContract[]> {
  let q = supabase.from('hr_contracts').select('*').order('start_date', { ascending: false });
  if (employeeId) q = q.eq('employee_id', employeeId);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function saveContract(
  contract: Omit<HrContract, 'id' | 'created_at'>
): Promise<HrContract> {
  const { data, error } = await supabase
    .from('hr_contracts')
    .insert(contract)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateContract(id: string, updates: Partial<HrContract>): Promise<void> {
  const { error } = await supabase.from('hr_contracts').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteContract(id: string): Promise<void> {
  const { error } = await supabase.from('hr_contracts').delete().eq('id', id);
  if (error) throw error;
}

// ══════════════════════════════════════════════════════════════
// ── Position History ──────────────────────────────────────────
// ══════════════════════════════════════════════════════════════

export async function fetchPositionHistory(employeeId: string): Promise<HrPositionHistory[]> {
  const { data, error } = await supabase
    .from('hr_position_history')
    .select('*')
    .eq('employee_id', employeeId)
    .order('effective_date', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addPositionChange(
  change: Omit<HrPositionHistory, 'id' | 'created_at'>
): Promise<HrPositionHistory> {
  const { data, error } = await supabase
    .from('hr_position_history')
    .insert(change)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ══════════════════════════════════════════════════════════════
// ── Evaluations ───────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════

export async function fetchEvaluations(employeeId?: string): Promise<HrEvaluation[]> {
  let q = supabase.from('hr_evaluations').select('*').order('created_at', { ascending: false });
  if (employeeId) q = q.eq('employee_id', employeeId);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function saveEvaluation(
  ev: Omit<HrEvaluation, 'id' | 'created_at'>
): Promise<HrEvaluation> {
  const { data, error } = await supabase
    .from('hr_evaluations')
    .insert(ev)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateEvaluation(id: string, updates: Partial<HrEvaluation>): Promise<void> {
  const { error } = await supabase.from('hr_evaluations').update(updates).eq('id', id);
  if (error) throw error;
}

// ══════════════════════════════════════════════════════════════
// ── Project History ───────────────────────────────────────────
// ══════════════════════════════════════════════════════════════

export async function fetchProjectHistory(employeeId: string): Promise<HrProjectHistory[]> {
  const { data, error } = await supabase
    .from('hr_project_history')
    .select('*')
    .eq('employee_id', employeeId)
    .order('start_date', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function saveProjectHistory(
  ph: Omit<HrProjectHistory, 'id' | 'created_at'>
): Promise<HrProjectHistory> {
  const { data, error } = await supabase.from('hr_project_history').insert(ph).select().single();
  if (error) throw error;
  return data;
}

export async function deleteProjectHistory(id: string): Promise<void> {
  const { error } = await supabase.from('hr_project_history').delete().eq('id', id);
  if (error) throw error;
}

// ══════════════════════════════════════════════════════════════
// ── Documents ─────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════

export async function fetchDocuments(employeeId?: string): Promise<HrDocument[]> {
  let q = supabase.from('hr_documents').select('*').order('created_at', { ascending: false });
  if (employeeId) q = q.eq('employee_id', employeeId);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function saveDocument(
  doc: Omit<HrDocument, 'id' | 'created_at'>
): Promise<HrDocument> {
  const { data, error } = await supabase.from('hr_documents').insert(doc).select().single();
  if (error) throw error;
  return data;
}

export async function updateDocument(id: string, updates: Partial<HrDocument>): Promise<void> {
  const { error } = await supabase.from('hr_documents').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteDocument(id: string): Promise<void> {
  const { error } = await supabase.from('hr_documents').delete().eq('id', id);
  if (error) throw error;
}

// ══════════════════════════════════════════════════════════════
// ── R2 File Upload ────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════

const R2_UPLOAD_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/r2-expense-upload`;
const R2_PUBLIC_BASE = import.meta.env.VITE_R2_PUBLIC_URL || '';
const MAX_FILE_SIZE_MB = 20;

export function toPublicUrl(url: string): string {
  if (!url || !R2_PUBLIC_BASE) return url;
  const r2Match = url.match(/https:\/\/[a-f0-9]+\.r2\.cloudflarestorage\.com\/(.+)/);
  if (r2Match) return `${R2_PUBLIC_BASE}/${r2Match[1]}`;
  return url;
}

export async function uploadFileToR2(file: File): Promise<{ url: string; fileName: string; fileSize: number }> {
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    throw new Error(`File quá lớn! Tối đa ${MAX_FILE_SIZE_MB}MB.`);
  }
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(R2_UPLOAD_URL, { method: 'POST', body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return { url: data.url, fileName: file.name, fileSize: file.size };
}

// ══════════════════════════════════════════════════════════════
// ── Reminders ─────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════

export async function fetchReminders(): Promise<(HrReminder & { employee?: HrEmployee })[]> {
  const { data, error } = await supabase
    .from('hr_reminders')
    .select('*, employee:hr_employees(id, full_name, employee_code, type, status)')
    .order('due_date');
  if (error) throw error;
  return data || [];
}

export async function dismissReminder(id: string): Promise<void> {
  const { error } = await supabase
    .from('hr_reminders')
    .update({ status: 'dismissed' })
    .eq('id', id);
  if (error) throw error;
}

/**
 * Auto-generate reminders based on employee & contract data:
 * - Contract expiry (30 / 15 / 7 days)
 * - Birthday (7 days before)
 * - Probation end (7 days before)
 * - Work anniversary (7 days before)
 */
export async function generateReminders(): Promise<number> {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];

  // Fetch all employees and contracts
  const [employees, contracts, existingReminders] = await Promise.all([
    fetchEmployees(),
    fetchContracts(),
    fetchReminders(),
  ]);

  const existing = new Set(
    existingReminders
      .filter(r => r.status !== 'dismissed')
      .map(r => `${r.employee_id}|${r.type}|${r.due_date}`)
  );

  const newReminders: Omit<HrReminder, 'id' | 'created_at'>[] = [];

  const addIfNew = (r: Omit<HrReminder, 'id' | 'created_at'>) => {
    const key = `${r.employee_id}|${r.type}|${r.due_date}`;
    if (!existing.has(key)) {
      newReminders.push(r);
      existing.add(key);
    }
  };

  for (const emp of employees) {
    if (emp.status !== 'active') continue;

    // Birthday
    if (emp.date_of_birth) {
      const dob = new Date(emp.date_of_birth);
      const thisYear = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
      const diff = Math.ceil((thisYear.getTime() - today.getTime()) / 86400000);
      if (diff >= 0 && diff <= 7) {
        addIfNew({
          employee_id: emp.id, type: 'birthday',
          title: `🎂 Sinh nhật ${emp.full_name}`,
          due_date: fmt(thisYear), status: 'pending', notes: '',
        });
      }
    }

    // Probation end
    if (emp.probation_end) {
      const probEnd = new Date(emp.probation_end);
      const diff = Math.ceil((probEnd.getTime() - today.getTime()) / 86400000);
      if (diff >= 0 && diff <= 15) {
        addIfNew({
          employee_id: emp.id, type: 'probation_end',
          title: `📋 Hết thử việc: ${emp.full_name}`,
          due_date: emp.probation_end, status: 'pending', notes: '',
        });
      }
    }

    // Work anniversary
    if (emp.start_date) {
      const start = new Date(emp.start_date);
      const anni = new Date(today.getFullYear(), start.getMonth(), start.getDate());
      const diff = Math.ceil((anni.getTime() - today.getTime()) / 86400000);
      if (diff >= 0 && diff <= 7) {
        const years = today.getFullYear() - start.getFullYear();
        if (years > 0) {
          addIfNew({
            employee_id: emp.id, type: 'anniversary',
            title: `🎉 Kỷ niệm ${years} năm: ${emp.full_name}`,
            due_date: fmt(anni), status: 'pending', notes: '',
          });
        }
      }
    }
  }

  // Contract expiry
  for (const c of contracts) {
    if (c.status !== 'active' || !c.end_date) continue;
    const end = new Date(c.end_date);
    const diff = Math.ceil((end.getTime() - today.getTime()) / 86400000);
    for (const threshold of [30, 15, 7]) {
      if (diff >= 0 && diff <= threshold) {
        addIfNew({
          employee_id: c.employee_id, type: 'contract_expiry',
          title: `⚠️ HĐ "${c.title}" hết hạn trong ${diff} ngày`,
          due_date: c.end_date, status: 'pending', notes: `Contract: ${c.contract_number || c.title}`,
        });
        break; // Only one reminder per contract
      }
    }
  }

  // Insert new reminders
  if (newReminders.length > 0) {
    const { error } = await supabase.from('hr_reminders').insert(newReminders);
    if (error) throw error;
  }

  return newReminders.length;
}

// ══════════════════════════════════════════════════════════════
// ── Salary Components ─────────────────────────────────────────
// ══════════════════════════════════════════════════════════════

export async function fetchSalaryComponents(): Promise<HrSalaryComponent[]> {
  const { data, error } = await supabase
    .from('hr_salary_components')
    .select('*')
    .order('sort_order');
  if (error) throw error;
  return data || [];
}

export async function saveSalaryComponent(
  comp: Omit<HrSalaryComponent, 'id' | 'created_at'>
): Promise<HrSalaryComponent> {
  const { data, error } = await supabase
    .from('hr_salary_components')
    .insert(comp)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateSalaryComponent(id: string, updates: Partial<HrSalaryComponent>): Promise<void> {
  const { error } = await supabase.from('hr_salary_components').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteSalaryComponent(id: string): Promise<void> {
  const { error } = await supabase.from('hr_salary_components').delete().eq('id', id);
  if (error) throw error;
}

// ══════════════════════════════════════════════════════════════
// ── Employee Salary ───────────────────────────────────────────
// ══════════════════════════════════════════════════════════════

export async function fetchEmployeeSalary(employeeId: string): Promise<HrEmployeeSalary[]> {
  const { data, error } = await supabase
    .from('hr_employee_salary')
    .select('*, component:hr_salary_components(*)')
    .eq('employee_id', employeeId)
    .order('created_at');
  if (error) throw error;
  return data || [];
}

export async function saveEmployeeSalary(
  es: Omit<HrEmployeeSalary, 'id' | 'created_at' | 'component'>
): Promise<HrEmployeeSalary> {
  const { data, error } = await supabase
    .from('hr_employee_salary')
    .insert(es)
    .select('*, component:hr_salary_components(*)')
    .single();
  if (error) throw error;
  return data;
}

export async function updateEmployeeSalary(id: string, updates: Partial<HrEmployeeSalary>): Promise<void> {
  const { component, ...clean } = updates as any;
  const { error } = await supabase.from('hr_employee_salary').update(clean).eq('id', id);
  if (error) throw error;
}

export async function deleteEmployeeSalary(id: string): Promise<void> {
  const { error } = await supabase.from('hr_employee_salary').delete().eq('id', id);
  if (error) throw error;
}

// ══════════════════════════════════════════════════════════════
// ── Dependents (Người phụ thuộc) ──────────────────────────────
// ══════════════════════════════════════════════════════════════

export async function fetchDependents(employeeId: string): Promise<HrDependent[]> {
  const { data, error } = await supabase
    .from('hr_dependents')
    .select('*, documents:hr_dependent_documents(*)')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function saveDependent(dep: Omit<HrDependent, 'id' | 'created_at' | 'documents'>): Promise<HrDependent> {
  const { data, error } = await supabase
    .from('hr_dependents')
    .insert(dep)
    .select('*, documents:hr_dependent_documents(*)')
    .single();
  if (error) throw error;
  return data;
}

export async function updateDependent(id: string, updates: Partial<HrDependent>): Promise<void> {
  const { documents, ...clean } = updates as any;
  const { error } = await supabase.from('hr_dependents').update(clean).eq('id', id);
  if (error) throw error;
}

export async function deleteDependent(id: string): Promise<void> {
  const { error } = await supabase.from('hr_dependents').delete().eq('id', id);
  if (error) throw error;
}

export async function saveDependentDocument(doc: Omit<HrDependentDocument, 'id' | 'created_at'>): Promise<HrDependentDocument> {
  const { data, error } = await supabase
    .from('hr_dependent_documents')
    .insert(doc)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDependentDocument(id: string): Promise<void> {
  const { error } = await supabase.from('hr_dependent_documents').delete().eq('id', id);
  if (error) throw error;
}
