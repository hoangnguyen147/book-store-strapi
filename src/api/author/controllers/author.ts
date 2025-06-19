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
      // First, get the current author to find their numeric ID
      let currentAuthor;
      try {
        // Check if id is numeric (old format) or documentId (new format)
        if (isNaN(parseInt(id))) {
          // It's a documentId
          currentAuthor = await strapi.db.query('api::author.author').findOne({
            where: { documentId: id }
          });
        } else {
          // It's a numeric ID
          currentAuthor = await strapi.db.query('api::author.author').findOne({
            where: { id: parseInt(id) }
          });
        }

        if (!currentAuthor) {
          return ctx.notFound('Author not found');
        }

        // Check if email already exists for other authors using numeric ID
        const existingAuthor = await strapi.db.query('api::author.author').findOne({
          where: {
            email: data.email,
            id: { $ne: currentAuthor.id }  // Use numeric ID here
          }
        });

        if (existingAuthor) {
          return ctx.badRequest('Email already exists', {
            error: 'Another author with this email already exists'
          });
        }
      } catch (error) {
        console.error('Error checking email uniqueness:', error);
        return ctx.badRequest('Error validating email', { error: error.message });
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
      // First check if author exists and handle both numeric ID and documentId
      let author;
      let whereClause;

      if (isNaN(parseInt(id))) {
        // It's a documentId
        whereClause = { documentId: id };
      } else {
        // It's a numeric ID
        whereClause = { id: parseInt(id) };
      }

      author = await strapi.db.query('api::author.author').findOne({
        where: whereClause
      });

      if (!author) {
        return ctx.notFound('Author not found');
      }

      // Delete the author using the same where clause
      const entity = await strapi.db.query('api::author.author').delete({
        where: whereClause
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
