'use strict';

const { sanitize } = require('@strapi/utils');
const { getService } = require('@strapi/plugin-users-permissions/server/utils');

module.exports = {
  /**
   * Delete a user
   */
  async delete(ctx) {
    const { id } = ctx.params;
    console.log('🗑️ Delete user called with ID:', id);

    try {
      // Find user by documentId or numeric ID
      let user;

      // Try to find by documentId first (Strapi v5 format)
      if (isNaN(id)) {
        console.log('🔍 Finding user by documentId:', id);
        user = await strapi.db.query('plugin::users-permissions.user').findOne({
          where: { documentId: id },
          populate: ['role']
        });
      } else {
        console.log('🔍 Finding user by numeric ID:', id);
        user = await strapi.db.query('plugin::users-permissions.user').findOne({
          where: { id: parseInt(id) },
          populate: ['role']
        });
      }

      console.log('👤 Found user:', user ? `${user.username} (ID: ${user.id})` : 'null');

      if (!user) {
        return ctx.notFound('User not found');
      }

      // Check if the user is trying to delete themselves or is admin
      console.log('🔐 Current user ID:', ctx.state.user.id, 'Target user ID:', user.id);
      console.log('🔐 Current user role:', ctx.state.user.role.type);

      if (ctx.state.user.id !== user.id && ctx.state.user.role.type !== 'admin') {
        return ctx.forbidden('You can only delete your own account or you must be an admin');
      }

      // Prevent admin from deleting themselves (optional safety check)
      if (ctx.state.user.id === user.id && ctx.state.user.role.type === 'admin') {
        return ctx.badRequest('Admin users cannot delete their own account');
      }

      // Delete the user using the correct identifier
      console.log('🗑️ Deleting user...');
      if (isNaN(id)) {
        // Delete by documentId
        await strapi.db.query('plugin::users-permissions.user').delete({
          where: { documentId: id }
        });
      } else {
        // Delete by numeric ID
        await strapi.db.query('plugin::users-permissions.user').delete({
          where: { id: parseInt(id) }
        });
      }

      console.log('✅ User deleted successfully');
      return ctx.send({
        data: {
          id: user.id,
          documentId: user.documentId,
          username: user.username,
          email: user.email
        },
        message: 'User deleted successfully'
      });
    } catch (error) {
      console.error('❌ Error deleting user:', error);
      return ctx.badRequest('Error deleting user', { error: error.message });
    }
  },

  /**
   * Get list of users with pagination
   */
  async find(ctx) {
    try {
      // Parse pagination parameters
      const page = parseInt(ctx.query.page) || 1;
      const pageSize = Math.min(parseInt(ctx.query.pageSize) || 25, 100); // Max 100 per page
      const start = (page - 1) * pageSize;

      // Parse filters
      const where = {};
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
      console.error('Error in user find:', error);
      return ctx.badRequest('Error fetching users', { error: error.message });
    }
  },

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
