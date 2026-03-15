// App Registry — add new apps here
export interface AppConfig {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  gradient: string;
}

export const APPS: AppConfig[] = [
  {
    id: 'invoice',
    name: 'Invoice',
    icon: '📄',
    description: 'Quản lý hoá đơn & doanh thu',
    color: '#FF9500',
    gradient: 'linear-gradient(135deg, #FF9500 0%, #FF5E3A 100%)',
  },
  {
    id: 'expense',
    name: 'Expense',
    icon: '💰',
    description: 'Quản lý chi phí & thanh toán',
    color: '#34C759',
    gradient: 'linear-gradient(135deg, #34C759 0%, #30D158 100%)',
  },
  {
    id: 'workforce',
    name: 'Workforce',
    icon: '👷',
    description: 'Quản lý nhân sự & nghiệm thu',
    color: '#5856D6',
    gradient: 'linear-gradient(135deg, #5856D6 0%, #AF52DE 100%)',
  },
  {
    id: 'crm',
    name: 'CRM',
    icon: '👥',
    description: 'Quản lý khách hàng tập trung',
    color: '#0A84FF',
    gradient: 'linear-gradient(135deg, #0A84FF 0%, #5E5CE6 100%)',
  },
];

