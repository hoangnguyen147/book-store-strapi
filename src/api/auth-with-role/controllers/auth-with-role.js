'use strict';

const { ValidationError, ApplicationError } = require('@strapi/utils').errors;
const { getService } = require('@strapi/plugin-users-permissions/server/utils');
const _ = require('lodash');

module.exports = {
  /**
   * Login with role information included in response
   */
  async login(ctx) {
    console.log('🚀 CUSTOM LOGIN WITH ROLE CONTROLLER IS BEING USED!');
    
    const { identifier, password } = ctx.request.body;

    if (!identifier) {
      throw new ValidationError('Identifier is required');
    }

    if (!password) {
      throw new ValidationError('Password is required');
    }

    try {
      // Check format of provided identifier
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

      const query = strapi.db.query('plugin::users-permissions.user');

      // Find user with role populated
      const user = await strapi.entityService.findMany('plugin::users-permissions.user', {
        filters: {
          $or: [
            { email: isEmail ? identifier.toLowerCase() : undefined },
            { username: !isEmail ? identifier : undefined },
          ],
          provider: 'local'
        },
        populate: ['role']
      });

      const foundUser = user && user.length > 0 ? user[0] : null;

      console.log('🔍 Found user:', foundUser ? 'YES' : 'NO');
      console.log('🔍 User role:', foundUser?.role);

      if (!foundUser) {
        throw new ValidationError('Invalid identifier or password');
      }

      if (foundUser.confirmed !== true) {
        throw new ApplicationError('Your account email is not confirmed');
      }

      if (foundUser.blocked === true) {
        throw new ApplicationError('Your account has been blocked by an administrator');
      }

      // Validate password
      const validPassword = await getService('user').validatePassword(
        password,
        foundUser.password
      );

      if (!validPassword) {
        throw new ValidationError('Invalid identifier or password');
      }

      // Create response with role information
      const userResponse = {
        id: foundUser.id,
        documentId: foundUser.documentId,
        username: foundUser.username,
        email: foundUser.email,
        provider: foundUser.provider,
        confirmed: foundUser.confirmed,
        blocked: foundUser.blocked,
        createdAt: foundUser.createdAt,
        updatedAt: foundUser.updatedAt,
        publishedAt: foundUser.publishedAt,
        birthday: foundUser.birthday,
        address: foundUser.address,
        phone: foundUser.phone,
        facebook: foundUser.facebook,
        twitter: foundUser.twitter,
        city: foundUser.city,
        date_of_birth: foundUser.date_of_birth,
        gender: foundUser.gender,
        country: foundUser.country,
        role: foundUser.role || null
      };

      console.log('🔍 Final user response with role:', JSON.stringify(userResponse.role, null, 2));

      return ctx.send({
        jwt: getService('jwt').issue({ id: foundUser.id }),
        user: userResponse,
      });
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
  },

  /**
   * Get current user profile with role information
   */
  async me(ctx) {
    console.log('🚀 CUSTOM ME WITH ROLE CONTROLLER IS BEING USED!');
    
    const userId = ctx.state.user?.id;

    if (!userId) {
      return ctx.unauthorized('Authentication required');
    }

    try {
      // Find user with role populated
      const user = await strapi.entityService.findOne('plugin::users-permissions.user', userId, {
        populate: ['role']
      });

      console.log('🔍 Found user:', user ? 'YES' : 'NO');
      console.log('🔍 User role:', user?.role);

      if (!user) {
        return ctx.notFound('User not found');
      }

      // Create response with role information
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
        role: user.role || null
      };

      console.log('🔍 Final user response with role:', JSON.stringify(userResponse.role, null, 2));

      return ctx.send(userResponse);
    } catch (error) {
      console.error('❌ Me error:', error);
      return ctx.badRequest('Error fetching user profile', { error: error.message });
    }
  },
};
