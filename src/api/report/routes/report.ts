/**
 * Report router
 */

export default {
  routes: [
    {
      method: 'GET',
      path: '/reports/revenue',
      handler: 'report.revenue',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/reports/revenue/trends',
      handler: 'report.revenueTrends',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/reports/revenue/top-books',
      handler: 'report.topBooks',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/reports/inventory',
      handler: 'report.inventory',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/reports/inventory/low-stock',
      handler: 'report.lowStock',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/reports/inventory/movement',
      handler: 'report.inventoryMovement',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/reports/dashboard',
      handler: 'report.dashboard',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
