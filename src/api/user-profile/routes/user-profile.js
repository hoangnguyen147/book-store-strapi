module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/user-profile/me-with-role',
      handler: 'user-profile.meWithRole',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
