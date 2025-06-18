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

      return ctx.send({
        jwt,
        user: sanitizedCreatedUser,
      });
    } catch (err) {
      if (err.details?.errors) {
        const message = err.details.errors.map((error) => error.message).join('\n');
        throw new ValidationError(message);
      }
      throw new ApplicationError(err.message);
    }
  },
};
