/**
 * OpenAPI/Swagger 文档定义
 * 
 * 提供 API 文档用于调试和第三方集成
 */

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Start 书签管理系统 API',
    version: '1.1.5',
    description: `
Start 是一个现代化的书签管理系统，提供以下功能：
- 用户认证（注册、登录）
- 书签 CRUD 操作
- 标签管理
- 文件夹管理
- 图标管理
- 管理员功能

## 认证
大部分 API 需要 Bearer Token 认证。在登录成功后，将返回的 token 放在请求头中：
\`\`\`
Authorization: Bearer <token>
\`\`\`
    `,
    contact: {
      name: 'Start 项目',
      url: 'https://github.com/LZZLHY/TabN',
    },
  },
  servers: [
    {
      url: '/api',
      description: '当前服务器',
    },
  ],
  tags: [
    { name: 'Auth', description: '认证相关接口' },
    { name: 'Bookmarks', description: '书签管理接口' },
    { name: 'Users', description: '用户管理接口' },
    { name: 'Admin', description: '管理员接口' },
    { name: 'Health', description: '健康检查和监控接口' },
  ],
  paths: {
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: '用户注册',
        description: '创建新用户账号',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  username: { type: 'string', minLength: 3, maxLength: 32, description: '用户名（可选）' },
                  password: { type: 'string', minLength: 6, maxLength: 200, description: '密码' },
                  email: { type: 'string', format: 'email', description: '邮箱（可选）' },
                  phone: { type: 'string', description: '手机号（可选）' },
                  nickname: { type: 'string', minLength: 2, maxLength: 32, description: '昵称（可选）' },
                },
                required: ['password'],
              },
            },
          },
        },
        responses: {
          200: {
            description: '注册成功',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
              },
            },
          },
          400: { description: '参数错误' },
          409: { description: '账号已被占用' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: '用户登录',
        description: '使用账号密码登录',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  identifier: { type: 'string', description: '用户名/邮箱/手机号' },
                  password: { type: 'string', description: '密码' },
                },
                required: ['identifier', 'password'],
              },
            },
          },
        },
        responses: {
          200: {
            description: '登录成功',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
              },
            },
          },
          401: { description: '账号或密码错误' },
        },
      },
    },
    '/bookmarks': {
      get: {
        tags: ['Bookmarks'],
        summary: '获取书签列表',
        description: '获取当前用户的所有书签，支持标签筛选',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'tag',
            in: 'query',
            schema: { type: 'string' },
            description: '按标签筛选',
          },
        ],
        responses: {
          200: {
            description: '书签列表',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        items: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Bookmark' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: '未登录' },
        },
      },
      post: {
        tags: ['Bookmarks'],
        summary: '创建书签',
        description: '创建新的书签或文件夹',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateBookmarkRequest' },
            },
          },
        },
        responses: {
          200: {
            description: '创建成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        item: { $ref: '#/components/schemas/Bookmark' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: '参数错误' },
          401: { description: '未登录' },
        },
      },
    },
    '/bookmarks/{id}': {
      patch: {
        tags: ['Bookmarks'],
        summary: '更新书签',
        description: '更新书签信息',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: '书签 ID',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateBookmarkRequest' },
            },
          },
        },
        responses: {
          200: { description: '更新成功' },
          400: { description: '参数错误' },
          401: { description: '未登录' },
          404: { description: '书签不存在' },
        },
      },
      delete: {
        tags: ['Bookmarks'],
        summary: '删除书签',
        description: '删除指定书签',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: '书签 ID',
          },
        ],
        responses: {
          200: { description: '删除成功' },
          401: { description: '未登录' },
          404: { description: '书签不存在' },
        },
      },
    },
    '/bookmarks/tags': {
      get: {
        tags: ['Bookmarks'],
        summary: '获取标签列表',
        description: '获取当前用户的所有标签及使用次数',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: '标签列表',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        items: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              tag: { type: 'string' },
                              count: { type: 'integer' },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: '未登录' },
        },
      },
    },
    '/health': {
      get: {
        tags: ['Health'],
        summary: '健康检查',
        description: '检查服务是否正常运行',
        responses: {
          200: {
            description: '服务正常',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
              },
            },
          },
        },
      },
    },
    '/metrics': {
      get: {
        tags: ['Health'],
        summary: '系统指标',
        description: '获取系统运行指标（需要管理员权限）',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: '系统指标',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MetricsResponse' },
              },
            },
          },
          401: { description: '未登录' },
          403: { description: '无权限' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: '使用登录返回的 token',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          username: { type: 'string' },
          email: { type: 'string', format: 'email', nullable: true },
          phone: { type: 'string', nullable: true },
          nickname: { type: 'string' },
          role: { type: 'string', enum: ['USER', 'ADMIN', 'ROOT'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          ok: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              token: { type: 'string', description: 'JWT token' },
              user: { $ref: '#/components/schemas/User' },
            },
          },
        },
      },
      Bookmark: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          url: { type: 'string', format: 'uri', nullable: true },
          note: { type: 'string', nullable: true },
          type: { type: 'string', enum: ['LINK', 'FOLDER'] },
          parentId: { type: 'string', format: 'uuid', nullable: true },
          tags: { type: 'array', items: { type: 'string' } },
          iconUrl: { type: 'string', nullable: true },
          iconData: { type: 'string', nullable: true },
          iconType: { type: 'string', enum: ['URL', 'BASE64'], nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateBookmarkRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', maxLength: 120 },
          url: { type: 'string', format: 'uri', maxLength: 2048 },
          note: { type: 'string', maxLength: 500 },
          type: { type: 'string', enum: ['LINK', 'FOLDER'], default: 'LINK' },
          parentId: { type: 'string', format: 'uuid', nullable: true },
          tags: { type: 'array', items: { type: 'string' } },
          iconUrl: { type: 'string', nullable: true },
          iconData: { type: 'string', nullable: true },
          iconType: { type: 'string', enum: ['URL', 'BASE64'], nullable: true },
        },
      },
      UpdateBookmarkRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', maxLength: 120 },
          url: { type: 'string', format: 'uri', maxLength: 2048 },
          note: { type: 'string', maxLength: 500 },
          parentId: { type: 'string', format: 'uuid', nullable: true },
          tags: { type: 'array', items: { type: 'string' } },
          iconUrl: { type: 'string', nullable: true },
          iconData: { type: 'string', nullable: true },
          iconType: { type: 'string', enum: ['URL', 'BASE64'], nullable: true },
        },
      },
      HealthResponse: {
        type: 'object',
        properties: {
          ok: { type: 'boolean' },
          timestamp: { type: 'string', format: 'date-time' },
          uptime: { type: 'number', description: '运行时间（秒）' },
          version: { type: 'string' },
        },
      },
      MetricsResponse: {
        type: 'object',
        properties: {
          timestamp: { type: 'string', format: 'date-time' },
          uptime: { type: 'number' },
          memory: {
            type: 'object',
            properties: {
              rss: { type: 'number' },
              heapTotal: { type: 'number' },
              heapUsed: { type: 'number' },
              external: { type: 'number' },
            },
          },
          cpu: {
            type: 'object',
            properties: {
              user: { type: 'number' },
              system: { type: 'number' },
            },
          },
          requests: {
            type: 'object',
            properties: {
              total: { type: 'number' },
              success: { type: 'number' },
              error: { type: 'number' },
              avgResponseTime: { type: 'number' },
            },
          },
          database: {
            type: 'object',
            properties: {
              connected: { type: 'boolean' },
              latency: { type: 'number' },
            },
          },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          ok: { type: 'boolean', example: false },
          message: { type: 'string' },
          code: { type: 'integer', description: '错误码' },
          requestId: { type: 'string' },
          details: { type: 'object' },
        },
      },
    },
  },
}

export default openApiSpec
