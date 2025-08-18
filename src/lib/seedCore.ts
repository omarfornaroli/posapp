
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
// Mock data imports
import {
  mockProducts,
  mockClients,
  mockUsers,
  mockTaxes,
  mockPromotions,
  mockSalesTransactions,
  mockThemes,
  mockPaymentMethods,
  mockReceiptSettings,
  mockCountries,
  mockCurrencies,
  mockSuppliers,
} from './mock-data'; 

// Translation messages
import enMessages from '../messages/en.json';
import esMessages from '../messages/es.json';
// Type and specific key imports
import type { TranslationRecord } from '../models/Translation';
import { SINGLETON_KEY as ReceiptSettingSingletonKey } from '../models/ReceiptSetting';
import { SINGLETON_KEY as POSSettingSingletonKey } from '../models/POSSetting';
import { SINGLETON_KEY as SmtpSettingSingletonKey } from '../models/SmtpSetting';
import { DEFAULT_ROLE_PERMISSIONS } from './permissions'; 
import type { UserRole, Product as ProductType } from '../types';

// Ensure all models are imported so they are registered with Mongoose.
import '../models/Product';
import '../models/Client';
import '../models/User';
import '../models/Tax';
import '../models/Promotion';
import '../models/SaleTransaction';
import '../models/Translation';
import '../models/Theme';
import '../models/PaymentMethod';
import '../models/ReceiptSetting';
import '../models/POSSetting';
import '../models/SmtpSetting';
import '../models/AppLanguage';
import '../models/Notification'; 
import '../models/RolePermission'; 
import '../models/Country';
import '../models/Currency'; 
import '../models/Supplier';
import '../models/Report';


type NestedMessages = { [key: string]: string | NestedMessages };

function flattenMessages(messages: NestedMessages, prefix = ''): Record<string, string> {
  return Object.keys(messages).reduce((acc, k) => {
    const newPrefix = prefix ? `${prefix}.${k}` : k;
    if (typeof messages[k] === 'string') {
      acc[newPrefix] = messages[k] as string;
    } else if (typeof messages[k] === 'object' && messages[k] !== null) {
      Object.assign(acc, flattenMessages(messages[k] as NestedMessages, newPrefix));
    }
    return acc;
  }, {} as Record<string, string>);
}


export async function runSeedOperations() {
  console.log('Running seed operations (upsert mode)...');
  
  const Product = mongoose.model('Product');
  const Client = mongoose.model('Client');
  const User = mongoose.model('User');
  const Tax = mongoose.model('Tax');
  const Promotion = mongoose.model('Promotion');
  const SaleTransaction = mongoose.model('SaleTransaction');
  const Translation = mongoose.model('Translation');
  const Theme = mongoose.model('Theme');
  const PaymentMethod = mongoose.model('PaymentMethod');
  const ReceiptSetting = mongoose.model('ReceiptSetting');
  const POSSetting = mongoose.model('POSSetting');
  const SmtpSetting = mongoose.model('SmtpSetting');
  const AppLanguage = mongoose.model('AppLanguage'); 
  const RolePermissionModel = mongoose.model('RolePermission');
  const Country = mongoose.model('Country');
  const Currency = mongoose.model('Currency'); 
  const Supplier = mongoose.model('Supplier');

  const shouldLoadDemoData = process.env.LOAD_DEMO_DATA === 'true';

  // --- ESSENTIAL DATA ---
  console.log('Seeding essential data...');

  const adminUserData = mockUsers.find(u => u.email === 'admin@example.com');
  if (!adminUserData) {
    throw new Error("Admin user not found in mock data. Seeding cannot proceed.");
  }
  const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || '1234';
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(adminPassword, salt);
  const adminUser = await User.findOneAndUpdate(
    { email: adminUserData.email },
    { ...adminUserData, password: hashedPassword, status: 'active' },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );

  const adminId = adminUser._id;
  
  const otherUsers = mockUsers.filter(u => u.email !== 'admin@example.com');
  await Promise.all(
    otherUsers.map(data => User.findOneAndUpdate({ email: data.email }, { ...data, status: 'pending' }, { upsert: true, new: true, runValidators: true }))
  );
  console.log('Users seeded/updated.');
  
  await Promise.all([
    ...mockThemes.map(data => Theme.findOneAndUpdate({ name: data.name }, data, { upsert: true, new: true, runValidators: true })),
    ...mockPaymentMethods.map(data => PaymentMethod.findOneAndUpdate({ name: data.name }, data, { upsert: true, new: true, runValidators: true })),
    ...mockCountries.map(data => Country.findOneAndUpdate({ codeAlpha2: data.codeAlpha2 }, data, { upsert: true, new: true, runValidators: true })),
    ...mockCurrencies.map(data => Currency.findOneAndUpdate({ code: data.code }, data, { upsert: true, new: true, runValidators: true })),
    ReceiptSetting.findOneAndUpdate({ key: ReceiptSettingSingletonKey }, { key: ReceiptSettingSingletonKey, ...mockReceiptSettings }, { upsert: true, new: true, runValidators: true }),
    POSSetting.findOneAndUpdate({ key: POSSettingSingletonKey }, { key: POSSettingSingletonKey, requireAuthForCartItemRemoval: true, dispatchAtSaleDefault: true, separateCartAndPayment: false }, { upsert: true, new: true, runValidators: true }),
    SmtpSetting.findOneAndUpdate({ key: SmtpSettingSingletonKey }, { key: SmtpSettingSingletonKey }, { upsert: true, new: true, runValidators: true }),
    ...(Object.keys(DEFAULT_ROLE_PERMISSIONS) as UserRole[]).map(role => 
        RolePermissionModel.findOneAndUpdate({ role }, { role, permissions: DEFAULT_ROLE_PERMISSIONS[role] }, { upsert: true, new: true, runValidators: true })
    )
  ]);
  console.log('Core configuration data seeded/updated.');
  
  await AppLanguage.deleteMany({});
  await AppLanguage.insertMany([
    { code: 'en', name: 'English', isDefault: false, isEnabled: true },
    { code: 'es', name: 'Español', isDefault: true, isEnabled: true },
  ]);
  console.log('App Languages seeded.');
  
  await Translation.deleteMany({});
  const flatEnMessages = flattenMessages(enMessages as NestedMessages);
  const flatEsMessages = flattenMessages(esMessages as NestedMessages);
  const allKeys = new Set([...Object.keys(flatEnMessages), ...Object.keys(flatEsMessages)]);
  const translationRecords: Partial<TranslationRecord>[] = [];
  for (const keyPath of allKeys) {
    const valuesMap = new Map<string, string>();
    valuesMap.set('en', flatEnMessages[keyPath] || `[EN MISSING: ${keyPath}]`);
    valuesMap.set('es', flatEsMessages[keyPath] || `[ES MISSING: ${keyPath}]`);
    translationRecords.push({ keyPath, values: valuesMap });
  }
  await Translation.insertMany(translationRecords);
  console.log(`${translationRecords.length} Translation records seeded.`);
  
  await mongoose.model('Notification').deleteMany({});

  // --- DEMO DATA (Conditional) ---
  if (shouldLoadDemoData) {
    console.log('LOAD_DEMO_DATA is true. Seeding demo data...');
    
    const seededSuppliers = await Promise.all(
      mockSuppliers.map(data => Supplier.findOneAndUpdate({ name: data.name }, data, { upsert: true, new: true, runValidators: true }))
    );
    const supplierMap = new Map(seededSuppliers.map(s => [s.name, s._id]));
    console.log('Demo Suppliers seeded/updated.');
    
    const productsWithSupplierIds = mockProducts.map(productData => {
      const supplierId = supplierMap.get(productData.supplier as string);
      return { ...productData, supplier: supplierId };
    });
    
    await Promise.all([
      ...productsWithSupplierIds.map((data: Partial<ProductType>) => Product.findOneAndUpdate({ barcode: data.barcode }, data, { upsert: true, new: true, runValidators: true })),
      ...mockClients.map(data => Client.findOneAndUpdate({ email: data.email }, data, { upsert: true, new: true, runValidators: true })),
      ...mockTaxes.map(data => Tax.findOneAndUpdate({ name: data.name }, data, { upsert: true, new: true, runValidators: true })),
      ...mockPromotions.map(data => Promotion.findOneAndUpdate({ name: data.name }, data, { upsert: true, new: true, runValidators: true })),
    ]);
    console.log('Demo catalog data (Products, Clients, Taxes, Promotions) seeded/updated.');
    
    await SaleTransaction.deleteMany({});
    const salesToSeed = mockSalesTransactions.map(sale => ({ ...sale, date: new Date(sale.date) }));
    await SaleTransaction.insertMany(salesToSeed);
    console.log(`${salesToSeed.length} Demo Sale Transactions seeded.`);
    
  } else {
    console.log('LOAD_DEMO_DATA is not true. Skipping demo data.');
    // Ensure collections for demo data are empty if not loading them
    await Promise.all([
      Supplier.deleteMany({}),
      Product.deleteMany({}),
      Client.deleteMany({}),
      Tax.deleteMany({}),
      Promotion.deleteMany({}),
      SaleTransaction.deleteMany({}),
      mongoose.model('Report').deleteMany({})
    ]);
    console.log('Cleared demo data collections.');
  }
  
  console.log('Seed operations completed.');
}
