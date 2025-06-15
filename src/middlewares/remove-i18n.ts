/**
 * Custom middleware to remove i18n related parameters and headers
 * This ensures that locale and localizations are completely removed from all API responses
 */

export default (config, { strapi }) => {
  return async (ctx, next) => {
    // Remove locale parameter from query if present
    if (ctx.query && ctx.query.locale) {
      delete ctx.query.locale;
    }

    // Remove locale from request body if present
    if (ctx.request.body && ctx.request.body.locale) {
      delete ctx.request.body.locale;
    }

    // Remove localizations from request body if present
    if (ctx.request.body && ctx.request.body.localizations) {
      delete ctx.request.body.localizations;
    }

    // Continue with the request
    await next();

    // Remove locale and localizations from response data if present
    if (ctx.response.body && typeof ctx.response.body === 'object') {
      removeI18nFromResponse(ctx.response.body);
    }
  };
};

/**
 * Recursively remove locale and localizations from response objects
 */
function removeI18nFromResponse(obj: any): void {
  if (!obj || typeof obj !== 'object') {
    return;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    obj.forEach(item => removeI18nFromResponse(item));
    return;
  }

  // Remove locale and localizations fields
  if ('locale' in obj) {
    delete obj.locale;
  }
  if ('localizations' in obj) {
    delete obj.localizations;
  }

  // Recursively process nested objects
  Object.values(obj).forEach(value => {
    if (value && typeof value === 'object') {
      removeI18nFromResponse(value);
    }
  });
}
