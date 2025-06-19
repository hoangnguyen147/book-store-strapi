/**
 * order controller
 */

import { factories } from '@strapi/strapi';
import PDFDocument from 'pdfkit';
import * as csvWriter from 'csv-writer';

interface OrderItem {
  book_id: number;
  quantity: number;
}

interface CreateOrderRequest {
  items: OrderItem[];
  shipping_address?: string;
  phone?: string;
  notes?: string;
}

export default factories.createCoreController('api::order.order', ({ strapi }) => ({
  /**
   * Create a complete order with multiple books in a single API call
   *
   * IMPORTANT: You pass book IDs and quantities directly - NOT order item IDs!
   * The order items are created automatically by this API.
   *
   * What this API does:
   * 1. Validates all book IDs exist and have sufficient inventory
   * 2. Creates the main order record
   * 3. Creates order items automatically from your book_id + quantity pairs
   * 4. Deducts inventory from books automatically
   * 5. Calculates total amount automatically
   * 6. Returns complete order with all details
   *
   * If ANY book has insufficient inventory, the ENTIRE order is rejected.
   */
  async create(ctx) {
    try {
      const { items, shipping_address, phone, notes }: CreateOrderRequest = ctx.request.body.data;
      const userId = ctx.state.user?.id;

      // Authentication validation
      if (!userId) {
        return ctx.unauthorized('Authentication required. Please provide a valid Bearer token.');
      }

      // Items validation
      if (!items || !Array.isArray(items) || items.length === 0) {
        return ctx.badRequest('Items are required and must be a non-empty array. Each item should have book_id and quantity.');
      }

      // Validate each item format
      for (const [index, item] of items.entries()) {
        if (!item.book_id || typeof item.book_id !== 'number') {
          return ctx.badRequest(`Item ${index + 1}: book_id is required and must be a number (the ID of the book from GET /api/books)`);
        }
        if (!item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0) {
          return ctx.badRequest(`Item ${index + 1}: quantity is required and must be a positive number`);
        }
        if (!Number.isInteger(item.book_id)) {
          return ctx.badRequest(`Item ${index + 1}: book_id must be an integer`);
        }
        if (!Number.isInteger(item.quantity)) {
          return ctx.badRequest(`Item ${index + 1}: quantity must be an integer`);
        }
      }

      // Single transaction for complete order creation with automatic rollback
      const result = await strapi.db.transaction(async () => {
        const orderItemsData: Array<{ book: any; quantity: number; unit_price: number; total_price: number }> = [];
        let totalAmount = 0;

        // Step 1: Validate all books exist and check inventory
        for (const [index, item] of items.entries()) {
          const book = await strapi.db.query('api::book.book').findOne({
            where: { id: item.book_id },
            populate: ['thumbnail', 'categories', 'authors']
          });

          if (!book) {
            throw new Error(`Book with ID ${item.book_id} not found. Please check the book ID from GET /api/books (item ${index + 1})`);
          }

          if (book.quantity === null || book.quantity === undefined) {
            throw new Error(`Book "${book.name}" (ID: ${item.book_id}) does not have inventory tracking enabled`);
          }

          if (book.quantity < item.quantity) {
            throw new Error(`Insufficient inventory for "${book.name}" (ID: ${item.book_id}). Available: ${book.quantity}, Requested: ${item.quantity} (item ${index + 1})`);
          }

          const unitPrice = book.sale_price;
          const totalPrice = unitPrice * item.quantity;
          totalAmount += totalPrice;

          orderItemsData.push({
            book: book,
            quantity: item.quantity,
            unit_price: unitPrice,
            total_price: totalPrice
          });
        }

        // Step 2: Update book quantities (deduct inventory)
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const bookData = orderItemsData[i];

          await strapi.db.query('api::book.book').update({
            where: { id: item.book_id },
            data: { quantity: bookData.book.quantity - item.quantity }
          });
        }

        // Step 3: Create the order
        const order = await strapi.db.query('api::order.order').create({
          data: {
            user: userId,
            total_amount: totalAmount,
            status: 'pending',
            shipping_address,
            phone,
            notes
          }
        });

        // Step 4: Create all order items
        const createdOrderItems = [];
        for (const orderItemData of orderItemsData) {
          const orderItem = await strapi.db.query('api::order-item.order-item').create({
            data: {
              order: order.id,
              book: orderItemData.book.id,
              quantity: orderItemData.quantity,
              unit_price: orderItemData.unit_price,
              total_price: orderItemData.total_price
            }
          });
          createdOrderItems.push(orderItem);
        }

        return { order, orderItems: createdOrderItems };
      });

      // Fetch the complete order with all relations for response
      const completeOrder = await strapi.entityService.findOne('api::order.order', result.order.id, {
        populate: {
          order_items: {
            populate: {
              book: {
                populate: ['thumbnail', 'categories', 'authors']
              }
            }
          },
          user: {
            fields: ['id', 'username', 'email']
          }
        }
      });

      const sanitizedEntity = await this.sanitizeOutput(completeOrder, ctx);
      return this.transformResponse(sanitizedEntity);

    } catch (error) {
      console.error('Order creation error:', error);
      return ctx.badRequest('Failed to create order', {
        error: error.message || 'Unknown error occurred'
      });
    }
  },

  /**
   * Get all orders from all users - Admin only
   */
  async getAllOrdersAdmin(ctx) {
    try {
      const userId = ctx.state.user?.id;

      // Authentication check
      if (!userId) {
        return ctx.unauthorized('Authentication required to view orders');
      }

      // Admin authorization check
      const currentUser: any = await strapi.entityService.findOne('plugin::users-permissions.user', userId, {
        populate: ['role']
      });

      if (!currentUser || currentUser.role?.type !== 'admin') {
        return ctx.forbidden('Admin access required to view all orders');
      }

      // Extract query parameters
      const {
        page = 1,
        pageSize = 25,
        status,
        sort = 'createdAt:desc',
        search,
        startDate,
        endDate
      } = ctx.query;

      // Build filters
      const filters: any = {};

      // Add status filter if provided
      if (status) {
        filters.status = status;
      }

      // Add date range filter if provided
      if (startDate || endDate) {
        filters.createdAt = {};
        if (startDate) {
          filters.createdAt.$gte = new Date(startDate as string).toISOString();
        }
        if (endDate) {
          filters.createdAt.$lte = new Date(endDate as string).toISOString();
        }
      }

      // Add user search filter if provided
      if (search) {
        filters.$or = [
          { user: { username: { $containsi: search } } },
          { user: { email: { $containsi: search } } },
          { shipping_address: { $containsi: search } },
          { phone: { $containsi: search } }
        ];
      }

      // Fetch all orders with pagination
      const orders = await strapi.entityService.findMany('api::order.order', {
        filters,
        sort: sort,
        pagination: {
          page: parseInt(page as string),
          pageSize: parseInt(pageSize as string)
        },
        populate: {
          order_items: {
            populate: {
              book: {
                populate: ['thumbnail', 'categories', 'authors']
              }
            }
          },
          user: true
        }
      });

      // Get pagination info
      const total = await strapi.entityService.count('api::order.order', { filters });
      const pageCount = Math.ceil(total / parseInt(pageSize as string));

      return ctx.send({
        data: orders,
        meta: {
          pagination: {
            page: parseInt(page as string),
            pageSize: parseInt(pageSize as string),
            pageCount,
            total
          }
        },
        message: 'All orders retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching all orders:', error);
      return ctx.badRequest('Error fetching orders', { error: error.message });
    }
  },

  /**
   * Export all orders to CSV - Admin only
   */
  async exportOrdersCSV(ctx) {
    try {
      const userId = ctx.state.user?.id;

      // Authentication check
      if (!userId) {
        return ctx.unauthorized('Authentication required to export orders');
      }

      // Admin authorization check
      const currentUser: any = await strapi.entityService.findOne('plugin::users-permissions.user', userId, {
        populate: ['role']
      });

      if (!currentUser || currentUser.role?.type !== 'admin') {
        return ctx.forbidden('Admin access required to export orders');
      }

      // Extract query parameters for filtering
      const {
        status,
        search,
        startDate,
        endDate
      } = ctx.query;

      // Build filters (same as getAllOrdersAdmin)
      const filters: any = {};

      if (status) {
        filters.status = status;
      }

      if (startDate || endDate) {
        filters.createdAt = {};
        if (startDate) {
          filters.createdAt.$gte = new Date(startDate as string).toISOString();
        }
        if (endDate) {
          filters.createdAt.$lte = new Date(endDate as string).toISOString();
        }
      }

      if (search) {
        filters.$or = [
          { user: { username: { $containsi: search } } },
          { user: { email: { $containsi: search } } },
          { shipping_address: { $containsi: search } },
          { phone: { $containsi: search } }
        ];
      }

      // Fetch all orders without pagination for export
      const orders = await strapi.entityService.findMany('api::order.order', {
        filters,
        sort: 'createdAt:desc',
        populate: {
          order_items: {
            populate: {
              book: {
                populate: ['categories', 'authors']
              }
            }
          },
          user: true
        }
      });

      // Generate CSV content
      const csvHeaders = [
        'Order ID',
        'Document ID',
        'Order Date',
        'Customer Name',
        'Customer Email',
        'Customer Phone',
        'Status',
        'Total Amount',
        'Shipping Address',
        'Books',
        'Quantities',
        'Notes'
      ];

      const csvRows = orders.map((order: any) => {
        const books = order.order_items?.map((item: any) => item.book?.name || 'Unknown').join('; ') || '';
        const quantities = order.order_items?.map((item: any) => item.quantity || 0).join('; ') || '';

        return [
          order.id || '',
          order.documentId || '',
          order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '',
          order.user?.username || '',
          order.user?.email || '',
          order.phone || '',
          order.status || '',
          order.total_amount || 0,
          order.shipping_address || '',
          books,
          quantities,
          order.notes || ''
        ];
      });

      // Create CSV content
      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      // Set response headers for CSV download
      ctx.set('Content-Type', 'text/csv');
      ctx.set('Content-Disposition', `attachment; filename="orders-export-${new Date().toISOString().split('T')[0]}.csv"`);

      return ctx.send(csvContent);
    } catch (error) {
      console.error('Error exporting orders:', error);
      return ctx.badRequest('Error exporting orders', { error: error.message });
    }
  },

  /**
   * Get current user's orders with pagination and filtering
   */
  async getMyOrders(ctx) {
    try {
      const userId = ctx.state.user?.id;

      // Authentication check
      if (!userId) {
        return ctx.unauthorized('Authentication required to view orders');
      }

      // Extract query parameters
      const { page = 1, pageSize = 10, status, sort = 'createdAt:desc' } = ctx.query;

      // Build filters
      const filters: any = {
        user: userId
      };

      // Add status filter if provided
      if (status) {
        filters.status = status;
      }

      // Fetch orders with pagination
      const orders = await strapi.entityService.findMany('api::order.order', {
        filters,
        sort: sort,
        pagination: {
          page: parseInt(page as string),
          pageSize: parseInt(pageSize as string)
        },
        populate: {
          order_items: {
            populate: {
              book: {
                populate: ['thumbnail', 'categories', 'authors']
              }
            }
          }
        }
      });

      return ctx.send({
        data: orders,
        message: 'Orders retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching user orders:', error);
      return ctx.badRequest('Error fetching orders', { error: error.message });
    }
  },

  /**
   * Get order detail by documentId with full information
   */
  async getOrderDetail(ctx) {
    try {
      const { id } = ctx.params;
      const userId = ctx.state.user?.id;

      // Authentication check
      if (!userId) {
        return ctx.unauthorized('Authentication required to view order details');
      }

      // Validate documentId format (24-character alphanumeric string)
      if (!id || typeof id !== 'string' || !/^[a-z0-9]{24}$/.test(id)) {
        return ctx.badRequest('Invalid documentId format. Expected 24-character alphanumeric string.');
      }

      // Find order by documentId
      let order: any;
      try {
        order = await strapi.db.query('api::order.order').findOne({
          where: { documentId: id },
          populate: {
            order_items: {
              populate: {
                book: {
                  populate: ['thumbnail', 'categories', 'authors']
                }
              }
            },
            user: {
              fields: ['id', 'username', 'email']
            }
          }
        });
      } catch (dbError) {
        console.error('Database error:', dbError);
        return ctx.badRequest('Error querying order', { error: dbError.message });
      }

      if (!order) {
        return ctx.notFound('Order not found');
      }

      // Check if user owns this order
      if (order.user?.id !== userId) {
        return ctx.forbidden('You can only view your own orders');
      }

      return ctx.send({
        data: order,
        message: 'Order details retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching order details:', error);
      return ctx.badRequest('Error fetching order details', { error: error.message });
    }
  },

  // Override findOne to include order items
  async findOne(ctx) {
    const { id } = ctx.params;

    try {
      const entity = await strapi.entityService.findOne('api::order.order', id, {
        populate: {
          order_items: {
            populate: ['book']
          },
          user: true
        }
      });

      if (!entity) {
        return ctx.notFound('Order not found');
      }

      const sanitizedEntity = await this.sanitizeOutput(entity, ctx);
      return this.transformResponse(sanitizedEntity);
    } catch (error) {
      return ctx.badRequest('Error fetching order', { error: error.message });
    }
  },

  // Override find to include order items
  async find(ctx) {
    try {
      const results = await strapi.entityService.findMany('api::order.order', {
        ...ctx.query,
        populate: {
          order_items: {
            populate: ['book']
          },
          user: true
        }
      });

      const sanitizedResults = await this.sanitizeOutput(results, ctx);
      return this.transformResponse(sanitizedResults);
    } catch (error) {
      return ctx.badRequest('Error fetching orders', { error: error.message });
    }
  },

  /**
   * Print bill for an order - generates and downloads PDF
   */
  async printBill(ctx) {
    try {
      const { id } = ctx.params;
      const userId = ctx.state.user?.id;

      // Authentication check
      if (!userId) {
        return ctx.unauthorized('Authentication required to print bill');
      }

      // Fetch the complete order with all relations
      const order: any = await strapi.entityService.findOne('api::order.order', id, {
        populate: {
          order_items: {
            populate: {
              book: {
                populate: ['thumbnail', 'categories', 'authors']
              }
            }
          },
          user: true
        }
      });

      if (!order) {
        return ctx.notFound('Order not found');
      }

      // Check if user owns this order (optional security check)
      if (order.user?.id !== userId) {
        return ctx.forbidden('You can only print bills for your own orders');
      }

      // Generate PDF
      const pdfBuffer = await generateOrderBillPDF(order);

      // Set response headers for PDF download
      ctx.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="bill-order-${order.id}-${new Date().toISOString().split('T')[0]}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      });

      // Send PDF as response
      ctx.body = pdfBuffer;
    } catch (error) {
      console.error('Error generating bill PDF:', error);
      return ctx.badRequest('Error generating bill PDF', { error: error.message });
    }
  },

  /**
   * Generate revenue report by specific date
   */
  async revenueByDate(ctx) {
    try {
      const { date } = ctx.query;
      const userId = ctx.state.user?.id;

      // Authentication check
      if (!userId) {
        return ctx.unauthorized('Authentication required to access revenue reports');
      }

      // Validate date parameter
      if (!date) {
        return ctx.badRequest('Date parameter is required (format: YYYY-MM-DD)');
      }

      const targetDate = new Date(date as string);
      if (isNaN(targetDate.getTime())) {
        return ctx.badRequest('Invalid date format. Use YYYY-MM-DD format');
      }

      // Set date range for the specific day
      const startDate = new Date(targetDate);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(targetDate);
      endDate.setHours(23, 59, 59, 999);

      // Generate revenue report
      const csvBuffer = await generateRevenueReport(startDate, endDate, `Revenue Report - ${date}`);

      // Set response headers for CSV download
      ctx.set({
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="revenue-report-${date}.csv"`,
        'Content-Length': csvBuffer.length.toString(),
      });

      // Send CSV as response
      ctx.body = csvBuffer;
    } catch (error) {
      console.error('Error generating revenue report by date:', error);
      return ctx.badRequest('Error generating revenue report', { error: error.message });
    }
  },

  /**
   * Generate revenue report by date range
   */
  async revenueByDuration(ctx) {
    try {
      const { startDate, endDate } = ctx.query;
      const userId = ctx.state.user?.id;

      // Authentication check
      if (!userId) {
        return ctx.unauthorized('Authentication required to access revenue reports');
      }

      // Validate date parameters
      if (!startDate || !endDate) {
        return ctx.badRequest('Both startDate and endDate parameters are required (format: YYYY-MM-DD)');
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return ctx.badRequest('Invalid date format. Use YYYY-MM-DD format');
      }

      if (start > end) {
        return ctx.badRequest('Start date must be before or equal to end date');
      }

      // Set time ranges
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      // Generate revenue report
      const csvBuffer = await generateRevenueReport(start, end, `Revenue Report - ${startDate} to ${endDate}`);

      // Set response headers for CSV download
      ctx.set({
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="revenue-report-${startDate}-to-${endDate}.csv"`,
        'Content-Length': csvBuffer.length.toString(),
      });

      // Send CSV as response
      ctx.body = csvBuffer;
    } catch (error) {
      console.error('Error generating revenue report by duration:', error);
      return ctx.badRequest('Error generating revenue report', { error: error.message });
    }
  }
}));

/**
 * Generate PDF bill for an order
 */
async function generateOrderBillPDF(order: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      // Collect PDF data
      doc.on('data', (buffer: Buffer) => buffers.push(buffer));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('BOOK STORE', 50, 50);
      doc.fontSize(16).text('Order Bill / Invoice', 50, 80);
      doc.moveTo(50, 110).lineTo(550, 110).stroke();

      // Order Information
      doc.fontSize(12);
      doc.text(`Order ID: #${order.id}`, 50, 130);
      doc.text(`Document ID: ${order.documentId}`, 50, 150);
      doc.text(`Order Date: ${new Date(order.createdAt).toLocaleDateString()}`, 50, 170);
      doc.text(`Status: ${order.status.toUpperCase()}`, 50, 190);

      // Customer Information
      doc.text(`Customer: ${order.user.username}`, 300, 130);
      doc.text(`Email: ${order.user.email}`, 300, 150);
      if (order.shipping_address) {
        doc.text(`Shipping Address:`, 300, 170);
        doc.text(order.shipping_address, 300, 190, { width: 200 });
      }
      if (order.phone) {
        doc.text(`Phone: ${order.phone}`, 300, 220);
      }

      // Items Table Header
      let yPosition = 270;
      doc.moveTo(50, yPosition - 10).lineTo(550, yPosition - 10).stroke();

      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Item', 50, yPosition);
      doc.text('Qty', 350, yPosition);
      doc.text('Unit Price', 400, yPosition);
      doc.text('Total', 480, yPosition);

      yPosition += 20;
      doc.moveTo(50, yPosition - 5).lineTo(550, yPosition - 5).stroke();

      // Items
      doc.font('Helvetica');
      let subtotal = 0;

      for (const item of order.order_items) {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }

        const bookName = item.book.name || 'Unknown Book';
        const quantity = item.quantity;
        const unitPrice = item.unit_price;
        const totalPrice = item.total_price;
        subtotal += totalPrice;

        // Wrap long book names
        const bookNameLines = doc.widthOfString(bookName) > 280
          ? [bookName.substring(0, 40) + '...']
          : [bookName];

        doc.text(bookNameLines[0], 50, yPosition, { width: 280 });
        doc.text(quantity.toString(), 350, yPosition);
        doc.text(`${unitPrice.toLocaleString()} VND`, 400, yPosition);
        doc.text(`${totalPrice.toLocaleString()} VND`, 480, yPosition);

        yPosition += 25;
      }

      // Totals
      yPosition += 10;
      doc.moveTo(350, yPosition).lineTo(550, yPosition).stroke();
      yPosition += 15;

      doc.font('Helvetica-Bold');
      doc.text('Subtotal:', 400, yPosition);
      doc.text(`${subtotal.toLocaleString()} VND`, 480, yPosition);
      yPosition += 20;

      doc.fontSize(14);
      doc.text('TOTAL:', 400, yPosition);
      doc.text(`${order.total_amount.toLocaleString()} VND`, 480, yPosition);

      // Notes
      if (order.notes) {
        yPosition += 40;
        doc.fontSize(10).font('Helvetica');
        doc.text('Notes:', 50, yPosition);
        doc.text(order.notes, 50, yPosition + 15, { width: 500 });
      }

      // Footer
      yPosition = 750;
      doc.fontSize(8).font('Helvetica');
      doc.text('Thank you for your business!', 50, yPosition);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 400, yPosition);

      // Finalize PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate revenue report CSV for a given date range
 */
async function generateRevenueReport(startDate: Date, endDate: Date, reportTitle: string): Promise<Buffer> {
  try {
    console.log(`🔍 Generating revenue report for period: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Fetch orders within the date range with order items and books
    const orders: any = await strapi.entityService.findMany('api::order.order', {
      filters: {
        createdAt: {
          $gte: startDate.toISOString(),
          $lte: endDate.toISOString()
        },
        status: {
          $in: ['pending', 'confirmed', 'shipped', 'delivered'] // Include all orders except cancelled
        }
      },
      populate: {
        order_items: {
          populate: {
            book: {
              fields: ['name']
            }
          }
        }
      }
    });

    console.log(`📊 Found ${orders.length} orders in the specified period`);
    if (orders.length > 0) {
      console.log(`📅 Order dates: ${orders.map((o: any) => new Date(o.createdAt).toISOString().split('T')[0]).join(', ')}`);
      console.log(`📋 Order statuses: ${orders.map((o: any) => o.status).join(', ')}`);
    }

    // Process data to calculate revenue by book
    const bookRevenueMap = new Map();
    let grandTotal = 0;

    for (const order of orders) {
      if (order.order_items && Array.isArray(order.order_items)) {
        for (const item of order.order_items) {
          const bookName = item.book?.name || 'Unknown Book';
          const quantity = item.quantity || 0;
          const totalPrice = item.total_price || 0;

          if (bookRevenueMap.has(bookName)) {
            const existing = bookRevenueMap.get(bookName);
            existing.quantity += quantity;
            existing.totalRevenue += totalPrice;
          } else {
            bookRevenueMap.set(bookName, {
              bookName,
              quantity,
              totalRevenue: totalPrice
            });
          }

          grandTotal += totalPrice;
        }
      }
    }

    // Convert map to array and sort by revenue (highest first)
    const revenueData = Array.from(bookRevenueMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Add grand total row
    revenueData.push({
      bookName: '--- GRAND TOTAL ---',
      quantity: revenueData.reduce((sum, item) => sum + item.quantity, 0),
      totalRevenue: grandTotal
    });

    // Create CSV content
    const csvContent = await createCSVContent(revenueData, reportTitle, startDate, endDate);

    return Buffer.from(csvContent, 'utf8');
  } catch (error) {
    console.error('Error generating revenue report:', error);
    throw error;
  }
}

/**
 * Create CSV content from revenue data
 */
async function createCSVContent(revenueData: any[], reportTitle: string, startDate: Date, endDate: Date): Promise<string> {
  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  const formatCurrency = (amount: number) => amount.toLocaleString('vi-VN') + ' VND';

  let csvContent = '';

  // Header information
  csvContent += `"${reportTitle}"\n`;
  csvContent += `"Period: ${formatDate(startDate)} to ${formatDate(endDate)}"\n`;
  csvContent += `"Generated on: ${new Date().toLocaleString()}"\n`;
  csvContent += '\n';

  // Column headers
  csvContent += '"Book Name","Quantity Sold","Total Revenue"\n';

  // Data rows
  for (const item of revenueData) {
    const bookName = `"${item.bookName.replace(/"/g, '""')}"`;
    const quantity = item.quantity;
    const revenue = `"${formatCurrency(item.totalRevenue)}"`;

    csvContent += `${bookName},${quantity},${revenue}\n`;
  }

  return csvContent;
}
