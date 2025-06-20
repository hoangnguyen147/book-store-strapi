'use strict';

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/*{ strapi }*/) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap({ strapi }) {
    console.log('🚀 Bootstrap function called');

    // Add debug logging to see what's available
    console.log('🔍 Available plugins:', Object.keys(strapi.plugins || {}));
    console.log('🔍 Users-permissions plugin:', !!strapi.plugins['users-permissions']);
    console.log('🔍 Auth controller:', !!strapi.plugins['users-permissions']?.controllers?.auth);

    // Override the default auth controller to include role information
    const originalCallback = strapi.plugins['users-permissions'].controllers.auth.callback;

    strapi.plugins['users-permissions'].controllers.auth.callback = async function(ctx) {
      console.log('🔧 Custom auth callback intercepted!');
      
      // Call the original callback
      await originalCallback.call(this, ctx);
      
      // If this is a successful login response, add role information
      if (ctx.response.status === 200 && 
          ctx.response.body && 
          ctx.response.body.user && 
          ctx.response.body.jwt) {
        
        console.log('✅ Login successful, adding role information...');
        
        try {
          // Get user with role information
          const userId = ctx.response.body.user.id;
          const userWithRole = await strapi.entityService.findOne('plugin::users-permissions.user', userId, {
            populate: ['role']
          });

          if (userWithRole && userWithRole.role) {
            // Add role to the response
            ctx.response.body.user.role = userWithRole.role;
            console.log('✅ Role added to login response:', userWithRole.role.name);
          } else {
            console.log('⚠️ No role found for user');
          }
        } catch (error) {
          console.error('❌ Error adding role to login response:', error);
        }
      }
    };

    // Override the users/me endpoint to include role information
    const originalMe = strapi.plugins['users-permissions'].controllers.user.me;
    
    strapi.plugins['users-permissions'].controllers.user.me = async function(ctx) {
      console.log('🔧 Custom users/me callback intercepted!');
      
      // Call the original me function
      await originalMe.call(this, ctx);
      
      // If this is a successful response, add role information
      if (ctx.response.status === 200 && ctx.response.body) {
        console.log('✅ Users/me successful, adding role information...');
        
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
          } else {
            console.log('⚠️ No role found for user');
          }
        } catch (error) {
          console.error('❌ Error adding role to users/me response:', error);
        }
      }
    };

    console.log('✅ Auth controllers successfully overridden with role support!');
  },
};
