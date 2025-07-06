import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import SaleTransaction from '@/models/SaleTransaction';
import Product from '@/models/Product';
import Client from '@/models/Client';
import Currency from '@/models/Currency';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, subDays, eachDayOfInterval, format } from 'date-fns';

export async function GET() {
  try {
    await dbConnect();

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const last30DaysStart = startOfDay(subDays(now, 29));

    const [
      salesTodayData,
      salesMonthData,
      totalProducts,
      totalClients,
      defaultCurrency,
      lowStockProducts,
      salesByDayData,
      recentSales
    ] = await Promise.all([
      SaleTransaction.aggregate([
        { $match: { date: { $gte: todayStart, $lte: todayEnd } } },
        { $group: { _id: null, total: { $sum: '$totalInBaseCurrency' } } }
      ]),
      SaleTransaction.aggregate([
        { $match: { date: { $gte: monthStart, $lte: monthEnd } } },
        { $group: { _id: null, total: { $sum: '$totalInBaseCurrency' } } }
      ]),
      Product.countDocuments(),
      Client.countDocuments(),
      Currency.findOne({ isDefault: true }).lean(),
      Product.find({ 
        isService: { $ne: true },
        $expr: { $lte: ["$quantity", "$warningQuantity"] } 
      }).sort({ quantity: 1 }).limit(10).lean(),
      SaleTransaction.aggregate([
        { $match: { date: { $gte: last30DaysStart, $lte: todayEnd } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            total: { $sum: '$totalInBaseCurrency' }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      SaleTransaction.find({}).sort({ date: -1 }).limit(5).lean()
    ]);

    const salesToday = salesTodayData[0]?.total || 0;
    const salesMonth = salesMonthData[0]?.total || 0;
    const baseCurrencySymbol = defaultCurrency?.symbol || '$';
    
    // Create a map for quick lookups
    const salesMap = new Map(salesByDayData.map(item => [item._id, item.total]));
    
    // Generate all dates in the last 30 days
    const dateInterval = eachDayOfInterval({ start: last30DaysStart, end: todayEnd });
    
    const salesByDay = dateInterval.map(date => {
        const formattedDate = format(date, 'yyyy-MM-dd');
        return {
            date: formattedDate,
            total: salesMap.get(formattedDate) || 0
        };
    });


    return NextResponse.json({
      success: true,
      data: {
        salesToday,
        salesMonth,
        totalProducts,
        totalClients,
        lowStockProducts,
        salesByDay,
        baseCurrencySymbol,
        recentSales
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error';
    console.error('[API/dashboard/summary] Error:', error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
