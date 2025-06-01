/**
 * stats controller
 */

export default {
  // General system stats
  async getStats(ctx) {
    try {
      // Count total users
      const totalUsers = await strapi.db.query('plugin::users-permissions.user').count();

      // Count total books
      const totalBooks = await strapi.db.query('api::book.book').count();

      // Count total orders
      const totalOrders = await strapi.db.query('api::order.order').count();

      // Count total authors
      const totalAuthors = await strapi.db.query('api::author.author').count();

      // Count total categories
      const totalCategories = await strapi.db.query('api::category.category').count();

      return ctx.send({
        data: {
          totalUsers,
          totalBooks,
          totalOrders,
          totalAuthors,
          totalCategories
        }
      });
    } catch (error) {
      return ctx.badRequest('Error fetching stats', { error: error.message });
    }
  },

  // User-specific stats
  async getUserStats(ctx) {
    const { id } = ctx.params;

    try {
      // Check if user exists
      const user = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { id }
      });

      if (!user) {
        return ctx.notFound('User not found');
      }

      // Check if the user is requesting their own stats or is admin
      if (ctx.state.user.id !== parseInt(id) && ctx.state.user.role.type !== 'admin') {
        return ctx.forbidden('You can only view your own stats');
      }

      // Count user's orders
      const totalOrders = await strapi.db.query('api::order.order').count({
        where: { user: id }
      });

      // Count orders by status
      const pendingOrders = await strapi.db.query('api::order.order').count({
        where: { user: id, status: 'pending' }
      });

      const confirmedOrders = await strapi.db.query('api::order.order').count({
        where: { user: id, status: 'confirmed' }
      });

      const shippedOrders = await strapi.db.query('api::order.order').count({
        where: { user: id, status: 'shipped' }
      });

      const deliveredOrders = await strapi.db.query('api::order.order').count({
        where: { user: id, status: 'delivered' }
      });

      const cancelledOrders = await strapi.db.query('api::order.order').count({
        where: { user: id, status: 'cancelled' }
      });

      // Calculate total spent
      const orders = await strapi.db.query('api::order.order').findMany({
        where: { user: id, status: { $in: ['confirmed', 'shipped', 'delivered'] } },
        select: ['total_amount']
      });

      const totalSpent = orders.reduce((sum, order) => sum + order.total_amount, 0);

      // Get recent orders
      const recentOrders = await strapi.db.query('api::order.order').findMany({
        where: { user: id },
        orderBy: { createdAt: 'desc' },
        limit: 5,
        populate: ['books']
      });

      return ctx.send({
        data: {
          userId: parseInt(id),
          totalOrders,
          ordersByStatus: {
            pending: pendingOrders,
            confirmed: confirmedOrders,
            shipped: shippedOrders,
            delivered: deliveredOrders,
            cancelled: cancelledOrders
          },
          totalSpent,
          recentOrders
        }
      });
    } catch (error) {
      return ctx.badRequest('Error fetching user stats', { error: error.message });
    }
  },

  // Current user stats (authenticated user)
  async getMyStats(ctx) {
    const userId = ctx.state.user.id;

    if (!userId) {
      return ctx.unauthorized('Authentication required');
    }

    // Reuse getUserStats logic
    ctx.params.id = userId;
    return this.getUserStats(ctx);
  }
};
