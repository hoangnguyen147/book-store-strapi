import type { Core } from '@strapi/strapi';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    console.log('🚀 Bootstrap function called');
    console.log('🔍 SEED_BOOKS environment variable:', process.env.SEED_BOOKS);

    // Check if we should seed data
    if (process.env.SEED_BOOKS === 'true') {
      console.log('🌱 Books seeding is enabled!');
      console.log('📝 To implement seeding, please use the manual script approach');
      console.log('💡 Run: node scripts/seed-simple.js to test CSV reading');
    } else {
      console.log('⏭️  Skipping seeding (SEED_BOOKS not set to true)');
    }
  },
};
