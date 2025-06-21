#!/usr/bin/env node

/**
 * Comprehensive Report API Validation Script
 * Tests all reporting endpoints for functionality, data accuracy, and error handling
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:1337/api';
const ENDPOINTS = {
  // Revenue Reports
  revenue: '/reports/revenue',
  revenueTrends: '/reports/revenue/trends',
  topBooks: '/reports/revenue/top-books',
  
  // Inventory Reports
  inventory: '/reports/inventory',
  lowStock: '/reports/inventory/low-stock',
  inventoryMovement: '/reports/inventory/movement',
  
  // Dashboard
  dashboard: '/reports/dashboard'
};

class ReportValidator {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async test(name, testFn) {
    try {
      console.log(`🧪 Testing: ${name}`);
      await testFn();
      this.results.passed++;
      this.results.tests.push({ name, status: 'PASSED' });
      console.log(`✅ ${name} - PASSED`);
    } catch (error) {
      this.results.failed++;
      this.results.tests.push({ name, status: 'FAILED', error: error.message });
      console.log(`❌ ${name} - FAILED: ${error.message}`);
    }
  }

  async makeRequest(endpoint, params = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const response = await axios.get(url, { params });
    return response.data;
  }

  validateResponse(data, requiredFields) {
    if (!data || !data.data) {
      throw new Error('Response missing data field');
    }
    
    for (const field of requiredFields) {
      if (!(field in data.data)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Report API Validation\n');

    // Revenue Report Tests
    await this.test('Revenue Report - Basic', async () => {
      const data = await this.makeRequest(ENDPOINTS.revenue);
      this.validateResponse(data, ['summary', 'bookSales', 'grandTotal']);
      
      if (typeof data.data.summary.totalRevenue !== 'number') {
        throw new Error('totalRevenue should be a number');
      }
    });

    await this.test('Revenue Report - Date Filtering', async () => {
      const data = await this.makeRequest(ENDPOINTS.revenue, {
        startDate: '2025-06-01',
        endDate: '2025-06-21'
      });
      this.validateResponse(data, ['summary', 'bookSales', 'grandTotal']);
    });

    await this.test('Revenue Report - Time Series', async () => {
      const data = await this.makeRequest(ENDPOINTS.revenue, {
        groupBy: 'day',
        startDate: '2025-06-01',
        endDate: '2025-06-21'
      });
      this.validateResponse(data, ['summary', 'bookSales', 'grandTotal', 'timeSeries']);
      
      if (!Array.isArray(data.data.timeSeries)) {
        throw new Error('timeSeries should be an array');
      }
    });

    await this.test('Revenue Report - CSV Export', async () => {
      const response = await axios.get(`${BASE_URL}${ENDPOINTS.revenue}`, {
        params: { format: 'csv' }
      });
      
      if (!response.headers['content-type'].includes('text/csv')) {
        throw new Error('CSV export should return text/csv content type');
      }
    });

    // Revenue Trends Tests
    await this.test('Revenue Trends - Last 7 Days', async () => {
      const data = await this.makeRequest(ENDPOINTS.revenueTrends, {
        period: 'last7days'
      });
      this.validateResponse(data, ['period', 'groupBy', 'timeSeries', 'summary']);
      
      if (data.data.period !== 'last7days') {
        throw new Error('Period should match request');
      }
    });

    await this.test('Revenue Trends - Custom Grouping', async () => {
      const data = await this.makeRequest(ENDPOINTS.revenueTrends, {
        period: 'last30days',
        groupBy: 'week'
      });
      
      if (data.data.groupBy !== 'week') {
        throw new Error('GroupBy should match request');
      }
    });

    // Top Books Tests
    await this.test('Top Books - Basic', async () => {
      const data = await this.makeRequest(ENDPOINTS.topBooks);
      this.validateResponse(data, ['topBooks', 'summary']);
      
      if (!Array.isArray(data.data.topBooks)) {
        throw new Error('topBooks should be an array');
      }
    });

    await this.test('Top Books - Limit', async () => {
      const data = await this.makeRequest(ENDPOINTS.topBooks, { limit: 5 });
      
      if (data.data.topBooks.length > 5) {
        throw new Error('Should respect limit parameter');
      }
    });

    // Inventory Report Tests
    await this.test('Inventory Report - Basic', async () => {
      const data = await this.makeRequest(ENDPOINTS.inventory);
      this.validateResponse(data, ['summary', 'books', 'lowStockBooks']);
      
      if (!Array.isArray(data.data.books)) {
        throw new Error('books should be an array');
      }
    });

    await this.test('Inventory Report - CSV Export', async () => {
      const response = await axios.get(`${BASE_URL}${ENDPOINTS.inventory}`, {
        params: { format: 'csv' }
      });
      
      if (!response.headers['content-type'].includes('text/csv')) {
        throw new Error('CSV export should return text/csv content type');
      }
    });

    // Low Stock Tests
    await this.test('Low Stock Report - Basic', async () => {
      const data = await this.makeRequest(ENDPOINTS.lowStock);
      this.validateResponse(data, ['lowStockBooks', 'summary']);
      
      if (typeof data.data.summary.threshold !== 'number') {
        throw new Error('threshold should be a number');
      }
    });

    await this.test('Low Stock Report - Custom Threshold', async () => {
      const data = await this.makeRequest(ENDPOINTS.lowStock, { threshold: 5 });
      
      if (data.data.summary.threshold !== 5) {
        throw new Error('Should respect threshold parameter');
      }
    });

    // Inventory Movement Tests
    await this.test('Inventory Movement - Basic', async () => {
      const data = await this.makeRequest(ENDPOINTS.inventoryMovement);
      this.validateResponse(data, ['movementData', 'summary']);
      
      if (!Array.isArray(data.data.movementData)) {
        throw new Error('movementData should be an array');
      }
    });

    await this.test('Inventory Movement - Date Filtering', async () => {
      const data = await this.makeRequest(ENDPOINTS.inventoryMovement, {
        startDate: '2025-06-01',
        endDate: '2025-06-21'
      });
      this.validateResponse(data, ['movementData', 'summary']);
    });

    // Dashboard Tests
    await this.test('Dashboard - Basic', async () => {
      const data = await this.makeRequest(ENDPOINTS.dashboard);
      this.validateResponse(data, ['currentMonth', 'previousMonth', 'growth', 'lowStockBooks']);
      
      if (typeof data.data.growth.revenue !== 'number') {
        throw new Error('growth.revenue should be a number');
      }
    });

    // Error Handling Tests
    await this.test('Error Handling - Invalid Date', async () => {
      try {
        await this.makeRequest(ENDPOINTS.revenue, { startDate: 'invalid-date' });
        throw new Error('Should have thrown an error for invalid date');
      } catch (error) {
        if (!error.response || error.response.status !== 400) {
          throw new Error('Should return 400 status for invalid date');
        }
      }
    });

    await this.test('Error Handling - Non-existent Category', async () => {
      const data = await this.makeRequest(ENDPOINTS.revenue, { categoryId: 999 });
      
      if (data.data.summary.totalRevenue !== 0) {
        throw new Error('Should return zero revenue for non-existent category');
      }
    });

    this.printResults();
  }

  printResults() {
    console.log('\n📊 Validation Results:');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📈 Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`);
    
    if (this.results.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.tests
        .filter(test => test.status === 'FAILED')
        .forEach(test => {
          console.log(`  - ${test.name}: ${test.error}`);
        });
    }
    
    console.log('\n🎉 Validation Complete!');
  }
}

// Run validation
const validator = new ReportValidator();
validator.runAllTests().catch(console.error);
