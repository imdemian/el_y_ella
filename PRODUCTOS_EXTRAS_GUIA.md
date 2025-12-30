# 📦 Guía de Productos Extras (No Registrados)

## 🎯 Propósito

Esta funcionalidad permite agregar productos **no registrados** en el inventario durante una venta, ideal para:

- Productos nuevos que aún no se han registrado en el sistema
- Artículos esporádicos o de temporada
- Servicios o productos especiales
- Durante implementación o migración del sistema

## ⚙️ Cómo Funciona

### 1️⃣ **Backend** (Validaciones)

**Productos Normales (con variante_id):**

- ✅ Valida stock disponible
- ✅ Descuenta inventario en tienda
- ✅ Descuenta inventario global
- ✅ Registra movimientos de inventario

**Productos Extras (sin variante_id):**

- ⚠️ **NO** valida stock
- ⚠️ **NO** descuenta inventario
- ✅ Registra la venta normalmente
- ✅ Permite continuar operación del negocio

---

## 💻 Uso en Frontend (React)

### Agregar Producto Extra

1. Click en el botón naranja **"Extra"** junto al input de búsqueda
2. Llenar el formulario:
   - **Nombre** (requerido): "Bolsa grande marca X"
   - **SKU/Código** (opcional): Si lo dejas vacío se genera automático
   - **Precio** (requerido): 15.00
   - **Cantidad** (requerido): 1
3. Click en **"Agregar al Carrito"**

### Características en el Carrito

- Badge naranja **"EXTRA"** identifica productos no registrados
- Texto: "(No descuenta inventario)"
- No se valida stock al aumentar cantidad
- Se procesa igual que productos normales en el pago

---

## 📱 Uso en Flutter

```dart
// Abrir modal
_mostrarDialogoProductoManual()

// El sistema crea automáticamente:
{
  'id': 'manual_${timestamp}',
  'sku': sku_ingresado || 'MANUAL-${timestamp}',
  'nombre_producto': nombre_ingresado,
  'precio': precio_ingresado,
  'cantidad': cantidad_ingresada,
  'stock_actual': 999999, // Ilimitado
  'es_producto_manual': true,
}
```

---

## 📊 Estructura de Datos

### Producto Normal

```javascript
{
  variante_id: "uuid-de-variante",
  cantidad: 2,
  precio_unitario: 150.00,
  subtotal_linea: 300.00
}
```

### Producto Extra

```javascript
{
  es_producto_extra: true,
  nombre_extra: "Bolsa grande marca X",
  descripcion_extra: "Opcional",
  cantidad: 2,
  precio_unitario: 15.00,
  subtotal_linea: 30.00
  // ❌ NO incluye variante_id
}
```

---

## 🗄️ Base de Datos

### Tabla `ventas_items` - Campos Relevantes

```sql
-- Campos existentes
variante_id UUID (NULLABLE), -- NULL para productos extras

-- Campos nuevos
es_producto_extra BOOLEAN DEFAULT false,
nombre_producto_extra TEXT,
descripcion_extra TEXT,

-- Constraint de integridad
CHECK (
  (es_producto_extra = true AND nombre_producto_extra IS NOT NULL AND variante_id IS NULL)
  OR
  (es_producto_extra = false AND variante_id IS NOT NULL)
)
```

---

## ⚡ Flujo Completo

### Crear Venta con Productos Mixtos

```javascript
POST /ventas
{
  items: [
    // Producto normal
    {
      variante_id: "abc-123",
      cantidad: 1,
      precio_unitario: 299.00,
      subtotal_linea: 299.00
    },
    // Producto extra
    {
      es_producto_extra: true,
      nombre_extra: "Cargador genérico",
      cantidad: 1,
      precio_unitario: 50.00,
      subtotal_linea: 50.00
    }
  ],
  subtotal: 349.00,
  total: 349.00,
  metodo_pago: { efectivo: 350.00 },
  estado_venta: "completada",
  tienda_id: 1
}
```

### Respuesta

```json
{
  "message": "Venta creada exitosamente",
  "id": 456,
  "folio": "V-2025-000456",
  "total": 349.0
}
```

---

## 🔄 Cancelación de Ventas

**Comportamiento:**

- Productos normales: ✅ Restaura inventario
- Productos extras: ⏭️ Se ignoran (no afectan inventario)

```javascript
// Al cancelar, solo se restaura inventario de productos normales
for (const item of venta.ventas_items) {
  if (item.es_producto_extra) {
    console.log("Producto extra, no restaurar inventario");
    continue;
  }
  // Restaurar inventario...
}
```

---

## 📋 Checklist de Implementación

### ✅ Backend

- [x] Script SQL: `agregar_productos_extras.sql`
- [x] RPC: `crear_venta_transaccional` actualizado
- [x] RPC: `cobrar_venta_pendiente` actualizado
- [x] Router: Validaciones en POST /ventas
- [x] Router: Cancelación de ventas
- [x] Endpoints GET incluyen campos extras

### ✅ Frontend React

- [x] Estado para modal de producto extra
- [x] Función `agregarProductoExtra()`
- [x] Modal UI con formulario
- [x] Botón "Extra" junto a búsqueda
- [x] Badge "EXTRA" en items del carrito
- [x] Modificar `procesarVenta()` para enviar estructura correcta
- [x] Estilos CSS completos

### ✅ Frontend Flutter

- [x] Diálogo `_mostrarDialogoProductoManual()`
- [x] Badge "MANUAL" en items
- [x] Lógica de productos manuales en `_procesarVenta()`

---

## 🚨 Importante

1. **Registrar productos**: Esta es una solución temporal. Registra los productos en el inventario lo antes posible.

2. **Reportes**: Los productos extras aparecen en reportes de ventas, pero NO en reportes de inventario.

3. **Auditoría**: Todos los productos extras quedan registrados en `ventas_items` con `es_producto_extra = true`.

4. **Comisiones**: Los productos extras SÍ cuentan para comisiones de vendedores.

5. **Descuentos**: Los productos extras SÍ se incluyen en el cálculo de descuentos.

---

## 🔍 Consultas Útiles

### Ver todas las ventas con productos extras

```sql
SELECT
  v.id,
  v.folio,
  vi.nombre_producto_extra,
  vi.precio_unitario,
  vi.cantidad
FROM ventas v
JOIN ventas_items vi ON vi.venta_id = v.id
WHERE vi.es_producto_extra = true
ORDER BY v.created_at DESC;
```

### Contar productos extras por tienda

```sql
SELECT
  t.nombre as tienda,
  COUNT(*) as total_productos_extras
FROM ventas v
JOIN tiendas t ON t.id = v.tienda_id
JOIN ventas_items vi ON vi.venta_id = v.id
WHERE vi.es_producto_extra = true
GROUP BY t.nombre
ORDER BY total_productos_extras DESC;
```

---

## 📞 Soporte

Si encuentras algún problema o tienes dudas:

1. Revisa los logs del backend (consola)
2. Verifica la estructura de datos enviada
3. Consulta esta guía

**Logs útiles:**

- `🆕 Procesando PRODUCTO EXTRA`
- `📦 Procesando PRODUCTO NORMAL`
- `✅ Producto extra registrado (sin afectar inventario)`
