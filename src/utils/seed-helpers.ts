import type { Core } from '@strapi/strapi';

/**
 * Seed books from CSV data
 */
export async function seedBooks(strapi: Core.Strapi, csvData: any[], categories: Record<string, number>, authors: Record<string, number>) {
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
      const bookData: any = {
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
    } catch (error: any) {
      console.error(`❌ Error creating book "${row.title}":`, error.message);
    }
  }

  console.log(`📖 Created ${booksCreated} books total`);
}

/**
 * Map category names to more appropriate values
 */
export function mapCategoryName(categoryName: string): string {
  const categoryMap: Record<string, string> = {
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
export function generateBookTags(row: any): string[] {
  const tags: string[] = [];
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
export function generateBookDescription(row: any): string {
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
export function generateAuthorEmail(authorName: string): string {
  const cleanName = authorName.toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, '.');
  
  return `${cleanName}@bookstore.com`;
}
