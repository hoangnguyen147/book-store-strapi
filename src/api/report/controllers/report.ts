/**
 * Report controller for revenue and inventory analytics
 */

import { factories } from '@strapi/strapi';
import * as csvWriter from 'csv-writer';

export default factories.createCoreController('api::report.report' as any, ({ strapi }) => ({
  /**
   * Get comprehensive revenue report with optional date filtering
   *
   * Query parameters:
   * - startDate: YYYY-MM-DD (optional)
   * - endDate: YYYY-MM-DD (optional)
   * - date: YYYY-MM-DD (optional, for single date)
   * - format: 'json' | 'csv' (default: json)
   * - groupBy: 'day' | 'week' | 'month' | 'year' (optional, for time series)
   * - categoryId: number (optional, filter by category)
   * - authorId: number (optional, filter by author)
   */
  async revenue(ctx) {
    try {
      const { startDate, endDate, date, format = 'json', groupBy, categoryId, authorId } = ctx.query;

      // Parse date filters
      let dateFilter = {};
      if (date) {
        // Single date filter
        const targetDate = new Date(date as string);
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        dateFilter = {
          createdAt: {
            $gte: targetDate.toISOString(),
            $lt: nextDay.toISOString()
          }
        };
      } else if (startDate || endDate) {
        // Date range filter
        const filters: any = {};
        if (startDate) {
          filters.$gte = new Date(startDate as string).toISOString();
        }
        if (endDate) {
          const endDateTime = new Date(endDate as string);
          endDateTime.setHours(23, 59, 59, 999);
          filters.$lte = endDateTime.toISOString();
        }
        dateFilter = { createdAt: filters };
      }

      // Build additional filters
      let additionalFilters = {};
      if (categoryId || authorId) {
        const bookFilters: any = {};
        if (categoryId) {
          bookFilters.categories = { id: parseInt(categoryId as string) };
        }
        if (authorId) {
          bookFilters.authors = { id: parseInt(authorId as string) };
        }

        // Get books matching the filters
        const filteredBooks = await strapi.entityService.findMany('api::book.book', {
          filters: bookFilters,
          fields: ['id']
        });

        if (filteredBooks.length === 0) {
          // No books match the filter, return empty result
          const emptyResult = {
            summary: { totalRevenue: 0, totalOrders: 0, totalItemsSold: 0, averageOrderValue: 0 },
            bookSales: [],
            grandTotal: 0,
            timeSeries: groupBy ? [] : undefined
          };

          if (format === 'csv') {
            const csvBuffer = await generateRevenueCSV(emptyResult);
            ctx.set('Content-Type', 'text/csv');
            ctx.set('Content-Disposition', `attachment; filename="revenue-report-${new Date().toISOString().split('T')[0]}.csv"`);
            return ctx.send(csvBuffer);
          }

          return ctx.send({
            data: emptyResult,
            message: 'Revenue report generated successfully (no matching data)'
          });
        }

        additionalFilters = {
          order_items: {
            book: {
              id: { $in: filteredBooks.map(book => book.id) }
            }
          }
        };
      }

      // Fetch orders with revenue data
      const orders = await strapi.entityService.findMany('api::order.order', {
        filters: {
          ...dateFilter,
          ...additionalFilters,
          status: {
            $in: ['confirmed', 'shipped', 'delivered'] // Only count completed orders
          }
        },
        populate: {
          order_items: {
            populate: {
              book: {
                fields: ['name', 'sale_price'],
                populate: {
                  categories: { fields: ['name'] },
                  authors: { fields: ['name'] }
                }
              }
            }
          }
        }
      });

      // Calculate revenue statistics
      const revenueData = calculateRevenueStats(orders, groupBy as string);

      if (format === 'csv') {
        // Generate CSV report
        const csvBuffer = await generateRevenueCSV(revenueData);
        
        ctx.set('Content-Type', 'text/csv');
        ctx.set('Content-Disposition', `attachment; filename="revenue-report-${new Date().toISOString().split('T')[0]}.csv"`);
        return ctx.send(csvBuffer);
      }

      return ctx.send({
        data: revenueData,
        message: 'Revenue report generated successfully'
      });

    } catch (error) {
      console.error('Error generating revenue report:', error);
      return ctx.badRequest('Error generating revenue report', { error: error.message });
    }
  },

  /**
   * Get inventory report showing books sold and remaining stock
   * 
   * Query parameters:
   * - startDate: YYYY-MM-DD (optional)
   * - endDate: YYYY-MM-DD (optional)
   * - categoryId: number (optional, filter by category)
   * - format: 'json' | 'csv' (default: json)
   */
  async inventory(ctx) {
    try {
      const { startDate, endDate, categoryId, format = 'json' } = ctx.query;

      // Parse date filters for sales data
      let dateFilter = {};
      if (startDate || endDate) {
        const filters: any = {};
        if (startDate) {
          filters.$gte = new Date(startDate as string).toISOString();
        }
        if (endDate) {
          const endDateTime = new Date(endDate as string);
          endDateTime.setHours(23, 59, 59, 999);
          filters.$lte = endDateTime.toISOString();
        }
        dateFilter = { createdAt: filters };
      }

      // Build book filters
      let bookFilters = {};
      if (categoryId) {
        bookFilters = {
          categories: {
            id: parseInt(categoryId as string)
          }
        };
      }

      // Get all books with their current inventory
      const books = await strapi.entityService.findMany('api::book.book', {
        filters: bookFilters,
        populate: {
          categories: {
            fields: ['name']
          },
          authors: {
            fields: ['name']
          }
        }
      });

      // Get sales data for the period
      const orderItems = await strapi.entityService.findMany('api::order-item.order-item', {
        filters: {
          order: {
            ...dateFilter,
            status: {
              $in: ['confirmed', 'shipped', 'delivered']
            }
          }
        },
        populate: {
          book: {
            fields: ['id', 'name', 'sale_price']
          },
          order: {
            fields: ['status', 'createdAt']
          }
        }
      });

      // Calculate inventory statistics
      const inventoryData = calculateInventoryStats(books, orderItems);

      if (format === 'csv') {
        // Generate CSV report
        const csvBuffer = await generateInventoryCSV(inventoryData);
        
        ctx.set('Content-Type', 'text/csv');
        ctx.set('Content-Disposition', `attachment; filename="inventory-report-${new Date().toISOString().split('T')[0]}.csv"`);
        return ctx.send(csvBuffer);
      }

      return ctx.send({
        data: inventoryData,
        message: 'Inventory report generated successfully'
      });

    } catch (error) {
      console.error('Error generating inventory report:', error);
      return ctx.badRequest('Error generating inventory report', { error: error.message });
    }
  },

  /**
   * Get dashboard summary with key metrics
   */
  async dashboard(ctx) {
    try {
      // Get current month data
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      // Get previous month for comparison
      const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

      // Current month metrics
      const currentMonthOrders = await strapi.entityService.findMany('api::order.order', {
        filters: {
          createdAt: {
            $gte: startOfMonth.toISOString(),
            $lte: endOfMonth.toISOString()
          },
          status: {
            $in: ['confirmed', 'shipped', 'delivered']
          }
        },
        populate: {
          order_items: true
        }
      });

      // Previous month metrics
      const prevMonthOrders = await strapi.entityService.findMany('api::order.order', {
        filters: {
          createdAt: {
            $gte: startOfPrevMonth.toISOString(),
            $lte: endOfPrevMonth.toISOString()
          },
          status: {
            $in: ['confirmed', 'shipped', 'delivered']
          }
        },
        populate: {
          order_items: true
        }
      });

      // Calculate metrics
      const currentRevenue = currentMonthOrders.reduce((sum, order) => sum + order.total_amount, 0);
      const prevRevenue = prevMonthOrders.reduce((sum, order) => sum + order.total_amount, 0);
      
      const currentOrdersCount = currentMonthOrders.length;
      const prevOrdersCount = prevMonthOrders.length;

      const currentItemsSold = currentMonthOrders.reduce((sum, order: any) =>
        sum + order.order_items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
      );
      const prevItemsSold = prevMonthOrders.reduce((sum, order: any) =>
        sum + order.order_items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
      );

      // Get low stock books (quantity < 10)
      const lowStockBooks = await strapi.entityService.findMany('api::book.book', {
        filters: {
          quantity: {
            $lt: 10
          }
        },
        fields: ['name', 'quantity'],
        sort: 'quantity:asc',
        pagination: {
          limit: 10
        }
      });

      const dashboard = {
        currentMonth: {
          revenue: currentRevenue,
          orders: currentOrdersCount,
          itemsSold: currentItemsSold
        },
        previousMonth: {
          revenue: prevRevenue,
          orders: prevOrdersCount,
          itemsSold: prevItemsSold
        },
        growth: {
          revenue: prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue * 100) : 0,
          orders: prevOrdersCount > 0 ? ((currentOrdersCount - prevOrdersCount) / prevOrdersCount * 100) : 0,
          itemsSold: prevItemsSold > 0 ? ((currentItemsSold - prevItemsSold) / prevItemsSold * 100) : 0
        },
        lowStockBooks: lowStockBooks
      };

      return ctx.send({
        data: dashboard,
        message: 'Dashboard data retrieved successfully'
      });

    } catch (error) {
      console.error('Error generating dashboard:', error);
      return ctx.badRequest('Error generating dashboard', { error: error.message });
    }
  },

  /**
   * Get revenue trends over time
   *
   * Query parameters:
   * - period: 'last7days' | 'last30days' | 'last3months' | 'last6months' | 'lastyear'
   * - groupBy: 'day' | 'week' | 'month' (default: auto-selected based on period)
   */
  async revenueTrends(ctx) {
    try {
      const { period = 'last30days', groupBy } = ctx.query;

      // Calculate date range based on period
      const now = new Date();
      let startDate: Date;
      let defaultGroupBy: string;

      switch (period) {
        case 'last7days':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          defaultGroupBy = 'day';
          break;
        case 'last30days':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          defaultGroupBy = 'day';
          break;
        case 'last3months':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          defaultGroupBy = 'week';
          break;
        case 'last6months':
          startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
          defaultGroupBy = 'week';
          break;
        case 'lastyear':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          defaultGroupBy = 'month';
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          defaultGroupBy = 'day';
      }

      const actualGroupBy = (groupBy as string) || defaultGroupBy;

      // Fetch orders for the period
      const orders = await strapi.entityService.findMany('api::order.order', {
        filters: {
          createdAt: {
            $gte: startDate.toISOString(),
            $lte: now.toISOString()
          },
          status: {
            $in: ['confirmed', 'shipped', 'delivered']
          }
        },
        populate: {
          order_items: {
            populate: {
              book: {
                fields: ['name', 'sale_price']
              }
            }
          }
        }
      });

      // Generate time series data
      const timeSeries = generateTimeSeries(orders, actualGroupBy, startDate, now);

      return ctx.send({
        data: {
          period,
          groupBy: actualGroupBy,
          timeSeries,
          summary: {
            totalRevenue: timeSeries.reduce((sum, point) => sum + point.revenue, 0),
            totalOrders: timeSeries.reduce((sum, point) => sum + point.orders, 0),
            averageRevenuePerPeriod: timeSeries.length > 0 ?
              Math.round(timeSeries.reduce((sum, point) => sum + point.revenue, 0) / timeSeries.length) : 0
          }
        },
        message: 'Revenue trends generated successfully'
      });

    } catch (error) {
      console.error('Error generating revenue trends:', error);
      return ctx.badRequest('Error generating revenue trends', { error: error.message });
    }
  },

  /**
   * Get top performing books by revenue
   *
   * Query parameters:
   * - startDate: YYYY-MM-DD (optional)
   * - endDate: YYYY-MM-DD (optional)
   * - limit: number (default: 10)
   * - categoryId: number (optional)
   */
  async topBooks(ctx) {
    try {
      const { startDate, endDate, limit = 10, categoryId } = ctx.query;

      // Parse date filters
      let dateFilter = {};
      if (startDate || endDate) {
        const filters: any = {};
        if (startDate) {
          filters.$gte = new Date(startDate as string).toISOString();
        }
        if (endDate) {
          const endDateTime = new Date(endDate as string);
          endDateTime.setHours(23, 59, 59, 999);
          filters.$lte = endDateTime.toISOString();
        }
        dateFilter = { createdAt: filters };
      }

      // Build book filters
      let bookFilters = {};
      if (categoryId) {
        bookFilters = {
          categories: {
            id: parseInt(categoryId as string)
          }
        };
      }

      // Get order items with book details
      const orderItems = await strapi.entityService.findMany('api::order-item.order-item', {
        filters: {
          order: {
            ...dateFilter,
            status: {
              $in: ['confirmed', 'shipped', 'delivered']
            }
          }
        },
        populate: {
          book: {
            filters: bookFilters,
            fields: ['name', 'sale_price'],
            populate: {
              categories: { fields: ['name'] },
              authors: { fields: ['name'] }
            }
          },
          order: {
            fields: ['createdAt']
          }
        }
      });

      // Calculate book performance
      const bookPerformance = new Map();

      orderItems.forEach((item: any) => {
        if (!item.book) return; // Skip if book doesn't match filters

        const bookId = item.book.id;
        if (!bookPerformance.has(bookId)) {
          bookPerformance.set(bookId, {
            bookId,
            bookName: item.book.name,
            categories: item.book.categories?.map((cat: any) => cat.name).join(', ') || '',
            authors: item.book.authors?.map((author: any) => author.name).join(', ') || '',
            unitPrice: item.unit_price,
            totalRevenue: 0,
            quantitySold: 0,
            orderCount: 0
          });
        }

        const bookData = bookPerformance.get(bookId);
        bookData.totalRevenue += item.total_price;
        bookData.quantitySold += item.quantity;
        bookData.orderCount += 1;
      });

      // Sort by revenue and limit results
      const topBooks = Array.from(bookPerformance.values())
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, parseInt(limit as string));

      return ctx.send({
        data: {
          topBooks,
          summary: {
            totalBooksAnalyzed: bookPerformance.size,
            totalRevenue: topBooks.reduce((sum, book) => sum + book.totalRevenue, 0),
            totalQuantitySold: topBooks.reduce((sum, book) => sum + book.quantitySold, 0)
          }
        },
        message: 'Top performing books retrieved successfully'
      });

    } catch (error) {
      console.error('Error getting top books:', error);
      return ctx.badRequest('Error getting top books', { error: error.message });
    }
  },

  /**
   * Get low stock alert report
   *
   * Query parameters:
   * - threshold: number (default: 10, minimum stock level for alert)
   * - categoryId: number (optional, filter by category)
   * - sortBy: 'quantity' | 'name' | 'lastSold' (default: quantity)
   */
  async lowStock(ctx) {
    try {
      const { threshold = 10, categoryId, sortBy = 'quantity' } = ctx.query;

      // Build book filters
      let bookFilters: any = {
        quantity: {
          $lt: parseInt(threshold as string)
        }
      };

      if (categoryId) {
        bookFilters.categories = {
          id: parseInt(categoryId as string)
        };
      }

      // Get low stock books
      const books = await strapi.entityService.findMany('api::book.book', {
        filters: bookFilters,
        populate: {
          categories: { fields: ['name'] },
          authors: { fields: ['name'] }
        }
      });

      // Get recent sales data for each book
      const bookIds = books.map(book => book.id);
      const recentSales = await strapi.entityService.findMany('api::order-item.order-item', {
        filters: {
          book: { id: { $in: bookIds } },
          order: {
            status: { $in: ['confirmed', 'shipped', 'delivered'] }
          }
        },
        populate: {
          order: { fields: ['createdAt'] }
        },
        sort: 'createdAt:desc'
      });

      // Calculate last sold date for each book
      const lastSoldMap = new Map();
      recentSales.forEach((item: any) => {
        const bookId = item.book;
        if (!lastSoldMap.has(bookId)) {
          lastSoldMap.set(bookId, item.order.createdAt);
        }
      });

      // Enhance books with additional data
      const lowStockBooks = books.map((book: any) => ({
        bookId: book.id,
        documentId: book.documentId,
        bookName: book.name,
        currentStock: book.quantity,
        threshold: parseInt(threshold as string),
        stockStatus: book.quantity === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
        categories: book.categories?.map((cat: any) => cat.name).join(', ') || '',
        authors: book.authors?.map((author: any) => author.name).join(', ') || '',
        unitPrice: book.sale_price,
        lastSoldDate: lastSoldMap.get(book.id) || null,
        daysSinceLastSold: lastSoldMap.get(book.id) ?
          Math.floor((new Date().getTime() - new Date(lastSoldMap.get(book.id)).getTime()) / (1000 * 60 * 60 * 24)) : null
      }));

      // Sort based on sortBy parameter
      lowStockBooks.sort((a, b) => {
        switch (sortBy) {
          case 'name':
            return a.bookName.localeCompare(b.bookName);
          case 'lastSold':
            if (!a.lastSoldDate && !b.lastSoldDate) return 0;
            if (!a.lastSoldDate) return 1;
            if (!b.lastSoldDate) return -1;
            return new Date(b.lastSoldDate).getTime() - new Date(a.lastSoldDate).getTime();
          case 'quantity':
          default:
            return a.currentStock - b.currentStock;
        }
      });

      const outOfStockCount = lowStockBooks.filter(book => book.currentStock === 0).length;
      const lowStockCount = lowStockBooks.filter(book => book.currentStock > 0).length;

      return ctx.send({
        data: {
          lowStockBooks,
          summary: {
            totalBooksAnalyzed: books.length,
            outOfStockCount,
            lowStockCount,
            threshold: parseInt(threshold as string),
            criticalBooks: lowStockBooks.filter(book => book.currentStock <= 3).length
          }
        },
        message: 'Low stock report generated successfully'
      });

    } catch (error) {
      console.error('Error generating low stock report:', error);
      return ctx.badRequest('Error generating low stock report', { error: error.message });
    }
  },

  /**
   * Get inventory movement report
   *
   * Query parameters:
   * - startDate: YYYY-MM-DD (optional)
   * - endDate: YYYY-MM-DD (optional)
   * - bookId: number (optional, specific book analysis)
   * - categoryId: number (optional, filter by category)
   */
  async inventoryMovement(ctx) {
    try {
      const { startDate, endDate, bookId, categoryId } = ctx.query;

      // Parse date filters
      let dateFilter = {};
      if (startDate || endDate) {
        const filters: any = {};
        if (startDate) {
          filters.$gte = new Date(startDate as string).toISOString();
        }
        if (endDate) {
          const endDateTime = new Date(endDate as string);
          endDateTime.setHours(23, 59, 59, 999);
          filters.$lte = endDateTime.toISOString();
        }
        dateFilter = { createdAt: filters };
      }

      // Build filters
      let bookFilters = {};
      let orderItemFilters: any = {
        order: {
          ...dateFilter,
          status: { $in: ['confirmed', 'shipped', 'delivered'] }
        }
      };

      if (bookId) {
        bookFilters = { id: parseInt(bookId as string) };
        orderItemFilters.book = { id: parseInt(bookId as string) };
      } else if (categoryId) {
        bookFilters = {
          categories: { id: parseInt(categoryId as string) }
        };
      }

      // Get books
      const books = await strapi.entityService.findMany('api::book.book', {
        filters: bookFilters,
        populate: {
          categories: { fields: ['name'] },
          authors: { fields: ['name'] }
        }
      });

      // Get order items (movements)
      const movements = await strapi.entityService.findMany('api::order-item.order-item', {
        filters: orderItemFilters,
        populate: {
          book: { fields: ['name'] },
          order: { fields: ['createdAt', 'status'] }
        },
        sort: 'createdAt:desc'
      });

      // Calculate movement statistics
      const movementStats = new Map();

      movements.forEach((movement: any) => {
        const bookId = movement.book.id;
        if (!movementStats.has(bookId)) {
          const book: any = books.find((b: any) => b.id === bookId);
          if (book) {
            movementStats.set(bookId, {
              bookId,
              bookName: book.name,
              currentStock: book.quantity,
              categories: book.categories?.map((cat: any) => cat.name).join(', ') || '',
              authors: book.authors?.map((author: any) => author.name).join(', ') || '',
              totalMovements: 0,
              totalQuantityMoved: 0,
              averageMovementSize: 0,
              lastMovementDate: null,
              movements: []
            });
          }
        }

        if (movementStats.has(bookId)) {
          const stats = movementStats.get(bookId);
          stats.totalMovements += 1;
          stats.totalQuantityMoved += movement.quantity;
          stats.lastMovementDate = movement.order.createdAt;
          stats.movements.push({
            date: movement.order.createdAt,
            quantity: movement.quantity,
            orderStatus: movement.order.status,
            unitPrice: movement.unit_price,
            totalPrice: movement.total_price
          });
        }
      });

      // Calculate averages and sort
      const movementData = Array.from(movementStats.values()).map(stats => ({
        ...stats,
        averageMovementSize: stats.totalMovements > 0 ?
          Math.round(stats.totalQuantityMoved / stats.totalMovements) : 0,
        movements: stats.movements.slice(0, 10) // Limit to last 10 movements
      })).sort((a, b) => b.totalQuantityMoved - a.totalQuantityMoved);

      return ctx.send({
        data: {
          movementData,
          summary: {
            totalBooksAnalyzed: movementData.length,
            totalMovements: movements.length,
            totalQuantityMoved: movementData.reduce((sum, book) => sum + book.totalQuantityMoved, 0),
            averageMovementPerBook: movementData.length > 0 ?
              Math.round(movements.length / movementData.length) : 0
          }
        },
        message: 'Inventory movement report generated successfully'
      });

    } catch (error) {
      console.error('Error generating inventory movement report:', error);
      return ctx.badRequest('Error generating inventory movement report', { error: error.message });
    }
  }
}));

/**
 * Calculate revenue statistics from orders
 */
function calculateRevenueStats(orders: any[], groupBy?: string) {
  const bookSales = new Map();
  let totalRevenue = 0;
  let totalOrders = orders.length;
  let totalItemsSold = 0;

  orders.forEach(order => {
    totalRevenue += order.total_amount;

    order.order_items.forEach(item => {
      totalItemsSold += item.quantity;

      const bookId = item.book.id;
      const bookName = item.book.name;

      if (!bookSales.has(bookId)) {
        bookSales.set(bookId, {
          bookId,
          bookName,
          quantitySold: 0,
          totalRevenue: 0,
          unitPrice: item.unit_price,
          categories: item.book.categories?.map(cat => cat.name).join(', ') || '',
          authors: item.book.authors?.map(author => author.name).join(', ') || ''
        });
      }

      const bookData = bookSales.get(bookId);
      bookData.quantitySold += item.quantity;
      bookData.totalRevenue += item.total_price;
    });
  });

  const bookSalesArray = Array.from(bookSales.values())
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  const result: any = {
    summary: {
      totalRevenue,
      totalOrders,
      totalItemsSold,
      averageOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0
    },
    bookSales: bookSalesArray,
    grandTotal: totalRevenue
  };

  // Add time series data if groupBy is specified
  if (groupBy && orders.length > 0) {
    const startDate = new Date(Math.min(...orders.map(order => new Date(order.createdAt).getTime())));
    const endDate = new Date(Math.max(...orders.map(order => new Date(order.createdAt).getTime())));
    result.timeSeries = generateTimeSeries(orders, groupBy, startDate, endDate);
  }

  return result;
}

/**
 * Calculate inventory statistics
 */
function calculateInventoryStats(books: any[], orderItems: any[]) {
  const bookMap = new Map();

  // Initialize with all books
  books.forEach(book => {
    bookMap.set(book.id, {
      bookId: book.id,
      bookName: book.name,
      currentStock: book.quantity,
      quantitySold: 0,
      revenue: 0,
      categories: book.categories?.map(cat => cat.name).join(', ') || '',
      authors: book.authors?.map(author => author.name).join(', ') || '',
      unitPrice: book.sale_price
    });
  });

  // Add sales data
  orderItems.forEach(item => {
    const bookId = item.book.id;
    if (bookMap.has(bookId)) {
      const bookData = bookMap.get(bookId);
      bookData.quantitySold += item.quantity;
      bookData.revenue += item.total_price;
    }
  });

  const inventoryArray = Array.from(bookMap.values())
    .sort((a, b) => b.quantitySold - a.quantitySold);

  const totalRevenue = inventoryArray.reduce((sum, book) => sum + book.revenue, 0);
  const totalItemsSold = inventoryArray.reduce((sum, book) => sum + book.quantitySold, 0);
  const lowStockBooks = inventoryArray.filter(book => book.currentStock < 10);

  return {
    summary: {
      totalBooks: inventoryArray.length,
      totalItemsSold,
      totalRevenue,
      lowStockCount: lowStockBooks.length
    },
    books: inventoryArray,
    lowStockBooks
  };
}

/**
 * Generate CSV for revenue report
 */
async function generateRevenueCSV(revenueData: any): Promise<Buffer> {
  const csvData = revenueData.bookSales.map(book => ({
    'Book Name': book.bookName,
    'Quantity Sold': book.quantitySold,
    'Unit Price (VND)': book.unitPrice.toLocaleString(),
    'Total Revenue (VND)': book.totalRevenue.toLocaleString()
  }));

  // Add summary row
  csvData.push({
    'Book Name': 'GRAND TOTAL',
    'Quantity Sold': revenueData.summary.totalItemsSold,
    'Unit Price (VND)': '',
    'Total Revenue (VND)': revenueData.grandTotal.toLocaleString()
  });

  const csvString = [
    'Book Name,Quantity Sold,Unit Price (VND),Total Revenue (VND)',
    ...csvData.map(row =>
      `"${row['Book Name']}",${row['Quantity Sold']},"${row['Unit Price (VND)']}","${row['Total Revenue (VND)']}"`
    )
  ].join('\n');

  return Buffer.from(csvString, 'utf8');
}

/**
 * Generate CSV for inventory report
 */
async function generateInventoryCSV(inventoryData: any): Promise<Buffer> {
  const csvData = inventoryData.books.map(book => ({
    'Book Name': book.bookName,
    'Current Stock': book.currentStock,
    'Quantity Sold': book.quantitySold,
    'Revenue (VND)': book.revenue.toLocaleString(),
    'Categories': book.categories,
    'Authors': book.authors,
    'Unit Price (VND)': book.unitPrice.toLocaleString()
  }));

  const csvString = [
    'Book Name,Current Stock,Quantity Sold,Revenue (VND),Categories,Authors,Unit Price (VND)',
    ...csvData.map(row =>
      `"${row['Book Name']}",${row['Current Stock']},${row['Quantity Sold']},"${row['Revenue (VND)']}","${row['Categories']}","${row['Authors']}","${row['Unit Price (VND)']}"`
    )
  ].join('\n');

  return Buffer.from(csvString, 'utf8');
}

/**
 * Generate time series data for revenue trends
 */
function generateTimeSeries(orders: any[], groupBy: string, startDate: Date, endDate: Date) {
  const timeSeries = [];
  const ordersByPeriod = new Map();

  // Group orders by time period
  orders.forEach(order => {
    const orderDate = new Date(order.createdAt);
    let periodKey: string;

    switch (groupBy) {
      case 'day':
        periodKey = orderDate.toISOString().split('T')[0]; // YYYY-MM-DD
        break;
      case 'week':
        const weekStart = new Date(orderDate);
        weekStart.setDate(orderDate.getDate() - orderDate.getDay());
        periodKey = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        periodKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'year':
        periodKey = orderDate.getFullYear().toString();
        break;
      default:
        periodKey = orderDate.toISOString().split('T')[0];
    }

    if (!ordersByPeriod.has(periodKey)) {
      ordersByPeriod.set(periodKey, []);
    }
    ordersByPeriod.get(periodKey).push(order);
  });

  // Generate complete time series with zero values for missing periods
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    let periodKey: string;
    let periodLabel: string;

    switch (groupBy) {
      case 'day':
        periodKey = current.toISOString().split('T')[0];
        periodLabel = current.toLocaleDateString();
        current.setDate(current.getDate() + 1);
        break;
      case 'week':
        const weekStart = new Date(current);
        weekStart.setDate(current.getDate() - current.getDay());
        periodKey = weekStart.toISOString().split('T')[0];
        periodLabel = `Week of ${weekStart.toLocaleDateString()}`;
        current.setDate(current.getDate() + 7);
        break;
      case 'month':
        periodKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
        periodLabel = current.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        current.setMonth(current.getMonth() + 1);
        break;
      case 'year':
        periodKey = current.getFullYear().toString();
        periodLabel = current.getFullYear().toString();
        current.setFullYear(current.getFullYear() + 1);
        break;
      default:
        periodKey = current.toISOString().split('T')[0];
        periodLabel = current.toLocaleDateString();
        current.setDate(current.getDate() + 1);
    }

    const periodOrders = ordersByPeriod.get(periodKey) || [];
    const revenue = periodOrders.reduce((sum, order) => sum + order.total_amount, 0);
    const ordersCount = periodOrders.length;
    const itemsSold = periodOrders.reduce((sum, order) =>
      sum + order.order_items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
    );

    timeSeries.push({
      period: periodKey,
      label: periodLabel,
      revenue,
      orders: ordersCount,
      itemsSold,
      averageOrderValue: ordersCount > 0 ? Math.round(revenue / ordersCount) : 0
    });
  }

  return timeSeries;
}
