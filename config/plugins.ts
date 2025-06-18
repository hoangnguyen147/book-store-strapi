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
      },
      'x-strapi-config': {
        plugins: ['upload', 'users-permissions'],
        path: '/documentation',
        mutateDocumentation: (generatedDocumentationDraft) => {
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
              properties: {
                id: { type: 'integer', example: 1 },
                documentId: { type: 'string', example: 'user123abc' },
                username: { type: 'string', example: 'john_doe' },
                email: { type: 'string', format: 'email', example: 'john@example.com' },
                confirmed: { type: 'boolean', example: true },
                blocked: { type: 'boolean', example: false },
                role: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer', example: 1 },
                    name: { type: 'string', example: 'Authenticated' },
                    type: { type: 'string', example: 'authenticated' }
                  },
                  description: 'User role information'
                },
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
