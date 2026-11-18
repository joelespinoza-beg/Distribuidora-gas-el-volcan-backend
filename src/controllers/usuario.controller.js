const usuarioService = require('../services/usuario.service');

async function listar(req, res, next) {
  try {
    return res.status(200).json(await usuarioService.listarUsuarios());
  } catch (error) {
    return next(error);
  }
}

async function obtenerPorId(req, res, next) {
  try {
    return res.status(200).json(await usuarioService.obtenerUsuario(req.params.id, req.usuario));
  } catch (error) {
    return next(error);
  }
}

async function listarRoles(req, res, next) {
  try {
    return res.status(200).json(await usuarioService.listarRoles());
  } catch (error) {
    return next(error);
  }
}

async function crear(req, res, next) {
  try {
    return res.status(201).json(await usuarioService.crearUsuario(req.body));
  } catch (error) {
    return next(error);
  }
}

async function actualizar(req, res, next) {
  try {
    return res.status(200).json(
      await usuarioService.actualizarUsuario(req.params.id, req.body, req.usuario)
    );
  } catch (error) {
    return next(error);
  }
}

async function cambiarRol(req, res, next) {
  try {
    return res.status(200).json(
      await usuarioService.cambiarRol(req.params.id, req.body)
    );
  } catch (error) {
    return next(error);
  }
}

async function eliminar(req, res, next) {
  try {
    await usuarioService.desactivarUsuario(req.params.id, req.usuario);
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
}

module.exports = { listar, obtenerPorId, listarRoles, crear, actualizar, cambiarRol, eliminar };
