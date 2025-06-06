'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/users-list',
      handler: 'user.find',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/users/:id/profile',
      handler: 'user.updateProfile',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/users/me',
      handler: 'user.me',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
