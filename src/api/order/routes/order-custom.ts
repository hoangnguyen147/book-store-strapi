/**
 * order custom router
 */

export default {
  routes: [
    {
      method: 'GET',
      path: '/orders/:id/print-bill',
      handler: 'order.printBill',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
