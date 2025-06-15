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

    // Add global lifecycle hooks to remove i18n fields from all operations
    strapi.db.lifecycles.subscribe({
      models: ['*'], // Apply to all models

      beforeCreate(event) {
        removeI18nFields(event.params.data);
      },

      beforeUpdate(event) {
        removeI18nFields(event.params.data);
      },

      beforeCreateMany(event) {
        if (Array.isArray(event.params.data)) {
          event.params.data.forEach(removeI18nFields);
        }
      },

      beforeUpdateMany(event) {
        removeI18nFields(event.params.data);
      },

      afterFindOne(event) {
        removeI18nFields(event.result);
      },

      afterFindMany(event) {
        if (Array.isArray(event.result)) {
          event.result.forEach(removeI18nFields);
        }
      },
    });

    console.log('🚫 i18n fields removal lifecycle hooks registered');

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

/**
 * Remove i18n related fields from data objects
 */
function removeI18nFields(data: any): void {
  if (!data || typeof data !== 'object') {
    return;
  }

  // Remove locale and localizations fields
  if ('locale' in data) {
    delete data.locale;
  }
  if ('localizations' in data) {
    delete data.localizations;
  }

  // Recursively process nested objects
  Object.values(data).forEach(value => {
    if (value && typeof value === 'object') {
      removeI18nFields(value);
    }
  });
}
