/**
 * user-management controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::user-management.user-management', ({ strapi }) => ({
  async find(ctx) {
    try {
      // Parse pagination parameters
      const page = parseInt(ctx.query.page as string) || 1;
      const pageSize = Math.min(parseInt(ctx.query.pageSize as string) || 25, 100); // Max 100 per page
      const start = (page - 1) * pageSize;

      // Parse filters
      const where: any = {};
      if (ctx.query.search) {
        where.$or = [
          { username: { $containsi: ctx.query.search } },
          { email: { $containsi: ctx.query.search } }
        ];
      }
      if (ctx.query.confirmed !== undefined) {
        where.confirmed = ctx.query.confirmed === 'true';
      }
      if (ctx.query.blocked !== undefined) {
        where.blocked = ctx.query.blocked === 'true';
      }

      // Get total count for pagination
      const total = await strapi.db.query('plugin::users-permissions.user').count({
        where
      });

      // Get users with pagination
      const users = await strapi.db.query('plugin::users-permissions.user').findMany({
        where,
        populate: {
          role: true,
          avatar: true
        },
        limit: pageSize,
        offset: start,
        orderBy: { createdAt: 'desc' }
      });

      // Sanitize user data (remove sensitive fields)
      const sanitizedUsers = users.map(user => {
        const { password, resetPasswordToken, confirmationToken, ...sanitizedUser } = user;
        return sanitizedUser;
      });

      // Calculate pagination metadata
      const pageCount = Math.ceil(total / pageSize);

      return ctx.send({
        data: sanitizedUsers,
        meta: {
          pagination: {
            page,
            pageSize,
            pageCount,
            total
          }
        }
      });
    } catch (error) {
      console.error('Error in user management find:', error);
      return ctx.badRequest('Error fetching users', { error: error.message });
    }
  },

  /**
   * Get user profile by documentId with role and avatar information
   */
  async getUserProfile(ctx) {
    try {
      const { documentId } = ctx.params;

      if (!documentId) {
        return ctx.badRequest('User documentId is required');
      }

      console.log('🔍 Getting user profile for:', documentId);

      // Find user by documentId or numeric ID
      let user: any;

      try {
        // First try to find by documentId (Strapi v5 format)
        if (isNaN(Number(documentId))) {
          console.log('🔍 Finding user by documentId:', documentId);
          user = await strapi.db.query('plugin::users-permissions.user').findOne({
            where: { documentId: documentId },
            populate: {
              role: true,
              avatar: true
            }
          });
        } else {
          console.log('🔍 Finding user by numeric ID:', documentId);
          user = await strapi.db.query('plugin::users-permissions.user').findOne({
            where: { id: parseInt(documentId) },
            populate: {
              role: true,
              avatar: true
            }
          });
        }
      } catch (dbError) {
        console.error('❌ Database error finding user:', dbError);
        return ctx.badRequest('Error finding user', { error: dbError.message });
      }

      if (!user) {
        return ctx.notFound('User not found');
      }

      // Sanitize user data (remove sensitive fields)
      const { password, resetPasswordToken, confirmationToken, ...sanitizedUser } = user;

      console.log('✅ User profile retrieved successfully:', user.id);
      console.log('🔍 User role:', user.role?.name || 'No role');
      console.log('🔍 User avatar:', user.avatar ? 'Has avatar' : 'No avatar');

      return ctx.send({
        data: sanitizedUser,
        message: 'User profile retrieved successfully'
      });

    } catch (error) {
      console.error('❌ Error in getUserProfile:', error);
      return ctx.badRequest('Error fetching user profile', { error: error.message });
    }
  },

  /**
   * Get current user's profile using JWT token (no parameters required)
   */
  async getMyProfile(ctx) {
    try {
      // Get user ID from JWT token (set by Strapi authentication middleware)
      const userId = ctx.state.user?.id;

      if (!userId) {
        return ctx.unauthorized('Authentication required');
      }

      console.log('🔍 Getting current user profile for user ID:', userId);

      // Find current user with role and avatar populated
      const user = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { id: userId },
        populate: {
          role: true,
          avatar: true
        }
      });

      if (!user) {
        return ctx.notFound('User not found');
      }

      // Sanitize user data (remove sensitive fields)
      const { password, resetPasswordToken, confirmationToken, ...sanitizedUser } = user;

      console.log('✅ Current user profile retrieved successfully:', user.id);
      console.log('🔍 User role:', user.role?.name || 'No role');
      console.log('🔍 User avatar:', user.avatar ? 'Has avatar' : 'No avatar');

      return ctx.send({
        data: sanitizedUser,
        message: 'Current user profile retrieved successfully'
      });

    } catch (error) {
      console.error('❌ Error in getMyProfile:', error);
      return ctx.badRequest('Error fetching current user profile', { error: error.message });
    }
  },

  /**
   * Create a new user with comprehensive profile information including avatar
   */
  async create(ctx) {
    try {
      const { body } = ctx.request;

      // Validate required fields
      if (!body.username) {
        return ctx.badRequest('Username is required');
      }
      if (!body.email) {
        return ctx.badRequest('Email is required');
      }
      if (!body.password) {
        return ctx.badRequest('Password is required');
      }

      console.log('👤 Creating new user:', body.username);

      // Check if username or email already exists
      const existingUser = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: {
          $or: [
            { username: body.username },
            { email: body.email.toLowerCase() }
          ]
        }
      });

      if (existingUser) {
        if (existingUser.username === body.username) {
          return ctx.badRequest('Username already exists');
        }
        if (existingUser.email === body.email.toLowerCase()) {
          return ctx.badRequest('Email already exists');
        }
      }

      // Get default role if not provided
      let roleId = body.role;
      if (!roleId) {
        const defaultRole = await strapi.db.query('plugin::users-permissions.role').findOne({
          where: { type: 'authenticated' }
        });
        roleId = defaultRole?.id;
      }

      // Prepare user data with all allowed fields
      const userData = {
        username: body.username,
        email: body.email.toLowerCase(),
        password: body.password,
        confirmed: body.confirmed !== undefined ? body.confirmed : true,
        blocked: body.blocked !== undefined ? body.blocked : false,
        provider: 'local',
        role: roleId,
        // Optional profile fields
        date_of_birth: body.date_of_birth || null,
        birthday: body.birthday || null,
        address: body.address || null,
        phone: body.phone || null,
        facebook: body.facebook || null,
        twitter: body.twitter || null,
        city: body.city || null,
        country: body.country || null,
        gender: body.gender || null,
        avatar: body.avatar || null, // Avatar field for media upload
      };

      console.log('📝 User data prepared:', {
        username: userData.username,
        email: userData.email,
        hasAvatar: !!userData.avatar
      });

      // Create the user
      const newUser = await strapi.db.query('plugin::users-permissions.user').create({
        data: userData,
        populate: {
          role: true,
          avatar: true
        }
      });

      // Sanitize user data (remove sensitive fields)
      const { password, resetPasswordToken, confirmationToken, ...sanitizedUser } = newUser;

      console.log('✅ User created successfully:', newUser.id);
      console.log('🔍 User role:', newUser.role?.name || 'No role');
      console.log('🔍 User avatar:', newUser.avatar ? 'Has avatar' : 'No avatar');

      return ctx.send({
        data: sanitizedUser,
        message: 'User created successfully'
      });

    } catch (error) {
      console.error('❌ Error creating user:', error);
      return ctx.badRequest('Error creating user', { error: error.message });
    }
  },

  /**
   * Update a user with comprehensive profile information including avatar
   */
  async update(ctx) {
    try {
      const { id } = ctx.params;
      const { body } = ctx.request;

      if (!id) {
        return ctx.badRequest('User ID is required');
      }

      console.log('📝 Updating user:', id);

      // Find user by documentId or numeric ID
      let user: any;

      try {
        if (isNaN(Number(id))) {
          console.log('🔍 Finding user by documentId:', id);
          user = await strapi.db.query('plugin::users-permissions.user').findOne({
            where: { documentId: id },
            populate: {
              role: true,
              avatar: true
            }
          });
        } else {
          console.log('🔍 Finding user by numeric ID:', id);
          user = await strapi.db.query('plugin::users-permissions.user').findOne({
            where: { id: parseInt(id) },
            populate: {
              role: true,
              avatar: true
            }
          });
        }
      } catch (dbError) {
        console.error('❌ Database error finding user:', dbError);
        return ctx.badRequest('Error finding user', { error: dbError.message });
      }

      if (!user) {
        return ctx.notFound('User not found');
      }

      // Check for duplicate username/email if they're being changed
      if (body.username && body.username !== user.username) {
        const existingUsername = await strapi.db.query('plugin::users-permissions.user').findOne({
          where: {
            username: body.username,
            id: { $ne: user.id }
          }
        });
        if (existingUsername) {
          return ctx.badRequest('Username already exists');
        }
      }

      if (body.email && body.email.toLowerCase() !== user.email) {
        const existingEmail = await strapi.db.query('plugin::users-permissions.user').findOne({
          where: {
            email: body.email.toLowerCase(),
            id: { $ne: user.id }
          }
        });
        if (existingEmail) {
          return ctx.badRequest('Email already exists');
        }
      }

      // Prepare update data with all allowed fields
      const updateData: any = {};

      // Basic fields
      if (body.username !== undefined) updateData.username = body.username;
      if (body.email !== undefined) updateData.email = body.email.toLowerCase();
      if (body.password !== undefined) updateData.password = body.password;
      if (body.confirmed !== undefined) updateData.confirmed = body.confirmed;
      if (body.blocked !== undefined) updateData.blocked = body.blocked;
      if (body.role !== undefined) updateData.role = body.role;

      // Profile fields
      if (body.date_of_birth !== undefined) updateData.date_of_birth = body.date_of_birth;
      if (body.birthday !== undefined) updateData.birthday = body.birthday;
      if (body.address !== undefined) updateData.address = body.address;
      if (body.phone !== undefined) updateData.phone = body.phone;
      if (body.facebook !== undefined) updateData.facebook = body.facebook;
      if (body.twitter !== undefined) updateData.twitter = body.twitter;
      if (body.city !== undefined) updateData.city = body.city;
      if (body.country !== undefined) updateData.country = body.country;
      if (body.gender !== undefined) updateData.gender = body.gender;
      if (body.avatar !== undefined) updateData.avatar = body.avatar; // Avatar field for media upload

      console.log('📝 Update data prepared:', {
        fieldsToUpdate: Object.keys(updateData),
        hasAvatar: 'avatar' in updateData
      });

      // Update the user
      const updatedUser = await strapi.db.query('plugin::users-permissions.user').update({
        where: { id: user.id },
        data: updateData,
        populate: {
          role: true,
          avatar: true
        }
      });

      // Sanitize user data (remove sensitive fields)
      const { password, resetPasswordToken, confirmationToken, ...sanitizedUser } = updatedUser;

      console.log('✅ User updated successfully:', updatedUser.id);
      console.log('🔍 User role:', updatedUser.role?.name || 'No role');
      console.log('🔍 User avatar:', updatedUser.avatar ? 'Has avatar' : 'No avatar');

      return ctx.send({
        data: sanitizedUser,
        message: 'User updated successfully'
      });

    } catch (error) {
      console.error('❌ Error updating user:', error);
      return ctx.badRequest('Error updating user', { error: error.message });
    }
  },

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
