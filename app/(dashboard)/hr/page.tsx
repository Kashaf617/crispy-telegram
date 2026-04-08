'use client';
import { useState, useEffect } from 'react';
import { Plus, Search, Clock, AlertTriangle, RefreshCw, X, UserCheck } from 'lucide-react';
import { useLang } from '@/contexts/LanguageContext';
import { formatDate, getDaysUntilExpiry, generateEmployeeId } from '@/lib/utils';
import type { IEmployee } from '@/types';

export default function HRPage() {
  const { t } = useLang();
  const [employees, setEmployees] = useState<IEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [clockModal, setClockModal] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', nameAr: '', position: '', positionAr: '', department: '',
    nationality: 'Saudi', iqamaNumber: '', iqamaExpiry: '',
    passportNumber: '', passportExpiry: '', phone: '', email: '',
    salary: '', joinDate: new Date().toISOString().split('T')[0],
    branchId: '000000000000000000000001',
  });

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const res = await fetch('/api/employees');
    if (res.ok) setEmployees((await res.json()).employees);
    setLoading(false);
  }

  async function saveEmployee() {
    if (!form.name || !form.position) return;
    setSaving(true);
    const res = await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, employeeId: generateEmployeeId(), salary: Number(form.salary) }),
    });
    if (res.ok) { setModal(false); fetchData(); }
    setSaving(false);
  }

  async function clockAction(employeeId: string, action: 'clockIn' | 'clockOut') {
    await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId, action }),
    });
    setClockModal(null);
  }

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.nameAr.includes(search) ||
    e.employeeId.toLowerCase().includes(search.toLowerCase())
  );

  const iqamaAlerts = employees.filter(e => e.iqamaExpiry && getDaysUntilExpiry(e.iqamaExpiry) <= 60 && getDaysUntilExpiry(e.iqamaExpiry) >= 0);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('Human Resources', 'الموارد البشرية')}</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('Employee management & attendance', 'إدارة الموظفين والحضور')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="btn-secondary"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => setModal(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />{t('Add Employee', 'إضافة موظف')}
          </button>
        </div>
      </div>

      {iqamaAlerts.length > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
          <p className="text-sm text-yellow-300">
            {iqamaAlerts.length} {t('employee(s) have Iqama expiring within 60 days', 'موظف/موظفون لديهم إقامة تنتهي خلال 60 يوماً')}
          </p>
        </div>
      )}

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('Search employees…', 'بحث عن موظفين…')} className="input-field pl-9" />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead style={{ borderBottom: '1px solid var(--border-color)' }}>
            <tr>
              <th className="table-header text-left">{t('Employee', 'الموظف')}</th>
              <th className="table-header text-left">{t('Position', 'المنصب')}</th>
              <th className="table-header text-left">{t('Nationality', 'الجنسية')}</th>
              <th className="table-header text-left">{t('Iqama Expiry', 'انتهاء الإقامة')}</th>
              <th className="table-header text-left">{t('Salary', 'الراتب')}</th>
              <th className="table-header"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12" style={{ color: 'var(--text-muted)' }}>{t('Loading…', 'جاري التحميل…')}</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12" style={{ color: 'var(--text-muted)' }}>{t('No employees found', 'لا يوجد موظفون')}</td></tr>
            ) : filtered.map(emp => {
              const iqamaDays = emp.iqamaExpiry ? getDaysUntilExpiry(emp.iqamaExpiry) : 999;
              return (
                <tr key={emp._id} className="table-row">
                  <td className="table-cell">
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{emp.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{emp.nameAr} · {emp.employeeId}</p>
                  </td>
                  <td className="table-cell">
                    <p style={{ color: 'var(--text-secondary)' }}>{emp.position}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{emp.department}</p>
                  </td>
                  <td className="table-cell" style={{ color: 'var(--text-secondary)' }}>{emp.nationality}</td>
                  <td className="table-cell">
                    {emp.iqamaExpiry ? (
                      <span className={`badge ${iqamaDays < 0 ? 'badge-red' : iqamaDays <= 30 ? 'badge-red' : iqamaDays <= 60 ? 'badge-yellow' : 'badge-emerald'}`}>
                        {formatDate(emp.iqamaExpiry)}
                      </span>
                    ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td className="table-cell font-semibold" style={{ color: 'var(--text-primary)' }}>SAR {emp.salary.toLocaleString()}</td>
                  <td className="table-cell">
                    <button onClick={() => setClockModal(emp._id)} className="btn-secondary text-xs px-2 py-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />{t('Clock', 'حضور')}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Employee Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal-box max-w-2xl mx-4 p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{t('Add Employee', 'إضافة موظف')}</h2>
              <button onClick={() => setModal(false)} style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'name',           label: t('Full Name (EN)','الاسم الكامل (EN)'), type: 'text' },
                { key: 'nameAr',         label: t('Full Name (AR)','الاسم الكامل (AR)'), type: 'text' },
                { key: 'position',       label: t('Position (EN)','المنصب (EN)'), type: 'text' },
                { key: 'positionAr',     label: t('Position (AR)','المنصب (AR)'), type: 'text' },
                { key: 'department',     label: t('Department','القسم'), type: 'text' },
                { key: 'nationality',    label: t('Nationality','الجنسية'), type: 'text' },
                { key: 'iqamaNumber',    label: t('Iqama Number','رقم الإقامة'), type: 'text' },
                { key: 'iqamaExpiry',    label: t('Iqama Expiry','انتهاء الإقامة'), type: 'date' },
                { key: 'passportNumber', label: t('Passport Number','رقم الجواز'), type: 'text' },
                { key: 'passportExpiry', label: t('Passport Expiry','انتهاء الجواز'), type: 'date' },
                { key: 'phone',          label: t('Phone','الهاتف'), type: 'text' },
                { key: 'email',          label: t('Email','البريد الإلكتروني'), type: 'email' },
                { key: 'salary',         label: t('Salary (SAR)','الراتب (ريال)'), type: 'number' },
                { key: 'joinDate',       label: t('Join Date','تاريخ الانضمام'), type: 'date' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{field.label}</label>
                  <input
                    type={field.type}
                    value={(form as Record<string,string>)[field.key]}
                    onChange={e => setForm(f => ({...f, [field.key]: e.target.value}))}
                    className="input-field"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModal(false)} className="btn-secondary flex-1">{t('Cancel','إلغاء')}</button>
              <button onClick={saveEmployee} disabled={saving} className="btn-primary flex-1">
                {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : t('Save','حفظ')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clock Modal */}
      {clockModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setClockModal(null)}>
          <div className="modal-box max-w-sm mx-4 p-6 text-center animate-fade-in">
            <UserCheck className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <h2 className="text-lg font-bold mb-5" style={{ color: 'var(--text-primary)' }}>{t('Record Attendance', 'تسجيل الحضور')}</h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button onClick={() => clockAction(clockModal, 'clockIn')} className="btn-primary flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" />{t('Clock In', 'حضور')}
              </button>
              <button onClick={() => clockAction(clockModal, 'clockOut')} className="btn-secondary flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" />{t('Clock Out', 'انصراف')}
              </button>
            </div>
            <button onClick={() => setClockModal(null)} className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('Cancel','إلغاء')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
