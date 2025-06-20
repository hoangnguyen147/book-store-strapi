module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/simple-auth/login',
      handler: 'simple-auth.login',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/simple-auth/me',
      handler: 'simple-auth.me',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
