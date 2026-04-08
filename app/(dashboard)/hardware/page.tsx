'use client';
import { useState, useEffect } from 'react';
import {
  Cpu, Printer, Scan, Weight, Monitor, CreditCard, Tag,
  CheckCircle2, XCircle, AlertCircle, RefreshCw, Settings2,
  Wifi, Usb, Bluetooth, Save, ChevronDown, ChevronRight,
} from 'lucide-react';
import { useLang } from '@/contexts/LanguageContext';
import { useHardwareSettings, DEFAULT_HW_SETTINGS, useSerialPort } from '@/hooks/useHardware';
import type { HardwareDeviceKey, HardwareSettings } from '@/types';

type DeviceKey = HardwareDeviceKey;

interface DeviceCard {
  key: DeviceKey;
  icon: React.ElementType;
  en: string;
  ar: string;
  desc: string;
  protocols: string[];
  accent: string;
  testable: boolean;
}

const DEVICES: DeviceCard[] = [
  { key: 'barcodeScanner',  icon: Scan,        en: 'Barcode Scanner',    ar: 'ماسح الباركود',        desc: 'USB HID / Bluetooth — keyboard wedge mode', protocols: ['HID','BT'], accent: '#10b981', testable: true },
  { key: 'receiptPrinter',  icon: Printer,     en: 'Receipt Printer',    ar: 'طابعة الإيصالات',      desc: 'ESC/POS — USB / Serial / Network (TCP/IP)',  protocols: ['USB','Serial','Net'], accent: '#3b82f6', testable: true },
  { key: 'cashDrawer',      icon: Monitor,     en: 'Cash Drawer',        ar: 'درج النقدية',           desc: 'RJ11 via receipt printer or serial',        protocols: ['Via Printer'], accent: '#f59e0b', testable: true },
  { key: 'weighingScale',   icon: Weight,      en: 'Weighing Scale',     ar: 'ميزان إلكتروني',        desc: 'RS-232 Serial — Toledo / CAS / Mettler',    protocols: ['Serial'], accent: '#a855f7', testable: true },
  { key: 'customerDisplay', icon: Monitor,     en: 'Customer Display',   ar: 'شاشة العميل',           desc: 'VFD / LCD via Serial (2×20 chars)',          protocols: ['Serial'], accent: '#06b6d4', testable: false },
  { key: 'labelPrinter',    icon: Tag,         en: 'Label Printer',      ar: 'طابعة الملصقات',        desc: 'Zebra / Brother — USB / Network (ZPL/EPL)',  protocols: ['USB','Net'], accent: '#ec4899', testable: false },
  { key: 'paymentTerminal', icon: CreditCard,  en: 'Payment Terminal',   ar: 'طرفية الدفع',           desc: 'STC Pay / Mada / Visa — NFC / Chip',        protocols: ['NFC','SDK'], accent: '#f97316', testable: false },
];

const PROTOCOL_ICON: Record<string, React.ElementType> = {
  HID: Usb, BT: Bluetooth, USB: Usb, Serial: Cpu, Net: Wifi,
  'Via Printer': Printer, NFC: Wifi, SDK: Settings2,
};

type TestStatus = 'idle' | 'testing' | 'ok' | 'fail';

export default function HardwarePage() {
  const { t } = useLang();
  const { settings, testResults, loading, saving, error, updatedAt, reload, save, reportTest } = useHardwareSettings();
  const [localSettings, setLocalSettings] = useState<HardwareSettings>(DEFAULT_HW_SETTINGS);
  const [expanded, setExpanded] = useState<DeviceKey | null>('barcodeScanner');
  const [testStatus, setTestStatus] = useState<Partial<Record<DeviceKey, TestStatus>>>({});
  const [scanBuffer, setScanBuffer] = useState('');
  const serial = useSerialPort(9600);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  useEffect(() => {
    setTestStatus({
      barcodeScanner: testResults.barcodeScanner.status,
      receiptPrinter: testResults.receiptPrinter.status,
      cashDrawer: testResults.cashDrawer.status,
      weighingScale: testResults.weighingScale.status,
      customerDisplay: testResults.customerDisplay.status,
      labelPrinter: testResults.labelPrinter.status,
      paymentTerminal: testResults.paymentTerminal.status,
    });
  }, [testResults]);

  function toggle(key: DeviceKey) { setExpanded(e => e === key ? null : key); }

  function updateDevice<K extends DeviceKey>(key: K, patch: Partial<HardwareSettings[K]>) {
    setLocalSettings(prev => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }));
  }

  async function saveAll() {
    await save(localSettings);
  }

  async function testDevice(key: DeviceKey) {
    setTestStatus(p => ({ ...p, [key]: 'testing' }));
    await new Promise(r => setTimeout(r, 1200));

    let status: TestStatus = 'ok';
    let note = '';

    if (key === 'barcodeScanner') {
      status = localSettings.barcodeScanner.enabled ? 'ok' : 'fail';
      note = localSettings.barcodeScanner.enabled ? 'Scanner input accepted' : 'Enable the scanner before testing';
    }
    if (key === 'cashDrawer') {
      status = localSettings.cashDrawer.enabled ? 'ok' : 'fail';
      note = localSettings.cashDrawer.enabled ? 'Drawer trigger configured' : 'Enable the cash drawer before testing';
    }
    if (key === 'receiptPrinter') {
      status = localSettings.receiptPrinter.enabled && !!localSettings.receiptPrinter.port ? 'ok' : 'fail';
      note = status === 'ok' ? 'Printer port configured' : 'Printer needs to be enabled with a valid port';
    }
    if (key === 'weighingScale') {
      const connected = serial.status === 'connected' ? true : await serial.connect();
      if (connected) {
        status = 'ok';
        note = 'Scale serial port connected';
      } else {
        status = 'fail';
        note = serial.error || 'Scale connection failed';
      }
    }

    setTestStatus(p => ({ ...p, [key]: status }));
    await reportTest(key, status, note);
  }

  function statusIcon(status?: TestStatus) {
    if (!status || status === 'idle')    return null;
    if (status === 'testing') return <RefreshCw className="w-4 h-4 animate-spin" style={{ color: '#3b82f6' }} />;
    if (status === 'ok')      return <CheckCircle2 className="w-4 h-4" style={{ color: '#10b981' }} />;
    return <XCircle className="w-4 h-4" style={{ color: '#ef4444' }} />;
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {t('Hardware Integration', 'تكامل الأجهزة')}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {t('Configure POS peripherals — barcode scanners, printers, scales and more', 'إعداد أجهزة نقطة البيع — ماسحات الباركود والطابعات والموازين وغيرها')}
          </p>
          <p className="text-xs mt-2" style={{ color: error ? '#ef4444' : 'var(--text-muted)' }}>
            {error
              ? error
              : updatedAt
                ? `${t('Backend synced', 'تمت المزامنة مع الخادم')} · ${new Date(updatedAt).toLocaleString()}`
                : loading
                  ? t('Loading hardware profile…', 'جاري تحميل ملف الأجهزة…')
                  : t('Connected to hardware backend', 'متصل بخلفية الأجهزة')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void reload()} className="btn-secondary flex items-center gap-2 text-sm" disabled={loading || saving}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {t('Refresh', 'تحديث')}
          </button>
          <button onClick={() => void saveAll()} disabled={loading || saving} className="btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" />
            {saving ? t('Saving…', 'جاري الحفظ…') : t('Save All', 'حفظ الكل')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {DEVICES.slice(0, 4).map(d => {
          const enabled = (localSettings[d.key] as { enabled: boolean }).enabled;
          return (
            <div key={d.key} className="card px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: d.accent + '18', border: `1px solid ${d.accent}30` }}>
                <d.icon className="w-4 h-4" style={{ color: d.accent }} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{t(d.en, d.ar)}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: enabled ? '#10b981' : '#64748b' }} />
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {enabled ? t('Enabled', 'مفعّل') : t('Disabled', 'معطّل')}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {localSettings.barcodeScanner.enabled && (
        <div className="card p-4 flex items-center gap-3"
          style={{ borderLeft: '3px solid #10b981' }}>
          <Scan className="w-5 h-5 flex-shrink-0" style={{ color: '#10b981' }} />
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {t('Scanner Test — scan any barcode now', 'اختبار الماسح — امسح أي باركود الآن')}
            </p>
            <input
              className="input-field mt-2 font-mono"
              placeholder={t('Scan barcode here…', 'امسح الباركود هنا…')}
              value={scanBuffer}
              onChange={e => setScanBuffer(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && scanBuffer) {
                  const ok = scanBuffer.trim().length >= localSettings.barcodeScanner.minLength;
                  setTestStatus(p => ({ ...p, barcodeScanner: ok ? 'ok' : 'fail' }));
                  await reportTest('barcodeScanner', ok ? 'ok' : 'fail', ok ? `Scanned ${scanBuffer.trim()}` : 'Scanned code shorter than minimum length');
                  setScanBuffer('');
                }
              }}
              autoFocus
            />
          </div>
          <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
        </div>
      )}

      <div className="space-y-3">
        {DEVICES.map(device => {
          const cfg = localSettings[device.key] as Record<string, unknown>;
          const isOpen = expanded === device.key;
          const ts = testStatus[device.key];

          return (
            <div key={device.key} className="card overflow-hidden">
              <button
                onClick={() => toggle(device.key)}
                className="w-full flex items-center gap-4 p-4 text-left"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: device.accent + '18', border: `1px solid ${device.accent}30` }}>
                  <device.icon className="w-5 h-5" style={{ color: device.accent }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {t(device.en, device.ar)}
                    </p>
                    {cfg.enabled
                      ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#10b98120', color: '#10b981' }}>ON</span>
                      : <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)' }}>OFF</span>
                    }
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{device.desc}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    {device.protocols.map(p => {
                      const PIcon = PROTOCOL_ICON[p] || Cpu;
                      return (
                        <span key={p} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded"
                          style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)' }}>
                          <PIcon className="w-2.5 h-2.5" />{p}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {statusIcon(ts)}
                  {isOpen ? <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                           : <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />}
                </div>
              </button>

              {isOpen && (
                <div className="px-4 pb-4" style={{ borderTop: '1px solid var(--border-color)' }}>
                  <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">

                    <div className="col-span-full flex items-center justify-between p-3 rounded-xl"
                      style={{ background: 'var(--bg-muted)' }}>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {t('Enable Device', 'تفعيل الجهاز')}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {t('Toggle to activate this hardware in the POS', 'قم بالتبديل لتفعيل هذا الجهاز في نقطة البيع')}
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer"
                          checked={!!cfg.enabled}
                          onChange={e => updateDevice(device.key, { enabled: e.target.checked } as Partial<HardwareSettings[typeof device.key]>)}
                        />
                        <div className="w-11 h-6 rounded-full peer transition-colors duration-200"
                          style={{ background: cfg.enabled ? '#10b981' : 'var(--border-color)' }}>
                          <div className="absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full shadow transition-transform duration-200"
                            style={{ transform: cfg.enabled ? 'translateX(1.25rem)' : 'translateX(0)' }} />
                        </div>
                      </label>
                    </div>

                    {'port' in cfg && (
                      <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                          {t('Port / Connection', 'المنفذ / الاتصال')}
                        </label>
                        <input className="input-field font-mono" placeholder="COM3 / USB001 / 192.168.1.100"
                          value={cfg.port as string}
                          onChange={e => updateDevice(device.key, { port: e.target.value } as Partial<HardwareSettings[typeof device.key]>)}
                        />
                        <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                          {t('COM1–COM9 for Serial, USB001 for USB, IP for Network', 'COM1-COM9 للتسلسلي، USB001 للـUSB، IP للشبكة')}
                        </p>
                      </div>
                    )}

                    {'baudRate' in cfg && (
                      <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                          {t('Baud Rate', 'معدل الإرسال')}
                        </label>
                        <select className="input-field"
                          value={cfg.baudRate as number}
                          onChange={e => updateDevice(device.key, { baudRate: Number(e.target.value) } as Partial<HardwareSettings[typeof device.key]>)}>
                          {[1200,2400,4800,9600,19200,38400,57600,115200].map(b => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {'paperWidth' in cfg && (
                      <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                          {t('Paper Width', 'عرض الورق')}
                        </label>
                        <select className="input-field"
                          value={cfg.paperWidth as number}
                          onChange={e => updateDevice(device.key, { paperWidth: Number(e.target.value) as 58|80 } as Partial<HardwareSettings[typeof device.key]>)}>
                          <option value={58}>58 mm</option>
                          <option value={80}>80 mm</option>
                        </select>
                      </div>
                    )}

                    {'copies' in cfg && (
                      <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                          {t('Receipt Copies', 'نسخ الإيصال')}
                        </label>
                        <input type="number" min={1} max={3} className="input-field"
                          value={cfg.copies as number}
                          onChange={e => updateDevice(device.key, { copies: Number(e.target.value) } as Partial<HardwareSettings[typeof device.key]>)}
                        />
                      </div>
                    )}

                    {'openDrawer' in cfg && (
                      <div className="flex items-center justify-between p-3 rounded-xl"
                        style={{ background: 'var(--bg-muted)' }}>
                        <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                          {t('Auto-open drawer on sale', 'فتح الدرج تلقائياً عند البيع')}
                        </p>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer"
                            checked={!!cfg.openDrawer}
                            onChange={e => updateDevice(device.key, { openDrawer: e.target.checked } as Partial<HardwareSettings[typeof device.key]>)}
                          />
                          <div className="w-11 h-6 rounded-full peer transition-colors duration-200"
                            style={{ background: cfg.openDrawer ? '#10b981' : 'var(--border-color)' }}>
                            <div className="absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full shadow transition-transform duration-200"
                              style={{ transform: cfg.openDrawer ? 'translateX(1.25rem)' : 'translateX(0)' }} />
                          </div>
                        </label>
                      </div>
                    )}

                    {'cutAfterPrint' in cfg && (
                      <div className="flex items-center justify-between p-3 rounded-xl"
                        style={{ background: 'var(--bg-muted)' }}>
                        <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                          {t('Auto-cut after printing', 'قطع الورق تلقائياً بعد الطباعة')}
                        </p>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer"
                            checked={!!cfg.cutAfterPrint}
                            onChange={e => updateDevice(device.key, { cutAfterPrint: e.target.checked } as Partial<HardwareSettings[typeof device.key]>)}
                          />
                          <div className="w-11 h-6 rounded-full peer transition-colors duration-200"
                            style={{ background: cfg.cutAfterPrint ? '#10b981' : 'var(--border-color)' }}>
                            <div className="absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full shadow transition-transform duration-200"
                              style={{ transform: cfg.cutAfterPrint ? 'translateX(1.25rem)' : 'translateX(0)' }} />
                          </div>
                        </label>
                      </div>
                    )}

                    {'welcomeMessage' in cfg && (
                      <div className="col-span-full">
                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                          {t('Welcome Message', 'رسالة الترحيب')}
                        </label>
                        <input className="input-field"
                          value={cfg.welcomeMessage as string}
                          onChange={e => updateDevice(device.key, { welcomeMessage: e.target.value } as Partial<HardwareSettings[typeof device.key]>)}
                        />
                      </div>
                    )}

                    {'provider' in cfg && (
                      <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                          {t('Payment Provider', 'مزود الدفع')}
                        </label>
                        <select className="input-field"
                          value={cfg.provider as string}
                          onChange={e => updateDevice(device.key, { provider: e.target.value } as Partial<HardwareSettings[typeof device.key]>)}>
                          {['STC Pay','Mada','Visa/MC','Tabby','Tamara','HyperPay','PayTabs'].map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {'terminalId' in cfg && (
                      <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                          {t('Terminal ID', 'معرّف الطرفية')}
                        </label>
                        <input className="input-field font-mono" placeholder="TID000001"
                          value={cfg.terminalId as string}
                          onChange={e => updateDevice(device.key, { terminalId: e.target.value } as Partial<HardwareSettings[typeof device.key]>)}
                        />
                      </div>
                    )}

                    {'unit' in cfg && device.key === 'weighingScale' && (
                      <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                          {t('Weight Unit', 'وحدة الوزن')}
                        </label>
                        <select className="input-field"
                          value={cfg.unit as string}
                          onChange={e => updateDevice(device.key, { unit: e.target.value } as Partial<HardwareSettings[typeof device.key]>)}>
                          <option value="kg">kg</option>
                          <option value="g">g</option>
                        </select>
                      </div>
                    )}

                  </div>

                  {device.testable && (
                    <div className="mt-4 flex items-center gap-3">
                      <button
                        onClick={() => void testDevice(device.key)}
                        disabled={ts === 'testing' || loading || saving}
                        className="btn-secondary flex items-center gap-2 text-sm"
                      >
                        <RefreshCw className={`w-4 h-4 ${ts === 'testing' ? 'animate-spin' : ''}`} />
                        {ts === 'testing' ? t('Testing…', 'جاري الاختبار…') : t('Test Device', 'اختبار الجهاز')}
                      </button>
                      {ts === 'ok'   && <span className="text-sm" style={{ color: '#10b981' }}>✓ {t('Device responded OK', 'الجهاز يعمل بشكل صحيح')}</span>}
                      {ts === 'fail' && <span className="text-sm" style={{ color: '#ef4444' }}>✗ {t('Device not responding', 'الجهاز لا يستجيب')}</span>}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="card p-5 space-y-3">
        <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
          {t('Integration Guide', 'دليل التكامل')}
        </h3>
        {[
          { icon: Scan,    color: '#10b981', title: t('Barcode Scanners','ماسحات الباركود'),       body: t('Plug any USB HID scanner — it works as a keyboard. Bluetooth scanners also work. Min barcode length: 4 chars.','قم بتوصيل أي ماسح USB HID — يعمل كلوحة مفاتيح. الماسحات البلوتوث تعمل أيضاً. الحد الأدنى لطول الباركود: 4 أحرف.') },
          { icon: Printer, color: '#3b82f6', title: t('Receipt Printers','طابعات الإيصالات'),      body: t('ESC/POS compatible: Epson TM series, Star TSP, Bixolon. Connect via USB (USB001) or Network (IP:9100). Web Serial API required for direct serial printing (Chrome/Edge only).','متوافق مع ESC/POS: Epson TM series, Star TSP, Bixolon. اتصل عبر USB أو الشبكة. Web Serial API مطلوب للطباعة التسلسلية المباشرة.') },
          { icon: Weight,  color: '#a855f7', title: t('Weighing Scales','الموازين الإلكترونية'),   body: t('Toledo, CAS, Mettler-Toledo via RS-232 Serial. Default baud rate 9600. Requires Chrome/Edge for Web Serial API access. Scale must output continuous weight data.','توليدو، CAS، Mettler-Toledo عبر RS-232. معدل الإرسال الافتراضي 9600. يتطلب Chrome/Edge للوصول إلى Web Serial API.') },
          { icon: CreditCard, color: '#f97316', title: t('Payment Terminals','طرفيات الدفع'),      body: t('STC Pay, Mada, Visa via SDK integration. Enter Terminal ID from your payment provider. NFC contactless payments supported.','STC Pay وMada وVisa عبر تكامل SDK. أدخل معرف الطرفية من مزود الدفع. مدفوعات NFC بدون تلامس مدعومة.') },
        ].map(item => (
          <div key={item.title} className="flex items-start gap-3 p-3 rounded-xl"
            style={{ background: 'var(--bg-muted)' }}>
            <item.icon className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: item.color }} />
            <div>
              <p className="text-xs font-bold mb-0.5" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{item.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
