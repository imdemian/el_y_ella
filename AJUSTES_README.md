# Sistema de Comisiones, Descuentos y Códigos de Acceso

Este módulo implementa un sistema completo de gestión para:

- **Comisiones** para empleados/vendedores
- **Códigos de Descuento** aplicables en ventas
- **Códigos de Acceso** especiales para el sistema

## 📋 Instalación

### 1. Ejecutar Script SQL

Ve a tu panel de Supabase → SQL Editor y ejecuta el archivo:

```
functions/scripts/createAjustesTablas.sql
```

Este script creará las siguientes tablas:

- `comisiones`
- `codigos_descuento`
- `uso_descuentos`
- `codigos_acceso`
- `historial_accesos`

También actualizará la tabla `ventas` agregando:

- `codigo_descuento_id`
- `descuento_aplicado`
- `subtotal`

### 2. Archivos Creados

#### Servicios (src/services/supabase/):

- ✅ `comisionService.js` - CRUD y cálculos de comisiones
- ✅ `descuentoService.js` - CRUD y validación de descuentos
- ✅ `codigoAccesoService.js` - CRUD y validación de accesos

#### Componentes (src/pages/Ajustes/components/):

- ✅ `ComisionModal.jsx` + `.scss` - Crear/editar comisiones
- ✅ `EliminarComision.jsx` - Eliminar comisiones
- ✅ `DescuentoModal.jsx` + `.scss` - Crear/editar descuentos
- ✅ `CodigoAccesoModal.jsx` + `.scss` - Crear/editar códigos de acceso

## 🎯 Funcionalidades

### Comisiones

- Tipos: **Porcentaje** o **Monto Fijo**
- Aplica a: Todos, Empleado específico, Categoría, Producto
- Fechas de vigencia (inicio/fin)
- Cálculo automático en ventas completadas
- Integración con dashboard de Historial

**Ejemplo de uso:**

```javascript
import { ComisionService } from "./services/supabase/comisionService";

// Calcular comisión de una venta
const { comisionTotal, desglose } = await ComisionService.calcularComisionVenta(
  venta
);

// Obtener comisiones por vendedor en un período
const comisiones = await ComisionService.calcularComisionesPorVendedor(
  "2025-01-01",
  "2025-01-31",
  tiendaId // opcional
);
```

### Códigos de Descuento

- Tipos: **Porcentaje** o **Monto Fijo**
- Validación automática (fechas, usos, monto mínimo)
- Aplica a: Todos los productos, Categorías, Productos específicos
- Control de usos (máximos totales y por cliente)
- Registro de uso en cada venta

**Ejemplo de uso:**

```javascript
import { DescuentoService } from "./services/supabase/descuentoService";

// Validar código de descuento
const resultado = await DescuentoService.validarDescuento(
  "VERANO2025",
  subtotal,
  items,
  clienteInfo
);

if (resultado.valido) {
  console.log(`Descuento: $${resultado.montoDescuento}`);
  // Aplicar descuento a la venta
}
```

### Códigos de Acceso

- Tipos: **Temporal**, **Permanente**, **Uso Único**
- Niveles: Invitado, Vendedor, Gerente, Administrador
- Generación automática de códigos
- Historial de accesos
- Estadísticas de uso

**Ejemplo de uso:**

```javascript
import { CodigoAccesoService } from "./services/supabase/codigoAccesoService";

// Validar código de acceso
const resultado = await CodigoAccesoService.validarCodigoAcceso("ADMIN2025");

if (resultado.valido) {
  // Registrar acceso
  await CodigoAccesoService.registrarUsoAcceso(
    resultado.codigoAcceso.id,
    usuarioId,
    ipAddress,
    userAgent,
    true
  );
}
```

## 🔧 Integración con Ventas

### Aplicar Descuento en Ventas.jsx

Agregar al componente de ventas:

```jsx
import { DescuentoService } from "../../services/supabase/descuentoService";

// Estado para el descuento
const [codigoDescuento, setCodigoDescuento] = useState("");
const [descuentoAplicado, setDescuentoAplicado] = useState(null);

// Función para aplicar descuento
const aplicarDescuento = async () => {
  if (!codigoDescuento.trim()) return;

  const resultado = await DescuentoService.validarDescuento(
    codigoDescuento,
    subtotal,
    carrito
  );

  if (resultado.valido) {
    setDescuentoAplicado(resultado);
    toast.success(resultado.mensaje);
  } else {
    toast.error(resultado.mensaje);
  }
};

// En el cálculo del total
const subtotal = carrito.reduce((sum, item) => sum + item.subtotal, 0);
const montoDescuento = descuentoAplicado?.montoDescuento || 0;
const total = subtotal - montoDescuento;
```

### Actualizar ventasRouter.js

Agregar en el endpoint POST /ventas:

```javascript
// Validar descuento si existe
if (codigo_descuento_id) {
  const descuento = await supabaseAdmin
    .from("codigos_descuento")
    .select("*")
    .eq("id", codigo_descuento_id)
    .single();

  // Registrar uso del descuento
  await DescuentoService.registrarUsoDescuento(
    codigo_descuento_id,
    ventaId,
    cliente_info,
    descuento_aplicado
  );
}
```

## 📊 Integración con Historial

El componente `ComisionesVendedores.jsx` ya está preparado para mostrar comisiones.

Para usar el cálculo real de comisiones:

```jsx
import { ComisionService } from "../../../services/supabase/comisionService";

// En lugar de calcular 5% fijo:
const calcularComisionesReales = async () => {
  const comisionesPorVendedor =
    await ComisionService.calcularComisionesPorVendedor(
      fechaInicio,
      fechaFin,
      tiendaFiltro
    );

  return comisionesPorVendedor;
};
```

## 🎨 Componente Ajustes.jsx

El componente principal necesita importar los nuevos modales:

```jsx
import ComisionModal from "./components/ComisionModal";
import EliminarComision from "./components/EliminarComision";
import DescuentoModal from "./components/DescuentoModal";
import CodigoAccesoModal from "./components/CodigoAccesoModal";
import { ComisionService } from "../../services/supabase/comisionService";
import { DescuentoService } from "../../services/supabase/descuentoService";
import { CodigoAccesoService } from "../../services/supabase/codigoAccesoService";
```

## 📝 Próximos Pasos

1. ✅ Ejecutar script SQL en Supabase
2. ⏳ Actualizar Ajustes.jsx para cargar comisiones, descuentos y códigos
3. ⏳ Integrar descuentos en Ventas.jsx
4. ⏳ Actualizar ventasRouter.js para manejar descuentos
5. ⏳ Actualizar Historial para mostrar comisiones reales
6. ⏳ Probar todo el flujo completo

## 🐛 Troubleshooting

### Error: "relation does not exist"

- Asegúrate de ejecutar el script SQL completo
- Verifica que estás usando la base de datos correcta

### Error: "permission denied"

- Revisa las políticas de RLS en Supabase
- Asegúrate de que el usuario tiene permisos

### Descuento no se aplica

- Verifica que el código esté activo
- Revisa las fechas de vigencia
- Confirma que cumple con el monto mínimo

## 📚 Documentación Adicional

- Cada servicio tiene comentarios JSDoc
- Los componentes tienen validaciones inline
- Consulta los archivos individuales para más detalles

---

**Creado para el sistema ElyElla POS**
Fecha: Noviembre 2025
