'use server';
/**
 * @fileOverview Genkit tools for fetching data for AI reports.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import dbConnect from '@/lib/dbConnect';
import SaleTransaction from '@/models/SaleTransaction';
import Product from '@/models/Product';
import type { SaleTransaction as SaleTransactionType, Product as ProductType } from '@/types';

// Helper function to connect to the database
async function connectToDb() {
  await dbConnect();
}

export const getSalesData = ai.defineTool(
  {
    name: 'getSalesData',
    description: 'Retrieves sales transaction data. Can be filtered by date range and dispatch status.',
    inputSchema: z.object({
      startDate: z.string().optional().describe('The start date for the data range (e.g., YYYY-MM-DD).'),
      endDate: z.string().optional().describe('The end date for the data range (e.g., YYYY-MM-DD).'),
      dispatchStatus: z.enum(['Pending', 'Dispatched']).optional().describe('Filter sales by their dispatch status.'),
    }),
    outputSchema: z.array(z.any()).describe('An array of sales transaction objects.'),
  },
  async (input) => {
    await connectToDb();
    const query: any = {};
    if (input.startDate || input.endDate) {
      query.date = {};
      if (input.startDate) query.date.$gte = new Date(input.startDate);
      if (input.endDate) query.date.$lte = new Date(input.endDate);
    }
    if (input.dispatchStatus) {
      query.dispatchStatus = input.dispatchStatus;
    }
    const sales = await SaleTransaction.find(query).lean();
    // Convert complex Mongoose objects to plain JS objects for the AI
    return JSON.parse(JSON.stringify(sales)) as SaleTransactionType[];
  }
);

export const getProductsData = ai.defineTool(
  {
    name: 'getProductsData',
    description: 'Retrieves a list of all products and their details, such as name, category, price, and stock quantity.',
    inputSchema: z.object({}), // No input needed to get all products
    outputSchema: z.array(z.any()).describe('An array of product objects.'),
  },
  async () => {
    await connectToDb();
    const products = await Product.find({}).lean();
    return JSON.parse(JSON.stringify(products)) as ProductType[];
  }
);
