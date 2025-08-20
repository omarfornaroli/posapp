// src/lib/dexie-db.ts
import Dexie, { type Table } from 'dexie';
import type { Product, Client, SaleTransaction, Tax, Promotion, PaymentMethod, Supplier, User, Currency, Country, Theme, GridSetting, RolePermission, Notification, Report, POSSetting, ReceiptSetting, SmtpSetting, PendingCart, AppLanguage } from '@/types';

export interface SyncQueueItem {
  id?: number;
  entity: 'product' | 'client' | 'supplier' | 'promotion' | 'tax' | 'paymentMethod' | 'country' | 'currency' | 'appLanguage' | 'theme' | 'user' | 'notification' | 'posSetting' | 'receiptSetting' | 'smtpSetting' | 'sale' | 'translation' | 'rolePermission';
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

  constructor() {
    super('posAppDB');
    this.version(1).stores({
      products: 'id, name, barcode, sku, category, supplier',
      clients: 'id, name, email',
      suppliers: 'id, name, email',
      syncQueue: '++id, entity, timestamp',
      promotions: 'id, name, isActive',
    });
    this.version(2).stores({
      taxes: 'id, name',
      paymentMethods: 'id, name',
      countries: 'id, name, codeAlpha2',
      currencies: 'id, name, code',
      products: 'id, name, barcode, sku, category, supplier',
      clients: 'id, name, email',
      suppliers: 'id, name, email',
      syncQueue: '++id, entity, timestamp',
      promotions: 'id, name, isActive',
    });
    this.version(3).stores({
        appLanguages: 'id, code',
        themes: 'id, name',
        products: 'id, name, barcode, sku, category, supplier',
        clients: 'id, name, email',
        suppliers: 'id, name, email',
        syncQueue: '++id, entity, timestamp',
        promotions: 'id, name, isActive',
        taxes: 'id, name',
        paymentMethods: 'id, name',
        countries: 'id, name, codeAlpha2',
        currencies: 'id, name, code',
    });
    this.version(4).stores({
        users: 'id, email, role',
        rolePermissions: 'id, role', 
        notifications: 'id, createdAt, isRead',
        products: 'id, name, barcode, sku, category, supplier',
        clients: 'id, name, email',
        suppliers: 'id, name, email',
        syncQueue: '++id, entity, timestamp',
        promotions: 'id, name, isActive',
        taxes: 'id, name',
        paymentMethods: 'id, name',
        countries: 'id, name, codeAlpha2',
        appLanguages: 'id, code',
        themes: 'id, name',
    });
    this.version(5).stores({
        sales: 'id, date, clientId, dispatchStatus',
        reports: 'id, createdAt',
        products: 'id, name, barcode, sku, category, supplier',
        clients: 'id, name, email',
        suppliers: 'id, name, email',
        syncQueue: '++id, entity, timestamp',
        promotions: 'id, name, isActive',
        taxes: 'id, name',
        paymentMethods: 'id, name',
        countries: 'id, name, codeAlpha2',
        currencies: 'id, name, code',
        appLanguages: 'id, code',
        themes: 'id, name',
        users: 'id, email, role',
        rolePermissions: 'id, role',
        notifications: 'id, createdAt, isRead',
    });
    this.version(6).stores({
      translations: 'keyPath',
      products: 'id, name, barcode, sku, category, supplier',
      clients: 'id, name, email',
      suppliers: 'id, name, email',
      syncQueue: '++id, entity, timestamp',
      promotions: 'id, name, isActive',
      taxes: 'id, name',
      paymentMethods: 'id, name',
      countries: 'id, name, codeAlpha2',
      currencies: 'id, name, code',
      appLanguages: 'id, code',
      themes: 'id, name',
      users: 'id, email, role',
      rolePermissions: 'id, role',
      notifications: 'id, createdAt, isRead',
      sales: 'id, date, clientId, dispatchStatus',
      reports: 'id, createdAt',
    });
    this.version(7).stores({
        posSettings: 'key',
        receiptSettings: 'key',
        smtpSettings: 'key',
        products: 'id, name, barcode, sku, category, supplier',
        clients: 'id, name, email',
        suppliers: 'id, name, email',
        syncQueue: '++id, entity, timestamp',
        promotions: 'id, name, isActive',
        taxes: 'id, name',
        paymentMethods: 'id, name',
        countries: 'id, name, codeAlpha2',
        currencies: 'id, name, code',
        appLanguages: 'id, code',
        themes: 'id, name',
        users: 'id, email, role',
        rolePermissions: 'id, role',
        notifications: 'id, createdAt, isRead',
        sales: 'id, date, clientId, dispatchStatus',
        reports: 'id, createdAt',
        translations: 'keyPath',
    });
    this.version(8).stores({
      currencies: 'id, name, code, isDefault',
      themes: 'id, name, isDefault',
      products: 'id, name, barcode, sku, category, supplier',
      clients: 'id, name, email',
      suppliers: 'id, name, email',
      syncQueue: '++id, entity, timestamp',
      promotions: 'id, name, isActive',
      taxes: 'id, name',
      paymentMethods: 'id, name',
      countries: 'id, name, codeAlpha2',
      appLanguages: 'id, code',
      users: 'id, email, role',
      rolePermissions: 'id, role',
      notifications: 'id, createdAt, isRead',
      sales: 'id, date, clientId, dispatchStatus',
      reports: 'id, createdAt',
      translations: 'keyPath',
      posSettings: 'key',
      receiptSettings: 'key',
      smtpSettings: 'key',
    });
    this.version(9).stores({
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
        syncQueue: '++id, entity, timestamp',
    });
    this.version(10).stores({
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
        syncQueue: '++id, entity, timestamp',
    });
    this.version(11).stores({
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
        syncQueue: '++id, entity, timestamp',
    });
  }
}

export const db = new AppDexieDB();
