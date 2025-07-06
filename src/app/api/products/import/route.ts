
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Product from '@/models/Product';
import Supplier from '@/models/Supplier';
import User from '@/models/User';
import type { Product as ProductType, Supplier as SupplierType, ColumnMapping } from '@/types';
import NotificationService from '@/services/notification.service';

interface AdvancedImportRequestBody {
  dataRows: Record<string, any>[];
  mappings: ColumnMapping[];
  settings: {
    conflictResolution: 'skip' | 'overwrite';
  };
}

async function getActorDetails(request: Request) {
  const userEmail = request.headers.get('X-User-Email');
  if (userEmail) {
    const actingUser = await User.findOne({ email: userEmail }).lean();
    if (actingUser) {
      return {
        actorId: actingUser._id.toString(),
        actorName: actingUser.name,
        actorImageUrl: actingUser.imageUrl,
      };
    }
  }
  return {};
}

// Helper to cast values to the correct type based on the schema
const castValue = (value: any, type: string) => {
  if (value === undefined || value === null || String(value).trim() === '') return undefined;
  switch (type) {
    case 'number':
      const num = parseFloat(String(value).replace(/,/g, '.')); // Handle comma decimals
      return isNaN(num) ? undefined : num;
    case 'boolean':
      const lowerVal = String(value).trim().toLowerCase();
      if (lowerVal === 'true' || lowerVal === '1' || lowerVal === 'yes') return true;
      if (lowerVal === 'false' || lowerVal === '0' || lowerVal === 'no') return false;
      return undefined;
    default:
      return String(value);
  }
};

export async function POST(request: Request) {
  await dbConnect();
  try {
    const body = await request.json() as AdvancedImportRequestBody;
    const { dataRows, mappings, settings } = body;

    if (!dataRows || !Array.isArray(dataRows)) {
      return NextResponse.json({ success: false, error: 'Invalid data rows provided.' }, { status: 400 });
    }
    if (!mappings || !Array.isArray(mappings) || mappings.length === 0) {
      return NextResponse.json({ success: false, error: 'Invalid column mappings provided.' }, { status: 400 });
    }
    if (!settings || !settings.conflictResolution) {
      return NextResponse.json({ success: false, error: 'Invalid import settings.' }, { status: 400 });
    }

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: { row: number; error: string }[] = [];
    
    const supplierMapping = mappings.find(m => m.modelField === 'supplier');
    let supplierMap: Map<string, string> | undefined;

    if (supplierMapping && supplierMapping.relatedMatchField) {
      const suppliers = await Supplier.find({}).lean() as SupplierType[];
      supplierMap = new Map(suppliers.map(s => [String((s as any)[supplierMapping.relatedMatchField!]).toLowerCase(), s.name]));
    }
    
    for (const [index, row] of dataRows.entries()) {
      try {
        const productData: Partial<ProductType> = {};
        
        for (const mapping of mappings) {
          const rawValue = row[mapping.fileColumn];
          if (rawValue === undefined || rawValue === null || String(rawValue).trim() === '') continue;

          if (mapping.modelField === 'supplier') {
            if (supplierMap && supplierMapping?.relatedMatchField) {
              const lookupKey = String(rawValue).toLowerCase().trim();
              const supplierName = supplierMap.get(lookupKey);
              if (supplierName) {
                productData.supplier = supplierName;
              } else {
                 console.warn(`Supplier not found for value: "${rawValue}" on row ${index + 2}. Skipping field.`);
                 continue;
              }
            } else {
              productData.supplier = String(rawValue);
            }
          } else {
             const productSchemaPath = Product.schema.path(mapping.modelField);
             let fieldType = 'string'; // default
             if (productSchemaPath) {
                fieldType = (productSchemaPath as any).instance?.toLowerCase() || 'string';
             }
             (productData as any)[mapping.modelField] = castValue(rawValue, fieldType);
          }
        }

        if (!productData.name || !productData.barcode || productData.price === undefined || productData.quantity === undefined || !productData.category) {
          errors.push({ row: index + 2, error: 'Missing or invalid essential fields (name, barcode, price, quantity, category) after mapping.' });
          errorCount++;
          continue;
        }
        
        const existingProduct = await Product.findOne({ barcode: productData.barcode });

        if (existingProduct) {
          if (settings.conflictResolution === 'skip') {
            skippedCount++;
            continue;
          } else if (settings.conflictResolution === 'overwrite') {
            await Product.updateOne({ _id: existingProduct._id }, { $set: productData }, { runValidators: true });
            updatedCount++;
          }
        } else {
          await Product.create(productData);
          createdCount++;
        }
      } catch (e: any) {
        errorCount++;
        errors.push({ row: index + 2, error: e.message || `Unknown error on row ${index + 2}.` });
      }
    }

    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
      messageKey: 'Notifications.productImportSummary',
      messageParams: { created: createdCount, updated: updatedCount, skipped: skippedCount, errors: errorCount },
      type: errorCount > 0 ? 'warning' : 'success',
      link: '/products',
      ...actorDetails
    });

    return NextResponse.json({
      success: true,
      data: { createdCount, updatedCount, skippedCount, errorCount, errors: errorCount > 0 ? errors : undefined, }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during import process.';
    console.error('Product import API error:', error);
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
        messageKey: 'Notifications.productImportFailed',
        messageParams: { error: errorMessage },
        type: 'error',
        ...actorDetails
    });
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
