# 📚 Book Store API Documentation

## 🚀 Overview

The Book Store API provides comprehensive endpoints for managing books, authors, categories, user profiles, and orders. Built with Strapi v5 and PostgreSQL.

## 📖 API Documentation

### 🌐 Swagger UI
- **Development**: http://localhost:1337/documentation
- **Production**: https://api.bookstore.com/documentation

### 🔗 Base URLs
- **Development**: http://localhost:1337/api
- **Production**: https://api.bookstore.com/api

## 🔐 Authentication

Most endpoints require authentication using Bearer tokens:

```bash
Authorization: Bearer YOUR_JWT_TOKEN
```

Get your token by logging in:
```bash
POST /auth/local
{
  "identifier": "user@example.com",
  "password": "password"
}
```

## 📚 Core Endpoints

### Books API

#### Standard CRUD
- `GET /books` - List all books
- `GET /books/:id` - Get specific book
- `POST /books` - Create book (admin only)
- `PUT /books/:id` - Update book (admin only)
- `DELETE /books/:id` - Delete book (admin only)

#### Special Endpoints
- `GET /books/similar/:id` - Get similar books
- `GET /books/trendy` - Get trending books (high ratings)
- `GET /books/featured` - Get featured books (staff picks, best sellers)
- `GET /books/search` - Advanced search with filters

### Authors API

#### Standard CRUD
- `GET /authors` - List all authors
- `GET /authors/:id` - Get specific author
- `POST /authors` - Create author (admin only)
- `PUT /authors/:id` - Update author (admin only)
- `DELETE /authors/:id` - Delete author (admin only)

#### Special Endpoints
- `GET /authors/featured` - Get featured authors
- `GET /authors/:id/books` - Get books by author

### Categories API

#### Standard CRUD
- `GET /categories` - List all categories
- `GET /categories/:id` - Get specific category
- `POST /categories` - Create category (admin only)
- `PUT /categories/:id` - Update category (admin only)
- `DELETE /categories/:id` - Delete category (admin only)

#### Special Endpoints
- `GET /categories/:id/books` - Get books in category

### User Profiles API

#### Profile Management
- `GET /user-profiles/me` - Get current user profile
- `PUT /user-profiles/me` - Update current user profile
- `GET /user-profiles/me/orders` - Get user's orders
- `GET /user-profiles/me/stats` - Get user statistics

### Orders API

#### Order Management
- `GET /orders` - List orders (admin only)
- `GET /orders/:id` - Get specific order
- `POST /orders` - Create new order
- `PUT /orders/:id` - Update order status (admin only)
- `DELETE /orders/:id` - Cancel order

## 🔍 Search & Filtering

### Book Search
```bash
GET /books/search?q=harry potter&category=Fiction&minPrice=10000&maxPrice=50000&minRating=4.0
```

### Query Parameters
- `q` - Search query (title, author, description)
- `category` - Filter by category name
- `minPrice` / `maxPrice` - Price range filter (in VND)
- `minRating` - Minimum rating filter
- `limit` - Number of results (default: 25, max: 100)

### Sorting
```bash
GET /books?sort=rating:desc,name:asc
```

Available sort fields:
- `name:asc/desc`
- `rating:desc/asc`
- `list_price:asc/desc`
- `sale_price:asc/desc`
- `createdAt:desc/asc`

## 📊 Data Models

### Book Model
```json
{
  "id": 1,
  "documentId": "abc123def456",
  "name": "Book Title",
  "description": "Book description",
  "list_price": 50000,
  "sale_price": 40000,
  "rating": 4.8,
  "tags": ["featured", "best-selling"],
  "thumbnail_url": "https://example.com/image.jpg",
  "categories": [...],
  "authors": [...],
  "createdAt": "2025-06-01T00:00:00.000Z",
  "updatedAt": "2025-06-01T00:00:00.000Z",
  "publishedAt": "2025-06-01T00:00:00.000Z"
}
```

### Author Model
```json
{
  "id": 1,
  "documentId": "xyz789abc123",
  "name": "Author Name",
  "description": "Author biography",
  "email": "author@example.com",
  "tags": ["featured"],
  "books": [...],
  "createdAt": "2025-06-01T00:00:00.000Z",
  "updatedAt": "2025-06-01T00:00:00.000Z",
  "publishedAt": "2025-06-01T00:00:00.000Z"
}
```

### Category Model
```json
{
  "id": 1,
  "documentId": "cat123def456",
  "name": "Fiction",
  "description": "Fiction books category",
  "books": [...],
  "createdAt": "2025-06-01T00:00:00.000Z",
  "updatedAt": "2025-06-01T00:00:00.000Z",
  "publishedAt": "2025-06-01T00:00:00.000Z"
}
```

## 🏷️ Tags System

### Book Tags
- `featured` - High rating (≥4.8) + many reviews (>1000)
- `best-selling` - High quantity sold (>10,000)
- `staff-pick` - Curated selection by staff

### Author Tags
- `featured` - Featured authors
- `staff-pick` - Staff recommended authors

## 💰 Pricing

All prices are in Vietnamese Dong (VND):
- `list_price` - Original price
- `sale_price` - Current selling price
- Minimum price: 0 VND
- Example: 50000 = 50,000 VND

## 📈 Statistics

### User Stats
- Total orders
- Total books purchased
- Total amount spent
- Favorite categories
- Reading streak

## 🔧 Development

### Local Setup
1. Start Strapi: `yarn dev`
2. Access admin: http://localhost:1337/admin
3. Access API docs: http://localhost:1337/documentation
4. Test APIs: Use Postman or curl

### Database
- **Engine**: PostgreSQL
- **Total Books**: 1,768
- **Total Authors**: 1,080
- **Total Categories**: 30

## 📝 Notes

- All timestamps are in ISO 8601 format
- Pagination uses `page` and `pageSize` parameters
- Default page size: 25, maximum: 100
- All endpoints support population of relations
- Images can be uploaded via admin panel or use external URLs

## 🚀 Production Deployment

Remember to:
1. Set production database credentials
2. Configure CORS for your frontend domain
3. Set up SSL certificates
4. Update server URLs in documentation
5. Configure rate limiting
6. Set up monitoring and logging
