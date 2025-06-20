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
    {
      method: 'GET',
      path: '/user-management/me',
      handler: 'user-management.getMyProfile',
      config: {
        policies: [],
        middlewares: [],
        // auth: true is default - requires authentication
      },
    },
    {
      method: 'POST',
      path: '/user-management',
      handler: 'user-management.create',
      config: {
        policies: [],
        middlewares: [],
        // auth: true is default - requires authentication
      },
    },
    {
      method: 'PUT',
      path: '/user-management/:id',
      handler: 'user-management.update',
      config: {
        policies: [],
        middlewares: [],
        // auth: true is default - requires authentication
      },
    },
    {
      method: 'DELETE',
      path: '/user-management/:id',
      handler: 'user-management.delete',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
