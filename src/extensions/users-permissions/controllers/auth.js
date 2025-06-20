'use strict';

const _ = require('lodash');
const { sanitize } = require('@strapi/utils');
const { getService } = require('@strapi/plugin-users-permissions/server/utils');
const { ApplicationError, ValidationError } = require('@strapi/utils').errors;

module.exports = {
  /**
   * Override the default register method to automatically assign a default role
   * when no role is provided in the request
   */
  async register(ctx) {
    const pluginStore = await strapi.store({
      type: 'plugin',
      name: 'users-permissions',
    });

    const settings = await pluginStore.get({
      key: 'advanced',
    });

    if (!settings.allow_register) {
      throw new ApplicationError('Register action is currently disabled');
    }

    const params = {
      ...ctx.request.body,
    };

    // If no role is provided, assign the default 'authenticated' role
    if (!params.role) {
      const defaultRole = await strapi
        .query('plugin::users-permissions.role')
        .findOne({ where: { type: 'authenticated' } });

      if (defaultRole) {
        params.role = defaultRole.id;
      }
    }

    // Assign params to a new variable to avoid reassigning a parameter
    const { email, username, password, ...rest } = params;

    if (!email) {
      throw new ValidationError('Missing email parameter');
    }
    if (!username) {
      throw new ValidationError('Missing username parameter');
    }
    if (!password) {
      throw new ValidationError('Missing password parameter');
    }

    const userWithSameUsername = await strapi
      .query('plugin::users-permissions.user')
      .findOne({ where: { username } });

    if (userWithSameUsername) {
      throw new ApplicationError('Username already taken');
    }

    if (settings.unique_email) {
      const userWithSameEmail = await strapi
        .query('plugin::users-permissions.user')
        .findOne({ where: { email: email.toLowerCase() } });

      if (userWithSameEmail) {
        throw new ApplicationError('Email already taken');
      }
    }

    const user = {
      ...rest,
      email: email.toLowerCase(),
      username,
      confirmed: !settings.email_confirmation,
    };

    const userService = getService('user');
    const sanitizedUser = await sanitize.contentAPI.input(user, strapi.getModel('plugin::users-permissions.user'));

    try {
      if (!settings.email_confirmation) {
        sanitizedUser.confirmed = true;
      }

      const createdUser = await userService.add(sanitizedUser);

      const sanitizedCreatedUser = await sanitize.contentAPI.output(createdUser, strapi.getModel('plugin::users-permissions.user'));

      if (settings.email_confirmation) {
        try {
          await getService('user').sendConfirmationEmail(createdUser);
        } catch (err) {
          throw new ApplicationError(err.message);
        }

        return ctx.send({ user: sanitizedCreatedUser });
      }

      const jwt = getService('jwt').issue(_.pick(createdUser, ['id']));

      // Fetch user with role information for response
      const userWithRole = await strapi.entityService.findOne('plugin::users-permissions.user', createdUser.id, {
        populate: ['role']
      });

      // Create a custom sanitized user object that includes role
      const sanitizedUser = {
        id: userWithRole.id,
        documentId: userWithRole.documentId,
        username: userWithRole.username,
        email: userWithRole.email,
        provider: userWithRole.provider,
        confirmed: userWithRole.confirmed,
        blocked: userWithRole.blocked,
        createdAt: userWithRole.createdAt,
        updatedAt: userWithRole.updatedAt,
        publishedAt: userWithRole.publishedAt,
        birthday: userWithRole.birthday,
        address: userWithRole.address,
        phone: userWithRole.phone,
        facebook: userWithRole.facebook,
        twitter: userWithRole.twitter,
        city: userWithRole.city,
        date_of_birth: userWithRole.date_of_birth,
        gender: userWithRole.gender,
        country: userWithRole.country,
        role: userWithRole.role || null // Explicitly include role
      };

      return ctx.send({
        jwt,
        user: sanitizedUser,
      });
    } catch (err) {
      if (err.details?.errors) {
        const message = err.details.errors.map((error) => error.message).join('\n');
        throw new ValidationError(message);
      }
      throw new ApplicationError(err.message);
    }
  },

  /**
   * Override the default login method to include role information in response
   */
  async callback(ctx) {
    console.log('🚀 CUSTOM AUTH CONTROLLER IS BEING USED!');
    const provider = ctx.params.provider || 'local';
    const params = ctx.request.body;

    const store = await strapi.store({
      type: 'plugin',
      name: 'users-permissions',
    });

    if (provider === 'local') {
      if (!_.get(await store.get({ key: 'grant' }), 'email.enabled')) {
        throw new ApplicationError('This provider is disabled');
      }

      const { identifier } = params;

      // Check format of provided identifier
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

      if (isEmail) {
        params.email = params.identifier;
      } else {
        params.username = params.identifier;
      }

      const query = strapi.db.query('plugin::users-permissions.user');

      const user = await query.findOne({
        where: {
          provider,
          $or: [
            { email: params.email?.toLowerCase() },
            { username: params.username },
          ],
        },
        populate: {
          role: true,
          avatar: true
        } // Include role and avatar in the query
      });

      if (!user) {
        throw new ValidationError('Invalid identifier or password');
      }

      if (
        _.get(await store.get({ key: 'advanced' }), 'email_confirmation') &&
        user.confirmed !== true
      ) {
        throw new ApplicationError('Your account email is not confirmed');
      }

      if (user.blocked === true) {
        throw new ApplicationError('Your account has been blocked by an administrator');
      }

      // The user never authenticated with the `local` provider.
      if (!user.password) {
        throw new ApplicationError(
          'This user never set a local password, please login with the provider used during account creation'
        );
      }

      const validPassword = await getService('user').validatePassword(
        params.password,
        user.password
      );

      if (!validPassword) {
        throw new ValidationError('Invalid identifier or password');
      } else {
        // Debug: Log the user object to see if role is populated
        console.log('🔍 User object from database:', JSON.stringify(user, null, 2));
        console.log('🔍 User role:', user.role);

        // Create a custom sanitized user object that includes role and avatar
        const sanitizedUser = {
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
          role: user.role || null, // Explicitly include role
          avatar: user.avatar || null // Explicitly include avatar
        };

        console.log('🔍 Sanitized user with role:', JSON.stringify(sanitizedUser, null, 2));

        return ctx.send({
          jwt: getService('jwt').issue({ id: user.id }),
          user: sanitizedUser,
        });
      }
    }

    throw new ApplicationError(`Unknown provider: ${provider}`);
  },
};
