#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { Client } = require('pg');
require('dotenv').config();

/**
 * Manual seeding script that connects directly to PostgreSQL database
 * Uses helper functions and CSV data to seed books, authors, and categories
 */

// Database configuration from .env
const dbConfig = {
  host: process.env.DATABASE_HOST || '127.0.0.1',
  port: process.env.DATABASE_PORT || 55314,
  database: process.env.DATABASE_NAME || 'bookstore',
  user: process.env.DATABASE_USERNAME || 'odoo',
  password: process.env.DATABASE_PASSWORD || 'odoo',
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
};

async function main() {
  console.log('🌱 Starting manual books data seeding...');
  console.log('🔗 Database config:', {
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.user
  });

  const client = new Client(dbConfig);

  try {
    // Connect to database
    await client.connect();
    console.log('✅ Connected to PostgreSQL database');

    // Read and parse CSV data
    const csvData = await readCSVFile();
    
    if (csvData.length === 0) {
      console.log('📊 No CSV data found, exiting');
      return;
    }

    // Check if data already exists
    const existingBooks = await client.query('SELECT COUNT(*) FROM books');
    const bookCount = parseInt(existingBooks.rows[0].count);
    
    if (bookCount > 0) {
      console.log(`📚 Found ${bookCount} existing books.`);
      const answer = await askQuestion('Do you want to clear existing data and re-seed? (y/N): ');
      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        console.log('⏭️  Skipping seeding');
        return;
      }
      
      // Clear existing data
      console.log('🗑️  Clearing existing data...');
      await clearExistingData(client);
    }

    // Seed categories
    console.log('📚 Seeding categories...');
    const categories = await seedCategories(client, csvData);
    
    // Seed authors
    console.log('✍️  Seeding authors...');
    const authors = await seedAuthors(client, csvData);
    
    // Seed books
    console.log('📖 Seeding books...');
    await seedBooks(client, csvData, categories, authors);

    console.log('✅ Books data seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding books data:', error);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

/**
 * Clear existing data
 */
async function clearExistingData(client) {
  try {
    // Delete in correct order to avoid foreign key constraints
    await client.query('DELETE FROM books_categories_lnk');
    await client.query('DELETE FROM books_authors_lnk');
    await client.query('DELETE FROM books');
    await client.query('DELETE FROM categories');
    await client.query('DELETE FROM authors');
    console.log('✅ Existing data cleared');
  } catch (error) {
    console.log('⚠️  Warning: Could not clear some existing data:', error.message);
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
        console.log(`📊 Loaded ${results.length} records from CSV`);
        resolve(results);
      })
      .on('error', reject);
  });
}

/**
 * Seed categories from CSV data
 */
async function seedCategories(client, csvData) {
  const uniqueCategories = [...new Set(csvData.map(row => row.category).filter(Boolean))];
  const categoryMap = {};

  for (const categoryName of uniqueCategories) {
    try {
      // Map category names to more appropriate values
      const mappedName = mapCategoryName(categoryName);
      
      const result = await client.query(`
        INSERT INTO categories (name, description, created_at, updated_at, published_at, document_id)
        VALUES ($1, $2, NOW(), NOW(), NOW(), $3)
        RETURNING id
      `, [mappedName, `Category for ${mappedName} books`, generateDocumentId()]);

      categoryMap[categoryName] = result.rows[0].id;
    } catch (error) {
      console.error(`❌ Error creating category "${categoryName}":`, error.message);
    }
  }

  console.log(`📚 Created ${Object.keys(categoryMap).length} categories`);
  return categoryMap;
}

/**
 * Seed authors from CSV data
 */
async function seedAuthors(client, csvData) {
  const uniqueAuthors = [...new Set(csvData.map(row => row.authors).filter(Boolean))];
  const authorMap = {};

  for (const authorName of uniqueAuthors) {
    if (authorName === 'Unknown' || !authorName.trim()) continue;

    try {
      // Generate some sample data for authors
      const tags = Math.random() > 0.9 ? ['featured'] : Math.random() > 0.95 ? ['staff-pick'] : [];
      
      const result = await client.query(`
        INSERT INTO authors (name, description, email, tags, created_at, updated_at, published_at, document_id)
        VALUES ($1, $2, $3, $4, NOW(), NOW(), NOW(), $5)
        RETURNING id
      `, [
        authorName.trim(),
        `Biography of ${authorName.trim()}`,
        generateAuthorEmail(authorName),
        JSON.stringify(tags),
        generateDocumentId()
      ]);

      authorMap[authorName] = result.rows[0].id;
    } catch (error) {
      console.error(`❌ Error creating author "${authorName}":`, error.message);
    }
  }

  console.log(`✍️  Created ${Object.keys(authorMap).length} authors`);
  return authorMap;
}

/**
 * Seed books from CSV data
 */
async function seedBooks(client, csvData, categories, authors) {
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
      
      // Create book
      const bookResult = await client.query(`
        INSERT INTO books (name, description, list_price, sale_price, rating, thumbnail_url, tags, created_at, updated_at, published_at, document_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), NOW(), $8)
        RETURNING id
      `, [
        row.title.trim(),
        generateBookDescription(row),
        originalPrice,
        currentPrice,
        parseFloat(row.avg_rating) || 0,
        row.cover_link || null,
        JSON.stringify(tags),
        generateDocumentId()
      ]);

      const bookId = bookResult.rows[0].id;

      // Link book to category
      if (row.category && categories[row.category]) {
        await client.query(`
          INSERT INTO books_categories_lnk (book_id, category_id, category_ord)
          VALUES ($1, $2, 1)
        `, [bookId, categories[row.category]]);
      }

      // Link book to author
      if (row.authors && authors[row.authors]) {
        await client.query(`
          INSERT INTO books_authors_lnk (book_id, author_id, author_ord)
          VALUES ($1, $2, 1)
        `, [bookId, authors[row.authors]]);
      }

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

/**
 * Generate Strapi v5 compatible documentId (24 characters)
 */
function generateDocumentId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Ask user for input
 */
function askQuestion(question) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Run the script
if (require.main === module) {
  main().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = { main };
