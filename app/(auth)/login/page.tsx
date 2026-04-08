'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Lock, Mail, Eye, EyeOff, Globe } from 'lucide-react';
import { useLang } from '@/contexts/LanguageContext';

export default function LoginPage() {
  const router = useRouter();
  const { lang, toggleLang, t } = useLang();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      sessionStorage.setItem('saudimart_user', JSON.stringify(data.user));
      router.push('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-base)' }}>
      {/* Left panel — decorative (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col justify-between p-12"
        style={{ background: 'linear-gradient(145deg, #0a1628 0%, #0d1f3c 40%, #0a2a1e 100%)' }}>
        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/3 w-80 h-80 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'rgba(16,185,129,0.12)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'rgba(59,130,246,0.08)' }} />

        {/* Brand */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center emerald-glow"
            style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.35)' }}>
            <ShoppingCart className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-base font-bold text-white">SaudiMart ERP</p>
            <p className="text-[10px] text-emerald-400/70 tracking-widest font-semibold uppercase">Enterprise Suite</p>
          </div>
        </div>

        {/* Feature highlights */}
        <div className="relative z-10 space-y-5">
          {[
            { icon: '🛒', title: t('POS Billing', 'نقطة البيع'), desc: t('ZATCA Phase 2 compliant invoicing', 'فواتير متوافقة مع مرحلة ZATCA 2') },
            { icon: '📦', title: t('Smart Inventory', 'مخزون ذكي'), desc: t('FEFO batch tracking & expiry alerts', 'تتبع الدُفعات وتنبيهات انتهاء الصلاحية') },
            { icon: '👥', title: t('HR & Payroll', 'الموارد البشرية'), desc: t('Employee management & Iqama tracking', 'إدارة الموظفين ومتابعة الإقامة') },
            { icon: '📊', title: t('Finance & ZATCA', 'المالية والزاتكا'), desc: t('VAT reporting & export to CSV', 'تقارير ضريبة القيمة المضافة') },
          ].map((f) => (
            <div key={f.title} className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">{f.icon}</span>
              <div>
                <p className="text-sm font-semibold text-white">{f.title}</p>
                <p className="text-xs" style={{ color: 'rgba(148,163,184,0.7)' }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="relative z-10 text-xs" style={{ color: 'rgba(71,85,105,0.8)' }}>
          {t('© 2025 SaudiMart ERP. All rights reserved.', '© 2025 سعودي مارت. جميع الحقوق محفوظة.')}
        </p>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        {/* Top-right controls */}
        <div className="absolute top-5 right-5 flex items-center gap-2">
          <button onClick={toggleLang}
            className="btn-secondary gap-2 !px-3 !py-1.5 !text-xs"
            style={{ gap: '0.4rem' }}>
            <Globe className="w-3.5 h-3.5" />
            {lang === 'en' ? 'العربية' : 'English'}
          </button>
        </div>

        <div className="w-full max-w-sm animate-slide-up">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center emerald-glow"
              style={{ background: 'var(--accent-light)', border: '1px solid rgba(16,185,129,0.3)' }}>
              <ShoppingCart className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>SaudiMart ERP</p>
            </div>
          </div>

          <div className="mb-7">
            <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              {t('Welcome back', 'مرحباً بعودتك')} 👋
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {t('Sign in to your workspace', 'سجّل الدخول إلى مساحة عملك')}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 p-3 rounded-xl flex items-center gap-2 text-sm"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
              <span className="text-base">⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                {t('Email Address', 'البريد الإلكتروني')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@saudimart.sa"
                  className="input-field"
                  style={{ paddingLeft: '2.5rem' }}
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                {t('Password', 'كلمة المرور')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field"
                  style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                  required
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--text-muted)' }}>
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full !h-11 !text-sm mt-2">
              {loading
                ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : t('Sign In', 'تسجيل الدخول')}
            </button>
          </form>

          {/* Demo hint */}
          <div className="mt-6 p-3.5 rounded-xl" style={{ background: 'var(--bg-muted)', border: '1px solid var(--border-color)' }}>
            <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              {t('Demo Credentials', 'بيانات تجريبية')}
            </p>
            <div className="space-y-1 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              <p>admin@saudimart.sa</p>
              <p>Admin@1234</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
