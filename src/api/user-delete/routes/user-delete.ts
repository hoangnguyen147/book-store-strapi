export default {
  routes: [
    {
      method: 'DELETE',
      path: '/user-delete/:id',
      handler: 'user-delete.delete',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
