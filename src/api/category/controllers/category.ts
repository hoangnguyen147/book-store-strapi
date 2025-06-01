/**
 *  category controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::category.category', ({ strapi }) => ({
  // Override delete to return success message
  async delete(ctx) {
    const { id } = ctx.params;

    try {
      // First check if category exists
      const category = await strapi.db.query('api::category.category').findOne({
        where: { id }
      });

      if (!category) {
        return ctx.notFound('Category not found');
      }

      // Delete the category
      const entity = await strapi.db.query('api::category.category').delete({
        where: { id }
      });

      return ctx.send({
        data: category,
        message: 'Category deleted successfully'
      });
    } catch (error) {
      return ctx.badRequest('Error deleting category', { error: error.message });
    }
  }
}));
