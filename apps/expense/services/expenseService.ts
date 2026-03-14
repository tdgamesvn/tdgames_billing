import { supabase } from '@/services/supabaseClient';
import { ExpenseCategory, ExpenseRecord, RecurringExpense } from '@/types';

// ── Categories ────────────────────────────────────────────────
export async function fetchCategories(): Promise<ExpenseCategory[]> {
  const { data, error } = await supabase
    .from('expense_categories')
    .select('*')
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function saveCategory(cat: Omit<ExpenseCategory, 'id'>): Promise<ExpenseCategory> {
  const { data, error } = await supabase
    .from('expense_categories')
    .insert(cat)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCategory(id: string, updates: Partial<ExpenseCategory>): Promise<void> {
  const { error } = await supabase.from('expense_categories').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('expense_categories').delete().eq('id', id);
  if (error) throw error;
}

// ── Expenses ──────────────────────────────────────────────────
export async function fetchExpenses(): Promise<ExpenseRecord[]> {
  const { data, error } = await supabase
    .from('expense_expenses')
    .select('*, category:expense_categories(*)')
    .order('expense_date', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function saveExpense(expense: Omit<ExpenseRecord, 'id' | 'created_at' | 'updated_at' | 'category'>): Promise<ExpenseRecord> {
  const { data, error } = await supabase
    .from('expense_expenses')
    .insert(expense)
    .select('*, category:expense_categories(*)')
    .single();
  if (error) throw error;
  return data;
}

export async function updateExpense(id: string, updates: Partial<ExpenseRecord>): Promise<void> {
  const { category, ...clean } = updates as any;
  const { error } = await supabase
    .from('expense_expenses')
    .update({ ...clean, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('expense_expenses').delete().eq('id', id);
  if (error) throw error;
}

// ── Recurring ─────────────────────────────────────────────────
export async function fetchRecurringExpenses(): Promise<RecurringExpense[]> {
  const { data, error } = await supabase
    .from('expense_recurring')
    .select('*, category:expense_categories(*)')
    .order('next_run');
  if (error) throw error;
  return data || [];
}

export async function saveRecurringExpense(item: Omit<RecurringExpense, 'id' | 'created_at' | 'category'>): Promise<RecurringExpense> {
  const { data, error } = await supabase
    .from('expense_recurring')
    .insert(item)
    .select('*, category:expense_categories(*)')
    .single();
  if (error) throw error;
  return data;
}

export async function updateRecurringExpense(id: string, updates: Partial<RecurringExpense>): Promise<void> {
  const { category, ...clean } = updates as any;
  const { error } = await supabase.from('expense_recurring').update(clean).eq('id', id);
  if (error) throw error;
}

export async function deleteRecurringExpense(id: string): Promise<void> {
  const { error } = await supabase.from('expense_recurring').delete().eq('id', id);
  if (error) throw error;
}
