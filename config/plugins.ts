export default () => ({
  documentation: {
    enabled: true,
    config: {
      openapi: '3.0.0',
      info: {
        version: '1.0.0',
        title: 'Book Store API',
        description: 'API documentation for Book Store application with comprehensive book management, user authentication, and advanced search capabilities.',
        termsOfService: 'https://bookstore.com/terms',
        contact: {
          name: 'Book Store Team',
          email: 'contact@bookstore.com',
          url: 'https://bookstore.com'
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT'
        },
      },
      'x-strapi-config': {
        plugins: ['upload', 'users-permissions'],
        path: '/documentation',
        mutateDocumentation: (generatedDocumentationDraft) => {
          // Add custom routes to the documentation
          Object.assign(generatedDocumentationDraft.paths, {
            '/books/trendy': {
              get: {
                tags: ['Book - Custom'],
                summary: 'Get trendy books',
                description: 'Get books that are currently trending based on high ratings (5.0 stars)',
                parameters: [
                  {
                    name: 'limit',
                    in: 'query',
                    required: false,
                    schema: {
                      type: 'integer',
                      default: 20,
                      minimum: 1,
                      maximum: 100
                    },
                    description: 'Number of trendy books to return'
                  }
                ],
                responses: {
                  '200': {
                    description: 'List of trendy books',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            data: {
                              type: 'array',
                              items: { $ref: '#/components/schemas/Book' }
                            },
                            meta: {
                              type: 'object',
                              properties: {
                                pagination: { $ref: '#/components/schemas/Pagination' }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            '/books/featured': {
              get: {
                tags: ['Book - Custom'],
                summary: 'Get featured books',
                description: 'Get books that are featured by the store (staff picks, best sellers, etc.)',
                parameters: [
                  {
                    name: 'limit',
                    in: 'query',
                    required: false,
                    schema: {
                      type: 'integer',
                      default: 20,
                      minimum: 1,
                      maximum: 100
                    },
                    description: 'Number of featured books to return'
                  }
                ],
                responses: {
                  '200': {
                    description: 'List of featured books',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            data: {
                              type: 'array',
                              items: { $ref: '#/components/schemas/Book' }
                            },
                            meta: {
                              type: 'object',
                              properties: {
                                pagination: { $ref: '#/components/schemas/Pagination' }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            '/books/search': {
              get: {
                tags: ['Book - Custom'],
                summary: 'Search books',
                description: 'Search books by title, author, or description',
                parameters: [
                  {
                    name: 'search',
                    in: 'query',
                    required: true,
                    schema: { type: 'string' },
                    description: 'Search query',
                    example: 'Cam'
                  },
                  {
                    name: 'limit',
                    in: 'query',
                    required: false,
                    schema: {
                      type: 'integer',
                      default: 25,
                      minimum: 1,
                      maximum: 100
                    },
                    description: 'Number of results to return'
                  }
                ],
                responses: {
                  '200': {
                    description: 'Search results',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            data: {
                              type: 'array',
                              items: { $ref: '#/components/schemas/Book' }
                            },
                            meta: {
                              type: 'object',
                              properties: {
                                pagination: { $ref: '#/components/schemas/Pagination' }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            '/books/search/category': {
              get: {
                tags: ['Book - Custom'],
                summary: 'Search books by category',
                description: 'Search books by category name',
                parameters: [
                  {
                    name: 'category',
                    in: 'query',
                    required: true,
                    schema: { type: 'string' },
                    description: 'Category name to search for'
                  },
                  {
                    name: 'limit',
                    in: 'query',
                    required: false,
                    schema: {
                      type: 'integer',
                      default: 25,
                      minimum: 1,
                      maximum: 100
                    },
                    description: 'Number of results to return'
                  }
                ],
                responses: {
                  '200': {
                    description: 'Books in the specified category',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            data: {
                              type: 'array',
                              items: { $ref: '#/components/schemas/Book' }
                            },
                            meta: {
                              type: 'object',
                              properties: {
                                pagination: { $ref: '#/components/schemas/Pagination' }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            '/books/{id}/similar': {
              get: {
                tags: ['Book - Custom'],
                summary: 'Get similar books',
                description: 'Get books that are similar to the specified book based on categories and tags',
                parameters: [
                  {
                    name: 'id',
                    in: 'path',
                    required: true,
                    schema: { type: 'string' },
                    description: 'Book ID or document ID'
                  },
                  {
                    name: 'limit',
                    in: 'query',
                    required: false,
                    schema: {
                      type: 'integer',
                      default: 10,
                      minimum: 1,
                      maximum: 50
                    },
                    description: 'Number of similar books to return'
                  }
                ],
                responses: {
                  '200': {
                    description: 'List of similar books',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            data: {
                              type: 'array',
                              items: { $ref: '#/components/schemas/Book' }
                            },
                            meta: {
                              type: 'object',
                              properties: {
                                pagination: { $ref: '#/components/schemas/Pagination' }
                              }
                            }
                          }
                        }
                      }
                    }
                  },
                  '404': {
                    description: 'Book not found'
                  }
                }
              }
            },
            '/stats': {
              get: {
                tags: ['Stats'],
                summary: 'Get system statistics',
                description: 'Get general system statistics including total users, books, orders, authors, and categories',
                responses: {
                  '200': {
                    description: 'System statistics',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            data: {
                              type: 'object',
                              properties: {
                                totalUsers: { type: 'integer', example: 150 },
                                totalBooks: { type: 'integer', example: 1769 },
                                totalOrders: { type: 'integer', example: 45 },
                                totalAuthors: { type: 'integer', example: 1080 },
                                totalCategories: { type: 'integer', example: 30 }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            '/stats/me': {
              get: {
                tags: ['User Stats'],
                summary: 'Get my statistics',
                description: 'Get statistics for the currently authenticated user',
                security: [{ bearerAuth: [] }],
                responses: {
                  '200': {
                    description: 'User statistics',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            data: { $ref: '#/components/schemas/UserStats' }
                          }
                        }
                      }
                    }
                  },
                  '401': {
                    description: 'Authentication required'
                  }
                }
              }
            },
            '/stats/users/{id}': {
              get: {
                tags: ['User Stats'],
                summary: 'Get user statistics by ID',
                description: 'Get statistics for a specific user (admin only or own stats)',
                security: [{ bearerAuth: [] }],
                parameters: [
                  {
                    name: 'id',
                    in: 'path',
                    required: true,
                    schema: { type: 'integer' },
                    description: 'User ID'
                  }
                ],
                responses: {
                  '200': {
                    description: 'User statistics',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            data: { $ref: '#/components/schemas/UserStats' }
                          }
                        }
                      }
                    }
                  },
                  '401': {
                    description: 'Authentication required'
                  },
                  '403': {
                    description: 'You can only view your own stats'
                  },
                  '404': {
                    description: 'User not found'
                  }
                }
              }
            },
            '/users/me': {
              get: {
                tags: ['User Profile'],
                summary: 'Get my profile',
                description: 'Get the profile of the currently authenticated user',
                security: [{ bearerAuth: [] }],
                responses: {
                  '200': {
                    description: 'User profile',
                    content: {
                      'application/json': {
                        schema: { $ref: '#/components/schemas/User' }
                      }
                    }
                  },
                  '401': {
                    description: 'Authentication required'
                  }
                }
              }
            },
            '/users/{id}/profile': {
              put: {
                tags: ['User Profile'],
                summary: 'Update user profile',
                description: 'Update user profile information (own profile only)',
                security: [{ bearerAuth: [] }],
                parameters: [
                  {
                    name: 'id',
                    in: 'path',
                    required: true,
                    schema: { type: 'integer' },
                    description: 'User ID'
                  }
                ],
                requestBody: {
                  required: true,
                  content: {
                    'application/json': {
                      schema: { $ref: '#/components/schemas/UserProfileInput' }
                    }
                  }
                },
                responses: {
                  '200': {
                    description: 'Profile updated successfully',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            data: { $ref: '#/components/schemas/User' },
                            message: { type: 'string', example: 'Profile updated successfully' }
                          }
                        }
                      }
                    }
                  },
                  '401': {
                    description: 'Authentication required'
                  },
                  '403': {
                    description: 'You can only update your own profile'
                  },
                  '404': {
                    description: 'User not found'
                  }
                }
              }
            }
          });

          // Add User Stats and Profile schemas
          if (!generatedDocumentationDraft.components) {
            generatedDocumentationDraft.components = {};
          }
          if (!generatedDocumentationDraft.components.schemas) {
            generatedDocumentationDraft.components.schemas = {};
          }

          Object.assign(generatedDocumentationDraft.components.schemas, {
            UserStats: {
              type: 'object',
              properties: {
                userId: { type: 'integer', example: 1 },
                totalOrders: { type: 'integer', example: 5 },
                ordersByStatus: {
                  type: 'object',
                  properties: {
                    pending: { type: 'integer', example: 1 },
                    confirmed: { type: 'integer', example: 2 },
                    shipped: { type: 'integer', example: 1 },
                    delivered: { type: 'integer', example: 1 },
                    cancelled: { type: 'integer', example: 0 }
                  }
                },
                totalSpent: { type: 'integer', example: 250000, description: 'Total amount spent in VND' },
                recentOrders: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Order' }
                }
              }
            },
            User: {
              type: 'object',
              properties: {
                id: { type: 'integer', example: 1 },
                username: { type: 'string', example: 'john_doe' },
                email: { type: 'string', format: 'email', example: 'john@example.com' },
                confirmed: { type: 'boolean', example: true },
                blocked: { type: 'boolean', example: false },
                city: { type: 'string', example: 'Ho Chi Minh City' },
                country: { type: 'string', example: 'Vietnam' },
                address: { type: 'string', example: '123 Nguyen Hue Street' },
                phone: { type: 'string', example: '+84901234567' },
                birthday: { type: 'string', format: 'date', example: '1990-01-01' },
                date_of_birth: { type: 'string', format: 'date', example: '1990-01-01' },
                gender: { type: 'string', enum: ['male', 'female', 'other'], example: 'male' },
                facebook: { type: 'string', example: 'https://facebook.com/johndoe' },
                twitter: { type: 'string', example: 'https://twitter.com/johndoe' },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' }
              }
            },
            UserProfileInput: {
              type: 'object',
              properties: {
                city: { type: 'string', example: 'Ho Chi Minh City' },
                country: { type: 'string', example: 'Vietnam' },
                address: { type: 'string', example: '123 Nguyen Hue Street' },
                phone: { type: 'string', example: '+84901234567' },
                birthday: { type: 'string', format: 'date', example: '1990-01-01' },
                date_of_birth: { type: 'string', format: 'date', example: '1990-01-01' },
                gender: { type: 'string', enum: ['male', 'female', 'other'], example: 'male' },
                facebook: { type: 'string', example: 'https://facebook.com/johndoe' },
                twitter: { type: 'string', example: 'https://twitter.com/johndoe' }
              }
            },
            Order: {
              type: 'object',
              properties: {
                id: { type: 'integer', example: 1 },
                documentId: { type: 'string', example: 'order123abc' },
                total_amount: { type: 'integer', example: 50000, description: 'Total amount in VND' },
                status: { type: 'string', enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'], example: 'delivered' },
                shipping_address: { type: 'string', example: '123 Nguyen Hue Street, Ho Chi Minh City' },
                phone: { type: 'string', example: '+84901234567' },
                notes: { type: 'string', example: 'Please deliver in the morning' },
                books: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Book' }
                },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' }
              }
            }
          });
        }
      },
      servers: [
        {
          url: 'http://localhost:1337/api',
          description: 'Development server',
        },
        {
          url: 'https://calm-health-1bc6166fbc.strapiapp.com//api',
          description: 'Production server',
        },
      ],
      externalDocs: {
        description: 'Find out more about Strapi',
        url: 'https://docs.strapi.io/developer-docs/latest/getting-started/introduction.html'
      },
      security: [
        {
          bearerAuth: [],
        }
      ]
    }
  }
});
