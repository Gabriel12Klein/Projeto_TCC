export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'VINUM API',
    version: '1.0.0',
    description: 'API local para administração e apresentação pública dos vinhos VINUM.',
  },
  servers: [{ url: '/api' }],
  tags: [{ name: 'Autenticação' }, { name: 'Catálogo' }, { name: 'Administração' }, { name: 'Arquivos' }],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } },
    schemas: {
      Error: { type: 'object', properties: { message: { type: 'string' } } },
      User: {
        type: 'object',
        required: ['id', 'name', 'email', 'role'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['ADMIN', 'EDITOR', 'CUSTOMER'] },
        },
      },
      Wine: {
        type: 'object',
        required: ['id', 'name', 'slug', 'type', 'description'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          slug: { type: 'string' },
          type: { type: 'string' },
          grapes: { type: 'string' },
          volumeMl: { type: 'integer' },
          alcoholPercentage: { type: 'number' },
          description: { type: 'string' },
          imagePath: { type: ['string', 'null'] },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        summary: 'Verifica a API e o armazenamento',
        responses: { '200': { description: 'API disponível' } },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Autenticação'],
        summary: 'Cadastra um cliente',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Cliente criado' }, '400': { description: 'Dados inválidos' } },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Autenticação'],
        summary: 'Inicia uma sessão',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: { email: { type: 'string' }, password: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Sessão criada' },
          '401': { description: 'Credenciais inválidas' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Autenticação'],
        security: [{ bearerAuth: [] }],
        summary: 'Retorna o usuário autenticado',
        responses: { '200': { description: 'Usuário atual' } },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Autenticação'],
        security: [{ bearerAuth: [] }],
        summary: 'Encerra a sessão',
        responses: { '200': { description: 'Sessão encerrada' } },
      },
    },
    '/catalog/wines': {
      get: {
        tags: ['Catálogo'],
        summary: 'Lista vinhos publicados',
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'type', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Vinhos publicados',
            content: {
              'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Wine' } } },
            },
          },
        },
      },
    },
    '/catalog/wines/{slug}': {
      get: {
        tags: ['Catálogo'],
        summary: 'Exibe um vinho publicado',
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Detalhes do vinho' },
          '404': { description: 'Vinho não encontrado' },
        },
      },
    },
    '/vinhos': {
      get: {
        tags: ['Administração'],
        security: [{ bearerAuth: [] }],
        summary: 'Lista vinhos administrativos',
        responses: { '200': { description: 'Lista de vinhos' } },
      },
      post: {
        tags: ['Administração'],
        security: [{ bearerAuth: [] }],
        summary: 'Cadastra um vinho',
        responses: { '201': { description: 'Vinho criado' } },
      },
    },
    '/vinicolas': {
      get: {
        tags: ['Administração'],
        security: [{ bearerAuth: [] }],
        summary: 'Lista vinícolas',
        responses: { '200': { description: 'Lista de vinícolas' } },
      },
    },
    '/safras': {
      get: {
        tags: ['Administração'],
        security: [{ bearerAuth: [] }],
        summary: 'Lista safras',
        responses: { '200': { description: 'Lista de safras' } },
      },
    },
    '/lotes': {
      get: {
        tags: ['Administração'],
        security: [{ bearerAuth: [] }],
        summary: 'Lista lotes',
        responses: { '200': { description: 'Lista de lotes' } },
      },
    },
    '/uploads/wines/{wineId}': {
      post: {
        tags: ['Arquivos'],
        security: [{ bearerAuth: [] }],
        summary: 'Envia a imagem principal do vinho',
        parameters: [{ name: 'wineId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['image'],
                properties: { image: { type: 'string', format: 'binary' } },
              },
            },
          },
        },
        responses: { '201': { description: 'Imagem armazenada' } },
      },
    },
    '/lotes/{id}/qr-code': {
      post: {
        tags: ['Arquivos'],
        security: [{ bearerAuth: [] }],
        summary: 'Gera o QR Code de um lote',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '201': { description: 'QR Code gerado' } },
      },
    },
  },
} as const;
