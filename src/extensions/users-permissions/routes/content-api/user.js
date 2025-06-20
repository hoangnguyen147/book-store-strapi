'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/users',
      handler: 'user.create',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/users/:id',
      handler: 'user.update',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'DELETE',
      path: '/users/delete/:id',
      handler: 'user.delete',
      config: {
        policies: [],
        middlewares: [],
      },
    },
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
