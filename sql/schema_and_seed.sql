-- =============================================================================
-- Distribuidora de Gas El Volcán · DSY1104 Desarrollo Fullstack II
-- Script SQL para PostgreSQL (Amazon RDS)
-- Incluye creación de tablas, restricciones de integridad y datos iniciales
-- =============================================================================

-- Roles persistidos para validar las asignaciones en la base de datos.
CREATE TABLE IF NOT EXISTS roles (
    nombre VARCHAR(20) PRIMARY KEY
);

INSERT INTO roles (nombre) VALUES
    ('ADMIN'),
    ('OPERADORA'),
    ('REPARTIDOR'),
    ('CLIENTE')
ON CONFLICT (nombre) DO NOTHING;

-- 1. Tabla de Usuarios (clientes, operadoras, repartidores y administradores)
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    email VARCHAR(160) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL DEFAULT 'CLIENTE',
    repartidor_codigo VARCHAR(10) NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Actualiza de manera segura las bases existentes creadas antes de la tabla roles.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_rol_fk'
    ) THEN
        ALTER TABLE usuarios
            ADD CONSTRAINT usuarios_rol_fk
            FOREIGN KEY (rol) REFERENCES roles(nombre) ON DELETE RESTRICT;
    END IF;
END
$$;

-- Perfil de cliente separado de la cuenta y de la copia histórica guardada en pedidos.
CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER UNIQUE NULL REFERENCES usuarios(id) ON DELETE SET NULL,
    nombre VARCHAR(120) NOT NULL,
    telefono VARCHAR(30) NULL,
    direccion VARCHAR(250) NULL,
    tipo_cliente VARCHAR(20) NOT NULL DEFAULT 'residencial'
        CHECK (tipo_cliente IN ('residencial', 'comercial')),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Repartidores (flota de despacho en Chillán)
CREATE TABLE IF NOT EXISTS repartidores (
    id VARCHAR(10) PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    telefono VARCHAR(30) NOT NULL DEFAULT '+56 9 0000 0000',
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

-- 3. Tabla de Productos (catálogo de cilindros GLP, reguladores, mangueras y accesorios)
CREATE TABLE IF NOT EXISTS productos (
    id VARCHAR(20) PRIMARY KEY,
    categoria VARCHAR(80) NOT NULL,
    nombre VARCHAR(160) NOT NULL,
    descripcion TEXT NOT NULL DEFAULT '',
    unidad VARCHAR(40) NOT NULL DEFAULT 'Unidad',
    precio_residencial INTEGER NOT NULL CHECK (precio_residencial > 0),
    precio_comercial INTEGER NOT NULL CHECK (precio_comercial > 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla de Pedidos (solicitud principal del negocio)
CREATE TABLE IF NOT EXISTS pedidos (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NULL REFERENCES usuarios(id) ON DELETE SET NULL,
    cliente VARCHAR(120) NOT NULL,
    email VARCHAR(160) NULL,
    telefono VARCHAR(30) NOT NULL,
    direccion VARCHAR(250) NOT NULL,
    zona VARCHAR(60) NOT NULL
        CHECK (zona IN ('Zona Centro', 'Zona Oriente', 'Zona Rural', 'Zona Sur', 'Zona Comercial', 'Centro', 'Oriente', 'Rural', 'Sur')),
    tipo_cliente VARCHAR(20) NOT NULL DEFAULT 'residencial'
        CHECK (tipo_cliente IN ('residencial', 'comercial')),
    total INTEGER NOT NULL CHECK (total > 0),
    metodo_pago VARCHAR(50) NOT NULL DEFAULT 'efectivo al recibir',
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
        CHECK (estado IN ('pendiente', 'asignado', 'en_camino', 'entregado')),
    repartidor_id VARCHAR(10) NULL REFERENCES repartidores(id) ON DELETE SET NULL,
    hora VARCHAR(10) NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla de Detalle de Pedidos (líneas de productos por pedido)
-- ON DELETE RESTRICT en producto_id impide borrar un producto que ya figura en pedidos históricos
CREATE TABLE IF NOT EXISTS detalle_pedidos (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id VARCHAR(20) NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
    nombre_producto VARCHAR(160) NOT NULL,
    cantidad INTEGER NOT NULL CHECK (cantidad >= 1),
    precio_unitario INTEGER NOT NULL CHECK (precio_unitario > 0),
    subtotal INTEGER NOT NULL CHECK (subtotal > 0)
);

-- =============================================================================
-- DATOS INICIALES (Migración desde datos simulados de React a persistencia SQL)
-- =============================================================================

INSERT INTO repartidores (id, nombre, telefono, activo) VALUES
    ('R1', 'Pedro Rojas', '+56 9 8111 2233', TRUE),
    ('R2', 'Luis Contreras', '+56 9 8222 3344', TRUE),
    ('R3', 'Marcos Fuentes', '+56 9 8333 4455', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO productos (id, categoria, nombre, descripcion, unidad, precio_residencial, precio_comercial, stock) VALUES
    ('CL001', 'Cilindros de Gas', 'Cilindro GLP 5 kg', 'Cilindro de gas licuado de petróleo 5 kg. Para uso residencial (cocina, calefacción pequeña).', 'Unidad', 6500, 6000, 80),
    ('CL002', 'Cilindros de Gas', 'Cilindro GLP 11 kg', 'Cilindro estándar doméstico. El más utilizado en hogares chilenos. Compatible con reguladores estándar.', 'Unidad', 12000, 11000, 200),
    ('CL003', 'Cilindros de Gas', 'Cilindro GLP 15 kg', 'Cilindro de mayor capacidad para hogares de alto consumo o locales pequeños.', 'Unidad', 16000, 14500, 90),
    ('CL004', 'Cilindros de Gas', 'Cilindro GLP 45 kg', 'Cilindro industrial. Uso comercial: restaurantes, talleres, calefacción de locales.', 'Unidad', 45000, 40000, 30),
    ('RG001', 'Reguladores', 'Regulador doméstico estándar', 'Regulador de 1 etapa para cilindros 5, 11 y 15 kg. Presión de salida 28 mbar.', 'Unidad', 8990, 8200, 45),
    ('RG002', 'Reguladores', 'Regulador de alta presión', 'Regulador para cocinas industriales o equipos de mayor consumo. Presión regulable.', 'Unidad', 18990, 17000, 12),
    ('RG003', 'Reguladores', 'Regulador dual (2 salidas)', 'Permite conectar dos artefactos simultáneamente al mismo cilindro.', 'Unidad', 14990, 13500, 18),
    ('MG001', 'Mangueras y Conexiones', 'Manguera gas 1.5 m', 'Manguera flexible homologada. Diámetro interior 9mm. Compatible con reguladores estándar.', 'Unidad', 3990, 3500, 80),
    ('MG002', 'Mangueras y Conexiones', 'Manguera gas 3 m', 'Manguera larga para instalaciones donde el artefacto está alejado del cilindro.', 'Unidad', 6990, 6200, 50),
    ('MG003', 'Mangueras y Conexiones', 'Abrazadera metálica', 'Abrazadera de acero para asegurar la conexión manguera-regulador y manguera-artefacto.', 'Unidad', 990, 800, 200),
    ('MG004', 'Mangueras y Conexiones', 'Kit conexión completo (regulador + manguera 1.5m + abrazaderas)', 'Todo lo necesario para instalar un cilindro nuevo.', 'Kit', 12990, 11500, 25),
    ('AC001', 'Accesorios', 'Carro porta cilindro 11/15 kg', 'Carro metálico con ruedas para transportar cilindros dentro del hogar con seguridad.', 'Unidad', 12990, 11000, 20),
    ('AC002', 'Accesorios', 'Tapa protectora para válvula', 'Tapa de plástico ABS para proteger la válvula del cilindro durante el transporte.', 'Unidad', 1490, 1200, 60),
    ('AC003', 'Accesorios', 'Detector de gas a batería', 'Sensor electroquímico. Alarma sonora y visual ante fuga de gas GLP o metano.', 'Unidad', 19990, 17000, 8)
ON CONFLICT (id) DO NOTHING;
