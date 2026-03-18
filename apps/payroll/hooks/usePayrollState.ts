import { useState, useEffect, useCallback } from 'react';
import { PayPayrollSheet, PayPayrollRecord } from '@/types';
import { supabase } from '@/services/supabaseClient';
import * as svc from '../services/payrollService';

export type PayrollView = 'sheets' | 'detail';

export function usePayrollState(initialTab?: string | null) {
  const [view, setView] = useState<PayrollView>('sheets');
  const [sheets, setSheets] = useState<PayPayrollSheet[]>([]);
  const [records, setRecords] = useState<PayPayrollRecord[]>([]);
  const [activeSheet, setActiveSheet] = useState<PayPayrollSheet | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Load sheets on mount
  useEffect(() => {
    loadSheets();
  }, []);

  const loadSheets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await svc.fetchPayrollSheets();
      setSheets(data);
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  const createSheet = useCallback(async (month: number, year: number) => {
    setLoading(true);
    try {
      // Check if attendance sheet for this month is finalized
      const { data: attSheets } = await supabase
        .from('att_monthly_sheets')
        .select('id, status')
        .eq('month', month)
        .eq('year', year);

      if (!attSheets || attSheets.length === 0) {
        setToast({ message: `⚠️ Chưa có bảng chấm công Tháng ${month}/${year}. Vui lòng tạo bảng chấm công trước.`, type: 'error' });
        setLoading(false);
        return;
      }

      const attSheet = attSheets[0];
      if (attSheet.status !== 'finalized') {
        setToast({ message: `⚠️ Bảng chấm công Tháng ${month}/${year} chưa được chốt. Vui lòng chốt bảng công trước khi tính lương.`, type: 'error' });
        setLoading(false);
        return;
      }

      const { sheet, records: recs } = await svc.createPayrollSheet(month, year);
      setSheets(prev => [sheet, ...prev]);
      setActiveSheet(sheet);
      setRecords(recs);
      setView('detail');
      setToast({ message: `Đã tạo bảng lương Tháng ${month}/${year}`, type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  const openSheet = useCallback(async (sheet: PayPayrollSheet) => {
    setActiveSheet(sheet);
    setLoading(true);
    try {
      const data = await svc.fetchPayrollRecords(sheet.id);
      setRecords(data);
      setView('detail');
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteSheet = useCallback(async (id: string) => {
    try {
      await svc.deletePayrollSheet(id);
      setSheets(prev => prev.filter(s => s.id !== id));
      if (activeSheet?.id === id) {
        setActiveSheet(null);
        setRecords([]);
        setView('sheets');
      }
      setToast({ message: 'Đã xoá bảng lương', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
    }
  }, [activeSheet]);

  const updateRecord = useCallback(async (id: string, field: string, value: number) => {
    // Update locally, recalculate, save
    setRecords(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };
      return svc.recalculateRecord(updated);
    }));
    // Debounced save handled by component
  }, []);

  const saveRecord = useCallback(async (rec: PayPayrollRecord) => {
    try {
      await svc.recalculateAndSave(rec);
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
    }
  }, []);

  const confirmSheet = useCallback(async () => {
    if (!activeSheet) return;
    try {
      await svc.updateSheetStatus(activeSheet.id, 'confirmed');
      setActiveSheet(prev => prev ? { ...prev, status: 'confirmed' } : null);
      setSheets(prev => prev.map(s => s.id === activeSheet.id ? { ...s, status: 'confirmed' } : s));
      setToast({ message: 'Đã xác nhận bảng lương', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
    }
  }, [activeSheet]);

  const rollbackSheet = useCallback(async () => {
    if (!activeSheet) return;
    try {
      await svc.updateSheetStatus(activeSheet.id, 'draft');
      setActiveSheet(prev => prev ? { ...prev, status: 'draft' } : null);
      setSheets(prev => prev.map(s => s.id === activeSheet.id ? { ...s, status: 'draft' } : s));
      setToast({ message: 'Đã huỷ xác nhận — bảng lương quay lại Nháp', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
    }
  }, [activeSheet]);

  const backToSheets = useCallback(() => {
    setView('sheets');
    setActiveSheet(null);
    setRecords([]);
  }, []);

  return {
    view, sheets, records, activeSheet, loading, toast,
    setToast, createSheet, openSheet, deleteSheet,
    updateRecord, saveRecord, confirmSheet, rollbackSheet, backToSheets,
  };
}
