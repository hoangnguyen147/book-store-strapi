/**
 * order custom router
 */

export default {
  routes: [
    {
      method: 'GET',
      path: '/orders/admin/all-orders',
      handler: 'order.getAllOrdersAdmin',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/orders/my-orders',
      handler: 'order.getMyOrders',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/orders/detail/:id',
      handler: 'order.getOrderDetail',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/orders/:id/print-bill',
      handler: 'order.printBill',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/orders/revenue/by-date',
      handler: 'order.revenueByDate',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/orders/revenue/by-duration',
      handler: 'order.revenueByDuration',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
