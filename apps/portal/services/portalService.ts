import { supabase } from '@/services/supabaseClient';

// Fetch all employees for directory (public info only)
export async function fetchEmployeeDirectory() {
  const { data, error } = await supabase
    .from('hr_employees')
    .select(`
      id, full_name, email, work_email, phone, position, avatar_url, status, type,
      department_id, date_of_birth, address
    `)
    .eq('status', 'active')
    .in('type', ['fulltime', 'parttime'])
    .order('full_name');
  if (error) throw error;
  return data || [];
}

// Fetch departments for mapping
export async function fetchDepartments() {
  const { data, error } = await supabase
    .from('hr_departments')
    .select('id, name')
    .order('name');
  if (error) throw error;
  return data || [];
}

// Fetch my payroll records — only from CONFIRMED payroll sheets
export async function fetchMyPayslips(employeeId: string) {
  // 1. Get confirmed sheet IDs
  const { data: confirmedSheets } = await supabase
    .from('pay_payroll_sheets')
    .select('id')
    .eq('status', 'confirmed');

  if (!confirmedSheets || confirmedSheets.length === 0) return [];

  const sheetIds = confirmedSheets.map(s => s.id);

  // 2. Fetch records only from confirmed sheets
  const { data, error } = await supabase
    .from('pay_payroll_records')
    .select('*, sheet:pay_payroll_sheets(*)')
    .eq('employee_id', employeeId)
    .in('sheet_id', sheetIds)
    .order('created_at', { ascending: false });
  if (error && error.code !== '42P01') throw error;
  return data || [];
}

// Fetch my monthly attendance records — only from FINALIZED attendance sheets
export async function fetchMyAttendance(employeeId: string) {
  // 1. Get finalized sheet IDs
  const { data: finalizedSheets } = await supabase
    .from('att_monthly_sheets')
    .select('id')
    .eq('status', 'finalized');

  if (!finalizedSheets || finalizedSheets.length === 0) return [];

  const sheetIds = finalizedSheets.map(s => s.id);

  // 2. Fetch records only from finalized sheets
  const { data, error } = await supabase
    .from('att_monthly_records')
    .select('*, sheet:att_monthly_sheets(*)')
    .eq('employee_id', employeeId)
    .in('sheet_id', sheetIds)
    .order('created_at', { ascending: false });
  if (error && error.code !== '42P01') throw error;
  return data || [];
}

// Fetch full profile for the logged-in employee
export async function fetchMyProfile(employeeId: string) {
  const { data, error } = await supabase
    .from('hr_employees')
    .select('*, department:hr_departments!hr_employees_department_id_fkey(*)')
    .eq('id', employeeId)
    .single();
  if (error) throw error;
  return data;
}

// Update profile — only allow employee-editable fields
const EMPLOYEE_EDITABLE_FIELDS = [
  'full_name', 'email', 'phone', 'date_of_birth', 'gender', 'nationality',
  'address', 'temp_address', 'id_number', 'id_issue_date', 'id_issue_place',
  'avatar_url', 'id_card_front_url', 'id_card_back_url',
  'tax_code', 'insurance_number',
  'bank_name', 'bank_account', 'bank_branch',
];

export async function updateMyProfile(employeeId: string, updates: Record<string, any>) {
  // Filter to only allow editable fields
  const safeUpdates: Record<string, any> = {};
  for (const key of EMPLOYEE_EDITABLE_FIELDS) {
    if (key in updates) safeUpdates[key] = updates[key];
  }
  safeUpdates.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from('hr_employees')
    .update(safeUpdates)
    .eq('id', employeeId);
  if (error) throw error;
}
