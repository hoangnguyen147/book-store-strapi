/**
 * Middleware to automatically assign default role when creating users
 * This middleware runs before validation and assigns a default role if none is provided
 */

export default (config, { strapi }) => {
  return async (ctx, next) => {
    // Only apply to POST /api/users requests
    if (ctx.method === 'POST' && ctx.path === '/api/users') {
      // If no role is provided in the request body, assign the default 'authenticated' role
      if (ctx.request.body && !ctx.request.body.role) {
        try {
          const defaultRole = await strapi
            .query('plugin::users-permissions.role')
            .findOne({ where: { type: 'authenticated' } });

          if (defaultRole) {
            ctx.request.body.role = defaultRole.id;
          }
        } catch (error) {
          // Log error but don't fail the request
          console.error('Error finding default role:', error);
        }
      }
    }

    // Continue with the request
    await next();
  };
};
