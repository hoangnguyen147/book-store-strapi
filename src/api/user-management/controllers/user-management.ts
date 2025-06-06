/**
 * user-management controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::user-management.user-management', ({ strapi }) => ({
  async find(ctx) {
    try {
      // Parse pagination parameters
      const page = parseInt(ctx.query.page as string) || 1;
      const pageSize = Math.min(parseInt(ctx.query.pageSize as string) || 25, 100); // Max 100 per page
      const start = (page - 1) * pageSize;

      // Parse filters
      const where: any = {};
      if (ctx.query.search) {
        where.$or = [
          { username: { $containsi: ctx.query.search } },
          { email: { $containsi: ctx.query.search } }
        ];
      }
      if (ctx.query.confirmed !== undefined) {
        where.confirmed = ctx.query.confirmed === 'true';
      }
      if (ctx.query.blocked !== undefined) {
        where.blocked = ctx.query.blocked === 'true';
      }

      // Get total count for pagination
      const total = await strapi.db.query('plugin::users-permissions.user').count({
        where
      });

      // Get users with pagination
      const users = await strapi.db.query('plugin::users-permissions.user').findMany({
        where,
        populate: ['role'],
        limit: pageSize,
        offset: start,
        orderBy: { createdAt: 'desc' }
      });

      // Sanitize user data (remove sensitive fields)
      const sanitizedUsers = users.map(user => {
        const { password, resetPasswordToken, confirmationToken, ...sanitizedUser } = user;
        return sanitizedUser;
      });

      // Calculate pagination metadata
      const pageCount = Math.ceil(total / pageSize);

      return ctx.send({
        data: sanitizedUsers,
        meta: {
          pagination: {
            page,
            pageSize,
            pageCount,
            total
          }
        }
      });
    } catch (error) {
      console.error('Error in user management find:', error);
      return ctx.badRequest('Error fetching users', { error: error.message });
    }
  },
}));
