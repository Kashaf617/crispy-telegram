'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  HardwareDeviceKey,
  HardwareSettings,
  HardwareTestResultMap,
  HardwareTestStatus,
} from '@/types';
import {
  DEFAULT_HARDWARE_SETTINGS,
  createDefaultHardwareTests,
  mergeHardwareSettings,
  mergeHardwareTests,
} from '@/lib/hardware';

// ── Default hardware settings ──────────────────────────────────────────────
export const DEFAULT_HW_SETTINGS: HardwareSettings = DEFAULT_HARDWARE_SETTINGS;

export function useHardwareSettings() {
  const [settings, setSettings] = useState<HardwareSettings>(DEFAULT_HW_SETTINGS);
  const [testResults, setTestResults] = useState<HardwareTestResultMap>(createDefaultHardwareTests());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/hardware-settings', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load hardware settings');
      setSettings(mergeHardwareSettings(data.settings));
      setTestResults(mergeHardwareTests(data.testResults));
      setUpdatedAt(data.updatedAt || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load hardware settings');
      setSettings(DEFAULT_HW_SETTINGS);
      setTestResults(createDefaultHardwareTests());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const save = useCallback(async (updated: HardwareSettings) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/hardware-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: updated }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save hardware settings');
      setSettings(mergeHardwareSettings(data.settings));
      setTestResults(mergeHardwareTests(data.testResults));
      setUpdatedAt(data.updatedAt || null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save hardware settings');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const reportTest = useCallback(async (deviceKey: HardwareDeviceKey, status: HardwareTestStatus, note?: string) => {
    setTestResults((prev) => ({
      ...prev,
      [deviceKey]: {
        ...prev[deviceKey],
        status,
        testedAt: new Date(),
      },
    }));
    try {
      const res = await fetch('/api/hardware-settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceKey, status, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record hardware test');
      setSettings(mergeHardwareSettings(data.settings));
      setTestResults(mergeHardwareTests(data.testResults));
      setUpdatedAt(data.updatedAt || null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record hardware test');
      return false;
    }
  }, []);

  return { settings, testResults, loading, saving, error, updatedAt, reload, save, reportTest };
}

// ── Barcode scanner (HID keyboard wedge) ──────────────────────────────────
/**
 * USB / Bluetooth barcode scanners in HID mode type characters as a
 * keyboard. This hook captures those keystrokes in a buffer and fires
 * onScan when it detects a suffix character (default: Enter / \n).
 */
export function useBarcodeScanner(
  onScan: (code: string) => void,
  options: { enabled?: boolean; minLength?: number; suffix?: string } = {},
) {
  const { enabled = true, minLength = 4, suffix = 'Enter' } = options;
  const bufRef = useRef<string>('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (e.key === suffix || e.key === 'Enter') {
      const code = bufRef.current.trim();
      bufRef.current = '';
      if (code.length >= minLength) onScan(code);
      return;
    }
    if (e.key.length === 1) bufRef.current += e.key;
    timerRef.current = setTimeout(() => { bufRef.current = ''; }, 100);
  }, [enabled, minLength, suffix, onScan]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);
}

// ── Web Serial API wrapper for scale / printer / drawer ───────────────────
export type SerialStatus = 'idle' | 'connecting' | 'connected' | 'error';

export interface SerialPort {
  status: SerialStatus;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  send: (data: Uint8Array) => Promise<void>;
  lastReading: string;
  error: string | null;
}

export function useSerialPort(baudRate = 9600): SerialPort {
  const [status, setStatus]       = useState<SerialStatus>('idle');
  const [lastReading, setReading] = useState('');
  const [error, setError]         = useState<string | null>(null);
  const portRef = useRef<unknown>(null);
  const readerRef = useRef<unknown>(null);

  async function connect() {
    if (!('serial' in navigator)) {
      setError('Web Serial API not supported. Use Chrome/Edge.');
      setStatus('error');
      return false;
    }
    try {
      setStatus('connecting');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate });
      portRef.current = port;
      setStatus('connected');
      setError(null);
      readLoop(port);
      return true;
    } catch (err) {
      setError(String(err));
      setStatus('error');
      return false;
    }
  }

  async function readLoop(port: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = port as any;
    try {
      const reader = p.readable.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        setReading(prev => prev + decoder.decode(value));
      }
    } catch { /* port closed */ }
  }

  async function send(data: Uint8Array) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = portRef.current as any;
    if (!p) return;
    const writer = p.writable.getWriter();
    await writer.write(data);
    writer.releaseLock();
  }

  function disconnect() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = readerRef.current as any;
    if (r) r.cancel();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = portRef.current as any;
    if (p) p.close();
    setStatus('idle');
  }

  useEffect(() => () => disconnect(), []);

  return { status, connect, disconnect, send, lastReading, error };
}

// ── Parse weighing scale reading (common formats) ─────────────────────────
export function parseScaleReading(raw: string): number | null {
  // Common formats: "ST,GS,+  0.520 kg\r\n" or "0.520\r\n"
  const match = raw.match(/([+-]?\d+\.?\d*)\s*(kg|g)?/i);
  if (!match) return null;
  const val  = parseFloat(match[1]);
  const unit = (match[2] || 'kg').toLowerCase();
  return unit === 'g' ? val / 1000 : val;
}

// ── Print via browser (fallback: window.print) ────────────────────────────
export function printReceiptBrowser(htmlContent: string) {
  const w = window.open('', '_blank', 'width=320,height=600');
  if (!w) return;
  w.document.write(`<html><head><style>
    body{font-family:monospace;font-size:12px;width:300px;margin:0;padding:8px}
    .center{text-align:center} .right{text-align:right}
    .bold{font-weight:bold} .divider{border-top:1px dashed #000;margin:4px 0}
    table{width:100%;border-collapse:collapse} td{padding:1px 2px;font-size:11px}
  </style></head><body>${htmlContent}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); w.close(); }, 300);
}
