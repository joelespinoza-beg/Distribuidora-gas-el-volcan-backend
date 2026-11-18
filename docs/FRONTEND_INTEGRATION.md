# Recordatorio: integración pendiente en React

Este archivo guía el trabajo futuro en el repositorio del frontend. **No se implementa Axios ni se modifica React en el repositorio backend.**

## Dirección y contratos

- Configurar `VITE_API_BASE_URL` con la URL del backend y el prefijo versionado, por ejemplo `https://<host-api>/api/v1`.
- Configurar Axios en `src/services/api.js` con esa dirección base; Axios se instala y usa en el frontend, no en este backend.
- `POST /auth/register`: enviar `nombre`, `email`, `clave` y, opcionalmente, `telefono`, `direccion` y `tipoCliente`. El backend asigna `CLIENTE`; el frontend no debe enviar ni permitir elegir el rol.
- `POST /auth/login`: enviar `email` y `clave`. La respuesta contiene `accessToken`, `tokenType`, `expiresIn` y `usuario`.
- `GET /auth/me`: enviar `Authorization: Bearer <accessToken>` para recuperar la cuenta al restaurar la sesión.
- `GET /clientes/me` y `PATCH /clientes/me`: consultar y modificar el perfil del cliente autenticado.
- Las rutas administrativas de usuarios y clientes requieren token y rol `ADMIN`. `GET/PATCH /usuarios/:id` permiten al usuario titular ver/modificar solo su propia cuenta; las demás cuentas deben rechazarse.

La respuesta del registro y de las rutas de usuario/cliente es el objeto directamente, sin envoltorio `data`. El backend nunca devuelve la contraseña ni su hash.

## Sesión requerida por la rúbrica

- Elegir y documentar almacenamiento que sobreviva a una recarga. Una opción sencilla para este flujo Bearer es `sessionStorage`: persiste al recargar la pestaña y se elimina al cerrar la pestaña, pero sigue siendo accesible a JavaScript y debe protegerse frente a XSS.
- Al iniciar sesión, guardar el token; al cargar o recargar la aplicación, leerlo y llamar a `/auth/me`.
- Si `/auth/me` responde `401` o el JWT venció, limpiar el token y mostrar el flujo de inicio de sesión.
- Al cerrar sesión, borrar el token y limpiar el estado autenticado.
- Adjuntar el token mediante un interceptor de Axios en las solicitudes protegidas. Si se usa otra estrategia (por ejemplo cookie `HttpOnly`), coordinarla con el backend porque cambia CORS, cookies y protección CSRF.
- Mostrar estados de carga, éxito, validación y error en los formularios; no basta con que las solicitudes funcionen en Postman.

## Lista para completar y verificar

- [ ] Configurar `VITE_API_BASE_URL` para desarrollo y despliegue.
- [ ] Implementar el servicio Axios y conectar registro, login y `/auth/me`.
- [ ] Persistir/restaurar la sesión al recargar y limpiarla al cerrar sesión o recibir `401`.
- [ ] Restringir rutas, menús y acciones por `ADMIN`, `OPERADORA`, `REPARTIDOR` y `CLIENTE`; el backend sigue siendo quien autoriza.
- [ ] Conectar el CRUD administrativo de usuarios y clientes, y el perfil `/clientes/me`.
- [ ] Mostrar carga, éxito y error en cada flujo.
- [ ] Configurar `CORS_ORIGINS` en el backend con el origen real del frontend.
- [ ] Probar desde el navegador y guardar evidencia; Postman por sí solo no demuestra integración frontend-backend.
