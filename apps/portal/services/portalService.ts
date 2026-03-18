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
