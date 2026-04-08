export type UserRole = 'developer' | 'super_admin' | 'admin' | 'inventory_manager' | 'cashier' | 'accountant';

export interface IUser {
  _id: string;
  name: string;
  nameAr: string;
  email: string;
  password?: string;
  role: UserRole;
  branchId?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProduct {
  _id: string;
  sku: string;
  barcode: string;
  name: string;
  nameAr: string;
  category: string;
  categoryAr: string;
  unit: 'kg' | 'g' | 'piece' | 'box' | 'liter' | 'ml';
  basePrice: number;
  sellPrice: number;
  vatRate: number;
  isWeighed: boolean;
  isActive: boolean;
  minStock: number;
  imageUrl?: string;
  branchId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBatch {
  _id: string;
  productId: string;
  product?: IProduct;
  batchNumber: string;
  vendorId?: string;
  purchaseOrderId?: string;
  quantity: number;
  remainingQty: number;
  unit: string;
  costPrice: number;
  sellPrice: number;
  manufactureDate?: Date;
  expiryDate: Date;
  receivedDate: Date;
  status: 'active' | 'expired' | 'depleted' | 'quarantine';
  branchId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInvoiceLine {
  productId: string;
  product?: IProduct;
  batchId?: string;
  name: string;
  nameAr: string;
  qty: number;
  unit: string;
  unitPrice: number;
  discount: number;
  vatRate: number;
  vatAmount: number;
  lineTotal: number;
}

export interface IPayment {
  method: 'cash' | 'card' | 'loyalty' | 'credit';
  amount: number;
  reference?: string;
}

export interface IInvoice {
  _id: string;
  invoiceNumber: string;
  type: 'sale' | 'return' | 'purchase';
  customerId?: string;
  customerName?: string;
  customerVatNumber?: string;
  lines: IInvoiceLine[];
  subtotal: number;
  discountTotal: number;
  vatTotal: number;
  grandTotal: number;
  payments: IPayment[];
  change: number;
  status: 'draft' | 'paid' | 'held' | 'cancelled' | 'returned';
  zatcaQR?: string;
  zatcaHash?: string;
  cashierId: string;
  cashierName?: string;
  promotionCode?: string;
  branchId: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IVendor {
  _id: string;
  code: string;
  name: string;
  nameAr: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  vatNumber?: string;
  creditLimit: number;
  currentBalance: number;
  paymentTerms: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPurchaseOrderLine {
  productId: string;
  name: string;
  qty: number;
  unit: string;
  unitCost: number;
  vatRate: number;
  vatAmount: number;
  lineTotal: number;
}

export interface IPurchaseOrder {
  _id: string;
  poNumber: string;
  vendorId: string;
  vendor?: IVendor;
  lines: IPurchaseOrderLine[];
  subtotal: number;
  vatTotal: number;
  landedCostFactor: number;
  grandTotal: number;
  status: 'draft' | 'sent' | 'received' | 'partial' | 'cancelled';
  expectedDelivery?: Date;
  receivedDate?: Date;
  branchId: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISupplierInvoicePayment {
  amount: number;
  method: 'cash' | 'bank_transfer' | 'card' | 'cheque' | 'other';
  reference?: string;
  note?: string;
  paidAt: Date;
}

export interface ISupplierInvoice {
  _id: string;
  invoiceNumber: string;
  vendorId: string | IVendor;
  purchaseOrderId?: string | IPurchaseOrder;
  supplierReference?: string;
  invoiceDate: Date;
  dueDate: Date;
  lines: IPurchaseOrderLine[];
  subtotal: number;
  vatTotal: number;
  grandTotal: number;
  paidAmount: number;
  balanceDue: number;
  status: 'draft' | 'posted' | 'partial' | 'paid' | 'overdue' | 'cancelled';
  payments: ISupplierInvoicePayment[];
  notes?: string;
  branchId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IGoodsReceiptLine extends IPurchaseOrderLine {
  batchNumber?: string;
  expiryDate?: Date;
}

export interface IGoodsReceipt {
  _id: string;
  grnNumber: string;
  purchaseOrderId: string | IPurchaseOrder;
  vendorId: string | IVendor;
  lines: IGoodsReceiptLine[];
  receivedDate: Date;
  notes?: string;
  branchId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEmployee {
  _id: string;
  employeeId: string;
  name: string;
  nameAr: string;
  position: string;
  positionAr: string;
  department: string;
  nationality: string;
  iqamaNumber?: string;
  iqamaExpiry?: Date;
  passportNumber?: string;
  passportExpiry?: Date;
  phone?: string;
  email?: string;
  salary: number;
  joinDate: Date;
  isActive: boolean;
  branchId: string;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAttendance {
  _id: string;
  employeeId: string;
  date: Date;
  clockIn?: Date;
  clockOut?: Date;
  hoursWorked?: number;
  status: 'present' | 'absent' | 'late' | 'half-day' | 'leave';
  notes?: string;
  createdAt: Date;
}

export interface IWastageLog {
  _id: string;
  productId: string;
  product?: IProduct;
  batchId?: string;
  quantity: number;
  unit: string;
  reason: 'expired' | 'damaged' | 'theft' | 'quality' | 'other';
  notes?: string;
  costLoss: number;
  recordedBy: string;
  branchId: string;
  createdAt: Date;
}

export interface IAuditLog {
  _id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  branchId?: string;
  createdAt: Date;
}

export interface IBranch {
  _id: string;
  code: string;
  name: string;
  nameAr: string;
  address: string;
  phone?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface IInventoryMovement {
  _id: string;
  productId: string;
  batchId?: string;
  type: 'in' | 'out' | 'adjustment' | 'transfer' | 'wastage';
  quantity: number;
  reference?: string;
  notes?: string;
  branchId: string;
  createdBy: string;
  createdAt: Date;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  branchId?: string;
  name: string;
}

export interface CartItem {
  productId: string;
  batchId?: string;
  name: string;
  nameAr: string;
  sku: string;
  qty: number;
  unit: string;
  unitPrice: number;
  discount: number;
  vatRate: number;
  isWeighed: boolean;
}

export interface HeldBill {
  id: string;
  label: string;
  items: CartItem[];
  customerName?: string;
  heldAt: Date;
}

export interface Language {
  code: 'en' | 'ar';
  name: string;
  dir: 'ltr' | 'rtl';
}

export type AlertSeverity = 'info' | 'warning' | 'error' | 'success';

export interface DashboardStats {
  todaySales: number;
  todayTransactions: number;
  todayVAT: number;
  expiringItems: number;
  pendingPOs: number;
  iqamaExpiring: number;
  monthRevenue: number;
  monthTransactions: number;
  activeProducts: number;
  totalCustomers: number;
  activePromos: number;
}

// ─── Customer / CRM ──────────────────────────────────────────────────────────
export interface ICustomer {
  _id: string;
  customerCode: string;
  name: string;
  nameAr: string;
  phone: string;
  email?: string;
  vatNumber?: string;
  loyaltyPoints: number;
  totalSpent: number;
  visitCount: number;
  segment: 'bronze' | 'silver' | 'gold' | 'platinum';
  notes?: string;
  isActive: boolean;
  branchId: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Promotions ───────────────────────────────────────────────────────────────
export type PromotionType = 'percentage' | 'fixed' | 'bogo' | 'bundle' | 'loyalty';
export interface IPromotion {
  _id: string;
  code: string;
  name: string;
  nameAr: string;
  type: PromotionType;
  value: number;
  minPurchase: number;
  maxDiscount?: number;
  productIds: string[];
  categoryIds: string[];
  usageLimit?: number;
  usedCount: number;
  loyaltyPointsCost?: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  branchId: string;
  createdAt: Date;
}

// ─── Shift / Cash Management ─────────────────────────────────────────────────
export interface ICashDenomination {
  value: number;
  count: number;
}
export interface IShift {
  _id: string;
  shiftNumber: string;
  cashierId: string;
  cashierName: string;
  branchId: string;
  openingFloat: number;
  closingFloat?: number;
  denominations?: ICashDenomination[];
  expectedCash?: number;
  cashVariance?: number;
  totalSales: number;
  totalReturns: number;
  totalCash: number;
  totalCard: number;
  totalLoyalty: number;
  transactionCount: number;
  openedAt: Date;
  closedAt?: Date;
  status: 'open' | 'closed';
  notes?: string;
}

// ─── Returns ──────────────────────────────────────────────────────────────────
export interface IReturn {
  _id: string;
  returnNumber: string;
  originalInvoiceId: string;
  originalInvoiceNumber: string;
  customerId?: string;
  lines: IInvoiceLine[];
  subtotal: number;
  vatTotal: number;
  grandTotal: number;
  reason: string;
  refundMethod: 'cash' | 'card' | 'loyalty' | 'credit_note';
  processedBy: string;
  branchId: string;
  createdAt: Date;
}

// ─── Stock Transfers ──────────────────────────────────────────────────────────
export interface IStockTransferLine {
  productId: string;
  productName: string;
  batchId?: string;
  batchNumber?: string;
  qty: number;
  unit: string;
}
export interface IStockTransfer {
  _id: string;
  transferNumber: string;
  fromBranchId: string;
  toBranchId: string;
  lines: IStockTransferLine[];
  status: 'pending' | 'in_transit' | 'received' | 'cancelled';
  requestedBy: string;
  approvedBy?: string;
  notes?: string;
  createdAt: Date;
  receivedAt?: Date;
}

// ─── Hardware ─────────────────────────────────────────────────────────────────
export type HardwareType = 'barcode_scanner' | 'receipt_printer' | 'cash_drawer' | 'weighing_scale' | 'customer_display' | 'label_printer' | 'payment_terminal';
export type HardwareStatus = 'connected' | 'disconnected' | 'error' | 'testing';
export type HardwareDeviceKey = 'barcodeScanner' | 'receiptPrinter' | 'cashDrawer' | 'weighingScale' | 'customerDisplay' | 'labelPrinter' | 'paymentTerminal';
export type HardwareTestStatus = 'idle' | 'testing' | 'ok' | 'fail';
export interface HardwareDevice {
  id: string;
  type: HardwareType;
  name: string;
  protocol: 'usb' | 'serial' | 'network' | 'bluetooth' | 'hid';
  port?: string;
  baudRate?: number;
  ipAddress?: string;
  status: HardwareStatus;
  lastSeen?: Date;
  config: Record<string, unknown>;
}
export interface HardwareSettings {
  barcodeScanner: { enabled: boolean; prefix: string; suffix: string; minLength: number; };
  receiptPrinter: { enabled: boolean; port: string; paperWidth: 58 | 80; copies: number; cutAfterPrint: boolean; openDrawer: boolean; };
  cashDrawer: { enabled: boolean; port: string; };
  weighingScale: { enabled: boolean; port: string; baudRate: number; unit: 'kg' | 'g'; };
  customerDisplay: { enabled: boolean; port: string; welcomeMessage: string; };
  labelPrinter: { enabled: boolean; port: string; labelWidth: number; labelHeight: number; };
  paymentTerminal: { enabled: boolean; provider: string; terminalId: string; };
}

export interface HardwareTestResult {
  status: HardwareTestStatus;
  testedAt?: Date;
  testedBy?: string;
  note?: string;
}

export type HardwareTestResultMap = Record<HardwareDeviceKey, HardwareTestResult>;

export interface IHardwareSettingsRecord {
  _id: string;
  branchId: string;
  settings: HardwareSettings;
  testResults: HardwareTestResultMap;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}
