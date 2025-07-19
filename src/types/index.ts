
import type React from 'react';

export type Permission =
  | 'access_dashboard_page'
  | 'access_pos_page'
  | 'process_payment_action' // Specific action within POS
  | 'clear_cart_action'      // Specific action within POS
  | 'manage_products_page'
  | 'manage_sales_reports_page'
  | 'manage_clients_page'
  | 'manage_promotions_page'
  | 'manage_taxes_page'
  | 'manage_payment_methods_page'
  | 'manage_users_page'
  | 'manage_suppliers_page'
  | 'manage_dispatches_page'
  | 'manage_notifications_page'
  | 'manage_themes_page'
  | 'manage_translations_page'
  | 'manage_languages_page'
  | 'manage_settings_page'
  | 'view_roles_permissions_page'
  | 'manage_roles_permissions_page'
  | 'manage_countries_page'
  | 'manage_currencies_page'
  | 'manage_reports_page'
  | 'change_global_currency';

export interface Product {
  id: string;
  name: string;
  sku?: string;
  barcode: string;
  measurementUnit?: string; 
  cost?: number; 
  markup?: number; 
  price: number; 
  tax?: number; 
  isTaxInclusivePrice?: boolean; 
  isPriceChangeAllowed?: boolean; 
  isUsingDefaultQuantity?: boolean; 
  isService?: boolean; 
  isEnabled?: boolean; 
  description?: string;
  quantity: number; 
  supplier?: Supplier | string;
  reorderPoint?: number; 
  preferredQuantity?: number; 
  lowStockWarning?: boolean; 
  warningQuantity?: number; 
  category: string; 
  productGroup?: string;
  imageUrl?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CartItem extends Product {
  productId: string; 
  quantity: number; 
  dispatchedQuantity?: number;
  itemDiscountType?: 'percentage' | 'fixedAmount';
  itemDiscountValue?: number;
  effectivePrice?: number; // Calculated: Original price after item-specific discount
  totalPriceAfterItemDiscount?: number; // Calculated: effectivePrice * quantity
}

export interface Tax {
  id: string;
  name: string;
  rate: number; 
  description?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AppliedTaxEntry {
  taxId: string;
  name: string;
  rate: number;
  amount: number;
}

export type PromotionDiscountType = 'percentage' | 'fixedAmount';

export type PromotionConditionType = 
  | 'minSellAmount' 
  | 'clientIds' 
  | 'productIds' 
  | 'productCategories'
  | 'paymentMethods'
  | 'itemQuantity';

export interface PromotionCondition {
  type: PromotionConditionType;
  value?: number; 
  values?: string[]; 
  operator?: 'gte' | 'in';
}

export interface Promotion {
  id: string;
  name: string;
  description?: string;
  discountType: PromotionDiscountType;
  discountValue: number;
  startDate: string; 
  endDate?: string; 
  conditions: PromotionCondition[];
  isActive: boolean;
  applicationMethod?: 'cart' | 'lowestPriceItem';
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AppliedPromotionEntry {
  promotionId: string;
  name: string;
  discountType: PromotionDiscountType;
  discountValue: number;
  amountDeducted: number;
}

export interface PaymentMethod {
  id: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  isDefault?: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AppliedPayment {
  methodId: string;
  methodName: string;
  amount: number;
}

export type DispatchStatus = 'Pending' | 'Partially Dispatched' | 'Dispatched';

export interface SaleTransaction {
  id: string;
  date: string; 
  items: CartItem[]; 
  
  subtotal: number; 
  totalItemDiscountAmount: number; 

  overallDiscountType?: 'percentage' | 'fixedAmount';
  overallDiscountValue?: number;
  overallDiscountAmountApplied?: number; 
  
  promotionalDiscountAmount: number; 
  
  taxAmount: number;
  totalAmount: number; // This is the total in the transaction currency
  dispatchStatus: DispatchStatus;

  appliedPayments: AppliedPayment[];
  clientId?: string;
  clientName?: string;
  appliedTaxes: AppliedTaxEntry[];
  appliedPromotions?: AppliedPromotionEntry[]; 

  // Transaction Currency Details
  currencyCode: string; // The currency of the transaction (e.g., EUR)
  currencySymbol: string;
  currencyDecimalPlaces: number;
  
  // Base Currency Details
  baseCurrencyCode: string; // The system's default currency at time of sale (e.g., USD)
  totalInBaseCurrency: number; // The final total converted to the base currency
  exchangeRate: number; // The exchange rate used (transaction currency relative to base)

  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PendingCart {
  id: string;
  cartName: string;
  items: CartItem[];
  clientId?: string;
  clientName?: string;
  subtotal: number;
  totalItemDiscountAmount: number;
  overallDiscountType?: 'percentage' | 'fixedAmount';
  overallDiscountValue?: number;
  overallDiscountAmountApplied?: number;
  promotionalDiscountAmount: number;
  appliedPromotions?: AppliedPromotionEntry[];
  taxAmount: number;
  totalAmount: number;
  appliedTaxes: AppliedTaxEntry[];
  currencyCode: string;
  currencySymbol: string;
  currencyDecimalPlaces: number;
  baseCurrencyCode: string;
  totalInBaseCurrency: number;
  exchangeRate: number;
  createdBy?: {
    id: string;
    name: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  registrationDate: string; 
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  notes?: string;
  isEnabled: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type UserRole = 'Admin' | 'Editor' | 'Viewer';
export type UserStatus = 'pending' | 'active';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  joinDate: string; 
  imageUrl?: string;
  authorizationCode?: string;
  permissions?: Permission[]; // Permissions should be optional as they are added at runtime
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
}

export interface Theme {
  id: string;
  name: string;
  isDefault?: boolean;
  colors: ThemeColors;
  fontBody: string;
  fontHeadline: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ReceiptMargin = 'none' | 'small' | 'medium' | 'large';

export interface ReceiptSetting {
  id: string;
  key: string; 
  logoUrl?: string;
  footerText?: string;

  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;

  receiptWidth?: '80mm' | '58mm' | 'auto';
  receiptMargin?: ReceiptMargin;

  showCompanyName?: boolean;
  showCompanyAddress?: boolean;
  showCompanyPhone?: boolean;
  showClientInfo?: boolean;
  showItemBarcodes?: boolean;
  showDiscountSummary?: boolean; 
  showPromotionsApplied?: boolean;
  showPaymentMethodsDetails?: boolean;
}

export interface POSSetting {
  id: string;
  key: string;
  requireAuthForCartItemRemoval?: boolean;
  dispatchAtSaleDefault?: boolean;
  separateCartAndPayment?: boolean;
}

export interface SmtpSetting {
  id: string;
  key: string;
  host: string;
  port: number;
  user: string;
  pass?: string; // This will likely not be sent to the client
  from: string;
  isConfigured?: boolean;
}

export interface SortConfig<T = any> {
  key: keyof T | string;
  direction: 'asc' | 'desc';
}

export interface ColumnDefinition<T = any> {
  key: keyof T | string;
  label: string;
  isSortable?: boolean;
  isGroupable?: boolean;
  className?: string;
  visible?: boolean; 
  render?: (item: T, isGrouped?: boolean) => React.ReactNode;
}

export interface PersistedColumnSetting {
  key: string;
  visible: boolean;
}

export interface GridSetting {
  id?: string;
  pagePath: string;
  columns: PersistedColumnSetting[];
  sortConfig: SortConfig | null;
  groupingKeys: string[];
}


export interface GridTemplateConfig<TData = any> {
  columns: PersistedColumnSetting[];
  sortConfig: SortConfig<TData> | null;
  groupingKeys: string[];
}

export interface GridTemplate<TData = any> {
  id: string; 
  name: string; 
  config: GridTemplateConfig<TData>;
  isUserDefined?: boolean; 
}


export interface GroupedTableItem<T = any> {
  isGroupHeader: true;
  groupKey: string;
  groupValue: string;
  level: number;
  items: Array<T | GroupedTableItem<T>>;
}

export interface AppLanguage {
  id: string;
  code: string; 
  name: string; 
  isDefault?: boolean;
  isEnabled?: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type NotificationEnumType = 'info' | 'success' | 'warning' | 'error' | 'system';

export interface Notification {
  id: string;
  messageKey: string; 
  messageParams?: Record<string, string | number>; 
  type: NotificationEnumType;
  isRead: boolean;
  createdAt?: string; 
  link?: string; 
  userId?: string; 
  actorId?: string;
  actorName?: string;
  actorImageUrl?: string;
}

export type TranslationData = Record<string, any>;

export interface Country {
  id: string;
  name: string;
  codeAlpha2: string; 
  codeAlpha3?: string; 
  numericCode?: string; 
  currencyCode?: string; 
  flagImageUrl?: string; 
  isEnabled: boolean;
  isDefault?: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Currency {
  id: string;
  name: string; // e.g., US Dollar, Euro
  code: string; // ISO 4217 code, e.g., USD, EUR
  symbol: string; // e.g., $, €
  decimalPlaces: number; // Typically 2
  isEnabled: boolean;
  isDefault?: boolean;
  exchangeRate?: number; // Optional: rate against a base currency
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RolePermission {
  id: string;
  role: UserRole;
  permissions: Permission[];
}

export interface DashboardSummary {
  salesToday: number;
  salesMonth: number;
  totalProducts: number;
  totalClients: number;
  lowStockProducts: Product[];
  recentSales: SaleTransaction[];
  salesByDay: { date: string; total: number }[];
  baseCurrencySymbol: string;
}

export interface ModelFieldDefinition {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'relation';
  isRequired?: boolean;
  relatedModel?: 'Supplier' | 'Client' | 'Category'; // Can be extended
  relatedFieldOptions?: string[]; // e.g., ['name', 'id', 'email']
}

export interface ColumnMapping {
  fileColumn: string;
  modelField: string;
  relatedMatchField?: string;
}

export interface ImportMappingTemplate {
  id: string;
  name: string;
  targetModel: string; // e.g., 'Product'
  mappings: ColumnMapping[];
}

export interface Report {
  id: string;
  name: string;
  description?: string;
  query: string; // The natural language query
  reportData: {
    title: string;
    summary: string;
    headers: string[];
    rows: (string | number)[][];
  };
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}
