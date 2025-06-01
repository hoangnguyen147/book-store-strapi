/**
 * author custom router
 */

export default {
  routes: [
    // Custom routes
    {
      method: 'GET',
      path: '/authors/featured',
      handler: 'author.getFeaturedAuthors',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
