/**
 * order controller
 */

import { factories } from '@strapi/strapi';

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
  }
}));
