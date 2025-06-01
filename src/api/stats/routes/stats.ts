/**
 * stats router
 */

export default {
  routes: [
    // General system stats (public access)
    {
      method: 'GET',
      path: '/stats',
      handler: 'stats.getStats',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    // User-specific stats (admin or own stats)
    {
      method: 'GET',
      path: '/stats/users/:id',
      handler: 'stats.getUserStats',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    // Current user stats (authenticated user)
    {
      method: 'GET',
      path: '/stats/me',
      handler: 'stats.getMyStats',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
