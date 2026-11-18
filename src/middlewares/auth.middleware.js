const jwt = require('jsonwebtoken');
const usuarioRepository = require('../repositories/usuario.repository');

const JWT_SECRET = String(process.env.JWT_SECRET || '').trim();
const JWT_ISSUER = process.env.JWT_ISSUER || 'distribuidora-el-volcan-api';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'distribuidora-el-volcan-web';
const JWT_EXPIRES_IN_SECONDS = Number(process.env.JWT_EXPIRES_IN_SECONDS) || 3600;

function obtenerConfiguracionJwt() {
  if (JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET debe configurarse con al menos 32 caracteres aleatorios');
  }
  if (!Number.isInteger(JWT_EXPIRES_IN_SECONDS) || JWT_EXPIRES_IN_SECONDS < 1) {
    throw new Error('JWT_EXPIRES_IN_SECONDS debe ser un entero positivo');
  }
  return {
    secret: JWT_SECRET,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    expiresInSeconds: JWT_EXPIRES_IN_SECONDS,
    algorithm: 'HS256'
  };
}

// Middleware de Autenticación: verifica firma, algoritmo HS256, expiración, emisor, destinatario y estado activo
async function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'No autenticado: se requiere token Bearer en el encabezado Authorization'
    });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return res.status(401).json({
      error: 'No autenticado: token ausente'
    });
  }

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    });
  } catch (err) {
    const mensaje = err.name === 'TokenExpiredError'
      ? 'Sesión vencida: el token JWT ha expirado'
      : 'No autenticado: token JWT inválido o alterado';
    return res.status(401).json({ error: mensaje });
  }

  const usuarioId = Number(payload.sub);
  if (!Number.isInteger(usuarioId) || usuarioId < 1) {
    return res.status(401).json({ error: 'No autenticado: token JWT inválido o alterado' });
  }

  try {
    const usuario = await usuarioRepository.buscarPorId(usuarioId);

    if (!usuario || usuario.activo === false) {
      return res.status(401).json({
        error: 'No autenticado: la cuenta asociada al token no existe o fue deshabilitada'
      });
    }

    req.usuario = {
      id: usuario.id,
      sub: String(usuario.id),
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      repartidorCodigo: usuario.repartidorCodigo || null
    };

    return next();
  } catch (err) {
    return next(err);
  }
}

// Middleware de Autorización: comprueba que el usuario autenticado tenga uno de los roles permitidos
function requerirRoles(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({
        error: `Acceso denegado: se requiere uno de los roles [${rolesPermitidos.join(', ')}]`
      });
    }
    return next();
  };
}

module.exports = {
  obtenerConfiguracionJwt,
  verificarToken,
  requerirRoles
};
