import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/saudimart_erp';

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db!;

  // ---- Clear collections ----
  const colls = ['users','products','vendors','employees','branches','batches','invoices','purchaseorders','attendances','wastageLogs','auditlogs'];
  for (const c of colls) {
    try { await db.collection(c).deleteMany({}); } catch { /* ignore */ }
  }
  console.log('Cleared existing data');

  // ---- Branch ----
  const branchId = new mongoose.Types.ObjectId('000000000000000000000001');
  await db.collection('branches').insertOne({
    _id: branchId,
    code: 'BR001',
    name: 'Main Branch - Riyadh',
    nameAr: 'الفرع الرئيسي - الرياض',
    address: 'King Fahd Road, Riyadh 12345',
    phone: '+966-11-000-0001',
    isActive: true,
    createdAt: new Date(),
  });
  console.log('Branch seeded');

  // ---- Users ----
  const password = await bcrypt.hash('Admin@1234', 12);
  const users = [
    { name: 'Super Admin',       nameAr: 'المدير العام',      email: 'admin@saudimart.sa',     role: 'super_admin',       branchId, isActive: true },
    { name: 'Developer',         nameAr: 'المطور',            email: 'dev@saudimart.sa',        role: 'developer',         branchId, isActive: true },
    { name: 'Inventory Manager', nameAr: 'مدير المخزون',       email: 'inventory@saudimart.sa',  role: 'inventory_manager', branchId, isActive: true },
    { name: 'Cashier Ahmed',     nameAr: 'كاشير أحمد',         email: 'cashier@saudimart.sa',    role: 'cashier',           branchId, isActive: true },
    { name: 'Accountant Sara',   nameAr: 'محاسبة سارة',        email: 'accounts@saudimart.sa',   role: 'accountant',        branchId, isActive: true },
  ].map(u => ({ ...u, password, createdAt: new Date(), updatedAt: new Date() }));
  await db.collection('users').insertMany(users);
  console.log('Users seeded (password: Admin@1234)');

  // ---- Products ----
  const products = [
    { sku: 'RICE-001', barcode: '6281234567890', name: 'Basmati Rice 5kg', nameAr: 'أرز بسمتي 5 كيلو', category: 'Grains', categoryAr: 'حبوب', unit: 'piece', basePrice: 28, sellPrice: 34.5, vatRate: 0.15, isWeighed: false, isActive: true, minStock: 10, branchId },
    { sku: 'CHKN-001', barcode: '6281234567891', name: 'Whole Chicken (Fresh)', nameAr: 'دجاج كامل طازج', category: 'Poultry', categoryAr: 'دواجن', unit: 'kg', basePrice: 9, sellPrice: 12.5, vatRate: 0.15, isWeighed: true, isActive: true, minStock: 5, branchId },
    { sku: 'MILK-001', barcode: '6281234567892', name: 'Full Fat Milk 1L', nameAr: 'حليب كامل الدسم 1 لتر', category: 'Dairy', categoryAr: 'منتجات الألبان', unit: 'liter', basePrice: 3.5, sellPrice: 5.5, vatRate: 0.15, isWeighed: false, isActive: true, minStock: 20, branchId },
    { sku: 'TMAT-001', barcode: '6281234567893', name: 'Fresh Tomatoes', nameAr: 'طماطم طازجة', category: 'Vegetables', categoryAr: 'خضروات', unit: 'kg', basePrice: 2, sellPrice: 4, vatRate: 0.15, isWeighed: true, isActive: true, minStock: 15, branchId },
    { sku: 'OILV-001', barcode: '6281234567894', name: 'Olive Oil 750ml', nameAr: 'زيت زيتون 750 مل', category: 'Oils', categoryAr: 'زيوت', unit: 'piece', basePrice: 22, sellPrice: 29.99, vatRate: 0.15, isWeighed: false, isActive: true, minStock: 8, branchId },
    { sku: 'BRED-001', barcode: '6281234567895', name: 'White Bread Loaf', nameAr: 'رغيف خبز أبيض', category: 'Bakery', categoryAr: 'مخبوزات', unit: 'piece', basePrice: 2.5, sellPrice: 4.5, vatRate: 0.15, isWeighed: false, isActive: true, minStock: 25, branchId },
    { sku: 'EGGS-001', barcode: '6281234567896', name: 'Eggs 30-pack', nameAr: 'بيض 30 حبة', category: 'Dairy', categoryAr: 'منتجات الألبان', unit: 'box', basePrice: 16, sellPrice: 21, vatRate: 0.15, isWeighed: false, isActive: true, minStock: 10, branchId },
    { sku: 'SGRA-001', barcode: '6281234567897', name: 'Granulated Sugar 1kg', nameAr: 'سكر أبيض 1 كيلو', category: 'Staples', categoryAr: 'أساسيات', unit: 'piece', basePrice: 3, sellPrice: 5.25, vatRate: 0.15, isWeighed: false, isActive: true, minStock: 20, branchId },
  ].map(p => ({ ...p, createdAt: new Date(), updatedAt: new Date() }));
  const prodResult = await db.collection('products').insertMany(products);
  console.log(`Products seeded: ${prodResult.insertedCount}`);

  // ---- Batches (with expiry dates) ----
  const productIds = Object.values(prodResult.insertedIds);
  const now = new Date();
  const batches = productIds.slice(0, 6).map((pid, i) => ({
    productId: pid,
    batchNumber: `BATCH-2025-${String(i + 1).padStart(3, '0')}`,
    quantity: 100 + i * 20,
    remainingQty: 80 + i * 10,
    unit: products[i].unit,
    costPrice: products[i].basePrice,
    sellPrice: products[i].sellPrice,
    manufactureDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
    expiryDate: new Date(now.getFullYear(), now.getMonth() + 2 + i, 1),
    receivedDate: new Date(),
    status: 'active',
    branchId,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
  // One expired batch
  batches.push({
    productId: productIds[6],
    batchNumber: 'BATCH-EXPIRED-001',
    quantity: 50,
    remainingQty: 12,
    unit: 'box',
    costPrice: 14,
    sellPrice: 19,
    manufactureDate: new Date(now.getFullYear() - 1, 0, 1),
    expiryDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
    receivedDate: new Date(now.getFullYear() - 1, 1, 1),
    status: 'expired',
    branchId,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await db.collection('batches').insertMany(batches);
  console.log(`Batches seeded: ${batches.length}`);

  // ---- Vendors ----
  const vendors = [
    { code: 'VND-001', name: 'Al-Othman Trading', nameAr: 'مؤسسة العثمان للتجارة', contactPerson: 'Mohammed Al-Othman', phone: '+966-11-111-1111', vatNumber: '300012345600003', creditLimit: 50000, currentBalance: 12000, paymentTerms: 30, isActive: true },
    { code: 'VND-002', name: 'Saudi Farms Co.', nameAr: 'شركة المزارع السعودية', contactPerson: 'Abdullah Ahmed', phone: '+966-11-222-2222', vatNumber: '300056789000004', creditLimit: 80000, currentBalance: 5500, paymentTerms: 45, isActive: true },
    { code: 'VND-003', name: 'Gulf Dairy Products', nameAr: 'منتجات الألبان الخليجية', contactPerson: 'Khalid Hassan', phone: '+966-11-333-3333', vatNumber: '300098765400005', creditLimit: 30000, currentBalance: 0, paymentTerms: 14, isActive: true },
  ].map(v => ({ ...v, createdAt: new Date(), updatedAt: new Date() }));
  await db.collection('vendors').insertMany(vendors);
  console.log(`Vendors seeded: ${vendors.length}`);

  // ---- Employees ----
  const employees = [
    { employeeId: 'EMP-001', name: 'Ahmed Al-Rashidi', nameAr: 'أحمد الراشدي', position: 'Store Manager', positionAr: 'مدير المتجر', department: 'Management', nationality: 'Saudi', iqamaNumber: null, iqamaExpiry: null, phone: '+966-55-000-0001', salary: 8000, joinDate: new Date('2022-01-15'), isActive: true, branchId },
    { employeeId: 'EMP-002', name: 'Rajesh Kumar', nameAr: 'راجيش كومار', position: 'Cashier', positionAr: 'كاشير', department: 'Sales', nationality: 'Indian', iqamaNumber: '2456789012', iqamaExpiry: new Date(now.getFullYear(), now.getMonth() + 2, 15), phone: '+966-55-000-0002', salary: 2500, joinDate: new Date('2023-03-01'), isActive: true, branchId },
    { employeeId: 'EMP-003', name: 'Mohammed Al-Farsi', nameAr: 'محمد الفارسي', position: 'Inventory Clerk', positionAr: 'موظف مخزون', department: 'Warehouse', nationality: 'Saudi', iqamaNumber: null, iqamaExpiry: null, phone: '+966-55-000-0003', salary: 3500, joinDate: new Date('2021-07-10'), isActive: true, branchId },
    { employeeId: 'EMP-004', name: 'Suresh Patel', nameAr: 'سوريش باتيل', position: 'Stock Boy', positionAr: 'عامل مخزن', department: 'Warehouse', nationality: 'Indian', iqamaNumber: '2567890123', iqamaExpiry: new Date(now.getFullYear(), now.getMonth() + 45, 1), phone: '+966-55-000-0004', salary: 1800, joinDate: new Date('2024-01-20'), isActive: true, branchId },
  ].map(e => ({ ...e, createdAt: new Date(), updatedAt: new Date() }));
  await db.collection('employees').insertMany(employees);
  console.log(`Employees seeded: ${employees.length}`);

  // ---- Sample invoice ----
  const p0 = productIds[0];
  const p2 = productIds[2];
  await db.collection('invoices').insertOne({
    invoiceNumber: 'INV-250601-0001',
    type: 'sale',
    customerName: 'Walk-in Customer',
    lines: [
      { productId: p0, name: products[0].name, nameAr: products[0].nameAr, qty: 2, unit: 'piece', unitPrice: 34.5, discount: 0, vatRate: 0.15, vatAmount: 10.35, lineTotal: 79.35 },
      { productId: p2, name: products[2].name, nameAr: products[2].nameAr, qty: 3, unit: 'liter', unitPrice: 5.5, discount: 0, vatRate: 0.15, vatAmount: 2.475, lineTotal: 18.975 },
    ],
    subtotal: 85.5,
    discountTotal: 0,
    vatTotal: 12.825,
    grandTotal: 98.325,
    payments: [{ method: 'cash', amount: 100 }],
    change: 1.675,
    status: 'paid',
    cashierId: 'system',
    cashierName: 'Seed Script',
    branchId,
    zatcaQR: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log('Sample invoice seeded');

  await mongoose.disconnect();
  console.log('\n✅ Seed complete! Login credentials:');
  console.log('   super_admin  → admin@saudimart.sa    / Admin@1234');
  console.log('   developer    → dev@saudimart.sa       / Admin@1234');
  console.log('   cashier      → cashier@saudimart.sa   / Admin@1234');
  console.log('   accountant   → accounts@saudimart.sa  / Admin@1234');
}

seed().catch(err => { console.error(err); process.exit(1); });
