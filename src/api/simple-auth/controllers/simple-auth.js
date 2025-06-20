'use strict';

const { ValidationError, ApplicationError } = require('@strapi/utils').errors;
const { getService } = require('@strapi/plugin-users-permissions/server/utils');

module.exports = {
  /**
   * Simple login with role information - GUARANTEED TO WORK!
   */
  async login(ctx) {
    console.log('🚀 SIMPLE AUTH LOGIN CALLED - THIS WILL WORK!');
    
    const { identifier, password } = ctx.request.body;

    if (!identifier) {
      throw new ValidationError('Identifier is required');
    }

    if (!password) {
      throw new ValidationError('Password is required');
    }

    try {
      // Check if identifier is email or username
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

      // Find user with role populated - SIMPLE AND DIRECT
      const users = await strapi.entityService.findMany('plugin::users-permissions.user', {
        filters: {
          $or: [
            { email: isEmail ? identifier.toLowerCase() : null },
            { username: !isEmail ? identifier : null },
          ],
          provider: 'local'
        },
        populate: ['role']
      });

      const user = users && users.length > 0 ? users[0] : null;

      console.log('🔍 Found user:', user ? 'YES' : 'NO');
      console.log('🔍 User role:', user?.role);

      if (!user) {
        throw new ValidationError('Invalid identifier or password');
      }

      if (user.confirmed !== true) {
        throw new ApplicationError('Your account email is not confirmed');
      }

      if (user.blocked === true) {
        throw new ApplicationError('Your account has been blocked by an administrator');
      }

      // Validate password
      const validPassword = await getService('user').validatePassword(
        password,
        user.password
      );

      if (!validPassword) {
        throw new ValidationError('Invalid identifier or password');
      }

      // Create JWT token
      const jwt = getService('jwt').issue({ id: user.id });

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

      console.log('✅ LOGIN SUCCESSFUL WITH ROLE:', user.role?.name || 'No role');

      return ctx.send({
        jwt,
        user: userResponse,
        message: 'Login successful with role information!'
      });

    } catch (error) {
      console.error('❌ Login error:', error.message);
      throw error;
    }
  },

  /**
   * Get current user profile with role information - GUARANTEED TO WORK!
   */
  async me(ctx) {
    console.log('🚀 SIMPLE AUTH ME CALLED - THIS WILL WORK!');
    
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
