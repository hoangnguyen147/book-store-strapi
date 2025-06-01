#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

/**
 * Seed books data script for Strapi
 * This script reads CSV data and creates books, authors, and categories
 */

async function main() {
  console.log('🌱 Starting books data seeding for Strapi...');

  let strapi;
  try {
    // Initialize Strapi
    const Strapi = require('@strapi/strapi');
    strapi = Strapi();
    await strapi.load();

    // Read and parse CSV data
    const csvData = await readCSVFile();
    
    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('🗑️  Clearing existing data...');
    await clearExistingData(strapi);

    // Seed categories
    console.log('📚 Seeding categories...');
    const categories = await seedCategories(strapi, csvData);
    
    // Seed authors
    console.log('✍️  Seeding authors...');
    const authors = await seedAuthors(strapi, csvData);
    
    // Seed books
    console.log('📖 Seeding books...');
    await seedBooks(strapi, csvData, categories, authors);

    console.log('✅ Books data seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding books data:', error);
  } finally {
    // Always destroy Strapi instance
    if (strapi) {
      await strapi.destroy();
    }
    process.exit(0);
  }
}

/**
 * Clear existing data
 */
async function clearExistingData(strapi) {
  await strapi.db.query('api::book.book').deleteMany({});
  await strapi.db.query('api::category.category').deleteMany({});
  await strapi.db.query('api::author.author').deleteMany({});
}

/**
 * Read CSV file and return parsed data
 */
function readCSVFile() {
  return new Promise((resolve, reject) => {
    const results = [];
    const csvPath = path.join(__dirname, '../data/books/prepared_data_book.csv');
    
    if (!fs.existsSync(csvPath)) {
      reject(new Error(`CSV file not found: ${csvPath}`));
      return;
    }

    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        console.log(`📊 Loaded ${results.length} records from CSV`);
        resolve(results);
      })
      .on('error', reject);
  });
}

/**
 * Seed categories from CSV data
 */
async function seedCategories(strapi, csvData) {
  const uniqueCategories = [...new Set(csvData.map(row => row.category).filter(Boolean))];
  const categoryMap = {};

  for (const categoryName of uniqueCategories) {
    // Map category names to more appropriate values
    const mappedName = mapCategoryName(categoryName);
    
    const category = await strapi.db.query('api::category.category').create({
      data: {
        name: mappedName,
        description: `Category for ${mappedName} books`,
        publishedAt: new Date()
      }
    });

    categoryMap[categoryName] = category.id;
  }

  console.log(`📚 Created ${uniqueCategories.length} categories`);
  return categoryMap;
}

/**
 * Seed authors from CSV data
 */
async function seedAuthors(strapi, csvData) {
  const uniqueAuthors = [...new Set(csvData.map(row => row.authors).filter(Boolean))];
  const authorMap = {};

  for (const authorName of uniqueAuthors) {
    if (authorName === 'Unknown' || !authorName.trim()) continue;

    // Generate some sample data for authors
    const tags = Math.random() > 0.9 ? ['featured'] : Math.random() > 0.95 ? ['staff-pick'] : [];
    
    const author = await strapi.db.query('api::author.author').create({
      data: {
        name: authorName.trim(),
        bio: `Biography of ${authorName.trim()}`,
        email: generateAuthorEmail(authorName),
        tags: tags,
        publishedAt: new Date()
      }
    });

    authorMap[authorName] = author.id;
  }

  console.log(`✍️  Created ${Object.keys(authorMap).length} authors`);
  return authorMap;
}

/**
 * Seed books from CSV data
 */
async function seedBooks(strapi, csvData, categories, authors) {
  let booksCreated = 0;
  
  for (const row of csvData) {
    try {
      // Skip if essential data is missing
      if (!row.title || !row.title.trim()) continue;

      // Generate tags for featured books
      const tags = generateBookTags(row);
      
      // Convert price from string to number (multiply by 1000 for VND)
      const originalPrice = Math.round(parseFloat(row.original_price) * 1000) || 0;
      const currentPrice = Math.round(parseFloat(row.current_price) * 1000) || originalPrice;
      
      // Prepare book data
      const bookData = {
        name: row.title.trim(),
        description: generateBookDescription(row),
        price: originalPrice,
        sale_price: currentPrice,
        quantity: parseInt(row.quantity) || 0,
        rating: parseFloat(row.avg_rating) || 0,
        pages: parseInt(row.pages) || null,
        publisher: row.manufacturer || null,
        thumbnail_url: row.cover_link || null,
        tags: tags,
        publishedAt: new Date()
      };

      // Add category relation
      if (row.category && categories[row.category]) {
        bookData.categories = [categories[row.category]];
      }

      // Add author relation
      if (row.authors && authors[row.authors]) {
        bookData.authors = [authors[row.authors]];
      }

      // Create book
      await strapi.db.query('api::book.book').create({
        data: bookData
      });

      booksCreated++;
      
      if (booksCreated % 100 === 0) {
        console.log(`📖 Created ${booksCreated} books...`);
      }
    } catch (error) {
      console.error(`❌ Error creating book "${row.title}":`, error.message);
    }
  }

  console.log(`📖 Created ${booksCreated} books total`);
}

/**
 * Map category names to more appropriate values
 */
function mapCategoryName(categoryName) {
  const categoryMap = {
    'Tiểu Thuyết': 'Fiction',
    'Others': 'Self-Help',
    'Lĩnh vực khác': 'Others',
    'Tác phẩm kinh điển': 'Classics',
    'Truyện ngắn - Tản văn - Tạp Văn': 'Short Stories',
    'Truyện Giả tưởng - Huyền Bí - Phiêu Lưu': 'Fantasy & Adventure',
    'Sách kinh tế học': 'Economics',
    'Truyện dài': 'Novels',
    'Sách tài chính, tiền tệ': 'Finance',
    'Truyện trinh thám': 'Mystery',
    'Sách Chiêm Tinh - Horoscope': 'Astrology',
    'Truyện kể cho bé': 'Children',
    'Bài học kinh doanh': 'Business',
    'Kiến Thức Bách Khoa': 'Encyclopedia',
    'Lịch Sử Thế Giới': 'History',
    'Sách kỹ năng làm việc': 'Work Skills',
    'Sách quản trị, lãnh đạo': 'Management',
    'Sách Marketing - Bán hàng': 'Marketing',
    'Sách giáo dục': 'Education',
    'Light novel': 'Light Novel',
    'Sách Học Tiếng Anh': 'English Learning',
    'Sách nghệ thuật sống đẹp': 'Lifestyle',
    'Tiểu sử - Hồi ký': 'Biography',
    'Truyện đam mỹ': 'Romance',
    'Văn học thiếu nhi': 'Children Literature',
    'Truyện ngôn tình': 'Romance',
    'Truyện kinh dị': 'Horror',
    'Sách Tô Màu Dành Cho Người Lớn': 'Adult Coloring',
    'Sách Nấu ăn': 'Cooking'
  };

  return categoryMap[categoryName] || categoryName;
}

/**
 * Generate book tags based on rating and other factors
 */
function generateBookTags(row) {
  const tags = [];
  const rating = parseFloat(row.avg_rating) || 0;
  const reviews = parseInt(row.n_review) || 0;

  // Featured books (high rating + many reviews)
  if (rating >= 4.8 && reviews > 1000) {
    tags.push('featured');
  }

  // Best-selling (high quantity sold - using quantity as proxy)
  if (parseInt(row.quantity) > 10000) {
    tags.push('best-selling');
  }

  // Staff pick (random selection of high-rated books)
  if (rating >= 4.7 && Math.random() > 0.95) {
    tags.push('staff-pick');
  }

  return tags;
}

/**
 * Generate book description
 */
function generateBookDescription(row) {
  const rating = parseFloat(row.avg_rating) || 0;
  const reviews = parseInt(row.n_review) || 0;
  const pages = parseInt(row.pages) || 0;

  let description = `"${row.title}" is a captivating book`;
  
  if (row.authors && row.authors !== 'Unknown') {
    description += ` by ${row.authors}`;
  }
  
  if (pages > 0) {
    description += ` spanning ${pages} pages`;
  }
  
  if (rating > 0) {
    description += `. With an average rating of ${rating} stars`;
    if (reviews > 0) {
      description += ` from ${reviews} reviews`;
    }
  }
  
  description += ', this book offers readers an engaging and memorable experience.';
  
  return description;
}

/**
 * Generate author email
 */
function generateAuthorEmail(authorName) {
  const cleanName = authorName.toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, '.');
  
  return `${cleanName}@bookstore.com`;
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main };
