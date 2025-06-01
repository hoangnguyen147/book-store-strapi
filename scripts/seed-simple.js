#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

/**
 * Simple seed script that works with running Strapi instance
 */

async function main() {
  console.log('🌱 Starting books data seeding...');

  try {
    // Read and parse CSV data
    const csvData = await readCSVFile();
    
    if (csvData.length === 0) {
      console.log('📊 No CSV data found, exiting');
      return;
    }

    console.log(`📊 Loaded ${csvData.length} records from CSV`);
    console.log('✅ CSV data ready for seeding!');
    console.log('💡 To seed data, run: SEED_BOOKS=true npm run develop');
    
  } catch (error) {
    console.error('❌ Error reading CSV data:', error);
  }
}

/**
 * Read CSV file and return parsed data
 */
function readCSVFile() {
  return new Promise((resolve, reject) => {
    const results = [];
    const csvPath = path.join(__dirname, '../data/books/prepared_data_book.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.log('⚠️  CSV file not found');
      resolve([]);
      return;
    }

    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      })
      .on('error', reject);
  });
}

// Run the script
if (require.main === module) {
  main();
}
