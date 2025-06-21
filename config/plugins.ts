export default () => ({
  // Completely disable i18n plugin to remove locale and localizations from all APIs
  i18n: {
    enabled: false,
  },
  documentation: {
    enabled: true,
    config: {
      openapi: '3.0.0',
      info: {
        version: '1.0.0',
        title: 'Book Store API',
        description: 'API documentation for Book Store application with comprehensive book management, user authentication, and advanced search capabilities.\n\n**Important Note for Strapi v5:**\n- For GET requests: You can use either `id` (number) or `documentId` (24-char alphanumeric string)\n- For PUT/DELETE requests: You MUST use `documentId` (24-char alphanumeric string)\n- Example: GET /api/categories/133 OR /api/categories/o9m182bqf02l0zjrq8weqfwz\n- Example: PUT /api/categories/o9m182bqf02l0zjrq8weqfwz (documentId required)',
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
        // Remove x-generation-date to prevent file updates on each server start
      },
      'x-strapi-config': {
        plugins: ['upload', 'users-permissions'],
        path: '/documentation',
        mutateDocumentation: (generatedDocumentationDraft) => {
          // Remove the x-generation-date to prevent file updates on each server start
          delete generatedDocumentationDraft.info['x-generation-date'];

          // Fix Strapi v5 documentId parameters for PUT/DELETE operations
          const fixDocumentIdParameters = (paths) => {
            Object.keys(paths).forEach(pathKey => {
              const pathItem = paths[pathKey];

              // Fix PUT and DELETE operations to use documentId instead of id
              ['put', 'delete'].forEach(method => {
                if (pathItem[method] && pathItem[method].parameters) {
                  pathItem[method].parameters = pathItem[method].parameters.map(param => {
                    if (param.name === 'id' && param.in === 'path') {
                      return {
                        ...param,
                        name: 'documentId',
                        description: 'Document ID (alphanumeric string) - required for update/delete operations in Strapi v5',
                        schema: {
                          type: 'string',
                          pattern: '^[a-z0-9]{24}$',
                          example: 'o9m182bqf02l0zjrq8weqfwz'
                        }
                      };
                    }
                    return param;
                  });
                }
              });

              // Also update the path pattern for clarity
              if (pathKey.includes('/{id}')) {
                const newPathKey = pathKey.replace('/{id}', '/{documentId}');
                if (newPathKey !== pathKey) {
                  paths[newPathKey] = pathItem;
                  delete paths[pathKey];
                }
              }
            });
          };

          // Apply the fix to all paths
          if (generatedDocumentationDraft.paths) {
            fixDocumentIdParameters(generatedDocumentationDraft.paths);
          }
          // Add custom routes to the documentation
          Object.assign(generatedDocumentationDraft.paths, {
            '/orders': {
              post: {
                tags: ['Orders'],
                summary: 'Create a complete order with multiple books',
                description: `
**Create a complete order in ONE API call**

This endpoint allows you to create a complete order with multiple books and quantities.

**IMPORTANT:** You pass book IDs and quantities directly - NOT order item IDs. The order items are created automatically.

**What happens when you call this API:**
1. ✅ Validates all book IDs exist
2. ✅ Checks inventory for all books
3. ✅ Creates the order
4. ✅ Creates order items automatically
5. ✅ Deducts inventory from books
6. ✅ Calculates total amount automatically
7. ✅ Returns complete order with all details

**If ANY book has insufficient inventory, the ENTIRE order is rejected and NO changes are made.**

**Example workflow:**
1. Get books: \`GET /api/books\` → Note the book IDs you want
2. Create order: \`POST /api/orders\` → Pass book IDs and quantities
3. Done! Order created with inventory updated automatically
                `,
                security: [{ bearerAuth: [] }],
                requestBody: {
                  required: true,
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          data: { $ref: '#/components/schemas/CreateOrderRequest' }
                        }
                      },
                      examples: {
                        'single-book-order': {
                          summary: 'Order with single book',
                          description: 'Simple order with one book',
                          value: {
                            data: {
                              items: [
                                {
                                  book_id: 1,
                                  quantity: 2
                                }
                              ],
                              shipping_address: '123 Nguyen Hue Street, Ho Chi Minh City',
                              phone: '+84901234567',
                              notes: 'Please deliver in the morning'
                            }
                          }
                        },
                        'multiple-books-order': {
                          summary: 'Order with multiple books',
                          description: 'Order with different books and quantities',
                          value: {
                            data: {
                              items: [
                                {
                                  book_id: 1,
                                  quantity: 2
                                },
                                {
                                  book_id: 5,
                                  quantity: 1
                                },
                                {
                                  book_id: 10,
                                  quantity: 3
                                }
                              ],
                              shipping_address: '456 Le Loi Street, Ho Chi Minh City',
                              phone: '+84987654321',
                              notes: 'Call before delivery'
                            }
                          }
                        },
                        'minimal-order': {
                          summary: 'Minimal order (only required fields)',
                          description: 'Order with only book items (no address/phone/notes)',
                          value: {
                            data: {
                              items: [
                                {
                                  book_id: 3,
                                  quantity: 1
                                }
                              ]
                            }
                          }
                        }
                      }
                    }
                  }
                },
                responses: {
                  '200': {
                    description: 'Order created successfully with inventory updated',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            data: { $ref: '#/components/schemas/Order' }
                          }
                        },
                        examples: {
                          'successful-order': {
                            summary: 'Successful order creation',
                            value: {
                              data: {
                                id: 1,
                                documentId: 'order123abc',
                                total_amount: 75000,
                                status: 'pending',
                                shipping_address: '123 Nguyen Hue Street, Ho Chi Minh City',
                                phone: '+84901234567',
                                notes: 'Please deliver in the morning',
                                order_items: [
                                  {
                                    id: 1,
                                    quantity: 2,
                                    unit_price: 25000,
                                    total_price: 50000,
                                    book: {
                                      id: 1,
                                      name: 'Sample Book',
                                      quantity: 48,
                                      sale_price: 25000
                                    }
                                  },
                                  {
                                    id: 2,
                                    quantity: 1,
                                    unit_price: 25000,
                                    total_price: 25000,
                                    book: {
                                      id: 5,
                                      name: 'Another Book',
                                      quantity: 19,
                                      sale_price: 25000
                                    }
                                  }
                                ],
                                user: {
                                  id: 199,
                                  username: 'customer1',
                                  email: 'customer@example.com'
                                },
                                createdAt: '2025-06-15T09:45:00.000Z',
                                updatedAt: '2025-06-15T09:45:00.000Z'
                              }
                            }
                          }
                        }
                      }
                    }
                  },
                  '400': {
                    description: 'Bad request - Invalid data, insufficient inventory, or book not found',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            error: {
                              type: 'object',
                              properties: {
                                message: { type: 'string' }
                              }
                            }
                          }
                        },
                        examples: {
                          'insufficient-inventory': {
                            summary: 'Insufficient inventory',
                            value: {
                              error: {
                                message: 'Insufficient inventory for "The Great Gatsby". Available: 5, Requested: 10'
                              }
                            }
                          },
                          'book-not-found': {
                            summary: 'Book not found',
                            value: {
                              error: {
                                message: 'Book with ID 999 not found'
                              }
                            }
                          },
                          'invalid-quantity': {
                            summary: 'Invalid quantity',
                            value: {
                              error: {
                                message: 'Each item must have quantity > 0'
                              }
                            }
                          }
                        }
                      }
                    }
                  },
                  '401': {
                    description: 'Authentication required',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            error: {
                              type: 'object',
                              properties: {
                                message: { type: 'string', example: 'Authentication required' }
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
            '/auth/local': {
              post: {
                tags: ['Authentication'],
                summary: 'Login with email/username and password',
                description: 'Authenticate user and receive JWT token with complete user profile including role information',
                requestBody: {
                  required: true,
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        required: ['identifier', 'password'],
                        properties: {
                          identifier: {
                            type: 'string',
                            description: 'Email or username',
                            example: 'user@example.com'
                          },
                          password: {
                            type: 'string',
                            description: 'User password',
                            example: 'password123'
                          }
                        }
                      }
                    }
                  }
                },
                responses: {
                  200: {
                    description: 'Login successful with user profile and role information',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            jwt: {
                              type: 'string',
                              description: 'JWT token for authentication',
                              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                            },
                            user: {
                              allOf: [
                                { $ref: '#/components/schemas/User' },
                                {
                                  type: 'object',
                                  properties: {
                                    role: {
                                      type: 'object',
                                      properties: {
                                        id: { type: 'integer', example: 1 },
                                        name: { type: 'string', example: 'Authenticated' },
                                        type: { type: 'string', example: 'authenticated' },
                                        description: { type: 'string', example: 'Default role given to authenticated user.' }
                                      },
                                      description: 'Complete user role information'
                                    }
                                  }
                                }
                              ]
                            }
                          }
                        }
                      }
                    }
                  },
                  400: {
                    description: 'Invalid credentials',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            error: {
                              type: 'object',
                              properties: {
                                message: { type: 'string', example: 'Invalid identifier or password' }
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
            '/auth/local/register': {
              post: {
                tags: ['Authentication'],
                summary: 'Register new user account',
                description: 'Create a new user account and receive JWT token with user profile including role information',
                requestBody: {
                  required: true,
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        required: ['username', 'email', 'password'],
                        properties: {
                          username: {
                            type: 'string',
                            description: 'Unique username',
                            example: 'john_doe'
                          },
                          email: {
                            type: 'string',
                            format: 'email',
                            description: 'User email address',
                            example: 'john@example.com'
                          },
                          password: {
                            type: 'string',
                            description: 'User password (minimum 6 characters)',
                            example: 'password123'
                          }
                        }
                      }
                    }
                  }
                },
                responses: {
                  200: {
                    description: 'Registration successful with user profile and role information',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            jwt: {
                              type: 'string',
                              description: 'JWT token for authentication',
                              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                            },
                            user: {
                              allOf: [
                                { $ref: '#/components/schemas/User' },
                                {
                                  type: 'object',
                                  properties: {
                                    role: {
                                      type: 'object',
                                      properties: {
                                        id: { type: 'integer', example: 1 },
                                        name: { type: 'string', example: 'Authenticated' },
                                        type: { type: 'string', example: 'authenticated' },
                                        description: { type: 'string', example: 'Default role given to authenticated user.' }
                                      },
                                      description: 'Complete user role information'
                                    }
                                  }
                                }
                              ]
                            }
                          }
                        }
                      }
                    }
                  },
                  400: {
                    description: 'Registration failed - validation errors',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            error: {
                              type: 'object',
                              properties: {
                                message: { type: 'string', example: 'Email or Username are already taken' }
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
            '/user-delete/{id}': {
              delete: {
                tags: ['User Management'],
                summary: 'Delete a user',
                description: 'Delete a user by documentId. Users can delete their own account or admins can delete any user.',
                security: [{ bearerAuth: [] }],
                parameters: [
                  {
                    name: 'id',
                    in: 'path',
                    required: true,
                    schema: { type: 'string' },
                    description: 'User documentId (24-character alphanumeric string)'
                  }
                ],
                responses: {
                  200: {
                    description: 'User deleted successfully',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            data: {
                              type: 'object',
                              properties: {
                                id: { type: 'integer' },
                                documentId: { type: 'string' },
                                username: { type: 'string' },
                                email: { type: 'string' }
                              }
                            },
                            message: { type: 'string', example: 'User deleted successfully' }
                          }
                        }
                      }
                    }
                  },
                  401: { description: 'Unauthorized' },
                  403: { description: 'Forbidden - Can only delete own account or must be admin' },
                  404: { description: 'User not found' }
                }
              }
            },
            '/user-management': {
              get: {
                tags: ['User Management'],
                summary: 'Get list of users',
                description: 'Get paginated list of users with optional filtering',
                security: [{ bearerAuth: [] }],
                parameters: [
                  {
                    name: 'page',
                    in: 'query',
                    required: false,
                    schema: { type: 'integer', default: 1, minimum: 1 },
                    description: 'Page number'
                  },
                  {
                    name: 'pageSize',
                    in: 'query',
                    required: false,
                    schema: { type: 'integer', default: 25, minimum: 1, maximum: 100 },
                    description: 'Number of users per page'
                  },
                  {
                    name: 'search',
                    in: 'query',
                    required: false,
                    schema: { type: 'string' },
                    description: 'Search in username and email'
                  },
                  {
                    name: 'confirmed',
                    in: 'query',
                    required: false,
                    schema: { type: 'boolean' },
                    description: 'Filter by confirmed status'
                  },
                  {
                    name: 'blocked',
                    in: 'query',
                    required: false,
                    schema: { type: 'boolean' },
                    description: 'Filter by blocked status'
                  }
                ],
                responses: {
                  '200': {
                    description: 'List of users with pagination',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            data: {
                              type: 'array',
                              items: { $ref: '#/components/schemas/User' }
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
                  '401': {
                    description: 'Authentication required'
                  }
                }
              }
            },
            '/users': {
              post: {
                tags: ['User Management'],
                summary: 'Create a new user',
                description: 'Create a new user with comprehensive profile information. Only username, email, and password are required.',
                security: [{ bearerAuth: [] }],
                requestBody: {
                  required: true,
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        required: ['username', 'email', 'password'],
                        properties: {
                          username: {
                            type: 'string',
                            minLength: 3,
                            description: 'Unique username (required)',
                            example: 'john_doe'
                          },
                          email: {
                            type: 'string',
                            format: 'email',
                            description: 'User email address (required)',
                            example: 'john@example.com'
                          },
                          password: {
                            type: 'string',
                            minLength: 6,
                            description: 'User password (required, minimum 6 characters)',
                            example: 'SecurePass123'
                          },
                          date_of_birth: {
                            type: 'string',
                            format: 'date',
                            description: 'Date of birth (optional)',
                            example: '1990-01-15'
                          },
                          address: {
                            type: 'string',
                            description: 'Full address (optional)',
                            example: '123 Nguyen Hue Street, District 1'
                          },
                          phone: {
                            type: 'string',
                            description: 'Phone number (optional)',
                            example: '+84901234567'
                          },
                          facebook: {
                            type: 'string',
                            description: 'Facebook profile URL (optional)',
                            example: 'https://facebook.com/johndoe'
                          },
                          twitter: {
                            type: 'string',
                            description: 'Twitter profile URL (optional)',
                            example: 'https://twitter.com/johndoe'
                          },
                          city: {
                            type: 'string',
                            description: 'City (optional)',
                            example: 'Ho Chi Minh City'
                          },
                          country: {
                            type: 'string',
                            description: 'Country (optional)',
                            example: 'Vietnam'
                          },
                          gender: {
                            type: 'string',
                            enum: ['male', 'female', 'other'],
                            description: 'Gender (optional)',
                            example: 'male'
                          }
                        }
                      },
                      examples: {
                        'minimal-user': {
                          summary: 'Minimal user creation (required fields only)',
                          value: {
                            username: 'john_doe',
                            email: 'john@example.com',
                            password: 'SecurePass123'
                          }
                        },
                        'complete-user': {
                          summary: 'Complete user profile',
                          value: {
                            username: 'jane_smith',
                            email: 'jane@example.com',
                            password: 'SecurePass123',
                            date_of_birth: '1992-05-20',
                            address: '456 Le Loi Street, District 3',
                            phone: '+84987654321',
                            facebook: 'https://facebook.com/janesmith',
                            twitter: 'https://twitter.com/janesmith',
                            city: 'Ho Chi Minh City',
                            country: 'Vietnam',
                            gender: 'female'
                          }
                        }
                      }
                    }
                  }
                },
                responses: {
                  200: {
                    description: 'User created successfully',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            data: { $ref: '#/components/schemas/User' },
                            message: { type: 'string', example: 'User created successfully' }
                          }
                        }
                      }
                    }
                  },
                  400: {
                    description: 'Bad request - validation errors',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            error: {
                              type: 'object',
                              properties: {
                                message: {
                                  type: 'string',
                                  example: 'Username already taken'
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  },
                  401: { description: 'Authentication required' }
                }
              }
            },
            '/users/{id}': {
              put: {
                tags: ['User Management'],
                summary: 'Update user information',
                description: 'Update user profile with comprehensive information. All fields are optional for updates. **Important:** Use documentId (24-character string) for the id parameter, not numeric ID.',
                security: [{ bearerAuth: [] }],
                parameters: [
                  {
                    name: 'id',
                    in: 'path',
                    required: true,
                    schema: {
                      type: 'string',
                      pattern: '^[a-z0-9]{24}$',
                      example: 'pd6qqd1cix4pyhai5ya8xz7y'
                    },
                    description: 'User documentId (24-character alphanumeric string, not integer ID)'
                  }
                ],
                requestBody: {
                  required: true,
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          username: {
                            type: 'string',
                            minLength: 3,
                            description: 'Update username (optional)',
                            example: 'new_username'
                          },
                          email: {
                            type: 'string',
                            format: 'email',
                            description: 'Update email address (optional)',
                            example: 'newemail@example.com'
                          },
                          password: {
                            type: 'string',
                            minLength: 6,
                            description: 'Update password (optional)',
                            example: 'NewSecurePass123'
                          },
                          date_of_birth: {
                            type: 'string',
                            format: 'date',
                            description: 'Update date of birth (optional)',
                            example: '1990-01-15'
                          },
                          address: {
                            type: 'string',
                            description: 'Update address (optional)',
                            example: '789 Dong Khoi Street, District 1'
                          },
                          phone: {
                            type: 'string',
                            description: 'Update phone number (optional)',
                            example: '+84912345678'
                          },
                          facebook: {
                            type: 'string',
                            description: 'Update Facebook profile URL (optional)',
                            example: 'https://facebook.com/newprofile'
                          },
                          twitter: {
                            type: 'string',
                            description: 'Update Twitter profile URL (optional)',
                            example: 'https://twitter.com/newprofile'
                          },
                          city: {
                            type: 'string',
                            description: 'Update city (optional)',
                            example: 'Hanoi'
                          },
                          country: {
                            type: 'string',
                            description: 'Update country (optional)',
                            example: 'Vietnam'
                          },
                          gender: {
                            type: 'string',
                            enum: ['male', 'female', 'other'],
                            description: 'Update gender (optional)',
                            example: 'other'
                          }
                        }
                      },
                      examples: {
                        'update-profile': {
                          summary: 'Update profile information',
                          value: {
                            phone: '+84912345678',
                            city: 'Hanoi',
                            address: '789 Dong Khoi Street, District 1'
                          }
                        },
                        'update-credentials': {
                          summary: 'Update username and email',
                          value: {
                            username: 'new_username',
                            email: 'newemail@example.com'
                          }
                        },
                        'update-password': {
                          summary: 'Update password only',
                          value: {
                            password: 'NewSecurePass123'
                          }
                        }
                      }
                    }
                  }
                },
                responses: {
                  200: {
                    description: 'User updated successfully',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            data: { $ref: '#/components/schemas/User' },
                            message: { type: 'string', example: 'User updated successfully' }
                          }
                        }
                      }
                    }
                  },
                  400: {
                    description: 'Bad request - validation errors',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            error: {
                              type: 'object',
                              properties: {
                                message: {
                                  type: 'string',
                                  example: 'Email already taken'
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  },
                  401: { description: 'Authentication required' },
                  404: { description: 'User not found' }
                }
              }
            },
            '/orders/{id}/print-bill': {
              get: {
                tags: ['Orders'],
                summary: 'Print order bill as PDF',
                description: `
**Download order bill as PDF file**

This endpoint generates and downloads a professional PDF bill/invoice for the specified order.

**Features:**
- ✅ Professional invoice layout with company header
- ✅ Complete order details (ID, date, status)
- ✅ Customer information (name, email, address, phone)
- ✅ Itemized list of books with quantities and prices
- ✅ Subtotal and total calculations
- ✅ Order notes if provided
- ✅ Automatic PDF download with descriptive filename

**Security:**
- ✅ Authentication required
- ✅ Users can only print bills for their own orders
- ✅ Order ownership verification

**PDF Filename Format:**
\`bill-order-{order-id}-{date}.pdf\`

**Example:** \`bill-order-123-2025-06-15.pdf\`
                `,
                security: [{ bearerAuth: [] }],
                parameters: [
                  {
                    name: 'id',
                    in: 'path',
                    required: true,
                    schema: {
                      type: 'integer',
                      minimum: 1
                    },
                    description: 'Order ID (numeric ID, not documentId)',
                    example: 123
                  }
                ],
                responses: {
                  '200': {
                    description: 'PDF bill generated and downloaded successfully',
                    content: {
                      'application/pdf': {
                        schema: {
                          type: 'string',
                          format: 'binary',
                          description: 'PDF file containing the order bill/invoice'
                        }
                      }
                    },
                    headers: {
                      'Content-Type': {
                        description: 'MIME type of the response',
                        schema: {
                          type: 'string',
                          example: 'application/pdf'
                        }
                      },
                      'Content-Disposition': {
                        description: 'Attachment header with filename',
                        schema: {
                          type: 'string',
                          example: 'attachment; filename="bill-order-123-2025-06-15.pdf"'
                        }
                      },
                      'Content-Length': {
                        description: 'Size of the PDF file in bytes',
                        schema: {
                          type: 'string',
                          example: '25648'
                        }
                      }
                    }
                  },
                  '401': {
                    description: 'Authentication required',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            error: {
                              type: 'object',
                              properties: {
                                message: {
                                  type: 'string',
                                  example: 'Authentication required to print bill'
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  },
                  '403': {
                    description: 'Access forbidden - can only print bills for own orders',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            error: {
                              type: 'object',
                              properties: {
                                message: {
                                  type: 'string',
                                  example: 'You can only print bills for your own orders'
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  },
                  '404': {
                    description: 'Order not found',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            error: {
                              type: 'object',
                              properties: {
                                message: {
                                  type: 'string',
                                  example: 'Order not found'
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  },
                  '400': {
                    description: 'Error generating PDF',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            error: {
                              type: 'object',
                              properties: {
                                message: {
                                  type: 'string',
                                  example: 'Error generating bill PDF'
                                }
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
            '/orders/revenue/by-date': {
              get: {
                tags: ['Orders'],
                summary: 'Generate revenue report by specific date',
                description: `
**Download revenue report for a specific date as CSV**

This endpoint generates a comprehensive revenue report for a specific date, showing:
- Book name and quantity sold
- Total revenue per book
- Grand total for all sales

**Features:**
- ✅ CSV format for easy analysis in Excel/Google Sheets
- ✅ Only includes completed orders (confirmed, shipped, delivered)
- ✅ Sorted by revenue (highest first)
- ✅ Includes grand total summary
- ✅ Professional report header with date and generation time

**CSV Format:**
\`\`\`
"Revenue Report - 2025-06-15"
"Period: 2025-06-15 to 2025-06-15"
"Generated on: 6/15/2025, 10:30:00 AM"

"Book Name","Quantity Sold","Total Revenue"
"Modern JavaScript Guide",15,"750,000 VND"
"Python for Beginners",8,"400,000 VND"
"--- GRAND TOTAL ---",23,"1,150,000 VND"
\`\`\`

**File Download:**
- Automatic CSV download
- Filename: \`revenue-report-YYYY-MM-DD.csv\`
                `,
                security: [{ bearerAuth: [] }],
                parameters: [
                  {
                    name: 'date',
                    in: 'query',
                    required: true,
                    schema: {
                      type: 'string',
                      format: 'date',
                      pattern: '^\\d{4}-\\d{2}-\\d{2}$'
                    },
                    description: 'Date for revenue report (YYYY-MM-DD format)',
                    example: '2025-06-15'
                  }
                ],
                responses: {
                  '200': {
                    description: 'CSV revenue report generated and downloaded successfully',
                    content: {
                      'text/csv': {
                        schema: {
                          type: 'string',
                          format: 'binary',
                          description: 'CSV file containing the revenue report'
                        }
                      }
                    },
                    headers: {
                      'Content-Type': {
                        description: 'MIME type of the response',
                        schema: {
                          type: 'string',
                          example: 'text/csv'
                        }
                      },
                      'Content-Disposition': {
                        description: 'Attachment header with filename',
                        schema: {
                          type: 'string',
                          example: 'attachment; filename="revenue-report-2025-06-15.csv"'
                        }
                      }
                    }
                  },
                  '400': {
                    description: 'Bad request - Invalid or missing date parameter',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            error: {
                              type: 'object',
                              properties: {
                                message: { type: 'string' }
                              }
                            }
                          }
                        },
                        examples: {
                          'missing-date': {
                            summary: 'Missing date parameter',
                            value: {
                              error: {
                                message: 'Date parameter is required (format: YYYY-MM-DD)'
                              }
                            }
                          },
                          'invalid-date': {
                            summary: 'Invalid date format',
                            value: {
                              error: {
                                message: 'Invalid date format. Use YYYY-MM-DD format'
                              }
                            }
                          }
                        }
                      }
                    }
                  },
                  '401': {
                    description: 'Authentication required',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            error: {
                              type: 'object',
                              properties: {
                                message: {
                                  type: 'string',
                                  example: 'Authentication required to access revenue reports'
                                }
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
            '/orders/revenue/by-duration': {
              get: {
                tags: ['Orders'],
                summary: 'Generate revenue report by date range',
                description: `
**Download revenue report for a date range as CSV**

This endpoint generates a comprehensive revenue report for a specified date range, showing:
- Book name and total quantity sold during the period
- Total revenue per book during the period
- Grand total for all sales in the period

**Features:**
- ✅ CSV format for easy analysis in Excel/Google Sheets
- ✅ Only includes completed orders (confirmed, shipped, delivered)
- ✅ Sorted by revenue (highest first)
- ✅ Includes grand total summary
- ✅ Professional report header with date range and generation time

**CSV Format:**
\`\`\`
"Revenue Report - 2025-06-01 to 2025-06-15"
"Period: 2025-06-01 to 2025-06-15"
"Generated on: 6/15/2025, 10:30:00 AM"

"Book Name","Quantity Sold","Total Revenue"
"Modern JavaScript Guide",45,"2,250,000 VND"
"Python for Beginners",32,"1,600,000 VND"
"React Handbook",28,"1,400,000 VND"
"--- GRAND TOTAL ---",105,"5,250,000 VND"
\`\`\`

**File Download:**
- Automatic CSV download
- Filename: \`revenue-report-YYYY-MM-DD-to-YYYY-MM-DD.csv\`
                `,
                security: [{ bearerAuth: [] }],
                parameters: [
                  {
                    name: 'startDate',
                    in: 'query',
                    required: true,
                    schema: {
                      type: 'string',
                      format: 'date',
                      pattern: '^\\d{4}-\\d{2}-\\d{2}$'
                    },
                    description: 'Start date for revenue report (YYYY-MM-DD format)',
                    example: '2025-06-01'
                  },
                  {
                    name: 'endDate',
                    in: 'query',
                    required: true,
                    schema: {
                      type: 'string',
                      format: 'date',
                      pattern: '^\\d{4}-\\d{2}-\\d{2}$'
                    },
                    description: 'End date for revenue report (YYYY-MM-DD format)',
                    example: '2025-06-15'
                  }
                ],
                responses: {
                  '200': {
                    description: 'CSV revenue report generated and downloaded successfully',
                    content: {
                      'text/csv': {
                        schema: {
                          type: 'string',
                          format: 'binary',
                          description: 'CSV file containing the revenue report'
                        }
                      }
                    },
                    headers: {
                      'Content-Type': {
                        description: 'MIME type of the response',
                        schema: {
                          type: 'string',
                          example: 'text/csv'
                        }
                      },
                      'Content-Disposition': {
                        description: 'Attachment header with filename',
                        schema: {
                          type: 'string',
                          example: 'attachment; filename="revenue-report-2025-06-01-to-2025-06-15.csv"'
                        }
                      }
                    }
                  },
                  '400': {
                    description: 'Bad request - Invalid or missing date parameters',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            error: {
                              type: 'object',
                              properties: {
                                message: { type: 'string' }
                              }
                            }
                          }
                        },
                        examples: {
                          'missing-dates': {
                            summary: 'Missing date parameters',
                            value: {
                              error: {
                                message: 'Both startDate and endDate parameters are required (format: YYYY-MM-DD)'
                              }
                            }
                          },
                          'invalid-dates': {
                            summary: 'Invalid date format',
                            value: {
                              error: {
                                message: 'Invalid date format. Use YYYY-MM-DD format'
                              }
                            }
                          },
                          'invalid-range': {
                            summary: 'Invalid date range',
                            value: {
                              error: {
                                message: 'Start date must be before or equal to end date'
                              }
                            }
                          }
                        }
                      }
                    }
                  },
                  '401': {
                    description: 'Authentication required',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            error: {
                              type: 'object',
                              properties: {
                                message: {
                                  type: 'string',
                                  example: 'Authentication required to access revenue reports'
                                }
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
            '/orders/admin/all-orders': {
              get: {
                tags: ['Orders'],
                summary: 'Get all orders from all users (Admin only)',
                description: 'Get paginated list of all orders from all users with advanced filtering. Requires admin role.',
                security: [{ bearerAuth: [] }],
                parameters: [
                  {
                    name: 'page',
                    in: 'query',
                    required: false,
                    schema: { type: 'integer', default: 1, minimum: 1 },
                    description: 'Page number'
                  },
                  {
                    name: 'pageSize',
                    in: 'query',
                    required: false,
                    schema: { type: 'integer', default: 25, minimum: 1, maximum: 100 },
                    description: 'Number of orders per page'
                  },
                  {
                    name: 'status',
                    in: 'query',
                    required: false,
                    schema: {
                      type: 'string',
                      enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']
                    },
                    description: 'Filter by order status'
                  },
                  {
                    name: 'sort',
                    in: 'query',
                    required: false,
                    schema: { type: 'string', default: 'createdAt:desc' },
                    description: 'Sort orders (e.g., createdAt:desc, total_amount:asc)'
                  },
                  {
                    name: 'search',
                    in: 'query',
                    required: false,
                    schema: { type: 'string' },
                    description: 'Search in username, email, shipping address, or phone'
                  },
                  {
                    name: 'startDate',
                    in: 'query',
                    required: false,
                    schema: { type: 'string', format: 'date' },
                    description: 'Filter orders from this date (YYYY-MM-DD)'
                  },
                  {
                    name: 'endDate',
                    in: 'query',
                    required: false,
                    schema: { type: 'string', format: 'date' },
                    description: 'Filter orders until this date (YYYY-MM-DD)'
                  }
                ],
                responses: {
                  200: {
                    description: 'All orders retrieved successfully',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            data: {
                              type: 'array',
                              items: { $ref: '#/components/schemas/Order' }
                            },
                            meta: {
                              type: 'object',
                              properties: {
                                pagination: {
                                  type: 'object',
                                  properties: {
                                    page: { type: 'integer', example: 1 },
                                    pageSize: { type: 'integer', example: 25 },
                                    pageCount: { type: 'integer', example: 10 },
                                    total: { type: 'integer', example: 250 }
                                  }
                                }
                              }
                            },
                            message: { type: 'string', example: 'All orders retrieved successfully' }
                          }
                        }
                      }
                    }
                  },
                  401: { description: 'Unauthorized' },
                  403: { description: 'Forbidden - Admin access required' }
                }
              }
            },
            '/orders/admin/export-csv': {
              get: {
                tags: ['Orders'],
                summary: 'Export all orders to CSV (Admin only)',
                description: 'Export all orders with detailed user information to CSV file. Supports same filtering as all-orders API. Requires admin role.',
                security: [{ bearerAuth: [] }],
                parameters: [
                  {
                    name: 'status',
                    in: 'query',
                    required: false,
                    schema: {
                      type: 'string',
                      enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']
                    },
                    description: 'Filter by order status'
                  },
                  {
                    name: 'search',
                    in: 'query',
                    required: false,
                    schema: { type: 'string' },
                    description: 'Search in username, email, shipping address, or phone'
                  },
                  {
                    name: 'startDate',
                    in: 'query',
                    required: false,
                    schema: { type: 'string', format: 'date' },
                    description: 'Filter orders from this date (YYYY-MM-DD)'
                  },
                  {
                    name: 'endDate',
                    in: 'query',
                    required: false,
                    schema: { type: 'string', format: 'date' },
                    description: 'Filter orders until this date (YYYY-MM-DD)'
                  }
                ],
                responses: {
                  200: {
                    description: 'CSV file with orders data',
                    content: {
                      'text/csv': {
                        schema: {
                          type: 'string',
                          example: 'Order ID,Document ID,Order Date,Customer Name,Customer Email,Customer Phone,Status,Total Amount,Shipping Address,Books,Quantities,Notes\n1,abc123,2025-06-19,john_doe,john@example.com,+84901234567,pending,75000,"123 Main St","Book 1; Book 2","2; 1","Special delivery"'
                        }
                      }
                    },
                    headers: {
                      'Content-Disposition': {
                        description: 'Attachment filename',
                        schema: { type: 'string', example: 'attachment; filename="orders-export-2025-06-19.csv"' }
                      }
                    }
                  },
                  401: { description: 'Unauthorized' },
                  403: { description: 'Forbidden - Admin access required' }
                }
              }
            },
            '/orders/my-orders': {
              get: {
                tags: ['Orders'],
                summary: 'Get current user orders',
                description: 'Get paginated list of orders for the authenticated user with optional status filtering',
                security: [{ bearerAuth: [] }],
                parameters: [
                  {
                    name: 'page',
                    in: 'query',
                    required: false,
                    schema: { type: 'integer', default: 1, minimum: 1 },
                    description: 'Page number'
                  },
                  {
                    name: 'pageSize',
                    in: 'query',
                    required: false,
                    schema: { type: 'integer', default: 10, minimum: 1, maximum: 100 },
                    description: 'Number of orders per page'
                  },
                  {
                    name: 'status',
                    in: 'query',
                    required: false,
                    schema: {
                      type: 'string',
                      enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']
                    },
                    description: 'Filter by order status'
                  },
                  {
                    name: 'sort',
                    in: 'query',
                    required: false,
                    schema: { type: 'string', default: 'createdAt:desc' },
                    description: 'Sort orders (e.g., createdAt:desc, total_amount:asc)'
                  }
                ],
                responses: {
                  200: {
                    description: 'Orders retrieved successfully',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            data: {
                              type: 'array',
                              items: { $ref: '#/components/schemas/Order' }
                            },
                            message: { type: 'string', example: 'Orders retrieved successfully' }
                          }
                        }
                      }
                    }
                  },
                  401: { description: 'Unauthorized' }
                }
              }
            },
            '/orders/detail/{id}': {
              get: {
                tags: ['Orders'],
                summary: 'Get order details',
                description: 'Get detailed information about a specific order by documentId. **Important:** This endpoint expects documentId (24-character string), not integer ID.',
                security: [{ bearerAuth: [] }],
                parameters: [
                  {
                    name: 'id',
                    in: 'path',
                    required: true,
                    schema: {
                      type: 'string',
                      pattern: '^[a-z0-9]{24}$',
                      example: 'order123documentid567890'
                    },
                    description: 'Order documentId (24-character alphanumeric string, not integer ID)'
                  }
                ],
                responses: {
                  200: {
                    description: 'Order details retrieved successfully',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            data: { $ref: '#/components/schemas/Order' },
                            message: { type: 'string', example: 'Order details retrieved successfully' }
                          }
                        }
                      }
                    }
                  },
                  401: { description: 'Unauthorized' },
                  403: { description: 'Forbidden - Can only view own orders' },
                  404: { description: 'Order not found' }
                }
              }
            },
            '/reports/revenue': {
              get: {
                tags: ['Reports'],
                summary: 'Get comprehensive revenue report',
                description: 'Generate detailed revenue report with optional date filtering, category/author filtering, time series grouping, and CSV export',
                parameters: [
                  {
                    name: 'startDate',
                    in: 'query',
                    description: 'Start date (YYYY-MM-DD)',
                    required: false,
                    schema: { type: 'string', format: 'date' }
                  },
                  {
                    name: 'endDate',
                    in: 'query',
                    description: 'End date (YYYY-MM-DD)',
                    required: false,
                    schema: { type: 'string', format: 'date' }
                  },
                  {
                    name: 'date',
                    in: 'query',
                    description: 'Single date filter (YYYY-MM-DD)',
                    required: false,
                    schema: { type: 'string', format: 'date' }
                  },
                  {
                    name: 'groupBy',
                    in: 'query',
                    description: 'Group results by time period for time series analysis',
                    required: false,
                    schema: { type: 'string', enum: ['day', 'week', 'month', 'year'] }
                  },
                  {
                    name: 'categoryId',
                    in: 'query',
                    description: 'Filter by category ID',
                    required: false,
                    schema: { type: 'integer' }
                  },
                  {
                    name: 'authorId',
                    in: 'query',
                    description: 'Filter by author ID',
                    required: false,
                    schema: { type: 'integer' }
                  },
                  {
                    name: 'format',
                    in: 'query',
                    description: 'Response format',
                    required: false,
                    schema: { type: 'string', enum: ['json', 'csv'], default: 'json' }
                  }
                ],
                responses: {
                  200: {
                    description: 'Revenue report generated successfully',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            data: {
                              type: 'object',
                              properties: {
                                summary: {
                                  type: 'object',
                                  properties: {
                                    totalRevenue: { type: 'integer' },
                                    totalOrders: { type: 'integer' },
                                    totalItemsSold: { type: 'integer' },
                                    averageOrderValue: { type: 'integer' }
                                  }
                                },
                                bookSales: {
                                  type: 'array',
                                  items: {
                                    type: 'object',
                                    properties: {
                                      bookId: { type: 'integer' },
                                      bookName: { type: 'string' },
                                      quantitySold: { type: 'integer' },
                                      totalRevenue: { type: 'integer' },
                                      unitPrice: { type: 'integer' }
                                    }
                                  }
                                },
                                grandTotal: { type: 'integer' }
                              }
                            },
                            message: { type: 'string' }
                          }
                        }
                      },
                      'text/csv': {
                        schema: { type: 'string' }
                      }
                    }
                  }
                }
              }
            },
            '/reports/revenue/trends': {
              get: {
                tags: ['Reports'],
                summary: 'Get revenue trends over time',
                description: 'Generate time-series revenue data showing trends over different periods with automatic grouping',
                parameters: [
                  {
                    name: 'period',
                    in: 'query',
                    description: 'Time period for analysis',
                    required: false,
                    schema: {
                      type: 'string',
                      enum: ['last7days', 'last30days', 'last3months', 'last6months', 'lastyear'],
                      default: 'last30days'
                    }
                  },
                  {
                    name: 'groupBy',
                    in: 'query',
                    description: 'Override automatic grouping (auto-selected based on period if not specified)',
                    required: false,
                    schema: { type: 'string', enum: ['day', 'week', 'month'] }
                  }
                ],
                responses: {
                  200: {
                    description: 'Revenue trends generated successfully',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            data: {
                              type: 'object',
                              properties: {
                                period: { type: 'string', example: 'last30days' },
                                groupBy: { type: 'string', example: 'day' },
                                timeSeries: {
                                  type: 'array',
                                  items: {
                                    type: 'object',
                                    properties: {
                                      period: { type: 'string', example: '2025-06-21' },
                                      label: { type: 'string', example: '6/21/2025' },
                                      revenue: { type: 'integer', example: 150000 },
                                      orders: { type: 'integer', example: 5 },
                                      itemsSold: { type: 'integer', example: 12 },
                                      averageOrderValue: { type: 'integer', example: 30000 }
                                    }
                                  }
                                },
                                summary: {
                                  type: 'object',
                                  properties: {
                                    totalRevenue: { type: 'integer' },
                                    totalOrders: { type: 'integer' },
                                    averageRevenuePerPeriod: { type: 'integer' }
                                  }
                                }
                              }
                            },
                            message: { type: 'string' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            '/reports/revenue/top-books': {
              get: {
                tags: ['Reports'],
                summary: 'Get top performing books by revenue',
                description: 'Get the highest revenue-generating books with detailed performance metrics',
                parameters: [
                  {
                    name: 'startDate',
                    in: 'query',
                    description: 'Start date (YYYY-MM-DD)',
                    required: false,
                    schema: { type: 'string', format: 'date' }
                  },
                  {
                    name: 'endDate',
                    in: 'query',
                    description: 'End date (YYYY-MM-DD)',
                    required: false,
                    schema: { type: 'string', format: 'date' }
                  },
                  {
                    name: 'limit',
                    in: 'query',
                    description: 'Number of top books to return',
                    required: false,
                    schema: { type: 'integer', default: 10, minimum: 1, maximum: 100 }
                  },
                  {
                    name: 'categoryId',
                    in: 'query',
                    description: 'Filter by category ID',
                    required: false,
                    schema: { type: 'integer' }
                  }
                ],
                responses: {
                  200: {
                    description: 'Top performing books retrieved successfully',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            data: {
                              type: 'object',
                              properties: {
                                topBooks: {
                                  type: 'array',
                                  items: {
                                    type: 'object',
                                    properties: {
                                      bookId: { type: 'integer' },
                                      bookName: { type: 'string' },
                                      categories: { type: 'string' },
                                      authors: { type: 'string' },
                                      unitPrice: { type: 'integer' },
                                      totalRevenue: { type: 'integer' },
                                      quantitySold: { type: 'integer' },
                                      orderCount: { type: 'integer' }
                                    }
                                  }
                                },
                                summary: {
                                  type: 'object',
                                  properties: {
                                    totalBooksAnalyzed: { type: 'integer' },
                                    totalRevenue: { type: 'integer' },
                                    totalQuantitySold: { type: 'integer' }
                                  }
                                }
                              }
                            },
                            message: { type: 'string' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            '/reports/inventory': {
              get: {
                tags: ['Reports'],
                summary: 'Get comprehensive inventory report',
                description: 'Generate detailed inventory report showing books sold, remaining stock, and sales analytics',
                parameters: [
                  {
                    name: 'startDate',
                    in: 'query',
                    description: 'Start date for sales data (YYYY-MM-DD)',
                    required: false,
                    schema: { type: 'string', format: 'date' }
                  },
                  {
                    name: 'endDate',
                    in: 'query',
                    description: 'End date for sales data (YYYY-MM-DD)',
                    required: false,
                    schema: { type: 'string', format: 'date' }
                  },
                  {
                    name: 'categoryId',
                    in: 'query',
                    description: 'Filter by category ID',
                    required: false,
                    schema: { type: 'integer' }
                  },
                  {
                    name: 'format',
                    in: 'query',
                    description: 'Response format',
                    required: false,
                    schema: { type: 'string', enum: ['json', 'csv'], default: 'json' }
                  }
                ],
                responses: {
                  200: {
                    description: 'Inventory report generated successfully',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            data: {
                              type: 'object',
                              properties: {
                                summary: {
                                  type: 'object',
                                  properties: {
                                    totalBooks: { type: 'integer' },
                                    totalItemsSold: { type: 'integer' },
                                    totalRevenue: { type: 'integer' },
                                    lowStockCount: { type: 'integer' }
                                  }
                                },
                                books: {
                                  type: 'array',
                                  items: {
                                    type: 'object',
                                    properties: {
                                      bookId: { type: 'integer' },
                                      bookName: { type: 'string' },
                                      currentStock: { type: 'integer' },
                                      quantitySold: { type: 'integer' },
                                      revenue: { type: 'integer' },
                                      categories: { type: 'string' },
                                      authors: { type: 'string' },
                                      unitPrice: { type: 'integer' }
                                    }
                                  }
                                },
                                lowStockBooks: {
                                  type: 'array',
                                  items: {
                                    type: 'object',
                                    properties: {
                                      bookId: { type: 'integer' },
                                      bookName: { type: 'string' },
                                      currentStock: { type: 'integer' }
                                    }
                                  }
                                }
                              }
                            },
                            message: { type: 'string' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            '/reports/inventory/low-stock': {
              get: {
                tags: ['Reports'],
                summary: 'Get low stock alert report',
                description: 'Generate report of books with low inventory levels requiring restocking attention',
                parameters: [
                  {
                    name: 'threshold',
                    in: 'query',
                    description: 'Minimum stock level for alert (default: 10)',
                    required: false,
                    schema: { type: 'integer', default: 10, minimum: 0 }
                  },
                  {
                    name: 'categoryId',
                    in: 'query',
                    description: 'Filter by category ID',
                    required: false,
                    schema: { type: 'integer' }
                  },
                  {
                    name: 'sortBy',
                    in: 'query',
                    description: 'Sort results by field',
                    required: false,
                    schema: { type: 'string', enum: ['quantity', 'name', 'lastSold'], default: 'quantity' }
                  }
                ],
                responses: {
                  200: {
                    description: 'Low stock report generated successfully',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            data: {
                              type: 'object',
                              properties: {
                                lowStockBooks: {
                                  type: 'array',
                                  items: {
                                    type: 'object',
                                    properties: {
                                      bookId: { type: 'integer' },
                                      bookName: { type: 'string' },
                                      currentStock: { type: 'integer' },
                                      threshold: { type: 'integer' },
                                      stockStatus: { type: 'string', enum: ['OUT_OF_STOCK', 'LOW_STOCK'] },
                                      categories: { type: 'string' },
                                      authors: { type: 'string' },
                                      unitPrice: { type: 'integer' },
                                      lastSoldDate: { type: 'string', format: 'date-time', nullable: true },
                                      daysSinceLastSold: { type: 'integer', nullable: true }
                                    }
                                  }
                                },
                                summary: {
                                  type: 'object',
                                  properties: {
                                    totalBooksAnalyzed: { type: 'integer' },
                                    outOfStockCount: { type: 'integer' },
                                    lowStockCount: { type: 'integer' },
                                    threshold: { type: 'integer' },
                                    criticalBooks: { type: 'integer' }
                                  }
                                }
                              }
                            },
                            message: { type: 'string' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            '/reports/inventory/movement': {
              get: {
                tags: ['Reports'],
                summary: 'Get inventory movement report',
                description: 'Generate detailed report of inventory movements and stock changes over time',
                parameters: [
                  {
                    name: 'startDate',
                    in: 'query',
                    description: 'Start date for movement analysis (YYYY-MM-DD)',
                    required: false,
                    schema: { type: 'string', format: 'date' }
                  },
                  {
                    name: 'endDate',
                    in: 'query',
                    description: 'End date for movement analysis (YYYY-MM-DD)',
                    required: false,
                    schema: { type: 'string', format: 'date' }
                  },
                  {
                    name: 'bookId',
                    in: 'query',
                    description: 'Analyze specific book movements',
                    required: false,
                    schema: { type: 'integer' }
                  },
                  {
                    name: 'categoryId',
                    in: 'query',
                    description: 'Filter by category ID',
                    required: false,
                    schema: { type: 'integer' }
                  }
                ],
                responses: {
                  200: {
                    description: 'Inventory movement report generated successfully',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            data: {
                              type: 'object',
                              properties: {
                                movementData: {
                                  type: 'array',
                                  items: {
                                    type: 'object',
                                    properties: {
                                      bookId: { type: 'integer' },
                                      bookName: { type: 'string' },
                                      currentStock: { type: 'integer' },
                                      categories: { type: 'string' },
                                      authors: { type: 'string' },
                                      totalMovements: { type: 'integer' },
                                      totalQuantityMoved: { type: 'integer' },
                                      averageMovementSize: { type: 'integer' },
                                      lastMovementDate: { type: 'string', format: 'date-time', nullable: true },
                                      movements: {
                                        type: 'array',
                                        items: {
                                          type: 'object',
                                          properties: {
                                            date: { type: 'string', format: 'date-time' },
                                            quantity: { type: 'integer' },
                                            orderStatus: { type: 'string' },
                                            unitPrice: { type: 'integer' },
                                            totalPrice: { type: 'integer' }
                                          }
                                        }
                                      }
                                    }
                                  }
                                },
                                summary: {
                                  type: 'object',
                                  properties: {
                                    totalBooksAnalyzed: { type: 'integer' },
                                    totalMovements: { type: 'integer' },
                                    totalQuantityMoved: { type: 'integer' },
                                    averageMovementPerBook: { type: 'integer' }
                                  }
                                }
                              }
                            },
                            message: { type: 'string' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            '/reports/dashboard': {
              get: {
                tags: ['Reports'],
                summary: 'Get dashboard metrics',
                description: 'Get key business metrics for dashboard display',
                responses: {
                  200: {
                    description: 'Dashboard data retrieved successfully'
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
            DocumentIdNote: {
              type: 'object',
              description: 'Important: In Strapi v5, use documentId (alphanumeric string) for PUT/DELETE operations, not the numeric id. GET operations accept both.',
              properties: {
                id: { type: 'integer', description: 'Numeric ID - use for GET requests only', example: 133 },
                documentId: {
                  type: 'string',
                  pattern: '^[a-z0-9]{24}$',
                  description: 'Document ID (24-character alphanumeric string) - required for PUT/DELETE requests',
                  example: 'o9m182bqf02l0zjrq8weqfwz'
                }
              }
            },
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
              description: 'Complete user profile with all available fields',
              properties: {
                id: { type: 'integer', example: 1, description: 'Numeric user ID' },
                documentId: { type: 'string', example: 'pd6qqd1cix4pyhai5ya8xz7y', description: '24-character document ID' },
                username: {
                  type: 'string',
                  example: 'john_doe',
                  description: 'Unique username (required for creation)'
                },
                email: {
                  type: 'string',
                  format: 'email',
                  example: 'john@example.com',
                  description: 'User email address (required for creation)'
                },
                confirmed: {
                  type: 'boolean',
                  example: true,
                  description: 'Whether user email is confirmed'
                },
                blocked: {
                  type: 'boolean',
                  example: false,
                  description: 'Whether user account is blocked'
                },
                provider: {
                  type: 'string',
                  example: 'local',
                  description: 'Authentication provider (local, google, etc.)'
                },
                role: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer', example: 1 },
                    name: { type: 'string', example: 'Authenticated' },
                    type: { type: 'string', example: 'authenticated' },
                    description: { type: 'string', example: 'Default role given to authenticated user.' }
                  },
                  description: 'User role information with permissions'
                },
                date_of_birth: {
                  type: 'string',
                  format: 'date',
                  example: '1990-01-15',
                  description: 'Date of birth (optional)'
                },
                address: {
                  type: 'string',
                  example: '123 Nguyen Hue Street, District 1',
                  description: 'Full address (optional)'
                },
                phone: {
                  type: 'string',
                  example: '+84901234567',
                  description: 'Phone number (optional)'
                },
                facebook: {
                  type: 'string',
                  example: 'https://facebook.com/johndoe',
                  description: 'Facebook profile URL (optional)'
                },
                twitter: {
                  type: 'string',
                  example: 'https://twitter.com/johndoe',
                  description: 'Twitter profile URL (optional)'
                },
                city: {
                  type: 'string',
                  example: 'Ho Chi Minh City',
                  description: 'City (optional)'
                },
                country: {
                  type: 'string',
                  example: 'Vietnam',
                  description: 'Country (optional)'
                },
                gender: {
                  type: 'string',
                  enum: ['male', 'female', 'other'],
                  example: 'male',
                  description: 'Gender (optional)'
                },
                birthday: {
                  type: 'string',
                  format: 'date',
                  example: '1990-01-01',
                  description: 'Birthday field (legacy, use date_of_birth instead)'
                },
                createdAt: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Account creation timestamp'
                },
                updatedAt: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Last update timestamp'
                },
                publishedAt: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Publication timestamp'
                }
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
            Pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer', example: 1, description: 'Current page number' },
                pageSize: { type: 'integer', example: 25, description: 'Number of items per page' },
                pageCount: { type: 'integer', example: 10, description: 'Total number of pages' },
                total: { type: 'integer', example: 250, description: 'Total number of items' }
              }
            },
            OrderItem: {
              type: 'object',
              properties: {
                id: { type: 'integer', example: 1 },
                documentId: { type: 'string', example: 'item123abc' },
                quantity: { type: 'integer', example: 2, minimum: 1 },
                unit_price: { type: 'integer', example: 25000, description: 'Unit price in VND' },
                total_price: { type: 'integer', example: 50000, description: 'Total price in VND' },
                book: { $ref: '#/components/schemas/Book' },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' }
              }
            },
            CreateOrderRequest: {
              type: 'object',
              required: ['items'],
              properties: {
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['book_id', 'quantity'],
                    properties: {
                      book_id: {
                        type: 'integer',
                        example: 1,
                        description: 'The ID of the book you want to order (NOT order item ID). This is the book.id from GET /api/books'
                      },
                      quantity: {
                        type: 'integer',
                        example: 2,
                        minimum: 1,
                        description: 'How many copies of this book you want to order'
                      }
                    },
                    description: 'Book order item - specify which book and how many copies'
                  },
                  minItems: 1,
                  description: 'Array of books to order. Each item specifies a book ID and quantity. Order items are created automatically.'
                },
                shipping_address: {
                  type: 'string',
                  example: '123 Nguyen Hue Street, Ho Chi Minh City',
                  description: 'Delivery address (optional)'
                },
                phone: {
                  type: 'string',
                  example: '+84901234567',
                  description: 'Contact phone number (optional)'
                },
                notes: {
                  type: 'string',
                  example: 'Please deliver in the morning',
                  description: 'Special delivery instructions (optional)'
                }
              },
              example: {
                items: [
                  {
                    book_id: 1,
                    quantity: 2,
                    comment: "Order 2 copies of book with ID 1"
                  },
                  {
                    book_id: 3,
                    quantity: 1,
                    comment: "Order 1 copy of book with ID 3"
                  }
                ],
                shipping_address: '123 Nguyen Hue Street, Ho Chi Minh City',
                phone: '+84901234567',
                notes: 'Please deliver in the morning'
              }
            },
            Order: {
              type: 'object',
              description: 'Complete order created in a single API call with automatic inventory management',
              properties: {
                id: { type: 'integer', example: 1 },
                documentId: { type: 'string', example: 'order123abc' },
                total_amount: {
                  type: 'integer',
                  example: 75000,
                  description: 'Total amount in VND (automatically calculated)'
                },
                status: {
                  type: 'string',
                  enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
                  example: 'pending',
                  description: 'Order status (starts as pending)'
                },
                shipping_address: {
                  type: 'string',
                  example: '123 Nguyen Hue Street, Ho Chi Minh City',
                  description: 'Delivery address'
                },
                phone: {
                  type: 'string',
                  example: '+84901234567',
                  description: 'Contact phone number'
                },
                notes: {
                  type: 'string',
                  example: 'Please deliver in the morning',
                  description: 'Special delivery instructions'
                },
                order_items: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/OrderItem' },
                  description: 'All items in the order with book details'
                },
                user: {
                  $ref: '#/components/schemas/User',
                  description: 'User who placed the order'
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
          url: 'https://calm-health-1bc6166fbc.strapiapp.com/api',
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
