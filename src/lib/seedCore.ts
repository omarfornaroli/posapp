
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
import { SINGLETON_KEY as AiSettingSingletonKey } from '../models/AiSetting';
import { DEFAULT_ROLE_PERMISSIONS } from './permissions'; 
import type { UserRole, Product as ProductType, Supplier } from '../types';

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
import '../models/AiSetting';
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
  console.log('Running seed operations (non-destructive mode for user configs)...');
  
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
  const AiSetting = mongoose.model('AiSetting');
  const AppLanguage = mongoose.model('AppLanguage'); 
  const RolePermissionModel = mongoose.model('RolePermission');
  const Country = mongoose.model('Country');
  const Currency = mongoose.model('Currency'); 
  const Supplier = mongoose.model('Supplier');

  const shouldLoadDemoData = process.env.LOAD_DEMO_DATA === 'true';

  // --- ESSENTIAL DATA (Non-destructive upserts) ---
  console.log('Seeding essential data...');

  // User Seeding: Only insert if they don't exist. Never update existing users.
  const salt = await bcrypt.genSalt(10);
  const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || '1234';
  const hashedPassword = await bcrypt.hash(adminPassword, salt);
  
  await Promise.all(
    mockUsers.map(userData => {
      const isAdmin = userData.email === 'admin@example.com';
      const userPayload = {
        ...userData,
        status: 'active' as const, // Admins and mock users are active by default now.
        password: isAdmin ? hashedPassword : undefined,
      };
      return User.updateOne(
        { email: userData.email },
        { $setOnInsert: userPayload },
        { upsert: true, runValidators: true }
      );
    })
  );
  console.log('Users seeded/updated.');
  
  await Promise.all([
    ...mockThemes.map(data => Theme.updateOne({ name: data.name }, { $setOnInsert: data }, { upsert: true, runValidators: true })),
    ...mockPaymentMethods.map(data => {
        // Convert plain object names to Maps for Mongoose
        const nameMap = new Map<string, string>();
        if (typeof data.name === 'object' && data.name !== null) {
            Object.entries(data.name).forEach(([key, value]) => nameMap.set(key, value));
        }
        const descriptionMap = new Map<string, string>();
        if (typeof data.description === 'object' && data.description !== null) {
            Object.entries(data.description).forEach(([key, value]) => descriptionMap.set(key, value));
        }
        
        const englishName = nameMap.get('en') || `PaymentMethod-${Date.now()}`;

        return PaymentMethod.updateOne(
            { 'name.en': englishName }, 
            { $setOnInsert: { ...data, name: nameMap, description: descriptionMap } }, 
            { upsert: true, runValidators: true }
        );
    }),
    ...mockCountries.map(data => Country.updateOne({ codeAlpha2: data.codeAlpha2 }, { $setOnInsert: data }, { upsert: true, runValidators: true })),
    ...mockCurrencies.map(data => Currency.updateOne({ code: data.code }, { $setOnInsert: data }, { upsert: true, runValidators: true })),
    ReceiptSetting.updateOne({ key: ReceiptSettingSingletonKey }, { $setOnInsert: { key: ReceiptSettingSingletonKey, ...mockReceiptSettings } }, { upsert: true, runValidators: true }),
    POSSetting.updateOne({ key: POSSettingSingletonKey }, { $setOnInsert: { key: POSSettingSingletonKey, requireAuthForCartItemRemoval: true, dispatchAtSaleDefault: true, separateCartAndPayment: false, sessionDuration: 30 } }, { upsert: true, runValidators: true }),
    SmtpSetting.updateOne({ key: SmtpSettingSingletonKey }, { $setOnInsert: { key: SmtpSettingSingletonKey } }, { upsert: true, runValidators: true }),
    AiSetting.updateOne({ key: AiSettingSingletonKey }, { $setOnInsert: { key: AiSettingSingletonKey } }, { upsert: true, runValidators: true }),
    ...(Object.keys(DEFAULT_ROLE_PERMISSIONS) as UserRole[]).map(role => 
        RolePermissionModel.updateOne({ role }, { $setOnInsert: { role, permissions: DEFAULT_ROLE_PERMISSIONS[role] } }, { upsert: true, runValidators: true })
    )
  ]);
  console.log('Core configuration data seeded/updated.');
  
  // App Languages and Translations should be managed carefully.
  const enLangCount = await AppLanguage.countDocuments({ code: 'en' });
  if (enLangCount === 0) await AppLanguage.create({ code: 'en', name: 'English', isDefault: false, isEnabled: true });
  const esLangCount = await AppLanguage.countDocuments({ code: 'es' });
  if (esLangCount === 0) await AppLanguage.create({ code: 'es', name: 'Español', isDefault: true, isEnabled: true });
  console.log('App Languages seeded.');
  
  const flatEnMessages = flattenMessages(enMessages as NestedMessages);
  const flatEsMessages = flattenMessages(esMessages as NestedMessages);
  const allKeys = new Set([...Object.keys(flatEnMessages), ...Object.keys(flatEsMessages)]);

  for (const keyPath of allKeys) {
    const valuesMap = new Map<string, string>();
    valuesMap.set('en', flatEnMessages[keyPath] || `[EN MISSING: ${keyPath}]`);
    valuesMap.set('es', flatEsMessages[keyPath] || `[ES MISSING: ${keyPath}]`);
    
    // Use updateOne with upsert to avoid race conditions and ensure atomicity per key
    await Translation.updateOne(
        { keyPath: keyPath },
        { $setOnInsert: { keyPath: keyPath, values: valuesMap } },
        { upsert: true }
    );
  }
  console.log(`${allKeys.size} Translation records seeded/updated.`);
  
  // --- DEMO DATA (Conditional) ---
  if (shouldLoadDemoData) {
    console.log('LOAD_DEMO_DATA is true. Seeding demo data (upsert mode)...');
    
    await Promise.all(
      mockSuppliers.map(data => Supplier.updateOne({ name: data.name }, { $setOnInsert: data }, { upsert: true, runValidators: true }))
    );
    console.log('Demo Suppliers seeded/updated.');
    
    // Have to fetch suppliers again to get their IDs for product mapping
    const seededSuppliers = await Supplier.find({ name: { $in: mockSuppliers.map(s => s.name) } });
    const supplierMap = new Map(seededSuppliers.map(s => [s.name, s._id]));

    const productsWithSupplierIds = mockProducts.map(productData => {
      const supplierId = supplierMap.get(productData.supplier as string);
      return { ...productData, supplier: supplierId };
    });
    
    await Promise.all([
      ...productsWithSupplierIds.map((data: Partial<ProductType>) => Product.updateOne({ barcode: data.barcode }, { $setOnInsert: data }, { upsert: true, runValidators: true })),
      ...mockClients.map(data => Client.updateOne({ email: data.email }, { $setOnInsert: data }, { upsert: true, runValidators: true })),
      ...mockTaxes.map(data => Tax.updateOne({ name: data.name }, { $setOnInsert: data }, { upsert: true, runValidators: true })),
      ...mockPromotions.map(data => Promotion.updateOne({ name: data.name }, { $setOnInsert: data }, { upsert: true, runValidators: true })),
    ]);
    console.log('Demo catalog data (Products, Clients, Taxes, Promotions) seeded/updated.');
    
    // For sales, it's safer to just add if the collection is empty to avoid duplicates
    const salesCount = await SaleTransaction.countDocuments();
    if (salesCount === 0) {
      const salesToSeed = mockSalesTransactions.map(sale => ({ ...sale, date: new Date(sale.date) }));
      await SaleTransaction.insertMany(salesToSeed);
      console.log(`${salesToSeed.length} Demo Sale Transactions seeded.`);
    } else {
      console.log('Skipping sale transactions seeding as data already exists.');
    }
    
  } else {
    console.log('LOAD_DEMO_DATA is not true. Skipping demo data.');
  }
  
  console.log('Seed operations completed.');
}
