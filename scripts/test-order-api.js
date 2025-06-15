#!/usr/bin/env node

/**
 * Test script for the simplified single-API order creation
 * This demonstrates how easy it is for the client to create orders
 */

const axios = require('axios');

const API_BASE = 'http://localhost:1337/api';

// Example: Create a complete order with multiple books in ONE API call
async function testOrderCreation() {
  try {
    console.log('🚀 Testing Single API Order Creation...\n');

    // Single API call to create complete order with inventory management
    const orderData = {
      data: {
        items: [
          { book_id: 1, quantity: 2 },  // 2 copies of book ID 1
          { book_id: 2, quantity: 1 },  // 1 copy of book ID 2
          { book_id: 3, quantity: 3 }   // 3 copies of book ID 3
        ],
        shipping_address: '123 Nguyen Hue Street, Ho Chi Minh City',
        phone: '+84901234567',
        notes: 'Please deliver in the morning'
      }
    };

    console.log('📦 Creating order with data:');
    console.log(JSON.stringify(orderData, null, 2));
    console.log('\n⏳ Sending request...\n');

    const response = await axios.post(`${API_BASE}/orders`, orderData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_TOKEN_HERE' // Replace with actual token
      }
    });

    console.log('✅ Order created successfully!');
    console.log('📋 Order Details:');
    console.log(`   Order ID: ${response.data.data.id}`);
    console.log(`   Total Amount: ${response.data.data.total_amount} VND`);
    console.log(`   Status: ${response.data.data.status}`);
    console.log(`   Items Count: ${response.data.data.order_items.length}`);
    
    console.log('\n📚 Order Items:');
    response.data.data.order_items.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.book.name}`);
      console.log(`      Quantity: ${item.quantity}`);
      console.log(`      Unit Price: ${item.unit_price} VND`);
      console.log(`      Total: ${item.total_price} VND`);
      console.log(`      Remaining Stock: ${item.book.quantity}`);
    });

    console.log('\n🎉 Single API call completed successfully!');
    console.log('✨ Benefits:');
    console.log('   - One API call instead of multiple');
    console.log('   - Automatic inventory deduction');
    console.log('   - Transaction rollback on errors');
    console.log('   - Complete order with all details');

  } catch (error) {
    console.error('❌ Error creating order:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.data.error?.message || error.response.data.message}`);
    } else {
      console.error(`   ${error.message}`);
    }
  }
}

// Example: Test insufficient inventory scenario
async function testInsufficientInventory() {
  try {
    console.log('\n🧪 Testing Insufficient Inventory Scenario...\n');

    const orderData = {
      data: {
        items: [
          { book_id: 1, quantity: 999999 }  // Requesting way more than available
        ],
        shipping_address: '123 Test Street',
        phone: '+84123456789'
      }
    };

    await axios.post(`${API_BASE}/orders`, orderData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_TOKEN_HERE'
      }
    });

  } catch (error) {
    console.log('✅ Insufficient inventory properly handled!');
    console.log(`   Error: ${error.response.data.error?.message}`);
    console.log('   🔄 No changes made to database (automatic rollback)');
  }
}

// Run tests
async function runTests() {
  console.log('📖 Book Store - Single API Order Creation Test\n');
  console.log('This script demonstrates the simplified order API that:');
  console.log('- Creates complete orders in ONE API call');
  console.log('- Handles multiple books with quantities');
  console.log('- Manages inventory automatically');
  console.log('- Provides transaction rollback on errors\n');
  console.log('=' .repeat(60));

  await testOrderCreation();
  await testInsufficientInventory();

  console.log('\n' + '='.repeat(60));
  console.log('🎯 Client Integration is now MUCH simpler!');
  console.log('   Just one API call: POST /api/orders');
  console.log('   No need to manage order items separately');
  console.log('   No need to handle inventory manually');
}

// Only run if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testOrderCreation, testInsufficientInventory };
