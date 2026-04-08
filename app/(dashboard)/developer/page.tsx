'use client';
import { useState, useEffect } from 'react';
import { Terminal, RefreshCw, Shield, Database, Activity } from 'lucide-react';
import { useLang } from '@/contexts/LanguageContext';
import { formatDateTime } from '@/lib/utils';
import type { IAuditLog } from '@/types';

export default function DeveloperPage() {
  const { t } = useLang();
  const [auditLogs, setAuditLogs] = useState<IAuditLog[]>([]);
  const [users, setUsers] = useState<{ _id: string; name: string; email: string; role: string; isActive: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'logs' | 'users' | 'system'>('logs');
  const [sseStatus, setSseStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const [dbStatus, setDbStatus] = useState<'ok' | 'error' | 'checking'>('checking');

  useEffect(() => { fetchData(); checkSystem(); }, []);

  async function fetchData() {
    setLoading(true);
    const [lRes, uRes] = await Promise.all([
      fetch('/api/audit-logs?limit=50'),
      fetch('/api/users?limit=100'),
    ]);
    if (lRes.ok) setAuditLogs((await lRes.json()).logs);
    if (uRes.ok) setUsers((await uRes.json()).users);
    setLoading(false);
  }

  async function checkSystem() {
    try {
      const res = await fetch('/api/health');
      setDbStatus(res.ok ? 'ok' : 'error');
    } catch { setDbStatus('error'); }

    const es = new EventSource('/api/sse');
    es.onopen = () => setSseStatus('connected');
    es.onerror = () => setSseStatus('disconnected');
    setTimeout(() => es.close(), 3000);
  }

  async function toggleUser(id: string, isActive: boolean) {
    await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    });
    fetchData();
  }

  const roleBadge: Record<string, string> = {
    developer:        'bg-purple-500/20 text-purple-400 border-purple-500/30',
    super_admin:      'bg-red-500/20 text-red-400 border-red-500/30',
    admin:            'bg-orange-500/20 text-orange-400 border-orange-500/30',
    inventory_manager:'bg-blue-500/20 text-blue-400 border-blue-500/30',
    cashier:          'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    accountant:       'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Terminal className="w-5 h-5 text-purple-400" />
            {t('Developer Panel', 'لوحة المطور')}
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('System management, audit logs & user control', 'إدارة النظام، سجلات التدقيق وإدارة المستخدمين')}</p>
        </div>
        <button onClick={fetchData} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw className="w-4 h-4" />{t('Refresh', 'تحديث')}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-muted)', border: '1px solid var(--border-color)' }}>
        {([['logs', t('Audit Logs', 'سجلات التدقيق')], ['users', t('Users', 'المستخدمون')], ['system', t('System', 'النظام')]] as const).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === tab ? 'var(--bg-card)' : 'transparent',
              color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: activeTab === tab ? 'var(--shadow-sm)' : 'none',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Audit Logs Tab */}
      {activeTab === 'logs' && (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead style={{ borderBottom: '1px solid var(--border-color)' }}>
              <tr>
                <th className="table-header text-left">{t('User', 'المستخدم')}</th>
                <th className="table-header text-left">{t('Action', 'الإجراء')}</th>
                <th className="table-header text-left">{t('Resource', 'المورد')}</th>
                <th className="table-header text-left">{t('Time', 'الوقت')}</th>
                <th className="table-header text-left">{t('IP', 'العنوان')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12" style={{ color: 'var(--text-muted)' }}>{t('Loading…', 'جاري التحميل…')}</td></tr>
              ) : auditLogs.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12" style={{ color: 'var(--text-muted)' }}>{t('No logs yet', 'لا توجد سجلات')}</td></tr>
              ) : auditLogs.map(log => (
                <tr key={log._id} className="table-row">
                  <td className="table-cell">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{log.userName}</p>
                    <span className={`badge text-xs ${roleBadge[log.userRole] || 'badge-slate'}`}>{log.userRole}</span>
                  </td>
                  <td className="table-cell">
                    <span className={`badge text-xs ${
                      log.action.startsWith('create') ? 'badge-emerald' :
                      log.action.startsWith('update') ? 'badge-blue' :
                      log.action.startsWith('delete') ? 'badge-red' : 'badge-slate'
                    }`}>{log.action}</span>
                  </td>
                  <td className="table-cell text-sm" style={{ color: 'var(--text-secondary)' }}>{log.resource}</td>
                  <td className="table-cell text-xs" style={{ color: 'var(--text-muted)' }}>{formatDateTime(log.createdAt)}</td>
                  <td className="table-cell font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{log.ipAddress || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead style={{ borderBottom: '1px solid var(--border-color)' }}>
              <tr>
                <th className="table-header text-left">{t('Name', 'الاسم')}</th>
                <th className="table-header text-left">{t('Email', 'البريد')}</th>
                <th className="table-header text-left">{t('Role', 'الدور')}</th>
                <th className="table-header text-left">{t('Status', 'الحالة')}</th>
                <th className="table-header"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12" style={{ color: 'var(--text-muted)' }}>{t('Loading…', 'جاري التحميل…')}</td></tr>
              ) : users.map(u => (
                <tr key={u._id} className="table-row">
                  <td className="table-cell font-medium" style={{ color: 'var(--text-primary)' }}>{u.name}</td>
                  <td className="table-cell text-sm" style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                  <td className="table-cell">
                    <span className={`badge text-xs ${roleBadge[u.role] || 'badge-slate'}`}>{u.role}</span>
                  </td>
                  <td className="table-cell">
                    <span className={`badge text-xs ${u.isActive ? 'badge-emerald' : 'badge-red'}`}>
                      {u.isActive ? t('Active', 'نشط') : t('Inactive', 'غير نشط')}
                    </span>
                  </td>
                  <td className="table-cell">
                    <button onClick={() => toggleUser(u._id, u.isActive)}
                      className={`text-xs px-2 py-1 rounded-lg border transition-all ${u.isActive ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'}`}
                    >
                      {u.isActive ? t('Disable', 'تعطيل') : t('Enable', 'تفعيل')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* System Tab */}
      {activeTab === 'system' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* DB Status */}
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-5 h-5 text-blue-400" />
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{t('Database', 'قاعدة البيانات')}</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${dbStatus === 'ok' ? 'bg-emerald-400' : dbStatus === 'error' ? 'bg-red-400' : 'bg-yellow-400 animate-pulse'}`} />
              <span className={`text-sm font-medium ${dbStatus === 'ok' ? 'text-emerald-400' : dbStatus === 'error' ? 'text-red-400' : 'text-yellow-400'}`}>
                {dbStatus === 'ok' ? t('Connected — MongoDB', 'متصل — MongoDB') : dbStatus === 'error' ? t('Connection Error', 'خطأ في الاتصال') : t('Checking…', 'جاري الفحص…')}
              </span>
            </div>
          </div>

          {/* SSE Status */}
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="w-5 h-5 text-emerald-400" />
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{t('Real-time SSE', 'البث الفوري SSE')}</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${sseStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : ''}`}
                style={sseStatus !== 'connected' ? { background: 'var(--border-color)' } : {}} />
              <span className="text-sm font-medium" style={{ color: sseStatus === 'connected' ? '#10b981' : 'var(--text-muted)' }}>
                {sseStatus === 'connected' ? t('Active', 'نشط') : t('Disconnected', 'غير متصل')}
              </span>
            </div>
          </div>

          {/* Role matrix */}
          <div className="card p-5 col-span-full">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-5 h-5 text-purple-400" />
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{t('RBAC Role Matrix', 'مصفوفة الصلاحيات')}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="py-2 px-3 text-left" style={{ color: 'var(--text-muted)' }}>{t('Permission', 'الصلاحية')}</th>
                    {['developer', 'super_admin', 'admin', 'inventory_manager', 'cashier', 'accountant'].map(r => (
                      <th key={r} className="py-2 px-3 text-center text-xs" style={{ color: roleBadge[r]?.split(' ')[1]?.replace('text-','') ? undefined : 'var(--text-muted)' }}><span className={roleBadge[r]?.split(' ')[1] || ''}>{r}</span></th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { perm: 'POS Billing',        roles: ['developer','super_admin','admin','cashier'] },
                    { perm: 'Customers (CRM)',    roles: ['developer','super_admin','admin','cashier'] },
                    { perm: 'Products',           roles: ['developer','super_admin','admin','inventory_manager'] },
                    { perm: 'Promotions',         roles: ['developer','super_admin','admin'] },
                    { perm: 'Returns/Refunds',    roles: ['developer','super_admin','admin','cashier'] },
                    { perm: 'Cash / Shifts',      roles: ['developer','super_admin','admin','cashier'] },
                    { perm: 'Inventory',          roles: ['developer','super_admin','admin','inventory_manager'] },
                    { perm: 'Stock Transfers',    roles: ['developer','super_admin','admin','inventory_manager'] },
                    { perm: 'Procurement',        roles: ['developer','super_admin','admin','inventory_manager','accountant'] },
                    { perm: 'HR',                 roles: ['developer','super_admin','admin'] },
                    { perm: 'Finance/ZATCA',      roles: ['developer','super_admin','admin','accountant'] },
                    { perm: 'Reports',            roles: ['developer','super_admin','admin','accountant'] },
                    { perm: 'Hardware Config',    roles: ['developer','super_admin','admin'] },
                    { perm: 'Developer Panel',    roles: ['developer'] },
                    { perm: 'Audit Logs',         roles: ['developer','super_admin'] },
                    { perm: 'User Management',    roles: ['developer','super_admin'] },
                  ].map(({ perm, roles }) => (
                    <tr key={perm} style={{ borderTop: '1px solid var(--border-color)' }}>
                      <td className="py-2 px-3" style={{ color: 'var(--text-secondary)' }}>{perm}</td>
                      {['developer','super_admin','admin','inventory_manager','cashier','accountant'].map(r => (
                        <td key={r} className="py-2 px-3 text-center">
                          {roles.includes(r)
                            ? <span className="text-emerald-400">✓</span>
                            : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Env vars */}
          <div className="card p-5 col-span-full">
            <div className="flex items-center gap-3 mb-4">
              <Terminal className="w-5 h-5 text-yellow-400" />
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{t('Required Environment Variables', 'متغيرات البيئة المطلوبة')}</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                ['MONGODB_URI',      t('MongoDB connection string', 'سلسلة اتصال MongoDB')],
                ['JWT_SECRET',       t('JWT signing secret (32+ chars)', 'مفتاح JWT (32+ حرف)')],
                ['ZATCA_VAT_NUMBER', t('ZATCA VAT registration number', 'رقم تسجيل ضريبة القيمة المضافة')],
                ['ZATCA_SELLER_NAME',t('Business name for ZATCA QR', 'اسم المنشأة في رمز QR')],
              ].map(([key, desc]) => (
                <div key={key} className="p-3 rounded-lg" style={{ background: 'var(--bg-muted)', border: '1px solid var(--border-color)' }}>
                  <p className="font-mono text-xs" style={{ color: '#eab308' }}>{key}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
