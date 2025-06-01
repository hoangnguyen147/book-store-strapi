/**
 * book custom router
 */

export default {
  routes: [
    // Custom routes
    {
      method: 'GET',
      path: '/books/trendy',
      handler: 'book.getTrendyBooks',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/books/featured',
      handler: 'book.getFeaturedBooks',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/books/search/category',
      handler: 'book.searchByCategory',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/books/search',
      handler: 'book.searchBooks',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/books/:id/similar',
      handler: 'book.getSimilarBooks',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
