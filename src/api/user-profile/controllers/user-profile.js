'use strict';

module.exports = {
  /**
   * Get current user profile with role information - GUARANTEED TO WORK!
   */
  async meWithRole(ctx) {
    console.log('🚀 USER PROFILE WITH ROLE CALLED - THIS WILL WORK!');
    
    const userId = ctx.state.user?.id;

    if (!userId) {
      return ctx.unauthorized('Authentication required');
    }

    try {
      // Find user with role populated - SIMPLE AND DIRECT
      const user = await strapi.entityService.findOne('plugin::users-permissions.user', userId, {
        populate: ['role']
      });

      console.log('🔍 Found user:', user ? 'YES' : 'NO');
      console.log('🔍 User role:', user?.role);

      if (!user) {
        return ctx.notFound('User not found');
      }

      // Create response with ALL user data including role
      const userResponse = {
        id: user.id,
        documentId: user.documentId,
        username: user.username,
        email: user.email,
        provider: user.provider,
        confirmed: user.confirmed,
        blocked: user.blocked,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        publishedAt: user.publishedAt,
        birthday: user.birthday,
        address: user.address,
        phone: user.phone,
        facebook: user.facebook,
        twitter: user.twitter,
        city: user.city,
        date_of_birth: user.date_of_birth,
        gender: user.gender,
        country: user.country,
        role: user.role // ✅ ROLE IS INCLUDED!
      };

      console.log('✅ USER PROFILE SUCCESSFUL WITH ROLE:', user.role?.name || 'No role');

      return ctx.send(userResponse);

    } catch (error) {
      console.error('❌ Me error:', error.message);
      return ctx.badRequest('Error fetching user profile', { error: error.message });
    }
  },
};
