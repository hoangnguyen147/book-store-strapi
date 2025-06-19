/**
 *  category controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::category.category', ({ strapi }) => ({
  // Override delete to return success message
  async delete(ctx) {
    const { id } = ctx.params;

    try {
      // Handle both numeric ID and documentId
      let category;
      let whereClause;

      if (isNaN(parseInt(id))) {
        // It's a documentId
        whereClause = { documentId: id };
      } else {
        // It's a numeric ID
        whereClause = { id: parseInt(id) };
      }

      // First check if category exists
      category = await strapi.db.query('api::category.category').findOne({
        where: whereClause
      });

      if (!category) {
        return ctx.notFound('Category not found');
      }

      // Delete the category using the same where clause
      const entity = await strapi.db.query('api::category.category').delete({
        where: whereClause
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
