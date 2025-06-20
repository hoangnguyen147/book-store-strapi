'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/auth/local/register',
      handler: 'auth.register',
      config: {
        middlewares: ['plugin::users-permissions.rateLimit'],
        prefix: '',
      },
    },
  ],
};
