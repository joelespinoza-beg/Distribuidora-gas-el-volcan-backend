const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'API REST · Distribuidora de Gas El Volcán',
    version: '1.0.0',
    description:
      'Especificación OpenAPI 3.0 del backend de **Distribuidora de Gas El Volcán** (Chillán). ' +
      'Incluye autenticación y autorización con **JWT (HS256)**, protección de contraseñas con **BCrypt**, ' +
      'catálogo de cilindros GLP y accesorios, gestión y seguimiento de pedidos con descuento de stock en el servidor ' +
      'y control de acceso por roles (`CLIENTE`, `OPERADORA`, `REPARTIDOR`, `ADMIN`).'
  },
  servers: [
    {
      url: '/',
      description: 'Servidor activo (EC2 o entorno local en puerto 3000)'
    }
  ],
  tags: [
    { name: 'Autenticación', description: 'Registro, inicio de sesión con JWT y perfil autenticado' },
    { name: 'Usuarios', description: 'Administración de cuentas y roles' },
    { name: 'Clientes', description: 'Perfiles de clientes y control de acceso por propietario' },
    { name: 'Productos', description: 'Catálogo público de cilindros/accesorios y CRUD administrativo' },
    { name: 'Pedidos', description: 'Solicitud principal de gas, asignación de repartidor y seguimiento de entregas' },
    { name: 'Repartidores', description: 'Consulta de repartidores activos para despacho' },
    { name: 'Diagnóstico', description: 'Verificación de estado del servidor y saludo de laboratorio (Guía 18)' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Ingresa el token JWT obtenido en POST /api/v1/auth/login (formato: Bearer <token>)'
      }
    },
    schemas: {
      ErrorRespuesta: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Descripción del error ocurrido' },
          detalles: {
            type: 'object',
            nullable: true,
            additionalProperties: { type: 'string' }
          }
        }
      },
      RegistroSolicitud: {
        type: 'object',
        required: ['nombre', 'email', 'clave'],
        properties: {
          nombre: { type: 'string', example: 'Camila Riquelme' },
          email: { type: 'string', format: 'email', example: 'camila.riquelme@correo.cl' },
          clave: { type: 'string', minLength: 6, example: 'Segura2026!' }
        }
      },
      LoginSolicitud: {
        type: 'object',
        required: ['email', 'clave'],
        properties: {
          email: { type: 'string', format: 'email', example: 'maria.soto@correo.cl' },
          clave: { type: 'string', example: 'Cliente2026!' }
        }
      },
      UsuarioPublico: {
        type: 'object',
        description: 'Datos públicos del usuario (generados/filtrados por el servidor; jamás incluye clave ni password_hash)',
        properties: {
          id: { type: 'integer', readOnly: true, example: 4 },
          nombre: { type: 'string', example: 'María Soto (Cliente)' },
          email: { type: 'string', example: 'maria.soto@correo.cl' },
          rol: { type: 'string', enum: ['CLIENTE', 'OPERADORA', 'REPARTIDOR', 'ADMIN'], readOnly: true, example: 'CLIENTE' },
          repartidorCodigo: { type: 'string', nullable: true, readOnly: true, example: null },
          activo: { type: 'boolean', readOnly: true, example: true }
        }
      },
      LoginRespuesta: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
          },
          tokenType: { type: 'string', example: 'Bearer' },
          expiresIn: { type: 'integer', example: 3600 },
          usuario: { $ref: '#/components/schemas/UsuarioPublico' }
        }
      },
      UsuarioAdminEntrada: {
        type: 'object',
        required: ['nombre', 'email', 'clave', 'rol'],
        properties: {
          nombre: { type: 'string', minLength: 1, maxLength: 120 },
          email: { type: 'string', format: 'email' },
          clave: { type: 'string', minLength: 6 },
          rol: { type: 'string', enum: ['ADMIN', 'OPERADORA', 'REPARTIDOR', 'CLIENTE'] },
          repartidorCodigo: { type: 'string', example: 'R1' },
          telefono: { type: 'string' },
          direccion: { type: 'string' }
        }
      },
      UsuarioActualizacion: {
        type: 'object',
        minProperties: 1,
        properties: {
          nombre: { type: 'string', maxLength: 120 },
          email: { type: 'string', format: 'email' },
          clave: { type: 'string', minLength: 6 }
        }
      },
      CambioRol: {
        type: 'object',
        required: ['rol'],
        properties: {
          rol: { type: 'string', enum: ['ADMIN', 'OPERADORA', 'REPARTIDOR', 'CLIENTE'] },
          repartidorCodigo: { type: 'string', example: 'R1' }
        }
      },
      ClienteEntrada: {
        type: 'object',
        required: ['nombre'],
        properties: {
          nombre: { type: 'string', maxLength: 120 },
          telefono: { type: 'string', example: '+56 9 1234 5678' },
          direccion: { type: 'string', maxLength: 250 },
          tipoCliente: { type: 'string', enum: ['residencial', 'comercial'] },
          usuarioId: { type: 'integer', nullable: true }
        }
      },
      ClienteActualizacion: {
        type: 'object',
        minProperties: 1,
        properties: {
          nombre: { type: 'string', maxLength: 120 },
          telefono: { type: 'string', nullable: true },
          direccion: { type: 'string', maxLength: 250, nullable: true },
          tipoCliente: { type: 'string', enum: ['residencial', 'comercial'] }
        }
      },
      Cliente: {
        type: 'object',
        properties: {
          id: { type: 'integer', readOnly: true },
          usuarioId: { type: 'integer', nullable: true },
          nombre: { type: 'string' },
          telefono: { type: 'string', nullable: true },
          direccion: { type: 'string', nullable: true },
          tipoCliente: { type: 'string', enum: ['residencial', 'comercial'] },
          activo: { type: 'boolean' }
        }
      },
      Producto: {
        type: 'object',
        required: ['id', 'categoria', 'nombre', 'precioResidencial', 'precioComercial', 'stock'],
        properties: {
          id: { type: 'string', example: 'CL003' },
          categoria: { type: 'string', example: 'Cilindros de Gas' },
          nombre: { type: 'string', example: 'Cilindro GLP 15 kg' },
          descripcion: { type: 'string', example: 'Cilindro de mayor capacidad para hogares de alto consumo.' },
          unidad: { type: 'string', example: 'Unidad' },
          precioResidencial: { type: 'integer', minimum: 1, example: 16000 },
          precioComercial: { type: 'integer', minimum: 1, example: 14500 },
          stock: { type: 'integer', minimum: 0, example: 90 }
        }
      },
      PedidoCrearSolicitud: {
        type: 'object',
        required: ['cliente', 'telefono', 'direccion', 'zona', 'productos'],
        properties: {
          cliente: { type: 'string', example: 'María Soto' },
          email: { type: 'string', format: 'email', example: 'maria.soto@correo.cl' },
          telefono: { type: 'string', example: '+56 9 9123 4567' },
          direccion: { type: 'string', example: 'Av. Libertad 123, Chillán' },
          zona: { type: 'string', example: 'Zona Centro' },
          tipoCliente: { type: 'string', enum: ['residencial', 'comercial'], example: 'residencial' },
          metodoPago: { type: 'string', example: 'efectivo al recibir' },
          productos: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'cantidad'],
              properties: {
                id: { type: 'string', example: 'CL003' },
                cantidad: { type: 'integer', minimum: 1, example: 2 }
              }
            }
          }
        }
      },
      PedidoRespuesta: {
        type: 'object',
        description: 'El servidor calcula precioUnitario, subtotal, total, estado inicial, usuarioId y hora',
        properties: {
          id: { type: 'integer', readOnly: true, example: 1 },
          usuarioId: { type: 'integer', readOnly: true, example: 4 },
          cliente: { type: 'string', example: 'María Soto' },
          email: { type: 'string', example: 'maria.soto@correo.cl' },
          telefono: { type: 'string', example: '+56 9 9123 4567' },
          direccion: { type: 'string', example: 'Av. Libertad 123, Chillán' },
          zona: { type: 'string', example: 'Zona Centro' },
          tipoCliente: { type: 'string', example: 'residencial' },
          productos: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', example: 'CL003' },
                nombre: { type: 'string', readOnly: true, example: 'Cilindro GLP 15 kg' },
                cantidad: { type: 'integer', example: 2 },
                precioUnitario: { type: 'integer', readOnly: true, example: 16000 },
                subtotal: { type: 'integer', readOnly: true, example: 32000 }
              }
            }
          },
          total: { type: 'integer', readOnly: true, example: 32000 },
          metodoPago: { type: 'string', example: 'efectivo al recibir' },
          estado: { type: 'string', enum: ['pendiente', 'asignado', 'en_camino', 'entregado'], readOnly: true, example: 'pendiente' },
          repartidorId: { type: 'string', nullable: true, readOnly: true, example: null },
          hora: { type: 'string', readOnly: true, example: '14:35' }
        }
      }
    }
  },
  paths: {
    '/api/v1/saludo': {
      get: {
        tags: ['Diagnóstico'],
        summary: 'Saludo de verificación del servidor (Guía 18)',
        parameters: [
          {
            name: 'nombre',
            in: 'query',
            required: false,
            schema: { type: 'string', example: 'Duoc' }
          }
        ],
        responses: {
          200: {
            description: 'Respuesta JSON confirmando ejecución en Node.js + Express',
            content: {
              'application/json': {
                example: {
                  mensaje: 'Hola, Duoc',
                  backend: 'Node.js + Express en EC2',
                  lenguaje: 'Node.js'
                }
              }
            }
          }
        }
      }
    },
    '/api/v1/auth/register': {
      post: {
        tags: ['Autenticación'],
        summary: 'Registrar nueva cuenta de cliente',
        description: 'Crea un usuario con contraseña protegida mediante BCrypt. El servidor asigna siempre el rol inicial CLIENTE.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegistroSolicitud' }
            }
          }
        },
        responses: {
          201: {
            description: 'Usuario registrado exitosamente (sin contraseña ni hash)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UsuarioPublico' }
              }
            }
          },
          400: {
            description: 'Datos de entrada inválidos',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorRespuesta' } } }
          },
          409: {
            description: 'El correo electrónico ya se encuentra registrado',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorRespuesta' } } }
          }
        }
      }
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['Autenticación'],
        summary: 'Iniciar sesión y obtener JWT firmado (HS256)',
        description: 'Valida credenciales contra el hash BCrypt. Si fallan, devuelve 401 con mensaje genérico sin revelar si la cuenta existe.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginSolicitud' }
            }
          }
        },
        responses: {
          200: {
            description: 'Autenticación exitosa: devuelve accessToken Bearer y vigencia',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginRespuesta' }
              }
            }
          },
          400: {
            description: 'Formato de correo o clave inválido',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorRespuesta' } } }
          },
          401: {
            description: 'Credenciales inválidas',
            content: {
              'application/json': {
                example: { error: 'Credenciales inválidas' }
              }
            }
          },
          429: {
            description: 'Límite de intentos fallidos superado'
          }
        }
      }
    },
    '/api/v1/auth/me': {
      get: {
        tags: ['Autenticación'],
        summary: 'Obtener perfil del usuario autenticado',
        description: 'Obtiene los datos del usuario a partir del claim sub del token JWT validado.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Perfil del usuario autenticado (sin contraseña ni hash)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UsuarioPublico' }
              }
            }
          },
          401: {
            description: 'Token ausente, inválido o vencido'
          }
        }
      }
    },
    '/api/v1/productos': {
      get: {
        tags: ['Productos'],
        summary: 'Listar catálogo de cilindros y accesorios',
        parameters: [
          {
            name: 'categoria',
            in: 'query',
            required: false,
            schema: { type: 'string', example: 'Cilindros de Gas' }
          }
        ],
        responses: {
          200: {
            description: 'Lista de productos disponibles',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Producto' }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ['Productos'],
        summary: 'Crear nuevo producto en el catálogo (Solo ADMIN)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Producto' }
            }
          }
        },
        responses: {
          201: {
            description: 'Producto creado exitosamente',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Producto' } } }
          },
          400: { description: 'Datos inválidos' },
          401: { description: 'No autenticado' },
          403: { description: 'Sin permiso (requiere rol ADMIN)' },
          409: { description: 'Conflicto: ya existe un producto con ese código' }
        }
      }
    },
    '/api/v1/productos/{id}': {
      get: {
        tags: ['Productos'],
        summary: 'Obtener detalle de un producto por su código',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', example: 'CL002' } }
        ],
        responses: {
          200: {
            description: 'Detalle del producto',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Producto' } } }
          },
          404: { description: 'Producto no encontrado' }
        }
      },
      put: {
        tags: ['Productos'],
        summary: 'Actualizar producto existente (Solo ADMIN)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', example: 'CL002' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Producto' }
            }
          }
        },
        responses: {
          200: { description: 'Producto actualizado' },
          400: { description: 'Datos inválidos' },
          401: { description: 'No autenticado' },
          403: { description: 'Sin permiso (requiere rol ADMIN)' },
          404: { description: 'Producto no encontrado' }
        }
      },
      delete: {
        tags: ['Productos'],
        summary: 'Eliminar producto del catálogo (Solo ADMIN)',
        description: 'Elimina el producto si no posee pedidos históricos asociados (en caso contrario devuelve 409 Conflict).',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', example: 'AC003' } }
        ],
        responses: {
          204: { description: 'Producto eliminado correctamente (sin cuerpo)' },
          401: { description: 'No autenticado' },
          403: { description: 'Sin permiso (requiere rol ADMIN)' },
          404: { description: 'Producto no encontrado' },
          409: { description: 'Conflicto de integridad: el producto tiene pedidos asociados' }
        }
      }
    },
    '/api/v1/pedidos': {
      get: {
        tags: ['Pedidos'],
        summary: 'Listar pedidos según el rol del usuario autenticado',
        description: 'ADMIN y OPERADORA ven todos los pedidos; REPARTIDOR ve sus entregas asignadas; CLIENTE solo ve sus propios pedidos.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Lista de pedidos autorizados para el usuario',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/PedidoRespuesta' }
                }
              }
            }
          },
          401: { description: 'No autenticado' }
        }
      },
      post: {
        tags: ['Pedidos'],
        summary: 'Crear un nuevo pedido de gas (calcula precios y descuenta stock en el servidor)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PedidoCrearSolicitud' }
            }
          }
        },
        responses: {
          201: {
            description: 'Pedido registrado con estado pendiente y stock descontado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PedidoRespuesta' }
              }
            }
          },
          400: { description: 'Datos de entrada inválidos' },
          401: { description: 'No autenticado' },
          404: { description: 'Producto solicitado no existe' },
          409: { description: 'Conflicto de negocio: stock insuficiente para completar el pedido' }
        }
      }
    },
    '/api/v1/pedidos/{id}': {
      get: {
        tags: ['Pedidos'],
        summary: 'Consultar detalle y seguimiento de un pedido por ID (con protección anti-IDOR)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer', example: 1 } }
        ],
        responses: {
          200: {
            description: 'Detalle del pedido',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PedidoRespuesta' } } }
          },
          401: { description: 'No autenticado' },
          403: { description: 'Acceso denegado: el pedido pertenece a otro cliente o repartidor' },
          404: { description: 'Pedido no encontrado' }
        }
      }
    },
    '/api/v1/pedidos/{id}/asignar': {
      patch: {
        tags: ['Pedidos'],
        summary: 'Asignar repartidor a un pedido (Solo OPERADORA o ADMIN)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer', example: 1 } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['repartidorId'],
                properties: {
                  repartidorId: { type: 'string', example: 'R1' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Repartidor asignado y estado actualizado a asignado' },
          400: { description: 'repartidorId ausente' },
          401: { description: 'No autenticado' },
          403: { description: 'Rol insuficiente (requiere OPERADORA o ADMIN)' },
          404: { description: 'Pedido o repartidor no encontrado' },
          409: { description: 'Conflicto: el pedido ya fue entregado' }
        }
      }
    },
    '/api/v1/pedidos/{id}/estado': {
      patch: {
        tags: ['Pedidos'],
        summary: 'Actualizar estado de entrega del pedido (OPERADORA, REPARTIDOR asignado o ADMIN)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer', example: 1 } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['estado'],
                properties: {
                  estado: {
                    type: 'string',
                    enum: ['pendiente', 'asignado', 'en_camino', 'entregado'],
                    example: 'en_camino'
                  }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Estado actualizado correctamente' },
          400: { description: 'Estado inválido' },
          401: { description: 'No autenticado' },
          403: { description: 'Rol insuficiente o pedido asignado a otro repartidor' },
          404: { description: 'Pedido no encontrado' }
        }
      }
    },
    '/api/v1/repartidores': {
      get: {
        tags: ['Repartidores'],
        summary: 'Listar repartidores activos (OPERADORA, REPARTIDOR o ADMIN)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Lista de repartidores',
            content: {
              'application/json': {
                example: [
                  { id: 'R1', nombre: 'Pedro Rojas', telefono: '+56 9 8111 2233', activo: true },
                  { id: 'R2', nombre: 'Luis Contreras', telefono: '+56 9 8222 3344', activo: true },
                  { id: 'R3', nombre: 'Marcos Fuentes', telefono: '+56 9 8333 4455', activo: true }
                ]
              }
            }
          },
          401: { description: 'No autenticado' },
          403: { description: 'Sin permiso' }
        }
      }
    },
    '/api/v1/usuarios': {
      get: {
        tags: ['Usuarios'],
        summary: 'Listar usuarios (solo ADMIN)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Lista de cuentas sin contraseñas ni hashes' },
          401: { description: 'No autenticado' },
          403: { description: 'Solo ADMIN puede listar todas las cuentas' }
        }
      },
      post: {
        tags: ['Usuarios'],
        summary: 'Crear usuario con rol asignado por ADMIN',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UsuarioAdminEntrada' }
            }
          }
        },
        responses: {
          201: { description: 'Usuario creado' },
          400: { description: 'Datos o rol inválidos' },
          401: { description: 'No autenticado' },
          403: { description: 'Solo ADMIN puede crear usuarios' },
          409: { description: 'El correo ya está registrado' }
        }
      }
    },
    '/api/v1/usuarios/roles': {
      get: {
        tags: ['Usuarios'],
        summary: 'Listar roles persistidos (solo ADMIN)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Roles disponibles',
            content: {
              'application/json': {
                example: ['ADMIN', 'CLIENTE', 'OPERADORA', 'REPARTIDOR']
              }
            }
          },
          401: { description: 'No autenticado' },
          403: { description: 'Solo ADMIN puede consultar roles' }
        }
      }
    },
    '/api/v1/usuarios/{id}': {
      parameters: [{
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'integer', minimum: 1 }
      }],
      get: {
        tags: ['Usuarios'],
        summary: 'Consultar una cuenta (ADMIN o titular)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Cuenta encontrada' },
          401: { description: 'No autenticado' },
          403: { description: 'No se permite consultar otra cuenta' },
          404: { description: 'Usuario no encontrado' }
        }
      },
      put: {
        tags: ['Usuarios'],
        summary: 'Modificar datos de cuenta (ADMIN o titular; no modifica rol)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UsuarioActualizacion' }
            }
          }
        },
        responses: {
          200: { description: 'Cuenta actualizada' },
          400: { description: 'Datos inválidos' },
          401: { description: 'No autenticado' },
          403: { description: 'No se permite modificar otra cuenta' },
          409: { description: 'El correo ya está registrado' }
        }
      },
      patch: {
        tags: ['Usuarios'],
        summary: 'Modificar datos de cuenta (ADMIN o titular; no modifica rol)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UsuarioActualizacion' }
            }
          }
        },
        responses: {
          200: { description: 'Cuenta actualizada' },
          400: { description: 'Datos inválidos' },
          401: { description: 'No autenticado' },
          403: { description: 'No se permite modificar otra cuenta' },
          409: { description: 'El correo ya está registrado' }
        }
      },
      delete: {
        tags: ['Usuarios'],
        summary: 'Desactivar una cuenta sin borrar sus pedidos (solo ADMIN)',
        security: [{ bearerAuth: [] }],
        responses: {
          204: { description: 'Cuenta desactivada' },
          401: { description: 'No autenticado' },
          403: { description: 'Solo ADMIN puede desactivar cuentas' },
          404: { description: 'Usuario no encontrado' },
          409: { description: 'No puede desactivarse el último administrador activo' }
        }
      }
    },
    '/api/v1/usuarios/{id}/rol': {
      parameters: [{
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'integer', minimum: 1 }
      }],
      patch: {
        tags: ['Usuarios'],
        summary: 'Cambiar rol (solo ADMIN)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CambioRol' }
            }
          }
        },
        responses: {
          200: { description: 'Rol actualizado' },
          400: { description: 'Rol o código de repartidor inválido' },
          401: { description: 'No autenticado' },
          403: { description: 'Solo ADMIN puede cambiar roles' },
          404: { description: 'Usuario no encontrado' },
          409: { description: 'No puede quitarse el rol del último administrador activo' }
        }
      }
    },
    '/api/v1/clientes': {
      get: {
        tags: ['Clientes'],
        summary: 'Listar clientes (solo ADMIN)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Lista de perfiles de cliente' },
          401: { description: 'No autenticado' },
          403: { description: 'Solo ADMIN puede listar clientes' }
        }
      },
      post: {
        tags: ['Clientes'],
        summary: 'Crear un perfil de cliente (solo ADMIN)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ClienteEntrada' }
            }
          }
        },
        responses: {
          201: { description: 'Perfil creado' },
          400: { description: 'Datos o usuario asociado inválidos' },
          401: { description: 'No autenticado' },
          403: { description: 'Solo ADMIN puede crear clientes' },
          409: { description: 'El usuario ya tiene perfil de cliente' }
        }
      }
    },
    '/api/v1/clientes/me': {
      get: {
        tags: ['Clientes'],
        summary: 'Consultar perfil propio (solo CLIENTE)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Perfil del cliente autenticado' },
          401: { description: 'No autenticado' },
          403: { description: 'El rol no es CLIENTE' },
          404: { description: 'La cuenta no tiene perfil de cliente' }
        }
      },
      patch: {
        tags: ['Clientes'],
        summary: 'Actualizar perfil propio (solo CLIENTE)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ClienteActualizacion' }
            }
          }
        },
        responses: {
          200: { description: 'Perfil actualizado' },
          400: { description: 'Datos inválidos' },
          401: { description: 'No autenticado' },
          403: { description: 'El rol no es CLIENTE' },
          404: { description: 'La cuenta no tiene perfil de cliente' }
        }
      }
    },
    '/api/v1/clientes/{id}': {
      parameters: [{
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'integer', minimum: 1 }
      }],
      get: {
        tags: ['Clientes'],
        summary: 'Consultar cliente (ADMIN o titular)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Perfil de cliente',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Cliente' }
              }
            }
          },
          401: { description: 'No autenticado' },
          403: { description: 'No se permite consultar otro cliente' },
          404: { description: 'Cliente no encontrado' }
        }
      },
      patch: {
        tags: ['Clientes'],
        summary: 'Actualizar cliente (ADMIN o titular)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ClienteActualizacion' }
            }
          }
        },
        responses: {
          200: { description: 'Perfil actualizado' },
          400: { description: 'Datos inválidos' },
          401: { description: 'No autenticado' },
          403: { description: 'No se permite modificar otro cliente' },
          404: { description: 'Cliente no encontrado' }
        }
      },
      delete: {
        tags: ['Clientes'],
        summary: 'Eliminar perfil de cliente (solo ADMIN)',
        security: [{ bearerAuth: [] }],
        responses: {
          204: { description: 'Perfil eliminado; la cuenta y los pedidos se conservan' },
          401: { description: 'No autenticado' },
          403: { description: 'Solo ADMIN puede eliminar clientes' },
          404: { description: 'Cliente no encontrado' }
        }
      }
    }
  }
};

module.exports = swaggerSpec;
