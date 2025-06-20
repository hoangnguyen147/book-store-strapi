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
    {
      method: 'GET',
      path: '/user-management/profile/:documentId',
      handler: 'user-management.getUserProfile',
      config: {
        policies: [],
        middlewares: [],
        auth: false, // Allow access without authentication for testing
      },
    },
  ],
};
