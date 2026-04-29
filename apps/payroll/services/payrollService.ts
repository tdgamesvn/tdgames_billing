import { supabase } from '@/services/supabaseClient';
import {
  PayPayrollSheet, PayPayrollRecord,
  HrEmployee, HrEmployeeSalary,
} from '@/types';

// ══════════════════════════════════════════════════════════
// ── Constants ─────────────────────────────────────────────
// ══════════════════════════════════════════════════════════

const STANDARD_DAYS = 22;
const HOURS_PER_DAY = 8;
const BH_EMPLOYEE_RATE = 0.105;  // 10.5%
const BH_COMPANY_RATE = 0.215;   // 21.5%
const PERSONAL_DEDUCTION = 15_500_000;
const DEPENDENT_DEDUCTION = 6_200_000;
const OT_RATE_WEEKDAY = 1.5;     // 150% for weekday overtime

// Tax brackets (progressive, 5-bracket shortcut)
const TAX_BRACKETS: { limit: number; rate: number; deduction: number }[] = [
  { limit: 10_000_000,   rate: 0.05, deduction: 0 },
  { limit: 30_000_000,   rate: 0.10, deduction: 500_000 },
  { limit: 60_000_000,   rate: 0.20, deduction: 3_500_000 },
  { limit: 100_000_000,  rate: 0.30, deduction: 9_500_000 },
  { limit: Infinity,     rate: 0.35, deduction: 14_500_000 },
];

// ══════════════════════════════════════════════════════════
// ── Core: calculatePayroll (pure function, 8 steps) ──────
// ══════════════════════════════════════════════════════════

interface PayrollInput {
  workDays: number;
  baseSalary: number;
  lunchAllowance: number;
  transportAllowance: number;
  phoneAllowance: number;
  clothingAllowance: number;
  kpiAllowance: number;
  defaultOt: number;
  extraOtHours: number;
  dependentsCount: number;
  isProbation: boolean;
}

interface PayrollOutput {
  grossRef: number;
  grossActual: number;
  extraOt: number;
  employeeBhxh: number;
  taxableIncome: number;
  assessableIncome: number;
  pit: number;
  netSalary: number;
  companyBhxh: number;
  totalCompanyCost: number;
}

export function calculatePayroll(input: PayrollInput): PayrollOutput {
  const r = (v: number) => Math.round(v); // round to đồng

  // [BƯỚC 1] Tỷ lệ ngày công
  const ratio = input.workDays / STANDARD_DAYS;

  // [BƯỚC 2] Lương thực tế
  const baseSalaryActual = r(input.baseSalary * ratio);
  const lunchActual = r(input.lunchAllowance * ratio);
  const transportActual = r(input.transportAllowance * ratio);
  const phoneActual = r(input.phoneAllowance * ratio);
  const clothingActual = r(input.clothingAllowance * ratio);
  const kpiActual = r(input.kpiAllowance * ratio);
  const defaultOtActual = r(input.defaultOt * ratio);

  // Tăng ca phát sinh: hours → money (Lương giờ × 150% × hours)
  const hourlyRate = input.baseSalary / STANDARD_DAYS / HOURS_PER_DAY;
  const extraOt = r(hourlyRate * OT_RATE_WEEKDAY * input.extraOtHours);

  const grossRef = r(input.baseSalary + input.lunchAllowance + input.transportAllowance
    + input.phoneAllowance + input.clothingAllowance + input.kpiAllowance + input.defaultOt);

  const grossActual = baseSalaryActual + lunchActual + transportActual
    + phoneActual + clothingActual + kpiActual + defaultOtActual + extraOt;

  // ── PROBATION: Không đóng BH, thuế TNCN 10% trên thu nhập chịu thuế ──
  if (input.isProbation) {
    const employeeBhxh = 0;
    // Thu nhập chịu thuế: CB + Xăng xe + ĐT + KPI (không gồm ăn trưa, trang phục, tăng ca)
    const taxableIncome = baseSalaryActual + transportActual + phoneActual + kpiActual;
    const assessableIncome = taxableIncome;
    const pit = r(taxableIncome * 0.10); // 10% cố định
    const netSalary = grossActual - pit;
    const companyBhxh = 0;
    const totalCompanyCost = grossActual;

    return {
      grossRef, grossActual, extraOt,
      employeeBhxh, taxableIncome, assessableIncome,
      pit, netSalary, companyBhxh, totalCompanyCost,
    };
  }

  // ── CHÍNH THỨC: Đóng BH + Thuế lũy tiến ──
  // [BƯỚC 3] Bảo hiểm nhân viên (Tính trên lương cơ bản cố định)
  const employeeBhxh = r(input.baseSalary * BH_EMPLOYEE_RATE);

  // [BƯỚC 4] Thu nhập chịu thuế (CB + Xăng xe + ĐT + KPI — không gồm ăn trưa, trang phục, tăng ca)
  const taxableIncome = baseSalaryActual + transportActual + phoneActual + kpiActual;

  // [BƯỚC 5] Thu nhập tính thuế
  let assessableIncome = taxableIncome - employeeBhxh
    - PERSONAL_DEDUCTION
    - (input.dependentsCount * DEPENDENT_DEDUCTION);
  if (assessableIncome < 0) assessableIncome = 0;

  // [BƯỚC 6] Thuế TNCN (tra biểu thuế lũy tiến)
  let pit = 0;
  if (assessableIncome > 0) {
    for (const bracket of TAX_BRACKETS) {
      if (assessableIncome <= bracket.limit) {
        pit = r(assessableIncome * bracket.rate - bracket.deduction);
        break;
      }
    }
  }

  // [BƯỚC 7] Net thực lĩnh
  const netSalary = grossActual - employeeBhxh - pit;

  // [BƯỚC 8] Chi phí công ty (Tính trên lương cơ bản cố định)
  const companyBhxh = r(input.baseSalary * BH_COMPANY_RATE);
  const totalCompanyCost = grossActual + companyBhxh;

  return {
    grossRef, grossActual, extraOt,
    employeeBhxh, taxableIncome, assessableIncome,
    pit, netSalary, companyBhxh, totalCompanyCost,
  };
}

// ══════════════════════════════════════════════════════════
// ── CRUD: Payroll Sheets ─────────────────────────────────
// ══════════════════════════════════════════════════════════

export async function fetchPayrollSheets(): Promise<PayPayrollSheet[]> {
  const { data, error } = await supabase
    .from('pay_payroll_sheets')
    .select('*')
    .order('year', { ascending: false })
    .order('month', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function deletePayrollSheet(id: string): Promise<void> {
  const { error } = await supabase.from('pay_payroll_sheets').delete().eq('id', id);
  if (error) throw error;
}

export async function updateSheetStatus(id: string, status: PayPayrollSheet['status']): Promise<void> {
  const { error } = await supabase.from('pay_payroll_sheets').update({ status }).eq('id', id);
  if (error) throw error;
}

// ══════════════════════════════════════════════════════════
// ── CRUD: Payroll Records ────────────────────────────────
// ══════════════════════════════════════════════════════════

export async function fetchPayrollRecords(sheetId: string): Promise<PayPayrollRecord[]> {
  const { data, error } = await supabase
    .from('pay_payroll_records')
    .select('*, employee:hr_employees(*)')
    .eq('sheet_id', sheetId)
    .order('created_at');
  if (error) throw error;
  return data || [];
}

export async function updatePayrollRecord(id: string, updates: Partial<PayPayrollRecord>): Promise<void> {
  const { employee, ...clean } = updates as any;
  const { error } = await supabase.from('pay_payroll_records').update(clean).eq('id', id);
  if (error) throw error;
}

// ══════════════════════════════════════════════════════════
// ── Create Payroll Sheet (auto-populate from HR + Att) ───
// ══════════════════════════════════════════════════════════

// Map salary component names → record field
const SALARY_NAME_MAP: Record<string, keyof PayPayrollRecord> = {
  'Lương cơ bản': 'base_salary',
  'Phụ cấp ăn trưa': 'lunch_allowance',
  'Phụ cấp xăng xe': 'transport_allowance',
  'Phụ cấp điện thoại': 'phone_allowance',
  'Phụ cấp trang phục': 'clothing_allowance',
  'Phụ cấp năng suất (KPI)': 'kpi_allowance',
  'Tăng ca': 'default_ot',
};

export async function createPayrollSheet(
  month: number, year: number
): Promise<{ sheet: PayPayrollSheet; records: PayPayrollRecord[] }> {
  // 1. Create sheet
  const title = `Bảng lương Tháng ${month}/${year}`;
  const { data: sheet, error: sheetErr } = await supabase
    .from('pay_payroll_sheets')
    .insert({ month, year, title })
    .select()
    .single();
  if (sheetErr) throw sheetErr;

  // 2. Fetch all fulltime employees
  const { data: employees } = await supabase
    .from('hr_employees')
    .select('*')
    .eq('type', 'fulltime')
    .eq('status', 'active');

  if (!employees?.length) return { sheet, records: [] };

  // 3. Fetch employee salary data
  const { data: salaryRows } = await supabase
    .from('hr_employee_salary')
    .select('*, component:hr_salary_components(name)')
    .in('employee_id', employees.map(e => e.id));

  // 4. Fetch monthly sheet records (attendance) for this month
  const { data: attSheets } = await supabase
    .from('att_monthly_sheets')
    .select('id')
    .eq('month', month)
    .eq('year', year);

  let attRecords: any[] = [];
  if (attSheets?.length) {
    const { data } = await supabase
      .from('att_monthly_records')
      .select('*')
      .eq('sheet_id', attSheets[0].id);
    attRecords = data || [];
  }

  // 5. Fetch dependents count per employee
  const { data: dependents } = await supabase
    .from('hr_dependents')
    .select('employee_id')
    .eq('status', 'active')
    .in('employee_id', employees.map(e => e.id));

  const depCountMap: Record<string, number> = {};
  (dependents || []).forEach(d => {
    depCountMap[d.employee_id] = (depCountMap[d.employee_id] || 0) + 1;
  });

  // 6. Build records
  // Determine last day of payroll month to check probation status
  const payrollLastDay = new Date(year, month, 0); // last day of this month

  const rows = employees.map(emp => {
    // Salary components for this employee
    const empSalary = (salaryRows || []).filter(s => s.employee_id === emp.id);
    const salaryMap: Record<string, number> = {};
    empSalary.forEach(s => {
      const compName = s.component?.name || '';
      const field = SALARY_NAME_MAP[compName];
      if (field) salaryMap[field] = s.amount || 0;
    });

    // Attendance data
    const attRec = attRecords.find(r => r.employee_id === emp.id);
    const workDays = attRec?.work_days ?? STANDARD_DAYS;
    const extraOtHours = attRec?.ot_hours ?? 0;

    // Probation check: NV thử việc nếu probation_end > ngày cuối tháng lương
    const isProbation = emp.probation_end
      ? new Date(emp.probation_end) > payrollLastDay
      : false;

    const input: PayrollInput = {
      workDays,
      baseSalary: salaryMap.base_salary || 0,
      lunchAllowance: salaryMap.lunch_allowance || 0,
      transportAllowance: salaryMap.transport_allowance || 0,
      phoneAllowance: salaryMap.phone_allowance || 0,
      clothingAllowance: salaryMap.clothing_allowance || 0,
      kpiAllowance: salaryMap.kpi_allowance || 0,
      defaultOt: salaryMap.default_ot || 0,
      extraOtHours,
      dependentsCount: depCountMap[emp.id] || 0,
      isProbation,
    };

    const output = calculatePayroll(input);

    return {
      sheet_id: sheet.id,
      employee_id: emp.id,
      work_days: input.workDays,
      base_salary: input.baseSalary,
      lunch_allowance: input.lunchAllowance,
      transport_allowance: input.transportAllowance,
      phone_allowance: input.phoneAllowance,
      clothing_allowance: input.clothingAllowance,
      kpi_allowance: input.kpiAllowance,
      default_ot: input.defaultOt,
      extra_ot_hours: input.extraOtHours,
      extra_ot: output.extraOt,
      dependents_count: input.dependentsCount,
      is_probation: isProbation,
      gross_ref: output.grossRef,
      gross_actual: output.grossActual,
      employee_bhxh: output.employeeBhxh,
      taxable_income: output.taxableIncome,
      assessable_income: output.assessableIncome,
      pit: output.pit,
      net_salary: output.netSalary,
      company_bhxh: output.companyBhxh,
      total_company_cost: output.totalCompanyCost,
    };
  });

  const { data: records, error: recErr } = await supabase
    .from('pay_payroll_records')
    .insert(rows)
    .select('*, employee:hr_employees(*)');
  if (recErr) throw recErr;

  return { sheet, records: records || [] };
}

// ══════════════════════════════════════════════════════════
// ── Recalculate ──────────────────────────────────────────
// ══════════════════════════════════════════════════════════

export function recalculateRecord(rec: PayPayrollRecord): PayPayrollRecord {
  const input: PayrollInput = {
    workDays: rec.work_days,
    baseSalary: rec.base_salary,
    lunchAllowance: rec.lunch_allowance,
    transportAllowance: rec.transport_allowance,
    phoneAllowance: rec.phone_allowance,
    clothingAllowance: rec.clothing_allowance,
    kpiAllowance: rec.kpi_allowance,
    defaultOt: rec.default_ot,
    extraOtHours: rec.extra_ot_hours,
    dependentsCount: rec.dependents_count,
    isProbation: rec.is_probation ?? false,
  };
  const output = calculatePayroll(input);
  return {
    ...rec,
    extra_ot: output.extraOt,
    gross_ref: output.grossRef,
    gross_actual: output.grossActual,
    employee_bhxh: output.employeeBhxh,
    taxable_income: output.taxableIncome,
    assessable_income: output.assessableIncome,
    pit: output.pit,
    net_salary: output.netSalary,
    company_bhxh: output.companyBhxh,
    total_company_cost: output.totalCompanyCost,
  };
}

export async function recalculateAndSave(rec: PayPayrollRecord): Promise<PayPayrollRecord> {
  const updated = recalculateRecord(rec);
  const { employee, ...clean } = updated as any;
  await updatePayrollRecord(updated.id, clean);
  return updated;
}
