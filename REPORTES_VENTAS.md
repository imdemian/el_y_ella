# 📊 Sistema de Reportes de Ventas

## Descripción

Sistema completo de generación de reportes en PDF y CSV para el módulo de Historial de Ventas.

---

## 🎯 Tipos de Reportes Disponibles

### 1️⃣ **Reporte de Ventas por Tienda** (PDF/CSV)

Organiza todas las ventas por tienda, mostrando:

- **Por cada tienda:**
  - Nombre de la tienda
  - Número total de ventas
  - Monto total vendido
  - **Tabla detallada con:**
    - Folio de venta
    - Fecha
    - Método de pago
    - Total
    - Cliente

**Formato:**

```
==========================================
        REPORTE DE VENTAS POR TIENDA
==========================================
Período: 15 nov 2025 - 18 nov 2025
Total de ventas: 150 | Monto total: $75,000.00

------------------------------------------
TIENDA CENTRO
Ventas: 75 | Total: $37,500.00

Folio   Fecha       Método      Total       Cliente
1001    15/11      EFECTIVO    $500.00     Juan Pérez
1002    15/11      TARJETA     $750.00     María López
...

------------------------------------------
TIENDA PLAZA
Ventas: 75 | Total: $37,500.00
...
```

---

### 2️⃣ **Reporte de Comisiones por Vendedor** (PDF/CSV)

Calcula y muestra las comisiones de cada vendedor:

- **Por cada vendedor:**
  - Ranking (#1, #2, #3...)
  - Nombre completo
  - Tienda asignada
  - Número de ventas realizadas
  - Total vendido
  - Comisión ganada (3%)

**Formato:**

```
==========================================
   REPORTE DE COMISIONES POR VENDEDOR
==========================================
Período: 15 nov 2025 - 18 nov 2025
Comisión aplicada: 3.0%

#  Vendedor         Tienda        Ventas  Total Vendido    Comisión
1  Juan Pérez      Centro         50      $25,000.00      $750.00
2  María López     Plaza          45      $22,500.00      $675.00
3  Carlos Ruiz     Norte          30      $15,000.00      $450.00
================================================================
   TOTAL                          125     $62,500.00      $1,875.00
```

---

## 🎨 Interfaz de Usuario

### Ubicación

Los botones de reportes están en la parte superior del módulo **Historial**, justo después de los filtros y antes de los KPIs.

### Botones Disponibles

```
📄 Generar Reportes
┌─────────────────────────────────────────────────────┐
│  📑 PDF Ventas por Tienda    📑 PDF Comisiones      │
│  📊 CSV Ventas por Tienda    📊 CSV Comisiones      │
└─────────────────────────────────────────────────────┘
```

- **📑 PDF Ventas por Tienda**: Genera PDF organizado por tiendas
- **📑 PDF Comisiones**: Genera PDF con comisiones de vendedores
- **📊 CSV Ventas por Tienda**: Exporta a Excel/CSV por tiendas
- **📊 CSV Comisiones**: Exporta comisiones a Excel/CSV

---

## 📋 Cómo Usar

### Paso 1: Aplicar Filtros

Antes de generar el reporte, configura los filtros:

1. **Selecciona el período:**

   - Hoy, Ayer, Esta Semana, Este Mes
   - O usa "Personalizado" para seleccionar fechas específicas

2. **Filtros opcionales:**
   - Estado (Completadas, Apartados, Canceladas)
   - Método de pago (Efectivo, Tarjeta, Transferencia)
   - Tienda específica
   - Vendedor específico

### Paso 2: Generar Reporte

1. Click en el botón del reporte deseado
2. El archivo se descargará automáticamente
3. Verás una notificación de éxito

### Paso 3: Abrir el Archivo

**PDF:**

- Se abre directamente en el navegador
- O se descarga según configuración del navegador
- Nombre: `Ventas_por_Tienda_20251115_20251118.pdf`

**CSV:**

- Se descarga automáticamente
- Compatible con Excel, Google Sheets, Numbers
- Nombre: `Comisiones_Vendedores_20251115_20251118.csv`

---

## 🔧 Configuración

### Porcentaje de Comisión

Actualmente configurado en **3%**. Para cambiar:

**Archivo:** `src/pages/Historial/Historial.jsx`

```javascript
const generarReportePDFComisiones = () => {
  ReportesService.generarReportePDFComisiones(
    ventas,
    empleados,
    tiendas,
    fechaInicio,
    fechaFin,
    0.03 // ← Cambiar aquí (0.05 = 5%, 0.10 = 10%)
  );
};
```

### Personalizar Diseño PDF

**Archivo:** `src/utils/reportesService.js`

Puedes modificar:

- **Colores:** Cambiar `setFillColor(R, G, B)`
- **Fuentes:** Cambiar `setFontSize(tamaño)`
- **Márgenes:** Ajustar coordenadas `doc.text(texto, x, y)`

---

## 📊 Casos de Uso

### 1. Reporte Diario de Ventas

```
1. Filtro: "Hoy"
2. Estado: "Completadas"
3. Click: "PDF Ventas por Tienda"
```

**Resultado:** PDF con ventas de hoy por tienda

### 2. Cálculo de Comisiones Semanal

```
1. Filtro: "Esta Semana"
2. Estado: "Completadas"
3. Click: "CSV Comisiones"
```

**Resultado:** Excel con comisiones de la semana

### 3. Análisis por Vendedor

```
1. Filtro: "Este Mes"
2. Vendedor: Seleccionar vendedor específico
3. Click: "PDF Comisiones"
```

**Resultado:** PDF con comisiones del vendedor en el mes

### 4. Reporte por Tienda

```
1. Filtro: Personalizado (rango de fechas)
2. Tienda: Seleccionar tienda específica
3. Click: "PDF Ventas por Tienda"
```

**Resultado:** PDF con ventas de esa tienda en el período

---

## 🎁 Características

### ✅ PDF

- ✨ Diseño profesional con colores corporativos
- 📄 Múltiples páginas automáticas
- 🔢 Numeración de páginas
- 📅 Fecha y hora de generación
- 📊 Tablas organizadas con filas alternadas
- 💰 Totales calculados automáticamente
- 🎨 Headers con fondo de color

### ✅ CSV

- 📊 Compatible con Excel y Google Sheets
- 🔤 Formato UTF-8 para caracteres especiales
- 📋 Estructura clara con encabezados
- 💵 Datos numéricos listos para análisis
- 🧮 Totales incluidos al final
- 📈 Fácil de importar a sistemas contables

---

## 🚀 Mejoras Futuras Sugeridas

1. **Gráficas en PDF**

   - Agregar gráficos de barras/pastel
   - Usar librería como Chart.js + canvas

2. **Envío por Email**

   - Botón "Enviar por Email"
   - Integración con servicio SMTP

3. **Programación de Reportes**

   - Reportes automáticos diarios/semanales
   - Notificaciones automáticas

4. **Filtros Avanzados**

   - Rango de montos
   - Productos más vendidos
   - Clientes frecuentes

5. **Formato Excel (.xlsx)**
   - Usar librería como `xlsx`
   - Múltiples hojas por reporte
   - Formato condicional

---

## 🐛 Troubleshooting

### ❌ Botones deshabilitados

**Causa:** No hay ventas en el rango de fechas seleccionado
**Solución:** Ajusta los filtros para incluir ventas

### ❌ Error al generar PDF

**Causa:** Datos faltantes (empleados o tiendas no cargados)
**Solución:** Recarga la página para cargar todos los datos

### ❌ CSV no se abre en Excel

**Causa:** Encoding incorrecto
**Solución:** Abre con Excel → Datos → Desde Texto → UTF-8

### ❌ Comisión incorrecta

**Causa:** Porcentaje mal configurado
**Solución:** Verifica el parámetro en `Historial.jsx` (línea 313)

---

## 📝 Archivos Involucrados

```
src/
├── utils/
│   └── reportesService.js        ← Lógica de generación
├── pages/
│   └── Historial/
│       ├── Historial.jsx         ← Integración de botones
│       └── Historial.scss        ← Estilos de botones
└── package.json                  ← Dependencia jsPDF
```

---

## 💡 Tips

1. **Filtrar antes de generar:** Aplica filtros para reportes más específicos
2. **CSV para análisis:** Usa CSV cuando necesites manipular datos en Excel
3. **PDF para presentar:** Usa PDF para mostrar a gerencia o imprimir
4. **Nombres de archivo:** Incluyen las fechas automáticamente
5. **Ventas completadas:** Solo se incluyen ventas con estado "completada"

---

## 📞 Soporte

Para dudas o problemas con los reportes:

- Revisar este documento
- Archivo: `src/utils/reportesService.js`
- Componente: `src/pages/Historial/Historial.jsx`
