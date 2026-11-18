const ZONAS_PERMITIDAS = [
  'Zona Centro',
  'Zona Oriente',
  'Zona Rural',
  'Zona Sur',
  'Zona Comercial',
  'Centro',
  'Oriente',
  'Rural',
  'Sur'
];

const ESTADOS_PEDIDO = ['pendiente', 'asignado', 'en_camino', 'entregado'];
const TIPOS_CLIENTE = ['residencial', 'comercial'];
const ROLES_VALIDOS = ['CLIENTE', 'OPERADORA', 'REPARTIDOR', 'ADMIN'];

function validarEmail(valor) {
  const texto = String(valor ?? '').trim();
  if (!texto) return 'Ingresa tu correo';
  const partes = texto.split('@');
  if (partes.length !== 2) return 'El correo debe tener exactamente un @';
  const [antes, despues] = partes;
  if (!antes) return 'Falta algo antes del @';
  if (!despues.includes('.') || despues.startsWith('.') || despues.endsWith('.')) {
    return 'Falta un punto después del @ (ejemplo: correo@dominio.cl)';
  }
  return '';
}

function validarTelefono(valor) {
  const texto = String(valor ?? '').trim();
  if (!texto) return 'Ingresa tu teléfono';
  if (!/^[+\d\s().-]+$/.test(texto)) {
    return 'Ingresa un teléfono válido (entre 8 y 15 dígitos)';
  }
  const digitos = texto.replace(/\D/g, '');
  if (digitos.length < 8 || digitos.length > 15) {
    return 'Ingresa un teléfono válido (entre 8 y 15 dígitos)';
  }
  return '';
}

function validarClave(valor) {
  const texto = String(valor ?? '');
  if (!texto.trim()) return 'Ingresa tu clave';
  if (texto.length < 6) return 'La clave debe tener al menos 6 caracteres';
  return '';
}

function sanitizarUsuarioSalida(usuario) {
  if (!usuario) return null;
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
    repartidorCodigo: usuario.repartidorCodigo || usuario.repartidor_codigo || null,
    activo: usuario.activo !== undefined ? Boolean(usuario.activo) : true
  };
}

function validarEntradaRegistro(body = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) body = {};
  const errores = {};
  const nombre = String(body.nombre ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();
  const clave = String(body.clave ?? body.password ?? '');
  const telefono = body.telefono === undefined ? undefined : String(body.telefono).trim();
  const direccion = body.direccion === undefined ? undefined : String(body.direccion).trim();
  const tipoCliente = String(body.tipoCliente ?? 'residencial').trim().toLowerCase();

  if (!nombre) errores.nombre = 'Ingresa tu nombre';
  const errEmail = validarEmail(email);
  if (errEmail) errores.email = errEmail;
  const errClave = validarClave(clave);
  if (errClave) errores.clave = errClave;
  if (telefono) {
    const errTelefono = validarTelefono(telefono);
    if (errTelefono) errores.telefono = errTelefono;
  }
  if (direccion && direccion.length > 250) {
    errores.direccion = 'La dirección no puede superar 250 caracteres';
  }
  if (!TIPOS_CLIENTE.includes(tipoCliente)) {
    errores.tipoCliente = 'El tipo de cliente debe ser residencial o comercial';
  }

  return {
    esValido: Object.keys(errores).length === 0,
    errores,
    datos: { nombre, email, clave, telefono: telefono || null, direccion: direccion || null, tipoCliente }
  };
}

function validarEntradaLogin(body = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) body = {};
  const errores = {};
  const email = String(body.email ?? '').trim().toLowerCase();
  const clave = String(body.clave ?? body.password ?? '');

  const errEmail = validarEmail(email);
  if (errEmail) errores.email = errEmail;
  if (!clave || !clave.trim()) errores.clave = 'Ingresa tu clave';

  return {
    esValido: Object.keys(errores).length === 0,
    errores,
    datos: { email, clave }
  };
}

function validarEntradaUsuario(body = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) body = {};
  const errores = {};
  const nombre = String(body.nombre ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();
  const clave = String(body.clave ?? body.password ?? '');
  const rol = String(body.rol ?? '').trim().toUpperCase();
  const repartidorCodigo = body.repartidorCodigo
    ? String(body.repartidorCodigo).trim().toUpperCase()
    : null;
  const telefono = body.telefono === undefined ? undefined : String(body.telefono).trim();
  const direccion = body.direccion === undefined ? undefined : String(body.direccion).trim();
  const tipoCliente = String(body.tipoCliente ?? 'residencial').trim().toLowerCase();

  if (!nombre) errores.nombre = 'Ingresa el nombre';
  const errEmail = validarEmail(email);
  if (errEmail) errores.email = errEmail;
  const errClave = validarClave(clave);
  if (errClave) errores.clave = errClave;
  if (!ROLES_VALIDOS.includes(rol)) {
    errores.rol = `El rol debe ser uno de: ${ROLES_VALIDOS.join(', ')}`;
  }
  if (rol === 'REPARTIDOR' && !repartidorCodigo) {
    errores.repartidorCodigo = 'Asigna el código del repartidor';
  }
  if (repartidorCodigo && !/^R[A-Z0-9]{1,9}$/.test(repartidorCodigo)) {
    errores.repartidorCodigo = 'El código de repartidor no tiene un formato válido';
  }
  if (telefono) {
    const errTelefono = validarTelefono(telefono);
    if (errTelefono) errores.telefono = errTelefono;
  }
  if (direccion && direccion.length > 250) {
    errores.direccion = 'La dirección no puede superar 250 caracteres';
  }
  if (rol === 'CLIENTE' && !TIPOS_CLIENTE.includes(tipoCliente)) {
    errores.tipoCliente = 'El tipo de cliente debe ser residencial o comercial';
  }

  return {
    esValido: Object.keys(errores).length === 0,
    errores,
    datos: {
      nombre,
      email,
      clave,
      rol,
      repartidorCodigo,
      cliente: {
        telefono: telefono || null,
        direccion: direccion || null,
        tipoCliente: TIPOS_CLIENTE.includes(tipoCliente) ? tipoCliente : 'residencial'
      }
    }
  };
}

function validarActualizacionUsuario(body = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) body = {};
  const errores = {};
  const datos = {};

  if (Object.hasOwn(body, 'rol') || Object.hasOwn(body, 'activo') ||
      Object.hasOwn(body, 'repartidorCodigo') || Object.hasOwn(body, 'passwordHash')) {
    errores.permisos = 'El rol y el estado de la cuenta solo se modifican mediante acciones administrativas.';
  }
  if (body.nombre !== undefined) {
    const nombre = String(body.nombre).trim();
    if (!nombre) errores.nombre = 'El nombre no puede estar vacío';
    else datos.nombre = nombre;
  }
  if (body.email !== undefined) {
    const email = String(body.email).trim().toLowerCase();
    const errEmail = validarEmail(email);
    if (errEmail) errores.email = errEmail;
    else datos.email = email;
  }
  if (body.clave !== undefined || body.password !== undefined) {
    const clave = String(body.clave ?? body.password);
    const errClave = validarClave(clave);
    if (errClave) errores.clave = errClave;
    else datos.clave = clave;
  }
  if (Object.keys(datos).length === 0 && Object.keys(errores).length === 0) {
    errores.solicitud = 'Debes enviar al menos nombre, email o clave';
  }

  return { esValido: Object.keys(errores).length === 0, errores, datos };
}

function validarCambioRol(body = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) body = {};
  const errores = {};
  const rol = String(body.rol ?? '').trim().toUpperCase();
  const repartidorCodigo = body.repartidorCodigo
    ? String(body.repartidorCodigo).trim().toUpperCase()
    : null;

  if (!ROLES_VALIDOS.includes(rol)) {
    errores.rol = `El rol debe ser uno de: ${ROLES_VALIDOS.join(', ')}`;
  }
  if (rol === 'REPARTIDOR' && !repartidorCodigo) {
    errores.repartidorCodigo = 'Asigna el código del repartidor';
  }
  if (repartidorCodigo && !/^R[A-Z0-9]{1,9}$/.test(repartidorCodigo)) {
    errores.repartidorCodigo = 'El código de repartidor no tiene un formato válido';
  }

  return {
    esValido: Object.keys(errores).length === 0,
    errores,
    datos: { rol, repartidorCodigo }
  };
}

function validarEntradaCliente(body = {}, esActualizacion = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) body = {};
  const errores = {};
  const datos = {};

  if (body.nombre !== undefined || !esActualizacion) {
    const nombre = String(body.nombre ?? '').trim();
    if (!nombre) errores.nombre = 'Ingresa el nombre del cliente';
    else if (nombre.length > 120) errores.nombre = 'El nombre no puede superar 120 caracteres';
    else datos.nombre = nombre;
  }

  if (body.telefono !== undefined) {
    const telefono = String(body.telefono ?? '').trim();
    if (telefono) {
      const errTelefono = validarTelefono(telefono);
      if (errTelefono) errores.telefono = errTelefono;
      else datos.telefono = telefono;
    } else {
      datos.telefono = null;
    }
  }

  if (body.direccion !== undefined) {
    const direccion = String(body.direccion ?? '').trim();
    if (direccion.length > 250) errores.direccion = 'La dirección no puede superar 250 caracteres';
    else datos.direccion = direccion || null;
  }

  if (body.tipoCliente !== undefined || !esActualizacion) {
    const tipoCliente = String(body.tipoCliente ?? 'residencial').trim().toLowerCase();
    if (!TIPOS_CLIENTE.includes(tipoCliente)) {
      errores.tipoCliente = 'El tipo de cliente debe ser residencial o comercial';
    } else {
      datos.tipoCliente = tipoCliente;
    }
  }

  if (!esActualizacion && body.usuarioId !== undefined && body.usuarioId !== null) {
    const usuarioId = Number(body.usuarioId);
    if (!Number.isInteger(usuarioId) || usuarioId < 1) {
      errores.usuarioId = 'El identificador de usuario debe ser un entero positivo';
    } else {
      datos.usuarioId = usuarioId;
    }
  }

  if (esActualizacion && Object.keys(datos).length === 0 && Object.keys(errores).length === 0) {
    errores.solicitud = 'Debes enviar al menos un campo para actualizar';
  }

  return { esValido: Object.keys(errores).length === 0, errores, datos };
}

function validarEntradaProducto(body = {}, esActualizacion = false) {
  const errores = {};
  const id = body.id !== undefined ? String(body.id).trim().toUpperCase() : undefined;
  const categoria = body.categoria !== undefined ? String(body.categoria).trim() : undefined;
  const nombre = body.nombre !== undefined ? String(body.nombre).trim() : undefined;
  const descripcion = body.descripcion !== undefined ? String(body.descripcion).trim() : '';
  const unidad = body.unidad !== undefined ? String(body.unidad).trim() || 'Unidad' : 'Unidad';

  if (!esActualizacion) {
    if (!id) errores.id = 'El producto necesita un código (ej: CL005)';
    if (!categoria) errores.categoria = 'Ingresa la categoría';
    if (!nombre) errores.nombre = 'Ingresa el nombre';
  } else {
    if (categoria !== undefined && !categoria) errores.categoria = 'La categoría no puede estar vacía';
    if (nombre !== undefined && !nombre) errores.nombre = 'El nombre no puede estar vacío';
  }

  let precioResidencial;
  if (!esActualizacion || body.precioResidencial !== undefined) {
    precioResidencial = Number(body.precioResidencial);
    if (!Number.isInteger(precioResidencial) || precioResidencial < 1) {
      errores.precioResidencial = 'El precio residencial debe ser un entero mayor o igual a 1';
    }
  }

  let precioComercial;
  if (!esActualizacion || body.precioComercial !== undefined) {
    precioComercial = Number(body.precioComercial);
    if (!Number.isInteger(precioComercial) || precioComercial < 1) {
      errores.precioComercial = 'El precio comercial debe ser un entero mayor o igual a 1';
    }
  }

  let stock;
  if (!esActualizacion || body.stock !== undefined) {
    stock = Number(body.stock);
    if (!Number.isInteger(stock) || stock < 0) {
      errores.stock = 'El stock debe ser un entero mayor o igual a 0';
    }
  }

  return {
    esValido: Object.keys(errores).length === 0,
    errores,
    datos: {
      ...(id !== undefined ? { id } : {}),
      ...(categoria !== undefined ? { categoria } : {}),
      ...(nombre !== undefined ? { nombre } : {}),
      ...(body.descripcion !== undefined || !esActualizacion ? { descripcion } : {}),
      ...(body.unidad !== undefined || !esActualizacion ? { unidad } : {}),
      ...(precioResidencial !== undefined ? { precioResidencial } : {}),
      ...(precioComercial !== undefined ? { precioComercial } : {}),
      ...(stock !== undefined ? { stock } : {})
    }
  };
}

function validarEntradaPedido(body = {}) {
  const errores = {};
  const cliente = String(body.cliente ?? body.nombre ?? '').trim();
  const email = body.email ? String(body.email).trim().toLowerCase() : null;
  const telefono = String(body.telefono ?? '').trim();
  const direccion = String(body.direccion ?? '').trim();
  const zona = String(body.zona ?? '').trim();
  const tipoCliente = String(body.tipoCliente ?? 'residencial').trim().toLowerCase();
  const metodoPago = String(body.metodoPago ?? 'efectivo al recibir').trim();

  if (!cliente) errores.cliente = 'Ingresa el nombre del cliente';
  if (email) {
    const errEmail = validarEmail(email);
    if (errEmail) errores.email = errEmail;
  }
  const errTel = validarTelefono(telefono);
  if (errTel) errores.telefono = errTel;
  if (!direccion) errores.direccion = 'Ingresa la dirección de entrega';
  if (!zona || !ZONAS_PERMITIDAS.includes(zona)) {
    errores.zona = `Selecciona una zona de despacho válida (${ZONAS_PERMITIDAS.slice(0, 5).join(', ')})`;
  }
  if (!TIPOS_CLIENTE.includes(tipoCliente)) {
    errores.tipoCliente = 'El tipo de cliente debe ser residencial o comercial';
  }

  // Normalizar productos desde formato Checkout (array productos) o FormularioNuevoPedido (productoId/producto + cantidad)
  let items = [];
  if (Array.isArray(body.productos) && body.productos.length > 0) {
    items = body.productos.map((item) => ({
      id: String(item.id ?? item.productoId ?? '').trim().toUpperCase(),
      cantidad: Number(item.cantidad)
    }));
  } else if (body.productoId || body.producto?.id) {
    items = [
      {
        id: String(body.productoId ?? body.producto.id).trim().toUpperCase(),
        cantidad: Number(body.cantidad ?? 1)
      }
    ];
  }

  if (items.length === 0) {
    errores.productos = 'El pedido debe incluir al menos un producto';
  } else {
    for (const item of items) {
      if (!item.id) {
        errores.productos = 'Cada línea del pedido debe indicar el código del producto';
        break;
      }
      if (!Number.isInteger(item.cantidad) || item.cantidad < 1) {
        errores.cantidad = 'La cantidad de cada producto debe ser un número entero mayor o igual a 1';
        break;
      }
    }
  }

  return {
    esValido: Object.keys(errores).length === 0,
    errores,
    datos: {
      cliente,
      email,
      telefono,
      direccion,
      zona,
      tipoCliente,
      metodoPago,
      items
    }
  };
}

module.exports = {
  ZONAS_PERMITIDAS,
  ESTADOS_PEDIDO,
  TIPOS_CLIENTE,
  ROLES_VALIDOS,
  validarEmail,
  validarTelefono,
  validarClave,
  sanitizarUsuarioSalida,
  validarEntradaRegistro,
  validarEntradaLogin,
  validarEntradaUsuario,
  validarActualizacionUsuario,
  validarCambioRol,
  validarEntradaCliente,
  validarEntradaProducto,
  validarEntradaPedido
};
