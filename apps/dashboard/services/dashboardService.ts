import { supabase } from '@/services/supabaseClient';

export interface DashboardMetrics {
  // Invoice
  invoiceCount: number;
  invoicePaid: number;
  invoicePending: number;
  totalRevenue: number;

  // Expense
  expenseCount: number;
  totalExpense: number;

  // Workforce
  workerCount: number;
  taskTotal: number;
  taskCompleted: number;
  taskPending: number;
  workforcePayable: number;

  // CRM
  clientCount: number;
  projectCount: number;

  // HR
  employeeCount: number;
  departmentCount: number;
  departments: { name: string; count: number }[];

  // Payroll (latest)
  latestPayroll: {
    title: string;
    status: string;
    totalNet: number;
    totalCompanyCost: number;
    employeeCount: number;
  } | null;
}

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  // Run all queries in parallel
  const [
    invoiceRes,
    expenseRes,
    workerRes,
    taskRes,
    clientRes,
    projectRes,
    employeeRes,
    deptRes,
    payrollSheetRes,
  ] = await Promise.all([
    supabase.from('invoice_invoices').select('status, amount_received, items'),
    supabase.from('expense_expenses').select('amount, status'),
    supabase.from('wf_workers').select('id'),
    supabase.from('wf_tasks').select('status, price, currency, exchange_rate, payment_status'),
    supabase.from('crm_clients').select('id'),
    supabase.from('crm_projects').select('id'),
    supabase.from('hr_employees').select('id, status, department_id'),
    supabase.from('hr_departments').select('id, name'),
    supabase.from('pay_payroll_sheets').select('id, title, status, month, year').order('year', { ascending: false }).order('month', { ascending: false }).limit(1),
  ]);

  // ── Invoice metrics ──
  const invoices = invoiceRes.data || [];
  const invoicePaid = invoices.filter(i => i.status === 'paid').length;
  const invoicePending = invoices.filter(i => i.status !== 'paid').length;
  let totalRevenue = 0;
  for (const inv of invoices) {
    if (inv.amount_received) {
      totalRevenue += Number(inv.amount_received);
    } else if (inv.items && Array.isArray(inv.items)) {
      // Sum from items
      for (const item of inv.items) {
        totalRevenue += (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
      }
    }
  }

  // ── Expense metrics ──
  const expenses = expenseRes.data || [];
  const totalExpense = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  // ── Workforce metrics ──
  const tasks = taskRes.data || [];
  const taskCompleted = tasks.filter(t => t.status === 'completed' || t.status === 'approved').length;
  const taskPending = tasks.filter(t => t.status !== 'completed' && t.status !== 'approved').length;
  let workforcePayable = 0;
  for (const t of tasks) {
    const price = Number(t.price) || 0;
    const rate = Number(t.exchange_rate) || 1;
    workforcePayable += t.currency === 'USD' ? price * rate : price;
  }

  // ── HR deps ──
  const employees = employeeRes.data || [];
  const depts = deptRes.data || [];
  const deptNameMap: Record<string, string> = {};
  for (const d of depts) deptNameMap[d.id] = d.name;

  const activeEmployees = employees.filter((e: any) => e.status === 'active');
  const deptCountMap: Record<string, number> = {};
  for (const emp of activeEmployees) {
    const dname = deptNameMap[(emp as any).department_id] || 'Khác';
    deptCountMap[dname] = (deptCountMap[dname] || 0) + 1;
  }
  const departments = Object.entries(deptCountMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // ── Payroll ──
  let latestPayroll: DashboardMetrics['latestPayroll'] = null;
  const latestSheet = payrollSheetRes.data?.[0];
  if (latestSheet) {
    const { data: records } = await supabase
      .from('pay_payroll_records')
      .select('net_salary, total_company_cost')
      .eq('sheet_id', latestSheet.id);
    const recs = records || [];
    latestPayroll = {
      title: latestSheet.title,
      status: latestSheet.status,
      totalNet: recs.reduce((s, r) => s + (Number(r.net_salary) || 0), 0),
      totalCompanyCost: recs.reduce((s, r) => s + (Number(r.total_company_cost) || 0), 0),
      employeeCount: recs.length,
    };
  }

  return {
    invoiceCount: invoices.length,
    invoicePaid,
    invoicePending,
    totalRevenue,
    expenseCount: expenses.length,
    totalExpense,
    workerCount: (workerRes.data || []).length,
    taskTotal: tasks.length,
    taskCompleted,
    taskPending,
    workforcePayable,
    clientCount: (clientRes.data || []).length,
    projectCount: (projectRes.data || []).length,
    employeeCount: activeEmployees.length,
    departmentCount: (deptRes.data || []).length,
    departments,
    latestPayroll,
  };
}
