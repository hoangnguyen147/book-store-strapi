'use strict';

const { sanitize } = require('@strapi/utils');
const { getService } = require('@strapi/plugin-users-permissions/server/utils');

module.exports = {
  /**
   * Update user profile
   */
  async updateProfile(ctx) {
    const { id } = ctx.params;
    const { body } = ctx.request;

    // Check if user exists
    const user = await strapi.entityService.findOne('plugin::users-permissions.user', id);
    
    if (!user) {
      return ctx.notFound('User not found');
    }

    // Check if the user is updating their own profile or is admin
    if (ctx.state.user.id !== parseInt(id) && ctx.state.user.role.type !== 'admin') {
      return ctx.forbidden('You can only update your own profile');
    }

    // Only allow updating specific fields
    const allowedFields = ['city', 'date_of_birth', 'gender', 'country', 'address', 'birthday', 'phone', 'facebook', 'twitter'];
    const updateData = {};
    
    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    try {
      const updatedUser = await strapi.entityService.update('plugin::users-permissions.user', id, {
        data: updateData
      });

      // Remove sensitive data
      const sanitizedUser = sanitize.contentAPI.output(updatedUser, strapi.getModel('plugin::users-permissions.user'));
      
      return ctx.send({
        data: sanitizedUser,
        message: 'Profile updated successfully'
      });
    } catch (error) {
      return ctx.badRequest('Error updating profile', { error: error.message });
    }
  },

  /**
   * Get user with all fields
   */
  async me(ctx) {
    const user = ctx.state.user;

    if (!user) {
      return ctx.badRequest('No authorization header was found');
    }

    try {
      const userData = await strapi.entityService.findOne('plugin::users-permissions.user', user.id, {
        populate: ['role']
      });

      // Ensure all new fields are included, set to null if not present
      const userWithAllFields = {
        ...userData,
        birthday: userData.birthday || null,
        address: userData.address || '',
        phone: userData.phone || '',
        facebook: userData.facebook || '',
        twitter: userData.twitter || '',
        city: userData.city || '',
        date_of_birth: userData.date_of_birth || null,
        gender: userData.gender || null,
        country: userData.country || ''
      };

      const sanitizedUser = sanitize.contentAPI.output(userWithAllFields, strapi.getModel('plugin::users-permissions.user'));
      
      return ctx.send(sanitizedUser);
    } catch (error) {
      return ctx.badRequest('Error fetching user data', { error: error.message });
    }
  }
};
