#!/usr/bin/env node

/**
 * Simple Order Data Seeding Script using API calls
 * Creates sample orders without modifying book quantities
 * Safe for production use - preserves existing data
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:1337/api';

// Sample data
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

const statuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

async function seedOrders() {
  try {
    console.log('🛒 Starting simple order seeding...');
    
    // Get users
    console.log('👥 Fetching users...');
    const usersResponse = await axios.get(`${BASE_URL}/users?pagination[limit]=20`);
    const users = usersResponse.data;
    
    if (!users || users.length === 0) {
      console.log('❌ No users found. Please create users first.');
      return;
    }
    
    console.log(`👥 Found ${users.length} users`);
    
    // Get books
    console.log('📚 Fetching books...');
    const booksResponse = await axios.get(`${BASE_URL}/books?pagination[limit]=50`);
    const books = booksResponse.data.data;
    
    if (!books || books.length === 0) {
      console.log('❌ No books found. Please create books first.');
      return;
    }
    
    console.log(`📚 Found ${books.length} books`);
    
    // Create orders
    const ordersToCreate = 30;
    console.log(`🛒 Creating ${ordersToCreate} orders...`);
    
    for (let i = 0; i < ordersToCreate; i++) {
      try {
        // Random user
        const user = users[Math.floor(Math.random() * users.length)];
        
        // Random order date (last 2 months)
        const now = new Date();
        const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        const orderDate = new Date(twoMonthsAgo.getTime() + Math.random() * (now.getTime() - twoMonthsAgo.getTime()));
        
        // Random status
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        
        // Random number of items (1-3)
        const numItems = Math.floor(Math.random() * 3) + 1;
        const orderItems = [];
        let totalAmount = 0;
        
        // Create order items
        for (let j = 0; j < numItems; j++) {
          const book = books[Math.floor(Math.random() * books.length)];
          const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 items
          const unitPrice = book.attributes.sale_price || 10000;
          const totalPrice = unitPrice * quantity;
          
          orderItems.push({
            book: book.id,
            quantity,
            unit_price: unitPrice,
            total_price: totalPrice
          });
          
          totalAmount += totalPrice;
        }
        
        // Create order data
        const orderData = {
          data: {
            user: user.id,
            total_amount: totalAmount,
            status,
            shipping_address: addresses[Math.floor(Math.random() * addresses.length)],
            phone: phones[Math.floor(Math.random() * phones.length)],
            order_items: orderItems
          }
        };
        
        // Create order via API
        const orderResponse = await axios.post(`${BASE_URL}/orders`, orderData);
        
        if (orderResponse.status === 200 || orderResponse.status === 201) {
          console.log(`✅ Created order ${i + 1}/${ordersToCreate}`);
        } else {
          console.log(`⚠️  Order ${i + 1} created with status: ${orderResponse.status}`);
        }
        
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Error creating order ${i + 1}:`, error.response?.data?.error?.message || error.message);
      }
    }
    
    console.log('✅ Order seeding completed!');
    console.log('⚠️  Book quantities were NOT modified (production safe)');
    
  } catch (error) {
    console.error('❌ Error in order seeding:', error.message);
  }
}

// Check if server is running first
async function checkServer() {
  try {
    await axios.get(`${BASE_URL}/books?pagination[limit]=1`);
    return true;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('🔍 Checking if Strapi server is running...');
  
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.log('❌ Strapi server is not running. Please start the server first with: npm run develop');
    process.exit(1);
  }
  
  console.log('✅ Server is running, proceeding with seeding...');
  await seedOrders();
}

main();
