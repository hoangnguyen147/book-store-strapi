/**
 *  author controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::author.author', ({ strapi }) => ({
  // Override create to check for duplicate email
  async create(ctx) {
    const { data } = ctx.request.body;

    if (data.email) {
      // Check if email already exists
      const existingAuthor = await strapi.db.query('api::author.author').findOne({
        where: { email: data.email }
      });

      if (existingAuthor) {
        return ctx.badRequest('Email already exists', {
          error: 'An author with this email already exists'
        });
      }
    }

    // Call the default create method
    return super.create(ctx);
  },

  // Override update to check for duplicate email
  async update(ctx) {
    const { id } = ctx.params;
    const { data } = ctx.request.body;

    if (data.email) {
      // Check if email already exists for other authors
      const existingAuthor = await strapi.db.query('api::author.author').findOne({
        where: {
          email: data.email,
          id: { $ne: id }
        }
      });

      if (existingAuthor) {
        return ctx.badRequest('Email already exists', {
          error: 'Another author with this email already exists'
        });
      }
    }

    // Call the default update method
    return super.update(ctx);
  },

  // Get featured authors
  async getFeaturedAuthors(ctx) {
    try {
      const limit = parseInt(ctx.query.limit as string) || 10;

      // Use raw query to filter by JSON field
      const knex = strapi.db.connection;
      const featuredAuthors = await knex('authors')
        .whereRaw("JSON_CONTAINS(tags, '\"featured\"')")
        .limit(limit);

      // Get full author data with populate
      const authorIds = featuredAuthors.map((author: any) => author.id);

      if (authorIds.length === 0) {
        return ctx.send({ data: [], meta: { pagination: { total: 0 } } });
      }

      const fullAuthors = await strapi.db.query('api::author.author').findMany({
        where: {
          id: { $in: authorIds }
        },
        populate: ['avatar', 'books.thumbnail']
      });

      const sanitizedEntities = await this.sanitizeOutput(fullAuthors, ctx);
      return this.transformResponse(sanitizedEntities);
    } catch (error) {
      return ctx.badRequest('Error fetching featured authors', { error: error.message });
    }
  },

  // Override delete to return success message
  async delete(ctx) {
    const { id } = ctx.params;

    try {
      // First check if author exists
      const author = await strapi.db.query('api::author.author').findOne({
        where: { id }
      });

      if (!author) {
        return ctx.notFound('Author not found');
      }

      // Delete the author
      const entity = await strapi.db.query('api::author.author').delete({
        where: { id }
      });

      return ctx.send({
        data: author,
        message: 'Author deleted successfully'
      });
    } catch (error) {
      return ctx.badRequest('Error deleting author', { error: error.message });
    }
  }
}));
