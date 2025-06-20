module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/auth-with-role/login',
      handler: 'auth-with-role.login',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/auth-with-role/me',
      handler: 'auth-with-role.me',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
