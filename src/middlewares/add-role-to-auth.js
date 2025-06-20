'use strict';

/**
 * Middleware to add role information to authentication responses
 */
module.exports = () => {
  return async (ctx, next) => {
    await next();

    // Check if this is an auth/local login response
    if (ctx.request.method === 'POST' && 
        ctx.request.url === '/api/auth/local' && 
        ctx.response.status === 200 && 
        ctx.response.body && 
        ctx.response.body.user) {
      
      console.log('🔧 Adding role to auth/local response');
      
      try {
        // Get user with role information
        const userId = ctx.response.body.user.id;
        const userWithRole = await strapi.entityService.findOne('plugin::users-permissions.user', userId, {
          populate: ['role']
        });

        if (userWithRole && userWithRole.role) {
          // Add role to the response
          ctx.response.body.user.role = userWithRole.role;
          console.log('✅ Role added to auth/local response:', userWithRole.role.name);
        }
      } catch (error) {
        console.error('❌ Error adding role to auth response:', error);
      }
    }

    // Check if this is a users/me response
    if (ctx.request.method === 'GET' && 
        ctx.request.url === '/api/users/me' && 
        ctx.response.status === 200 && 
        ctx.response.body) {
      
      console.log('🔧 Adding role to users/me response');
      
      try {
        // Get user with role information
        const userId = ctx.response.body.id;
        const userWithRole = await strapi.entityService.findOne('plugin::users-permissions.user', userId, {
          populate: ['role']
        });

        if (userWithRole && userWithRole.role) {
          // Add role to the response
          ctx.response.body.role = userWithRole.role;
          console.log('✅ Role added to users/me response:', userWithRole.role.name);
        }
      } catch (error) {
        console.error('❌ Error adding role to users/me response:', error);
      }
    }
  };
};
