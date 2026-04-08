import type {
  HardwareDeviceKey,
  HardwareSettings,
  HardwareTestResultMap,
} from '@/types';

export const DEFAULT_HARDWARE_SETTINGS: HardwareSettings = {
  barcodeScanner: { enabled: true, prefix: '', suffix: '\n', minLength: 4 },
  receiptPrinter: { enabled: false, port: 'USB001', paperWidth: 80, copies: 1, cutAfterPrint: true, openDrawer: true },
  cashDrawer: { enabled: false, port: 'USB001' },
  weighingScale: { enabled: false, port: 'COM3', baudRate: 9600, unit: 'kg' },
  customerDisplay: { enabled: false, port: 'COM4', welcomeMessage: 'Welcome to SaudiMart' },
  labelPrinter: { enabled: false, port: 'USB002', labelWidth: 62, labelHeight: 29 },
  paymentTerminal: { enabled: false, provider: 'STC Pay', terminalId: '' },
};

export const HARDWARE_DEVICE_KEYS: HardwareDeviceKey[] = [
  'barcodeScanner',
  'receiptPrinter',
  'cashDrawer',
  'weighingScale',
  'customerDisplay',
  'labelPrinter',
  'paymentTerminal',
];

export function createDefaultHardwareTests(): HardwareTestResultMap {
  return {
    barcodeScanner: { status: 'idle' },
    receiptPrinter: { status: 'idle' },
    cashDrawer: { status: 'idle' },
    weighingScale: { status: 'idle' },
    customerDisplay: { status: 'idle' },
    labelPrinter: { status: 'idle' },
    paymentTerminal: { status: 'idle' },
  };
}

export function mergeHardwareSettings(settings?: Partial<HardwareSettings> | null): HardwareSettings {
  return {
    barcodeScanner: { ...DEFAULT_HARDWARE_SETTINGS.barcodeScanner, ...(settings?.barcodeScanner || {}) },
    receiptPrinter: { ...DEFAULT_HARDWARE_SETTINGS.receiptPrinter, ...(settings?.receiptPrinter || {}) },
    cashDrawer: { ...DEFAULT_HARDWARE_SETTINGS.cashDrawer, ...(settings?.cashDrawer || {}) },
    weighingScale: { ...DEFAULT_HARDWARE_SETTINGS.weighingScale, ...(settings?.weighingScale || {}) },
    customerDisplay: { ...DEFAULT_HARDWARE_SETTINGS.customerDisplay, ...(settings?.customerDisplay || {}) },
    labelPrinter: { ...DEFAULT_HARDWARE_SETTINGS.labelPrinter, ...(settings?.labelPrinter || {}) },
    paymentTerminal: { ...DEFAULT_HARDWARE_SETTINGS.paymentTerminal, ...(settings?.paymentTerminal || {}) },
  };
}

export function mergeHardwareTests(tests?: Partial<HardwareTestResultMap> | null): HardwareTestResultMap {
  const defaults = createDefaultHardwareTests();
  return {
    barcodeScanner: { ...defaults.barcodeScanner, ...(tests?.barcodeScanner || {}) },
    receiptPrinter: { ...defaults.receiptPrinter, ...(tests?.receiptPrinter || {}) },
    cashDrawer: { ...defaults.cashDrawer, ...(tests?.cashDrawer || {}) },
    weighingScale: { ...defaults.weighingScale, ...(tests?.weighingScale || {}) },
    customerDisplay: { ...defaults.customerDisplay, ...(tests?.customerDisplay || {}) },
    labelPrinter: { ...defaults.labelPrinter, ...(tests?.labelPrinter || {}) },
    paymentTerminal: { ...defaults.paymentTerminal, ...(tests?.paymentTerminal || {}) },
  };
}
