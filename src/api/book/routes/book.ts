/**
 * book router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::book.book', {
  config: {
    find: {
      middlewares: [],
    },
    findOne: {
      middlewares: [],
    },
    create: {
      middlewares: [],
    },
    update: {
      middlewares: [],
    },
    delete: {
      middlewares: [],
    },
  },
});
