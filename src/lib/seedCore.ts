
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
  mockCountries,
  mockCurrencies,
  mockSuppliers,
  mockReceiptSettings
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
import { ALL_PERMISSIONS } from './permissionKeys';
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
  console.log('Running seed operations...');
  
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

  // Helper function for conditional upsert
  async function conditionalUpsert(model: mongoose.Model<any>, uniqueKey: string, data: any[]) {
    if (data.length === 0) return;

    for (const item of data) {
      const existingDoc = await model.findOne({ [uniqueKey]: item[uniqueKey] }).exec();

      if (existingDoc) {
        // Document exists, check if it was user-modified
        if (existingDoc.createdAt?.getTime() === existingDoc.updatedAt?.getTime()) {
          // Not user-modified, so we can update it.
          await model.updateOne({ _id: existingDoc._id }, { $set: item });
        }
      } else {
        // Document does not exist, insert it.
        await model.create(item);
      }
    }
  }


  // --- ESSENTIAL DATA (Non-destructive upserts) ---
  console.log('Seeding essential data...');

  // User Seeding with conditional update
  const adminPasswordHash = '$2a$10$ilPWobJlP0tg.HvdeK8T2etPEQkHWQJBG5aYS8.2W.Kv3At73E.jK';
  const salt = await bcrypt.genSalt(10);
  const otherUserPassword = await bcrypt.hash('1234', salt);
  
  for (const userData of mockUsers) {
    const existingUser = await User.findOne({ email: userData.email }).exec();
    const isAdmin = userData.email === 'admin@example.com';
    
    const userPayload: any = {
      ...userData,
      status: 'active',
    };
    
    // Only set the password if the user does not exist.
    // For admin, we use the specific hash. For others, a generic one.
    if (!existingUser) {
        userPayload.password = isAdmin ? adminPasswordHash : otherUserPassword;
        await User.create(userPayload);
    } else if (isAdmin) {
        // If the admin user exists, ensure their password is the one provided.
        // This is a specific override for the admin user.
        await User.updateOne({ _id: existingUser._id }, { $set: { ...userPayload, password: adminPasswordHash } });
    }
    // We don't update other existing users' passwords.
  }
  console.log('Users seeded/updated.');
  
  await Promise.all([
    ReceiptSetting.updateOne({ key: ReceiptSettingSingletonKey }, { $setOnInsert: { key: ReceiptSettingSingletonKey, ...mockReceiptSettings } }, { upsert: true, runValidators: true }),
    POSSetting.updateOne({ key: POSSettingSingletonKey }, { $setOnInsert: { key: POSSettingSingletonKey, requireAuthForCartItemRemoval: true, dispatchAtSaleDefault: true, separateCartAndPayment: false, sessionDuration: 30 } }, { upsert: true, runValidators: true }),
    SmtpSetting.updateOne({ key: SmtpSettingSingletonKey }, { $setOnInsert: { key: SmtpSettingSingletonKey } }, { upsert: true, runValidators: true }),
    AiSetting.updateOne({ key: AiSettingSingletonKey }, { $setOnInsert: { key: AiSettingSingletonKey } }, { upsert: true, runValidators: true })
  ]);
  
  // Always ensure Admin has all permissions. This acts as a self-healing mechanism.
  await RolePermissionModel.updateOne(
    { role: 'Admin' }, 
    { $set: { permissions: ALL_PERMISSIONS } },
    { upsert: true }
  );

  // Conditional upsert for other roles
  for (const role of Object.keys(DEFAULT_ROLE_PERMISSIONS) as UserRole[]) {
    if (role === 'Admin') continue; // Skip admin as it's already handled
    await RolePermissionModel.updateOne(
      { role }, 
      { $setOnInsert: { role, permissions: DEFAULT_ROLE_PERMISSIONS[role] } },
      { upsert: true }
    );
  }
  console.log('Role Permissions seeded/updated.');
  
  await conditionalUpsert(Theme, 'name', mockThemes);
  
  const mappedPaymentMethods = mockPaymentMethods.map(data => {
      const nameMap = new Map<string, string>();
      if (typeof data.name === 'object' && data.name !== null) {
          Object.entries(data.name).forEach(([key, value]) => nameMap.set(key, value));
      }
      const descriptionMap = new Map<string, string>();
      if (typeof data.description === 'object' && data.description !== null) {
          Object.entries(data.description).forEach(([key, value]) => descriptionMap.set(key, value));
      }
      return { ...data, name: nameMap, description: descriptionMap };
  });

  for (const item of mappedPaymentMethods) {
    const nameEn = item.name.get('en');
    await PaymentMethod.updateOne(
      { 'name.en': nameEn },
      { $setOnInsert: item },
      { upsert: true }
    );
  }

  await conditionalUpsert(Country, 'codeAlpha2', mockCountries);
  await conditionalUpsert(Currency, 'code', mockCurrencies);
  
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
    
    await Translation.updateOne(
        { keyPath: keyPath },
        { $setOnInsert: { keyPath: keyPath, values: valuesMap } },
        { upsert: true }
    );
  }
  console.log(`${allKeys.size} Translation records seeded/updated.`);
  
  // --- DEMO DATA (Conditional) ---
  if (shouldLoadDemoData) {
    console.log('LOAD_DEMO_DATA is true. Seeding demo data (conditional upsert mode)...');
    
    await conditionalUpsert(Supplier, 'name', mockSuppliers);
    console.log('Demo Suppliers seeded/updated.');
    
    const seededSuppliers = await Supplier.find({ name: { $in: mockSuppliers.map(s => s.name) } });
    const supplierMap = new Map(seededSuppliers.map(s => [s.name, s._id]));

    const productsWithSupplierIds = mockProducts.map(productData => {
      const supplierId = supplierMap.get(productData.supplier as string);
      return { ...productData, supplier: supplierId };
    });
    
    await conditionalUpsert(Product, 'barcode', productsWithSupplierIds);
    console.log('Demo Products seeded/updated.');
    
    await Promise.all([
      conditionalUpsert(Client, 'email', mockClients),
      conditionalUpsert(Tax, 'name', mockTaxes),
      conditionalUpsert(Promotion, 'name', mockPromotions),
    ]);
    console.log('Demo catalog data (Clients, Taxes, Promotions) seeded/updated.');
    
    const salesCount = await SaleTransaction.countDocuments();
    if (salesCount === 0) {
      const salesToSeed = mockSalesTransactions.map(sale => ({ ...sale, date: new Date(sale.date) }));
      await SaleTransaction.insertMany(salesToSeed);
      console.log(`${salesToSeed.length} Demo Sale Transactions seeded.`);
    } else {
      console.log('Skipping sale transactions seeding as data already exists.');
    }
    
  } else {
    console.log('LOAD_DEMO_DATA is not set to "true". Skipping demo data seeding.');
  }
}
