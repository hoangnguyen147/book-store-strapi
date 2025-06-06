export default {
  routes: [
    {
      method: 'GET',
      path: '/user-management',
      handler: 'user-management.find',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
