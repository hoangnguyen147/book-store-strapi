#!/usr/bin/env node

/**
 * Fast Order Data Seeding Script for Production
 * Creates sample orders without modifying book quantities
 * Safe for production use - preserves existing data
 */

const Strapi = require('@strapi/strapi');

async function seedOrderData() {
  let app;
  try {
    console.log('🛒 Starting FAST order data seeding for Strapi...');

    // Initialize Strapi
    app = await Strapi().load();
    
    console.log('📊 Fetching existing data...');
    
    // Get users and books
    const users = await app.db.query('plugin::users-permissions.user').findMany({
      limit: 20 // Limit to first 20 users for faster processing
    });

    const books = await app.db.query('api::book.book').findMany({
      where: { quantity: { $gt: 0 } },
      limit: 50 // Limit to first 50 books for faster processing
    });
    
    console.log(`👥 Found ${users.length} users`);
    console.log(`📚 Found ${books.length} books with stock`);
    
    if (users.length === 0 || books.length === 0) {
      console.log('❌ No users or books found. Please ensure data exists.');
      return;
    }
    
    console.log('⚠️  PRODUCTION MODE: Keeping existing orders, adding new ones');
    console.log('⚠️  PRODUCTION MODE: Not modifying book quantities');
    
    // Order statuses with realistic distribution
    const statuses = [
      { status: 'pending', weight: 10 },
      { status: 'confirmed', weight: 20 },
      { status: 'shipped', weight: 25 },
      { status: 'delivered', weight: 35 },
      { status: 'cancelled', weight: 10 }
    ];
    
    // Create weighted status array
    const weightedStatuses = [];
    statuses.forEach(({ status, weight }) => {
      for (let i = 0; i < weight; i++) {
        weightedStatuses.push(status);
      }
    });
    
    // Sample addresses and phones
    const addresses = [
      '123 Nguyen Hue Street, District 1, Ho Chi Minh City',
      '456 Le Loi Boulevard, District 3, Ho Chi Minh City',
      '789 Dong Khoi Street, District 1, Ho Chi Minh City',
      '321 Hai Ba Trung Street, District 1, Ho Chi Minh City',
      '654 Tran Hung Dao Street, District 5, Ho Chi Minh City'
    ];
    
    const phones = [
      '+84901234567', '+84912345678', '+84923456789',
      '+84934567890', '+84945678901', '+84956789012'
    ];
    
    console.log('🛒 Creating orders...');
    
    const ordersToCreate = 50; // Reduced number for faster processing
    const batchSize = 10; // Process in smaller batches
    
    for (let batch = 0; batch < Math.ceil(ordersToCreate / batchSize); batch++) {
      const batchStart = batch * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, ordersToCreate);
      
      console.log(`🛒 Processing batch ${batch + 1}/${Math.ceil(ordersToCreate / batchSize)} (orders ${batchStart + 1}-${batchEnd})`);
      
      for (let i = batchStart; i < batchEnd; i++) {
        try {
          // Random user
          const user = users[Math.floor(Math.random() * users.length)];
          
          // Random order date (last 3 months for faster processing)
          const now = new Date();
          const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          const orderDate = new Date(threeMonthsAgo.getTime() + Math.random() * (now.getTime() - threeMonthsAgo.getTime()));
          
          // Random status
          const status = weightedStatuses[Math.floor(Math.random() * weightedStatuses.length)];
          
          // Random number of items (1-3 for faster processing)
          const numItems = Math.floor(Math.random() * 3) + 1;
          const orderItems = [];
          let totalAmount = 0;
          
          // Create order items
          for (let j = 0; j < numItems; j++) {
            const book = books[Math.floor(Math.random() * books.length)];
            const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 items
            const unitPrice = book.sale_price || 10000;
            const totalPrice = unitPrice * quantity;
            
            orderItems.push({
              book: book.id,
              quantity,
              unit_price: unitPrice,
              total_price: totalPrice
            });
            
            totalAmount += totalPrice;
          }
          
          // Create order
          const orderData = {
            user: user.id,
            total_amount: totalAmount,
            status,
            shipping_address: addresses[Math.floor(Math.random() * addresses.length)],
            phone: phones[Math.floor(Math.random() * phones.length)],
            createdAt: orderDate.toISOString(),
            updatedAt: orderDate.toISOString()
          };
          
          const order = await app.db.query('api::order.order').create({
            data: orderData
          });

          // Create order items
          for (const itemData of orderItems) {
            await app.db.query('api::order-item.order-item').create({
              data: {
                ...itemData,
                order: order.id
              }
            });
          }
          
          // PRODUCTION SAFETY: Do not modify book quantities
          // This preserves existing book inventory data
          
        } catch (error) {
          console.error(`❌ Error creating order ${i + 1}:`, error.message);
        }
      }
    }
    
    console.log('✅ Order seeding completed successfully!');
    console.log(`📊 Created ${ordersToCreate} orders with realistic data`);
    console.log('⚠️  Book quantities were NOT modified (production safe)');
    
  } catch (error) {
    console.error('❌ Error seeding order data:', error);
  } finally {
    // Close Strapi
    if (app) {
      await app.destroy();
    }
    process.exit(0);
  }
}

// Run the seeding
seedOrderData();
