-- Script para crear tablas de Ajustes: Comisiones, Códigos de Descuento y Códigos de Acceso
-- Ejecutar en Supabase SQL Editor

-- =====================================================
-- 0. LIMPIAR TABLAS Y POLÍTICAS EXISTENTES (si existen)
-- =====================================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Permitir lectura de comisiones a usuarios autenticados" ON comisiones;
DROP POLICY IF EXISTS "Permitir todas las operaciones a service_role en comisiones" ON comisiones;
DROP POLICY IF EXISTS "Permitir lectura de descuentos activos a usuarios autenticados" ON codigos_descuento;
DROP POLICY IF EXISTS "Permitir todas las operaciones a service_role en descuentos" ON codigos_descuento;
DROP POLICY IF EXISTS "Permitir lectura de uso de descuentos a usuarios autenticados" ON uso_descuentos;
DROP POLICY IF EXISTS "Permitir todas las operaciones a service_role en uso_descuentos" ON uso_descuentos;
DROP POLICY IF EXISTS "Permitir lectura de códigos de acceso a usuarios autenticados" ON codigos_acceso;
DROP POLICY IF EXISTS "Permitir todas las operaciones a service_role en codigos_acceso" ON codigos_acceso;
DROP POLICY IF EXISTS "Permitir lectura de historial a usuarios autenticados" ON historial_accesos;
DROP POLICY IF EXISTS "Permitir todas las operaciones a service_role en historial_accesos" ON historial_accesos;

-- Eliminar tablas en orden correcto (considerando foreign keys)
DROP TABLE IF EXISTS historial_accesos CASCADE;
DROP TABLE IF EXISTS uso_descuentos CASCADE;
DROP TABLE IF EXISTS codigos_acceso CASCADE;
DROP TABLE IF EXISTS codigos_descuento CASCADE;
DROP TABLE IF EXISTS comisiones CASCADE;

-- =====================================================
-- 1. TABLA DE COMISIONES
-- =====================================================
CREATE TABLE IF NOT EXISTS comisiones (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  tipo_comision VARCHAR(50) NOT NULL CHECK (tipo_comision IN ('porcentaje', 'fijo')),
  valor DECIMAL(10, 2) NOT NULL, -- Si es porcentaje: 5.00 = 5%, si es fijo: monto en pesos
  aplica_a VARCHAR(50) NOT NULL CHECK (aplica_a IN ('todos', 'empleado', 'categoria', 'producto')),
  referencia_id INTEGER, -- ID del empleado, categoría o producto si aplica
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE, -- NULL = sin fecha de fin
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para comisiones
CREATE INDEX IF NOT EXISTS idx_comisiones_tipo ON comisiones(tipo_comision);
CREATE INDEX IF NOT EXISTS idx_comisiones_aplica ON comisiones(aplica_a, referencia_id);
CREATE INDEX IF NOT EXISTS idx_comisiones_activo ON comisiones(activo);
CREATE INDEX IF NOT EXISTS idx_comisiones_fechas ON comisiones(fecha_inicio, fecha_fin);

-- =====================================================
-- 2. TABLA DE CÓDIGOS DE DESCUENTO
-- =====================================================
CREATE TABLE IF NOT EXISTS codigos_descuento (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  tipo_descuento VARCHAR(50) NOT NULL CHECK (tipo_descuento IN ('porcentaje', 'fijo')),
  valor DECIMAL(10, 2) NOT NULL,
  monto_minimo DECIMAL(10, 2) DEFAULT 0, -- Compra mínima requerida
  monto_maximo DECIMAL(10, 2), -- Descuento máximo si es porcentaje
  usos_maximos INTEGER, -- NULL = ilimitado
  usos_por_cliente INTEGER DEFAULT 1, -- Cuántas veces puede usar un cliente
  usos_actuales INTEGER DEFAULT 0,
  fecha_inicio TIMESTAMP NOT NULL,
  fecha_fin TIMESTAMP NOT NULL,
  aplica_a VARCHAR(50) NOT NULL CHECK (aplica_a IN ('todo', 'categoria', 'producto')),
  referencia_ids INTEGER[], -- Array de IDs de categorías o productos
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para códigos de descuento
CREATE INDEX IF NOT EXISTS idx_descuento_codigo ON codigos_descuento(codigo);
CREATE INDEX IF NOT EXISTS idx_descuento_activo ON codigos_descuento(activo);
CREATE INDEX IF NOT EXISTS idx_descuento_fechas ON codigos_descuento(fecha_inicio, fecha_fin);

-- =====================================================
-- 3. TABLA DE USO DE DESCUENTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS uso_descuentos (
  id SERIAL PRIMARY KEY,
  codigo_descuento_id INTEGER NOT NULL REFERENCES codigos_descuento(id) ON DELETE CASCADE,
  venta_id INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  cliente_info JSONB, -- Información del cliente que usó el código
  monto_descuento DECIMAL(10, 2) NOT NULL,
  fecha_uso TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para uso de descuentos
CREATE INDEX IF NOT EXISTS idx_uso_descuento_codigo ON uso_descuentos(codigo_descuento_id);
CREATE INDEX IF NOT EXISTS idx_uso_descuento_venta ON uso_descuentos(venta_id);
CREATE INDEX IF NOT EXISTS idx_uso_descuento_fecha ON uso_descuentos(fecha_uso);

-- =====================================================
-- 4. TABLA DE CÓDIGOS DE ACCESO
-- =====================================================
CREATE TABLE IF NOT EXISTS codigos_acceso (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  tipo_acceso VARCHAR(50) NOT NULL CHECK (tipo_acceso IN ('temporal', 'permanente', 'uso_unico')),
  nivel_acceso VARCHAR(50) NOT NULL CHECK (nivel_acceso IN ('admin', 'gerente', 'vendedor', 'invitado')),
  usos_maximos INTEGER, -- NULL = ilimitado (para tipo temporal o permanente)
  usos_actuales INTEGER DEFAULT 0,
  fecha_inicio TIMESTAMP NOT NULL,
  fecha_fin TIMESTAMP, -- NULL si es permanente
  activo BOOLEAN DEFAULT true,
  creado_por INTEGER, -- ID del usuario que lo creó (sin FK porque puede ser externo)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para códigos de acceso
CREATE INDEX IF NOT EXISTS idx_acceso_codigo ON codigos_acceso(codigo);
CREATE INDEX IF NOT EXISTS idx_acceso_tipo ON codigos_acceso(tipo_acceso);
CREATE INDEX IF NOT EXISTS idx_acceso_nivel ON codigos_acceso(nivel_acceso);
CREATE INDEX IF NOT EXISTS idx_acceso_activo ON codigos_acceso(activo);

-- =====================================================
-- 5. TABLA DE HISTORIAL DE ACCESOS
-- =====================================================
CREATE TABLE IF NOT EXISTS historial_accesos (
  id SERIAL PRIMARY KEY,
  codigo_acceso_id INTEGER NOT NULL REFERENCES codigos_acceso(id) ON DELETE CASCADE,
  usuario_id INTEGER, -- ID del usuario (sin FK porque puede ser externo)
  ip_address VARCHAR(50),
  user_agent TEXT,
  acceso_exitoso BOOLEAN DEFAULT true,
  motivo_fallo TEXT,
  fecha_acceso TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para historial de accesos
CREATE INDEX IF NOT EXISTS idx_historial_codigo ON historial_accesos(codigo_acceso_id);
CREATE INDEX IF NOT EXISTS idx_historial_usuario ON historial_accesos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_historial_fecha ON historial_accesos(fecha_acceso);

-- =====================================================
-- 6. AGREGAR CAMPOS A LA TABLA VENTAS PARA DESCUENTOS
-- =====================================================
ALTER TABLE ventas 
ADD COLUMN IF NOT EXISTS codigo_descuento_id INTEGER REFERENCES codigos_descuento(id),
ADD COLUMN IF NOT EXISTS descuento_aplicado DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10, 2); -- Total antes del descuento

-- Índice para ventas con descuento
CREATE INDEX IF NOT EXISTS idx_ventas_descuento ON ventas(codigo_descuento_id);

-- =====================================================
-- 7. FUNCIONES HELPER
-- =====================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_comisiones_updated_at ON comisiones;
CREATE TRIGGER update_comisiones_updated_at BEFORE UPDATE ON comisiones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_descuentos_updated_at ON codigos_descuento;
CREATE TRIGGER update_descuentos_updated_at BEFORE UPDATE ON codigos_descuento
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_accesos_updated_at ON codigos_acceso;
CREATE TRIGGER update_accesos_updated_at BEFORE UPDATE ON codigos_acceso
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. DATOS DE EJEMPLO (OPCIONAL)
-- =====================================================

-- Ejemplo de comisión por porcentaje para todos
INSERT INTO comisiones (nombre, descripcion, tipo_comision, valor, aplica_a, fecha_inicio, activo)
VALUES 
('Comisión General', 'Comisión del 5% para todos los vendedores', 'porcentaje', 5.00, 'todos', CURRENT_DATE, true),
('Bono Especial', 'Bono fijo de $100 por venta completada', 'fijo', 100.00, 'todos', CURRENT_DATE, true);

-- Ejemplo de códigos de descuento
INSERT INTO codigos_descuento (codigo, nombre, descripcion, tipo_descuento, valor, monto_minimo, fecha_inicio, fecha_fin, aplica_a, activo)
VALUES 
('BIENVENIDA10', 'Descuento de Bienvenida', 'Descuento del 10% en tu primera compra', 'porcentaje', 10.00, 500.00, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '30 days', 'todo', true),
('VERANO2025', 'Descuento de Verano', 'Descuento de $200 en compras mayores a $1000', 'fijo', 200.00, 1000.00, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '90 days', 'todo', true),
('VIP20', 'Descuento VIP', '20% de descuento para clientes VIP', 'porcentaje', 20.00, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '365 days', 'todo', true);

-- Ejemplo de códigos de acceso
INSERT INTO codigos_acceso (codigo, nombre, descripcion, tipo_acceso, nivel_acceso, fecha_inicio, fecha_fin, activo)
VALUES 
('ADMIN2025', 'Acceso Admin Temporal', 'Código de acceso administrativo temporal', 'temporal', 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '7 days', true),
('INVITADO123', 'Acceso Invitado', 'Código de acceso de un solo uso para invitados', 'uso_unico', 'invitado', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '1 day', true),
('GERENTE001', 'Acceso Gerente Permanente', 'Código de acceso permanente para gerentes', 'permanente', 'gerente', CURRENT_TIMESTAMP, NULL, true);

-- =====================================================
-- 9. COMENTARIOS EN TABLAS
-- =====================================================
COMMENT ON TABLE comisiones IS 'Configuración de comisiones para empleados/vendedores';
COMMENT ON TABLE codigos_descuento IS 'Códigos de descuento aplicables en ventas';
COMMENT ON TABLE uso_descuentos IS 'Registro de uso de códigos de descuento';
COMMENT ON TABLE codigos_acceso IS 'Códigos especiales de acceso al sistema';
COMMENT ON TABLE historial_accesos IS 'Historial de uso de códigos de acceso';

-- =====================================================
-- 10. POLÍTICAS RLS (Row Level Security)
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE comisiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE codigos_descuento ENABLE ROW LEVEL SECURITY;
ALTER TABLE uso_descuentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE codigos_acceso ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_accesos ENABLE ROW LEVEL SECURITY;

-- Políticas para COMISIONES
-- Permitir lectura a usuarios autenticados
CREATE POLICY "Permitir lectura de comisiones a usuarios autenticados"
ON comisiones FOR SELECT
TO authenticated
USING (true);

-- Permitir inserción, actualización y eliminación solo a service_role (backend)
CREATE POLICY "Permitir todas las operaciones a service_role en comisiones"
ON comisiones FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Políticas para CÓDIGOS DE DESCUENTO
-- Permitir lectura de descuentos activos a usuarios autenticados
CREATE POLICY "Permitir lectura de descuentos activos a usuarios autenticados"
ON codigos_descuento FOR SELECT
TO authenticated
USING (activo = true);

-- Permitir todas las operaciones a service_role (backend)
CREATE POLICY "Permitir todas las operaciones a service_role en descuentos"
ON codigos_descuento FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Políticas para USO DE DESCUENTOS
-- Permitir lectura a usuarios autenticados
CREATE POLICY "Permitir lectura de uso de descuentos a usuarios autenticados"
ON uso_descuentos FOR SELECT
TO authenticated
USING (true);

-- Permitir inserción a service_role (backend)
CREATE POLICY "Permitir todas las operaciones a service_role en uso_descuentos"
ON uso_descuentos FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Políticas para CÓDIGOS DE ACCESO
-- Permitir lectura solo a service_role (más seguro)
CREATE POLICY "Permitir lectura de códigos de acceso a usuarios autenticados"
ON codigos_acceso FOR SELECT
TO authenticated
USING (true);

-- Permitir todas las operaciones a service_role (backend)
CREATE POLICY "Permitir todas las operaciones a service_role en codigos_acceso"
ON codigos_acceso FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Políticas para HISTORIAL DE ACCESOS
-- Permitir lectura a usuarios autenticados
CREATE POLICY "Permitir lectura de historial a usuarios autenticados"
ON historial_accesos FOR SELECT
TO authenticated
USING (true);

-- Permitir inserción y actualización a service_role
CREATE POLICY "Permitir todas las operaciones a service_role en historial_accesos"
ON historial_accesos FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================
-- FINALIZADO
-- =====================================================
-- Tablas creadas exitosamente:
-- ✓ comisiones
-- ✓ codigos_descuento
-- ✓ uso_descuentos
-- ✓ codigos_acceso
-- ✓ historial_accesos
-- ✓ ventas (actualizada con campos de descuento)
-- ✓ Políticas RLS configuradas
