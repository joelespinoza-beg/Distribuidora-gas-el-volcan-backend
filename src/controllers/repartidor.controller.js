const repartidorRepository = require('../repositories/repartidor.repository');

async function listar(req, res, next) {
  try {
    const repartidores = await repartidorRepository.listar();
    return res.status(200).json(repartidores);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listar
};
