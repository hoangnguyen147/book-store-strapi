export default [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  {
    name: 'strapi::cors',
    config: {
      headers: '*',
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
      keepHeaderOnError: true,
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  // Custom middleware to auto-assign role for user creation
  {
    name: 'global::auto-assign-role',
    config: {},
  },
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
  // Custom middleware to remove any i18n related headers/params
  {
    name: 'global::remove-i18n',
    config: {},
  },
];
