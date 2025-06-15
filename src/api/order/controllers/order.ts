/**
 * order controller
 */

import { factories } from '@strapi/strapi';
import PDFDocument from 'pdfkit';

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
      doc.on('data', (buffer) => buffers.push(buffer));
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
