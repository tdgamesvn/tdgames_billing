import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { HrEmployee, HrDepartment, HrEmployeeSalary } from '@/types';
import { fetchEmployeeSalary } from '../services/hrService';
import {
  generateHDLD, generateHDTV, generateNDA,
  generateHDKV, generateNDA_CTV,
  printContract, CONTRACT_TYPES_FULLTIME, CONTRACT_TYPES_FREELANCER, ContractType,
} from '../services/contractService';

interface Props {
  employee: HrEmployee;
  department: HrDepartment | undefined;
  onClose: () => void;
}

const ContractGenerator: React.FC<Props> = ({ employee, department, onClose }) => {
  const isFreelancer = employee.type === 'freelancer';
  const availableTypes = isFreelancer ? CONTRACT_TYPES_FREELANCER : CONTRACT_TYPES_FULLTIME;
  const [selectedType, setSelectedType] = useState<ContractType>(availableTypes[0].key);
  const [contractNumber, setContractNumber] = useState('001');
  const [signingDate, setSigningDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [projectName, setProjectName] = useState('');
  const [workScope, setWorkScope] = useState('');
  const [salaryComponents, setSalaryComponents] = useState<HrEmployeeSalary[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewHtml, setPreviewHtml] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Load salary data (for fulltime only)
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (!isFreelancer) {
          const sc = await fetchEmployeeSalary(employee.id);
          setSalaryComponents(sc);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [employee.id, isFreelancer]);

  // Generate preview on param change
  useEffect(() => {
    if (loading) return;
    let html = '';
    switch (selectedType) {
      case 'hdld':
        html = generateHDLD(employee, department, salaryComponents, signingDate, contractNumber);
        break;
      case 'hdtv':
        html = generateHDTV(employee, department, salaryComponents, signingDate, contractNumber);
        break;
      case 'nda':
        html = generateNDA(employee, department, signingDate);
        break;
      case 'hdkv':
        html = generateHDKV(employee, signingDate, contractNumber, projectName, workScope);
        break;
      case 'nda_ctv':
        html = generateNDA_CTV(employee, signingDate);
        break;
    }
    setPreviewHtml(html);
  }, [selectedType, contractNumber, signingDate, projectName, workScope, salaryComponents, loading, employee, department]);

  // Data fields to check based on employee type
  const dataChecks = isFreelancer
    ? [
        ['Họ tên', employee.full_name],
        ['CMND/CCCD', employee.id_number],
        ['Ngày sinh', employee.date_of_birth],
        ['Giới tính', employee.gender],
        ['Địa chỉ', employee.address],
        ['SĐT', employee.phone],
        ['Email', employee.email],
      ]
    : [
        ['Họ tên', employee.full_name],
        ['CMND/CCCD', employee.id_number],
        ['Ngày sinh', employee.date_of_birth],
        ['Ngày cấp CMND', employee.id_issue_date],
        ['Nơi cấp', employee.id_issue_place],
        ['Địa chỉ', employee.address],
        ['Phòng ban', department?.name],
        ['Chức danh', employee.position],
      ];

  // Required field validation for freelancer contracts
  const freelancerFieldsMissing = isFreelancer && selectedType === 'hdkv' && (!projectName.trim() || !workScope.trim());

  // Employee data validation (both fulltime & freelancer)
  const missingDataFields = dataChecks.filter(([, v]) => !v).map(([label]) => label) as string[];
  const hasDataMissing = missingDataFields.length > 0;

  const canExport = !loading && !freelancerFieldsMissing && !hasDataMissing;

  // Write preview to iframe
  useEffect(() => {
    if (!previewHtml || !iframeRef.current) return;
    const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(previewHtml);
    doc.close();
  }, [previewHtml]);

  const handlePrint = () => {
    if (previewHtml) printContract(previewHtml);
  };

  return ReactDOM.createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, padding: '0 24px',
        height: 56, background: '#111', borderBottom: '1px solid #333', flexShrink: 0,
      }}>
        <span style={{ fontSize: 18, fontWeight: 900, color: '#F5F5F5', letterSpacing: 1 }}>
          📝 Xuất Hợp Đồng {isFreelancer ? '(Freelancer)' : ''}
        </span>
        <span style={{ fontSize: 12, color: '#888', fontWeight: 600 }}>
          {employee.full_name} • {isFreelancer ? (employee.specializations?.join(', ') || 'Freelancer') : (employee.position || 'N/A')}
        </span>
        <div style={{ flex: 1 }} />
        {(freelancerFieldsMissing || hasDataMissing) && (
          <span style={{ fontSize: 11, color: '#FF453A', fontWeight: 700, maxWidth: 400, textAlign: 'right' }}>
            ⚠️ {hasDataMissing ? `Thiếu: ${missingDataFields.join(', ')}` : 'Cần điền Tên dự án & Loại công việc'}
          </span>
        )}
        <button onClick={handlePrint} disabled={!canExport} style={{
          padding: '8px 20px', borderRadius: 10, border: 'none', cursor: canExport ? 'pointer' : 'not-allowed',
          background: isFreelancer ? 'linear-gradient(135deg, #0A84FF, #5E5CE6)' : 'linear-gradient(135deg, #34C759, #30D158)',
          color: '#fff', fontSize: 13, fontWeight: 800, letterSpacing: 0.5,
          opacity: canExport ? 1 : 0.4,
        }}>
          🖨️ In / Xuất PDF
        </button>
        <button onClick={onClose} style={{
          padding: '8px 16px', borderRadius: 10, border: '1px solid #444',
          background: 'transparent', color: '#aaa', fontSize: 13, fontWeight: 800,
          cursor: 'pointer',
        }}>
          ✕ Đóng
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar - controls */}
        <div style={{
          width: 320, flexShrink: 0, background: '#161616', borderRight: '1px solid #333',
          padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20,
        }}>
          {/* Contract type selector */}
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 900, color: '#888', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
              Loại hợp đồng
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {availableTypes.map(ct => (
                <button key={ct.key} onClick={() => setSelectedType(ct.key)} style={{
                  padding: '12px 14px', borderRadius: 12, border: selectedType === ct.key ? `2px solid ${isFreelancer ? '#0A84FF' : '#34C759'}` : '1px solid #333',
                  background: selectedType === ct.key ? (isFreelancer ? 'rgba(10,132,255,0.1)' : 'rgba(52,199,89,0.1)') : '#1a1a1a',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: selectedType === ct.key ? (isFreelancer ? '#0A84FF' : '#34C759') : '#F5F5F5' }}>
                    {ct.icon} {ct.label}
                  </div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{ct.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Contract metadata */}
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 900, color: '#888', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
              Thông tin hợp đồng
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <span style={{ display: 'block', fontSize: 11, color: '#777', marginBottom: 4 }}>Số hợp đồng</span>
                <input
                  value={contractNumber}
                  onChange={e => setContractNumber(e.target.value)}
                  placeholder="001"
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #333',
                    background: '#1a1a1a', color: '#F5F5F5', fontSize: 13,
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <span style={{ display: 'block', fontSize: 11, color: '#777', marginBottom: 4 }}>Ngày ký</span>
                <input
                  type="date"
                  value={signingDate}
                  onChange={e => setSigningDate(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #333',
                    background: '#1a1a1a', color: '#F5F5F5', fontSize: 13,
                    outline: 'none', colorScheme: 'dark',
                  }}
                />
              </div>
              {/* Required fields for freelancer contracts */}
              {isFreelancer && (
                <>
                  <div>
                    <span style={{ display: 'block', fontSize: 11, color: '#777', marginBottom: 4 }}>
                      🎯 Tên dự án <span style={{ color: '#FF453A' }}>*</span>
                    </span>
                    <input
                      value={projectName}
                      onChange={e => setProjectName(e.target.value)}
                      placeholder="VD: Game XYZ, Dự án ABC..."
                      style={{
                        width: '100%', padding: '8px 12px', borderRadius: 8,
                        border: `1px solid ${!projectName.trim() ? '#FF453A66' : '#0A84FF44'}`,
                        background: '#1a1a1a', color: '#F5F5F5', fontSize: 13,
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: 11, color: '#777', marginBottom: 4 }}>
                      🛠️ Loại công việc <span style={{ color: '#FF453A' }}>*</span>
                    </span>
                    <input
                      value={workScope}
                      onChange={e => setWorkScope(e.target.value)}
                      placeholder="VD: hoạt hình 2D, Concept 2D, VFX..."
                      style={{
                        width: '100%', padding: '8px 12px', borderRadius: 8,
                        border: `1px solid ${!workScope.trim() ? '#FF453A66' : '#0A84FF44'}`,
                        background: '#1a1a1a', color: '#F5F5F5', fontSize: 13,
                        outline: 'none',
                      }}
                    />
                  </div>
                  <p style={{ fontSize: 10, color: '#0A84FF', marginTop: 0 }}>
                    💡 Mỗi freelancer có thể có nhiều HĐ cho từng dự án
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Salary summary - only for fulltime */}
          {!isFreelancer && !loading && (
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 900, color: '#888', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
                Dữ liệu lương
              </label>
              <div style={{ background: '#1a1a1a', borderRadius: 12, border: '1px solid #333', padding: 12 }}>
                {salaryComponents.length === 0 ? (
                  <p style={{ fontSize: 12, color: '#FF453A' }}>⚠️ Chưa có dữ liệu lương. Hãy nhập tại tab Lương & Phụ cấp.</p>
                ) : salaryComponents.map(sc => (
                  <div key={sc.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #222' }}>
                    <span style={{ fontSize: 12, color: '#999' }}>{sc.component?.name || '?'}</span>
                    <span style={{ fontSize: 12, color: '#F5F5F5', fontWeight: 700 }}>{sc.amount.toLocaleString('vi-VN')}đ</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rate info - for freelancer */}
          {isFreelancer && (
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 900, color: '#888', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
                Thông tin thù lao
              </label>
              <div style={{ background: '#1a1a1a', borderRadius: 12, border: '1px solid #333', padding: 12 }}>
                {[
                  ['Rate type', employee.rate_type || 'N/A'],
                  ['Rate amount', employee.rate_amount ? `${employee.rate_amount.toLocaleString('vi-VN')} ${employee.rate_currency || 'VND'}` : 'N/A'],
                  ['Thanh toán', employee.payment_method || 'N/A'],
                ].map(([label, value]) => (
                  <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #222' }}>
                    <span style={{ fontSize: 12, color: '#999' }}>{label}</span>
                    <span style={{ fontSize: 12, color: '#F5F5F5', fontWeight: 700 }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Employee data summary */}
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 900, color: '#888', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
              Kiểm tra dữ liệu
            </label>
            <div style={{ background: '#1a1a1a', borderRadius: 12, border: '1px solid #333', padding: 12, fontSize: 12 }}>
              {dataChecks.map(([label, value]) => (
                <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid #222' }}>
                  <span style={{ color: '#777' }}>{label}</span>
                  <span style={{ color: value ? '#34C759' : '#FF453A', fontWeight: 600, maxWidth: '55%', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {(value as string) || '⚠️ Thiếu'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Preview area */}
        <div style={{ flex: 1, background: '#2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          {loading ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 40, height: 40, border: '4px solid #333', borderTop: '4px solid #34C759', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
              <span style={{ color: '#777', fontSize: 13 }}>Đang tải dữ liệu...</span>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              style={{
                width: '210mm', height: '100%', border: 'none',
                background: 'white', boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
                borderRadius: 4,
              }}
              title="Contract Preview"
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ContractGenerator;
