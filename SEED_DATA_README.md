# 📚 Book Store Data Seeding Guide

This guide explains how to seed your Strapi book store application with data from CSV files.

## 📋 Overview

The seeding system will:
- Read book data from `data/books/prepared_data_book.csv`
- Create categories, authors, and books in your Strapi database
- Set up proper relationships between books, authors, and categories
- Add featured tags to high-rated books
- Include external image URLs in the `thumbnail_url` field

## 🚀 Quick Start

### 1. Prepare Your Data
Make sure your CSV file is located at:
```
data/books/prepared_data_book.csv
```

### 2. Run the Seeding Script
```bash
npm run seed:books
```

## 📊 Data Structure

### CSV Columns Expected:
- `title` - Book title
- `authors` - Author name
- `original_price` - Original price (will be converted to VND)
- `current_price` - Sale price (will be converted to VND)
- `quantity` - Stock quantity
- `category` - Book category
- `n_review` - Number of reviews
- `avg_rating` - Average rating (0-5)
- `pages` - Number of pages
- `manufacturer` - Publisher name
- `cover_link` - External image URL

### Generated Data:
- **Categories**: Mapped from Vietnamese to English names
- **Authors**: Created with bio, email, and optional tags
- **Books**: Complete with descriptions, pricing, and tags

## 🏷️ Tagging System

Books are automatically tagged based on:
- **Featured**: Rating ≥ 4.8 + Reviews > 1000
- **Best-selling**: Quantity > 10,000
- **Staff-pick**: Rating ≥ 4.7 (random selection)

Authors get tags:
- **Featured**: 10% chance for any author
- **Staff-pick**: 5% chance for any author

## 🗂️ Category Mapping

Vietnamese categories are mapped to English:
- `Tiểu Thuyết` → `Fiction`
- `Tác phẩm kinh điển` → `Classics`
- `Truyện trinh thám` → `Mystery`
- `Sách kinh tế học` → `Economics`
- And many more...

## 🖼️ Image Handling

The system supports dual image fields:
- **`thumbnail`**: For manual uploads via Strapi admin panel
- **`thumbnail_url`**: For external image links from CSV data

Both fields can be used simultaneously, giving you flexibility in image management.

## ⚠️ Important Notes

### Data Clearing
The script will **clear existing data** by default:
- All books, authors, and categories will be deleted
- To preserve existing data, comment out the `clearExistingData()` call

### Price Conversion
Prices are converted from USD to VND:
- CSV prices are multiplied by 1000
- Example: 4.56 → 4,560 VND

### Error Handling
- Books with missing titles are skipped
- Authors named "Unknown" are skipped
- Errors are logged but don't stop the process

## 🔧 Customization

### Modify Category Mapping
Edit the `mapCategoryName()` function in `scripts/seed-books.js`:

```javascript
function mapCategoryName(categoryName) {
  const categoryMap = {
    'Your Category': 'Mapped Name',
    // Add more mappings...
  };
  return categoryMap[categoryName] || categoryName;
}
```

### Adjust Tagging Logic
Modify the `generateBookTags()` function:

```javascript
function generateBookTags(row) {
  const tags = [];
  const rating = parseFloat(row.avg_rating) || 0;
  
  // Your custom logic here
  if (rating >= 4.5) {
    tags.push('recommended');
  }
  
  return tags;
}
```

## 📈 Expected Results

After successful seeding:
- **~30 Categories** (mapped from Vietnamese)
- **~500+ Authors** (excluding "Unknown")
- **~1700+ Books** (with complete data)
- **Proper relationships** between all entities
- **Featured content** automatically tagged

## 🐛 Troubleshooting

### CSV File Not Found
```
Error: CSV file not found: /path/to/data/books/prepared_data_book.csv
```
**Solution**: Ensure the CSV file exists in the correct location.

### Database Connection Issues
**Solution**: Make sure Strapi is properly configured and the database is running.

### Memory Issues with Large Files
**Solution**: Process data in smaller batches by modifying the script.

## 🔄 Re-running the Script

To re-seed data:
1. The script will clear existing data automatically
2. Run `npm run seed:books` again
3. All data will be recreated fresh

## 📝 Logs

The script provides detailed logging:
- 📊 CSV loading progress
- 📚 Category creation count
- ✍️ Author creation count  
- 📖 Book creation progress (every 100 books)
- ❌ Error details for failed records

## 🎯 Next Steps

After seeding:
1. Start your Strapi server: `npm run develop`
2. Check the admin panel to verify data
3. Test the new APIs with featured content
4. Upload manual thumbnails if needed
5. Adjust any category or author information

Happy seeding! 🌱
