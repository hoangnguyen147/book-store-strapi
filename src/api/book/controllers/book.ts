/**
 * book controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::book.book', ({ strapi }) => ({
  // Override findOne to fix get book by ID
  async findOne(ctx) {
    const { id } = ctx.params;

    try {
      const entity = await strapi.entityService.findOne('api::book.book', id, {
        populate: ['thumbnail', 'albums', 'categories', 'authors.avatar']
      });

      if (!entity) {
        return ctx.notFound('Book not found');
      }

      const sanitizedEntity = await this.sanitizeOutput(entity, ctx);
      return this.transformResponse(sanitizedEntity);
    } catch (error) {
      return ctx.badRequest('Error fetching book', { error: error.message });
    }
  },

  // Get similar books (same categories)
  async getSimilarBooks(ctx) {
    const { id } = ctx.params;

    try {
      // Find current book by documentId or numeric ID
      let currentBook;
      let whereClause;

      if (isNaN(parseInt(id))) {
        // It's a documentId
        whereClause = { documentId: id };
      } else {
        // It's a numeric ID
        whereClause = { id: parseInt(id) };
      }

      currentBook = await strapi.db.query('api::book.book').findOne({
        where: whereClause,
        populate: ['categories']
      });

      if (!currentBook) {
        return ctx.notFound('Book not found');
      }

      const categories = currentBook.categories || [];
      const categoryIds = categories.map((cat: any) => cat.id);

      if (categoryIds.length === 0) {
        return ctx.send({ data: [], meta: { pagination: { total: 0 } } });
      }

      // Find books with same categories, excluding current book using numeric ID
      const similarBooks = await strapi.db.query('api::book.book').findMany({
        where: {
          id: { $ne: currentBook.id },  // Use numeric ID here
          categories: { id: { $in: categoryIds } }
        },
        populate: ['thumbnail', 'categories', 'authors'],
        limit: 10
      });

      const sanitizedEntities = await this.sanitizeOutput(similarBooks, ctx);
      return this.transformResponse(sanitizedEntities);
    } catch (error) {
      return ctx.badRequest('Error fetching similar books', { error: error.message });
    }
  },

  // Get trendy books (high rating)
  async getTrendyBooks(ctx) {
    try {
      const limit = parseInt(ctx.query.limit as string) || 10;
      const trendyBooks = await strapi.db.query('api::book.book').findMany({
        where: {
          rating: { $gte: 4.0 }
        },
        orderBy: { rating: 'desc' },
        populate: ['thumbnail', 'categories', 'authors'],
        limit
      });

      const sanitizedEntities = await this.sanitizeOutput(trendyBooks, ctx);
      return this.transformResponse(sanitizedEntities);
    } catch (error) {
      return ctx.badRequest('Error fetching trendy books', { error: error.message });
    }
  },

  // Get featured books (with featured tag)
  async getFeaturedBooks(ctx) {
    try {
      const limit = parseInt(ctx.query.limit as string) || 20;
      const tag = ctx.query.tag || 'featured';

      // Use PostgreSQL JSON operator for filtering
      const knex = strapi.db.connection;
      const featuredBooks = await knex('books')
        .whereRaw("tags @> ?", [JSON.stringify([tag])])
        .andWhere('published_at', 'is not', null)
        .limit(limit);

      // Get full book data with populate
      const bookIds = featuredBooks.map((book: any) => book.id);

      if (bookIds.length === 0) {
        return ctx.send({ data: [], meta: { pagination: { total: 0 } } });
      }

      const fullBooks = await strapi.db.query('api::book.book').findMany({
        where: {
          id: { $in: bookIds }
        },
        populate: ['thumbnail', 'categories', 'authors']
      });

      const sanitizedEntities = await this.sanitizeOutput(fullBooks, ctx);
      return this.transformResponse(sanitizedEntities);
    } catch (error) {
      return ctx.badRequest('Error fetching featured books', { error: error.message });
    }
  },

  // Search books by category
  async searchByCategory(ctx) {
    const { category } = ctx.query;

    try {
      let where = {};

      if (category && category !== 'all') {
        where = {
          categories: {
            name: { $contains: category }
          }
        };
      }

      const books = await strapi.db.query('api::book.book').findMany({
        where,
        populate: ['thumbnail', 'categories', 'authors'],
        limit: parseInt(ctx.query.limit as string) || 25,
        offset: parseInt(ctx.query.start as string) || 0
      });

      const sanitizedEntities = await this.sanitizeOutput(books, ctx);
      return this.transformResponse(sanitizedEntities);
    } catch (error) {
      return ctx.badRequest('Error searching books', { error: error.message });
    }
  },

  // Search books by name
  async searchBooks(ctx) {
    const { search } = ctx.query;

    try {
      let where = {};

      if (search) {
        where = {
          $or: [
            { name: { $contains: search } },
            { description: { $contains: search } },
            { authors: { name: { $contains: search } } }
          ]
        };
      }

      const books = await strapi.db.query('api::book.book').findMany({
        where,
        populate: ['thumbnail', 'categories', 'authors'],
        limit: parseInt(ctx.query.limit as string) || 25,
        offset: parseInt(ctx.query.start as string) || 0
      });

      const sanitizedEntities = await this.sanitizeOutput(books, ctx);
      return this.transformResponse(sanitizedEntities);
    } catch (error) {
      return ctx.badRequest('Error searching books', { error: error.message });
    }
  }
}));
