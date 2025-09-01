
// src/lib/dexie-db.ts
import Dexie, { type Table } from 'dexie';
import type { Product, Client, SaleTransaction, Tax, Promotion, PaymentMethod, Supplier, User, Currency, Country, Theme, GridSetting, RolePermission, Notification, Report, POSSetting, ReceiptSetting, SmtpSetting, PendingCart, AppLanguage, AiSetting } from '@/types';

export interface SyncQueueItem {
  id?: number;
  entity: 'product' | 'client' | 'supplier' | 'promotion' | 'tax' | 'paymentMethod' | 'country' | 'currency' | 'appLanguage' | 'theme' | 'user' | 'notification' | 'posSetting' | 'receiptSetting' | 'smtpSetting' | 'aiSetting' | 'sale' | 'translation' | 'rolePermission';
  operation: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
}

export interface TranslationDexieRecord {
    keyPath: string;
    values: Record<string, string>;
}

export class AppDexieDB extends Dexie {
  products!: Table<Product>;
  clients!: Table<Client>;
  suppliers!: Table<Supplier>;
  promotions!: Table<Promotion>;
  taxes!: Table<Tax>; 
  paymentMethods!: Table<PaymentMethod>; 
  countries!: Table<Country>; 
  currencies!: Table<Currency>; 
  appLanguages!: Table<AppLanguage>;
  themes!: Table<Theme>;
  users!: Table<User>;
  rolePermissions!: Table<RolePermission>;
  notifications!: Table<Notification>;
  sales!: Table<SaleTransaction>;
  reports!: Table<Report>;
  translations!: Table<TranslationDexieRecord>;
  syncQueue!: Table<SyncQueueItem>;
  posSettings!: Table<POSSetting>;
  receiptSettings!: Table<ReceiptSetting>;
  smtpSettings!: Table<SmtpSetting>;
  aiSettings!: Table<AiSetting>;

  constructor() {
    super('posAppDB');
    this.version(14).stores({
        products: 'id, name, barcode, sku, category, supplier',
        clients: 'id, name, email',
        suppliers: 'id, name, email',
        promotions: 'id, name, isActive',
        taxes: 'id, name',
        paymentMethods: 'id, name',
        countries: 'id, name, codeAlpha2',
        currencies: 'id, name, code, isDefault',
        appLanguages: 'id, code',
        themes: 'id, name, isDefault',
        users: 'id, email, role',
        rolePermissions: 'id, role',
        notifications: 'id, createdAt, isRead',
        sales: 'id, date, clientId, dispatchStatus',
        reports: 'id, createdAt',
        translations: 'keyPath',
        posSettings: 'key',
        receiptSettings: 'key',
        smtpSettings: 'key',
        aiSettings: 'key',
        syncQueue: '++id, entity, timestamp',
    });
  }
}

export const db = new AppDexieDB();
