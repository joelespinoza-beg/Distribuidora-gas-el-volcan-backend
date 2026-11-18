const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.DB_MODE = 'memory';

const app = require('../src/app');
const { reiniciarMemoryStore } = require('../src/config/db');
const { reiniciarLimitador } = require('../src/middlewares/rateLimit.middleware');
const { obtenerConfiguracionJwt } = require('../src/middlewares/auth.middleware');

async function obtenerToken(email, clave) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, clave });
  assert.equal(res.status, 200);
  return res.body.accessToken;
}

describe('API Backend · Distribuidora de Gas El Volcán (Guías 18 y 19)', () => {
  beforeEach(() => {
    reiniciarMemoryStore();
    reiniciarLimitador();
  });

  it('1. Guía 18: responde en GET /api/saludo y devuelve 404 en rutas inexistentes', async () => {
    const saludo = await request(app).get('/api/saludo?nombre=Duoc');
    assert.equal(saludo.status, 200);
    assert.equal(saludo.body.mensaje, 'Hola, Duoc');
    assert.equal(saludo.body.backend, 'Node.js + Express en EC2');

    const noExiste = await request(app).get('/api/ruta-que-no-existe');
    assert.equal(noExiste.status, 404);
    assert.equal(noExiste.body.error, 'Ruta no encontrada');
  });

  it('2. Swagger / OpenAPI: expone la especificación viva en /api-docs.json', async () => {
    const res = await request(app).get('/api-docs.json');
    assert.equal(res.status, 200);
    assert.equal(res.body.openapi, '3.0.3');
    assert.ok(res.body.paths['/api/auth/login']);
    assert.ok(res.body.paths['/api/pedidos']);
  });

  it('3. Login válido e inválido: emite JWT con vigencia y rechaza credenciales erróneas con mensaje genérico', async () => {
    const ok = await request(app)
      .post('/api/auth/login')
      .send({ email: 'maria.soto@correo.cl', clave: 'Cliente2026!' });

    assert.equal(ok.status, 200);
    assert.ok(ok.body.accessToken);
    assert.equal(ok.body.tokenType, 'Bearer');
    assert.equal(ok.body.expiresIn, 3600);
    assert.equal(ok.body.usuario.rol, 'CLIENTE');
    assert.equal(ok.body.usuario.passwordHash, undefined);
    assert.equal(ok.body.usuario.clave, undefined);

    const claveMala = await request(app)
      .post('/api/auth/login')
      .send({ email: 'maria.soto@correo.cl', clave: 'ClaveIncorrecta' });
    assert.equal(claveMala.status, 401);
    assert.equal(claveMala.body.error, 'Credenciales inválidas');

    const correoInexistente = await request(app)
      .post('/api/auth/login')
      .send({ email: 'no.existe@correo.cl', clave: 'Cliente2026!' });
    assert.equal(correoInexistente.status, 401);
    assert.equal(correoInexistente.body.error, 'Credenciales inválidas');
  });

  it('4. Ruta protegida: rechaza solicitudes sin token, con token alterado o con token vencido', async () => {
    const sinToken = await request(app).get('/api/auth/me');
    assert.equal(sinToken.status, 401);

    const tokenAlterado = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer token.falso.alterado');
    assert.equal(tokenAlterado.status, 401);

    const cfg = obtenerConfiguracionJwt();
    const tokenVencido = jwt.sign(
      { email: 'maria.soto@correo.cl', rol: 'CLIENTE' },
      cfg.secret,
      {
        algorithm: 'HS256',
        subject: '4',
        issuer: cfg.issuer,
        audience: cfg.audience,
        expiresIn: -10
      }
    );

    const vencidoRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tokenVencido}`);
    assert.equal(vencidoRes.status, 401);
    assert.match(vencidoRes.body.error, /expirado|vencida/i);

    const tokenValido = await obtenerToken('maria.soto@correo.cl', 'Cliente2026!');
    const perfil = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tokenValido}`);
    assert.equal(perfil.status, 200);
    assert.equal(perfil.body.email, 'maria.soto@correo.cl');
    assert.equal(perfil.body.passwordHash, undefined);
  });

  it('5. Registro: asigna rol CLIENTE en servidor, rechaza duplicados (409) y entradas mal formadas (400)', async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({
        nombre: 'Joel Espinoza',
        email: 'Joel.Nuevo@Correo.cl',
        clave: 'MiClaveSegura123',
        rol: 'ADMIN' // Intento de escalamiento que el servidor debe ignorar
      });

    assert.equal(reg.status, 201);
    assert.equal(reg.body.email, 'joel.nuevo@correo.cl');
    assert.equal(reg.body.rol, 'CLIENTE');
    assert.equal(reg.body.passwordHash, undefined);

    const duplicado = await request(app)
      .post('/api/auth/register')
      .send({
        nombre: 'Otro Joel',
        email: 'JOEL.NUEVO@correo.cl',
        clave: 'MiClaveSegura123'
      });
    assert.equal(duplicado.status, 409);

    const invalido = await request(app)
      .post('/api/auth/register')
      .send({ nombre: '', email: 'correo-sin-arroba', clave: '123' });
    assert.equal(invalido.status, 400);
    assert.ok(invalido.body.detalles);
  });

  it('6. Rol insuficiente y protección anti-IDOR en pedidos ajenos', async () => {
    const tokenCliente1 = await obtenerToken('maria.soto@correo.cl', 'Cliente2026!');

    // Cliente no puede crear productos en el catálogo (403)
    const intentoProducto = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${tokenCliente1}`)
      .send({
        id: 'CL999',
        categoria: 'Cilindros de Gas',
        nombre: 'Cilindro Prueba',
        precioResidencial: 10000,
        precioComercial: 9000,
        stock: 10
      });
    assert.equal(intentoProducto.status, 403);

    // Cliente 1 crea su pedido
    const pedidoCreado = await request(app)
      .post('/api/pedidos')
      .set('Authorization', `Bearer ${tokenCliente1}`)
      .send({
        cliente: 'María Soto',
        telefono: '+56 9 9123 4567',
        direccion: 'Av. Libertad 123, Chillán',
        zona: 'Zona Centro',
        tipoCliente: 'residencial',
        productos: [{ id: 'CL001', cantidad: 1 }]
      });
    assert.equal(pedidoCreado.status, 201);

    // Registramos un Cliente 2 que intenta acceder al pedido #1 cambiando el ID en la URL (IDOR)
    await request(app)
      .post('/api/auth/register')
      .send({ nombre: 'Cliente Dos', email: 'cliente2@correo.cl', clave: 'Clave123!' });
    const tokenCliente2 = await obtenerToken('cliente2@correo.cl', 'Clave123!');

    const accesoAjeno = await request(app)
      .get(`/api/pedidos/${pedidoCreado.body.id}`)
      .set('Authorization', `Bearer ${tokenCliente2}`);
    assert.equal(accesoAjeno.status, 403);
  });

  it('7. Reglas del negocio: cálculo de precio en servidor, descuento de stock, conflicto 409 y flujo Operadora -> Repartidor', async () => {
    const tokenCliente = await obtenerToken('maria.soto@correo.cl', 'Cliente2026!');
    const tokenOperadora = await obtenerToken('operadora@elvolcan.cl', 'Operadora2026!');
    const tokenRepartidor = await obtenerToken('pedro.rojas@elvolcan.cl', 'Repartidor2026!');
    const tokenAdmin = await obtenerToken('admin@elvolcan.cl', 'AdminVolcan2026!');

    // Cliente intenta manipular el precio enviando precioUnitario: 1 y total: 1
    // El servidor debe calcular el precio real de CL003 comercial (14500 * 2 = 29000) y descontar stock (90 -> 88)
    const resPedido = await request(app)
      .post('/api/pedidos')
      .set('Authorization', `Bearer ${tokenCliente}`)
      .send({
        cliente: 'Panadería El Sol',
        telefono: '+56 9 8765 4321',
        direccion: 'Maipón 450, Chillán',
        zona: 'Zona Comercial',
        tipoCliente: 'comercial',
        precioUnitario: 1,
        total: 1,
        productos: [{ id: 'CL003', cantidad: 2 }]
      });

    assert.equal(resPedido.status, 201);
    assert.equal(resPedido.body.precioUnitario, 14500);
    assert.equal(resPedido.body.total, 29000);
    assert.equal(resPedido.body.estado, 'pendiente');

    const prodDespues = await request(app).get('/api/productos/CL003');
    assert.equal(prodDespues.body.stock, 88);

    // Conflicto de negocio: pedir más stock del disponible devuelve 409 Conflict
    const sinStock = await request(app)
      .post('/api/pedidos')
      .set('Authorization', `Bearer ${tokenCliente}`)
      .send({
        cliente: 'María Soto',
        telefono: '+56 9 9123 4567',
        direccion: 'Av. Libertad 123, Chillán',
        zona: 'Zona Centro',
        tipoCliente: 'residencial',
        productos: [{ id: 'AC003', cantidad: 999 }]
      });
    assert.equal(sinStock.status, 409);

    // Conflicto de integridad: Admin intenta eliminar CL003 que ya tiene un pedido asociado -> 409 Conflict
    const borrarConPedidos = await request(app)
      .delete('/api/productos/CL003')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    assert.equal(borrarConPedidos.status, 409);

    // Flujo logístico: Operadora asigna repartidor R1 y Repartidor R1 avanza entrega a en_camino y entregado
    const asignado = await request(app)
      .patch(`/api/pedidos/${resPedido.body.id}/asignar`)
      .set('Authorization', `Bearer ${tokenOperadora}`)
      .send({ repartidorId: 'R1' });
    assert.equal(asignado.status, 200);
    assert.equal(asignado.body.estado, 'asignado');
    assert.equal(asignado.body.repartidorId, 'R1');

    const enCamino = await request(app)
      .patch(`/api/pedidos/${resPedido.body.id}/estado`)
      .set('Authorization', `Bearer ${tokenRepartidor}`)
      .send({ estado: 'en_camino' });
    assert.equal(enCamino.status, 200);
    assert.equal(enCamino.body.estado, 'en_camino');

    const entregado = await request(app)
      .patch(`/api/pedidos/${resPedido.body.id}/estado`)
      .set('Authorization', `Bearer ${tokenRepartidor}`)
      .send({ estado: 'entregado' });
    assert.equal(entregado.status, 200);
    assert.equal(entregado.body.estado, 'entregado');
  });
});
