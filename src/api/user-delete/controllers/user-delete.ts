/**
 * user-delete controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('plugin::users-permissions.user', ({ strapi }) => ({
  /**
   * Delete a user
   */
  async delete(ctx) {
    const { id } = ctx.params;
    console.log('🗑️ Delete user called with ID:', id);

    try {
      // Find user by documentId or numeric ID
      let user;
      
      // Try to find by documentId first (Strapi v5 format)
      if (isNaN(id)) {
        console.log('🔍 Finding user by documentId:', id);
        user = await strapi.db.query('plugin::users-permissions.user').findOne({
          where: { documentId: id },
          populate: ['role']
        });
      } else {
        console.log('🔍 Finding user by numeric ID:', id);
        user = await strapi.db.query('plugin::users-permissions.user').findOne({
          where: { id: parseInt(id) },
          populate: ['role']
        });
      }
      
      console.log('👤 Found user:', user ? `${user.username} (ID: ${user.id})` : 'null');
      
      if (!user) {
        return ctx.notFound('User not found');
      }

      // Check if the user is trying to delete themselves or is admin
      console.log('🔐 Current user ID:', ctx.state.user.id, 'Target user ID:', user.id);
      console.log('🔐 Current user role:', ctx.state.user.role.type);
      
      if (ctx.state.user.id !== user.id && ctx.state.user.role.type !== 'admin') {
        return ctx.forbidden('You can only delete your own account or you must be an admin');
      }

      // Prevent admin from deleting themselves (optional safety check)
      if (ctx.state.user.id === user.id && ctx.state.user.role.type === 'admin') {
        return ctx.badRequest('Admin users cannot delete their own account');
      }

      // Delete the user using the correct identifier
      console.log('🗑️ Deleting user...');
      if (isNaN(id)) {
        // Delete by documentId
        await strapi.db.query('plugin::users-permissions.user').delete({
          where: { documentId: id }
        });
      } else {
        // Delete by numeric ID
        await strapi.db.query('plugin::users-permissions.user').delete({
          where: { id: parseInt(id) }
        });
      }

      console.log('✅ User deleted successfully');
      return ctx.send({
        data: {
          id: user.id,
          documentId: user.documentId,
          username: user.username,
          email: user.email
        },
        message: 'User deleted successfully'
      });
    } catch (error) {
      console.error('❌ Error deleting user:', error);
      return ctx.badRequest('Error deleting user', { error: error.message });
    }
  },
}));
