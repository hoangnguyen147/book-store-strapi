#!/usr/bin/env node

'use strict';

/**
 * Seed orders data script for Strapi
 * This script creates realistic order data with multiple order items
 */

async function main() {
  console.log('🛒 Starting order data seeding for Strapi...');

  let strapi;
  try {
    // Initialize Strapi
    const { createStrapi, compileStrapi } = require('@strapi/strapi');
    const appContext = await compileStrapi();
    strapi = await createStrapi(appContext).load();

    // Get existing data
    console.log('📊 Fetching existing data...');
    const users = await strapi.db.query('plugin::users-permissions.user').findMany({
      limit: 100
    });
    const books = await strapi.db.query('api::book.book').findMany({
      limit: 500,
      where: { quantity: { $gt: 0 } } // Only books with stock
    });

    if (users.length === 0) {
      console.log('❌ No users found. Please create some users first.');
      return;
    }

    if (books.length === 0) {
      console.log('❌ No books found. Please run book seeding first.');
      return;
    }

    console.log(`👥 Found ${users.length} users`);
    console.log(`📚 Found ${books.length} books with stock`);

    // Clear existing orders (optional - commented out for production safety)
    // console.log('🗑️  Clearing existing orders...');
    // await clearExistingOrders(strapi);
    console.log('⚠️  PRODUCTION MODE: Keeping existing orders, adding new ones');

    // Create orders
    console.log('🛒 Creating orders...');
    await createOrders(strapi, users, books);

    console.log('✅ Order data seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding order data:', error);
  } finally {
    if (strapi) {
      await strapi.destroy();
    }
    process.exit(0);
  }
}

/**
 * Clear existing orders and order items
 */
async function clearExistingOrders(strapi) {
  await strapi.db.query('api::order-item.order-item').deleteMany({});
  await strapi.db.query('api::order.order').deleteMany({});
  console.log('🗑️  Cleared existing orders and order items');
}

/**
 * Create realistic orders with multiple items
 */
async function createOrders(strapi, users, books) {
  const orderStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  const statusWeights = [0.15, 0.25, 0.20, 0.35, 0.05]; // Most orders are delivered
  
  const addresses = [
    '123 Nguyen Hue Street, District 1, Ho Chi Minh City',
    '456 Le Loi Boulevard, District 3, Ho Chi Minh City',
    '789 Dong Khoi Street, District 1, Ho Chi Minh City',
    '321 Hai Ba Trung Street, District 1, Ho Chi Minh City',
    '654 Tran Hung Dao Street, District 5, Ho Chi Minh City',
    '987 Pham Ngu Lao Street, District 1, Ho Chi Minh City',
    '147 Vo Van Tan Street, District 3, Ho Chi Minh City',
    '258 Cach Mang Thang Tam Street, District 10, Ho Chi Minh City'
  ];

  const phones = [
    '+84901234567', '+84912345678', '+84923456789', '+84934567890',
    '+84945678901', '+84956789012', '+84967890123', '+84978901234'
  ];

  let ordersCreated = 0;
  const totalOrders = 200; // Create 200 orders

  for (let i = 0; i < totalOrders; i++) {
    try {
      // Random user
      const user = users[Math.floor(Math.random() * users.length)];
      
      // Random order date (last 6 months)
      const orderDate = new Date();
      orderDate.setDate(orderDate.getDate() - Math.floor(Math.random() * 180));
      
      // Random status based on weights
      const status = getWeightedRandomStatus(orderStatuses, statusWeights);
      
      // Random number of items (1-5 books per order)
      const numItems = Math.floor(Math.random() * 5) + 1;
      const orderBooks = getRandomBooks(books, numItems);
      
      let totalAmount = 0;
      const orderItemsData = [];

      // Calculate order items and total
      for (const book of orderBooks) {
        const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 quantity per book
        const unitPrice = book.sale_price;
        const totalPrice = unitPrice * quantity;
        totalAmount += totalPrice;

        orderItemsData.push({
          book: book,
          quantity: quantity,
          unit_price: unitPrice,
          total_price: totalPrice
        });
      }

      // Create the order
      const order = await strapi.db.query('api::order.order').create({
        data: {
          user: user.id,
          total_amount: totalAmount,
          status: status,
          shipping_address: addresses[Math.floor(Math.random() * addresses.length)],
          phone: phones[Math.floor(Math.random() * phones.length)],
          notes: generateOrderNotes(),
          createdAt: orderDate,
          updatedAt: orderDate
        }
      });

      // Create order items
      for (const itemData of orderItemsData) {
        await strapi.db.query('api::order-item.order-item').create({
          data: {
            order: order.id,
            book: itemData.book.id,
            quantity: itemData.quantity,
            unit_price: itemData.unit_price,
            total_price: itemData.total_price,
            createdAt: orderDate,
            updatedAt: orderDate
          }
        });

        // PRODUCTION SAFETY: Do not modify book quantities
        // This preserves existing book inventory data
        // if (status === 'delivered' || status === 'shipped') {
        //   const newQuantity = Math.max(0, itemData.book.quantity - itemData.quantity);
        //   await strapi.db.query('api::book.book').update({
        //     where: { id: itemData.book.id },
        //     data: { quantity: newQuantity }
        //   });
        // }
      }

      ordersCreated++;
      
      if (ordersCreated % 50 === 0) {
        console.log(`🛒 Created ${ordersCreated} orders...`);
      }
    } catch (error) {
      console.error(`❌ Error creating order ${i + 1}:`, error.message);
    }
  }

  console.log(`🛒 Created ${ordersCreated} orders total`);
}

/**
 * Get weighted random status
 */
function getWeightedRandomStatus(statuses, weights) {
  const random = Math.random();
  let weightSum = 0;
  
  for (let i = 0; i < weights.length; i++) {
    weightSum += weights[i];
    if (random <= weightSum) {
      return statuses[i];
    }
  }
  
  return statuses[statuses.length - 1];
}

/**
 * Get random books for an order
 */
function getRandomBooks(books, count) {
  const shuffled = [...books].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Generate random order notes
 */
function generateOrderNotes() {
  const notes = [
    'Please deliver in the morning',
    'Call before delivery',
    'Leave at the front door if no one is home',
    'Gift wrapping requested',
    'Handle with care - fragile items',
    'Urgent delivery needed',
    'Please ring the doorbell',
    null, // Some orders have no notes
    null,
    null
  ];
  
  return notes[Math.floor(Math.random() * notes.length)];
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main };
