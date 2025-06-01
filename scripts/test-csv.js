#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

/**
 * Test script to verify CSV file can be read correctly
 */

async function testCSV() {
  console.log('🧪 Testing CSV file reading...');

  try {
    const csvPath = path.join(__dirname, '../data/books/prepared_data_book.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.error(`❌ CSV file not found: ${csvPath}`);
      return;
    }

    console.log(`📁 Found CSV file: ${csvPath}`);

    const results = [];
    
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (data) => {
          results.push(data);
          if (results.length <= 5) {
            console.log(`📊 Sample row ${results.length}:`, {
              title: data.title,
              authors: data.authors,
              category: data.category,
              price: data.current_price,
              rating: data.avg_rating,
              cover_link: data.cover_link ? 'Has image URL' : 'No image'
            });
          }
        })
        .on('end', () => {
          console.log(`✅ Successfully loaded ${results.length} records from CSV`);
          
          // Analyze data
          const categories = [...new Set(results.map(row => row.category).filter(Boolean))];
          const authors = [...new Set(results.map(row => row.authors).filter(Boolean))];
          
          console.log(`📚 Found ${categories.length} unique categories`);
          console.log(`✍️  Found ${authors.length} unique authors`);
          console.log(`🖼️  Books with images: ${results.filter(row => row.cover_link).length}`);
          console.log(`⭐ Books with ratings: ${results.filter(row => row.avg_rating && parseFloat(row.avg_rating) > 0).length}`);
          
          console.log('\n📋 Sample categories:', categories.slice(0, 10));
          console.log('\n✍️  Sample authors:', authors.slice(0, 10));
          
          resolve();
        })
        .on('error', reject);
    });

    console.log('\n✅ CSV test completed successfully!');
  } catch (error) {
    console.error('❌ Error testing CSV:', error);
  }
}

// Run the test
if (require.main === module) {
  testCSV();
}

module.exports = { testCSV };
