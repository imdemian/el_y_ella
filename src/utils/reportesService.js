// src/utils/reportesService.js
import jsPDF from "jspdf";

/**
 * Servicio para generar reportes de ventas en PDF y CSV
 */
export class ReportesService {
  /**
   * Genera un reporte PDF de ventas por tienda
   */
  static generarReportePDFPorTienda(
    ventas,
    tiendas,
    empleados,
    fechaInicio,
    fechaFin
  ) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let yPos = 20;

    // Filtrar solo ventas completadas
    const ventasCompletadas = ventas.filter(
      (v) => v.estado_venta === "completada"
    );

    // Agrupar ventas por tienda
    const ventasPorTienda = this._agruparPorTienda(ventasCompletadas, tiendas);

    // Título del reporte
    doc.setFontSize(18);
    doc.setFont(undefined, "bold");
    doc.text("REPORTE DE VENTAS POR TIENDA", pageWidth / 2, yPos, {
      align: "center",
    });
    yPos += 10;

    // Período
    doc.setFontSize(11);
    doc.setFont(undefined, "normal");
    doc.text(
      `Período: ${this._formatearFecha(fechaInicio)} - ${this._formatearFecha(
        fechaFin
      )}`,
      pageWidth / 2,
      yPos,
      { align: "center" }
    );
    yPos += 10;

    // Resumen general
    const totalGeneral = ventasCompletadas.reduce((sum, v) => sum + v.total, 0);
    doc.setFontSize(10);
    doc.text(
      `Total de ventas: ${
        ventasCompletadas.length
      } | Monto total: ${this._formatearMoneda(totalGeneral)}`,
      pageWidth / 2,
      yPos,
      { align: "center" }
    );
    yPos += 15;

    // Iterar por cada tienda
    Object.entries(ventasPorTienda).forEach(([tiendaNombre, data]) => {
      // Verificar si necesitamos nueva página
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      // Nombre de la tienda
      doc.setFontSize(14);
      doc.setFont(undefined, "bold");
      doc.text(tiendaNombre, 14, yPos);
      yPos += 7;

      // Resumen de la tienda
      doc.setFontSize(9);
      doc.setFont(undefined, "normal");
      doc.text(
        `Ventas: ${data.ventas.length} | Total: ${this._formatearMoneda(
          data.total
        )}`,
        14,
        yPos
      );
      yPos += 5;

      // Tabla de ventas (dibujada manualmente)
      doc.setFontSize(8);
      doc.setFont(undefined, "bold");
      doc.setFillColor(155, 127, 168);
      doc.rect(14, yPos, 182, 6, "F");
      doc.setTextColor(255, 255, 255);
      doc.text("Folio", 16, yPos + 4);
      doc.text("Fecha", 46, yPos + 4);
      doc.text("Método", 76, yPos + 4);
      doc.text("Total", 106, yPos + 4);
      doc.text("Cliente", 136, yPos + 4);
      doc.text("Vendedor", 166, yPos + 4);
      yPos += 6;

      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, "normal");
      let isGray = false;

      data.ventas.forEach((venta) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }

        if (isGray) {
          doc.setFillColor(245, 245, 245);
          doc.rect(14, yPos, 182, 5, "F");
        }
        isGray = !isGray;

        const folioTexto = venta.folio || String(venta.id).substring(0, 8);
        const usuario = empleados.find((e) => e.id === venta.usuario_id);
        const vendedorNombre = usuario?.nombre || "N/A";

        doc.text(folioTexto, 16, yPos + 3.5);
        doc.text(this._formatearFechaCorta(venta.created_at), 46, yPos + 3.5);
        doc.text(this._formatearMetodoPago(venta.metodo_pago), 76, yPos + 3.5);
        doc.text(this._formatearMoneda(venta.total), 106, yPos + 3.5);
        doc.text(
          (venta.cliente_info?.nombre || "General").substring(0, 15),
          136,
          yPos + 3.5
        );
        doc.text(vendedorNombre.substring(0, 15), 166, yPos + 3.5);
        yPos += 5;
      });

      yPos += 5;
    });

    // Pie de página con fecha de generación
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont(undefined, "normal");
      doc.text(
        `Generado: ${new Date().toLocaleString("es-MX")}`,
        14,
        doc.internal.pageSize.height - 10
      );
      doc.text(
        `Página ${i} de ${totalPages}`,
        pageWidth - 14,
        doc.internal.pageSize.height - 10,
        { align: "right" }
      );
    }

    // Guardar PDF
    const nombreArchivo = `Ventas_por_Tienda_${this._generarNombreArchivo(
      fechaInicio,
      fechaFin
    )}.pdf`;
    doc.save(nombreArchivo);
  }

  /**
   * Genera un reporte PDF de comisiones por vendedor
   */
  static generarReportePDFComisiones(
    ventas,
    empleados,
    tiendas,
    fechaInicio,
    fechaFin,
    porcentajeComision = 0.03
  ) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let yPos = 20;

    // Filtrar solo ventas completadas
    const ventasCompletadas = ventas.filter(
      (v) => v.estado_venta === "completada"
    );

    // Calcular comisiones por vendedor
    const resumenVendedores = this._calcularComisionesPorVendedor(
      ventasCompletadas,
      empleados,
      tiendas,
      porcentajeComision
    );

    // Título del reporte
    doc.setFontSize(18);
    doc.setFont(undefined, "bold");
    doc.text("REPORTE DE COMISIONES POR VENDEDOR", pageWidth / 2, yPos, {
      align: "center",
    });
    yPos += 10;

    // Período
    doc.setFontSize(11);
    doc.setFont(undefined, "normal");
    doc.text(
      `Período: ${this._formatearFecha(fechaInicio)} - ${this._formatearFecha(
        fechaFin
      )}`,
      pageWidth / 2,
      yPos,
      { align: "center" }
    );
    yPos += 8;

    // Comisión aplicada
    doc.setFontSize(10);
    doc.text(
      `Comisión aplicada: ${(porcentajeComision * 100).toFixed(1)}%`,
      pageWidth / 2,
      yPos,
      { align: "center" }
    );
    yPos += 15;

    // Tabla de vendedores (dibujada manualmente)
    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    doc.setFillColor(39, 174, 96);
    doc.rect(14, yPos, 182, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.text("#", 16, yPos + 5);
    doc.text("Vendedor", 26, yPos + 5);
    doc.text("Tienda", 86, yPos + 5);
    doc.text("Ventas", 126, yPos + 5);
    doc.text("Total Vendido", 146, yPos + 5);
    doc.text("Comisión", 176, yPos + 5);
    yPos += 7;

    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, "normal");
    doc.setFontSize(8);
    let isGray = false;

    resumenVendedores.forEach((vendedor, index) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }

      if (isGray) {
        doc.setFillColor(245, 245, 245);
        doc.rect(14, yPos, 182, 6, "F");
      }
      isGray = !isGray;

      doc.text((index + 1).toString(), 16, yPos + 4);
      doc.text(vendedor.nombre.substring(0, 25), 26, yPos + 4);
      doc.text(vendedor.tienda.substring(0, 18), 86, yPos + 4);
      doc.text(vendedor.num_ventas.toString(), 130, yPos + 4);
      doc.text(this._formatearMoneda(vendedor.total_ventas), 150, yPos + 4);
      doc.text(this._formatearMoneda(vendedor.comision), 176, yPos + 4);
      yPos += 6;
    });

    // Totales
    yPos += 2;
    doc.setFillColor(52, 73, 94);
    doc.rect(14, yPos, 182, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, "bold");
    doc.setFontSize(9);
    doc.text("TOTAL", 86, yPos + 5);
    doc.text(
      resumenVendedores.reduce((sum, v) => sum + v.num_ventas, 0).toString(),
      130,
      yPos + 5
    );
    doc.text(
      this._formatearMoneda(
        resumenVendedores.reduce((sum, v) => sum + v.total_ventas, 0)
      ),
      150,
      yPos + 5
    );
    doc.text(
      this._formatearMoneda(
        resumenVendedores.reduce((sum, v) => sum + v.comision, 0)
      ),
      176,
      yPos + 5
    );

    // Pie de página
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont(undefined, "normal");
      doc.text(
        `Generado: ${new Date().toLocaleString("es-MX")}`,
        14,
        doc.internal.pageSize.height - 10
      );
      doc.text(
        `Página ${i} de ${totalPages}`,
        pageWidth - 14,
        doc.internal.pageSize.height - 10,
        { align: "right" }
      );
    }

    // Guardar PDF
    const nombreArchivo = `Comisiones_Vendedores_${this._generarNombreArchivo(
      fechaInicio,
      fechaFin
    )}.pdf`;
    doc.save(nombreArchivo);
  }

  /**
   * Genera un reporte CSV de ventas por tienda
   */
  static generarReporteCSVPorTienda(
    ventas,
    tiendas,
    empleados,
    fechaInicio,
    fechaFin
  ) {
    const ventasCompletadas = ventas.filter(
      (v) => v.estado_venta === "completada"
    );
    const ventasPorTienda = this._agruparPorTienda(ventasCompletadas, tiendas);

    let csvContent = "data:text/csv;charset=utf-8,";

    // Encabezado del reporte
    csvContent += `REPORTE DE VENTAS POR TIENDA\n`;
    csvContent += `Período: ${this._formatearFecha(
      fechaInicio
    )} - ${this._formatearFecha(fechaFin)}\n`;
    csvContent += `Generado: ${new Date().toLocaleString("es-MX")}\n\n`;

    // Por cada tienda
    Object.entries(ventasPorTienda).forEach(([tiendaNombre, data]) => {
      csvContent += `\n${tiendaNombre}\n`;
      csvContent += `Ventas: ${
        data.ventas.length
      } | Total: ${this._formatearMoneda(data.total)}\n`;
      csvContent += `Folio,Fecha,Método Pago,Total,Cliente,Vendedor\n`;

      data.ventas.forEach((venta) => {
        const folio = venta.folio || String(venta.id).substring(0, 8);
        const fecha = this._formatearFecha(venta.created_at);
        const metodoPago = this._formatearMetodoPago(venta.metodo_pago);
        const total = venta.total || 0;
        const cliente = (
          venta.cliente_info?.nombre || "Cliente General"
        ).replace(/,/g, ";");
        const usuario = empleados.find((e) => e.id === venta.usuario_id);
        const vendedor = usuario?.nombre || "N/A";

        csvContent += `${folio},${fecha},${metodoPago},${total},${cliente},${vendedor}\n`;
      });
    });

    // Descargar archivo
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Ventas_por_Tienda_${this._generarNombreArchivo(
        fechaInicio,
        fechaFin
      )}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Genera un reporte CSV de comisiones por vendedor
   */
  static generarReporteCSVComisiones(
    ventas,
    empleados,
    tiendas,
    fechaInicio,
    fechaFin,
    porcentajeComision = 0.03
  ) {
    const ventasCompletadas = ventas.filter(
      (v) => v.estado_venta === "completada"
    );

    console.log("📊 Generando reporte CSV de comisiones:");
    console.log("- Ventas completadas:", ventasCompletadas.length);
    console.log("- Empleados/Usuarios:", empleados?.length);
    console.log("- Tiendas:", tiendas?.length);

    const resumenVendedores = this._calcularComisionesPorVendedor(
      ventasCompletadas,
      empleados,
      tiendas,
      porcentajeComision
    );

    console.log("- Resumen vendedores:", resumenVendedores);

    // BOM para UTF-8
    let csvContent = "\uFEFF";

    // Encabezado del reporte
    csvContent += `REPORTE DE COMISIONES POR VENDEDOR\n`;
    csvContent += `Período: ${this._formatearFecha(
      fechaInicio
    )} - ${this._formatearFecha(fechaFin)}\n`;
    csvContent += `Comisión aplicada: ${(porcentajeComision * 100).toFixed(
      1
    )}%\n`;
    csvContent += `Generado: ${new Date().toLocaleString("es-MX")}\n\n`;

    // Encabezados de tabla
    csvContent += `#,Vendedor,Tienda,Núm. Ventas,Total Vendido,Comisión\n`;

    // Datos de vendedores
    resumenVendedores.forEach((vendedor, index) => {
      csvContent += `${index + 1},"${vendedor.nombre}","${vendedor.tienda}",${
        vendedor.num_ventas
      },${vendedor.total_ventas.toFixed(2)},${vendedor.comision.toFixed(2)}\n`;
    });

    // Totales
    const totalVentas = resumenVendedores.reduce(
      (sum, v) => sum + v.num_ventas,
      0
    );
    const totalVendido = resumenVendedores.reduce(
      (sum, v) => sum + v.total_ventas,
      0
    );
    const totalComision = resumenVendedores.reduce(
      (sum, v) => sum + v.comision,
      0
    );
    csvContent += `\n,"TOTAL",,${totalVentas},${totalVendido.toFixed(
      2
    )},${totalComision.toFixed(2)}\n`;

    // Crear Blob y descargar
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Comisiones_Vendedores_${this._generarNombreArchivo(
        fechaInicio,
        fechaFin
      )}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // =====================================================
  // FUNCIONES HELPER PRIVADAS
  // =====================================================

  /**
   * Agrupa ventas por tienda
   */
  static _agruparPorTienda(ventas, tiendas) {
    const ventasPorTienda = {};

    ventas.forEach((venta) => {
      const tiendaNombre =
        venta.tiendas?.nombre ||
        tiendas.find((t) => t.id === venta.tienda_id)?.nombre ||
        "Sin Tienda";

      if (!ventasPorTienda[tiendaNombre]) {
        ventasPorTienda[tiendaNombre] = {
          ventas: [],
          total: 0,
        };
      }

      ventasPorTienda[tiendaNombre].ventas.push(venta);
      ventasPorTienda[tiendaNombre].total += venta.total;
    });

    // Ordenar alfabéticamente
    return Object.keys(ventasPorTienda)
      .sort()
      .reduce((acc, key) => {
        acc[key] = ventasPorTienda[key];
        return acc;
      }, {});
  }

  /**
   * Calcula comisiones por vendedor
   */
  static _calcularComisionesPorVendedor(
    ventas,
    empleados,
    tiendas,
    porcentajeComision
  ) {
    const resumenPorVendedor = {};

    ventas.forEach((venta) => {
      const vendedorId = venta.usuario_id;

      if (!resumenPorVendedor[vendedorId]) {
        const usuario = empleados.find((e) => e.id === vendedorId);
        const tienda =
          venta.tiendas?.nombre ||
          tiendas.find((t) => t.id === venta.tienda_id)?.nombre ||
          usuario?.tiendas?.nombre ||
          "Sin Tienda";

        resumenPorVendedor[vendedorId] = {
          vendedor_id: vendedorId,
          nombre: usuario?.nombre || `Usuario: ${vendedorId}`,
          tienda: tienda,
          total_ventas: 0,
          num_ventas: 0,
          comision: 0,
        };
      }

      resumenPorVendedor[vendedorId].total_ventas += venta.total;
      resumenPorVendedor[vendedorId].num_ventas += 1;
      resumenPorVendedor[vendedorId].comision +=
        venta.total * porcentajeComision;
    });

    // Convertir a array y ordenar por total de ventas
    return Object.values(resumenPorVendedor).sort(
      (a, b) => b.total_ventas - a.total_ventas
    );
  }

  /**
   * Formatea una fecha
   */
  static _formatearFecha(fecha) {
    if (!fecha) return "N/A";
    const date = new Date(fecha);
    return date.toLocaleDateString("es-MX", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  /**
   * Formatea una fecha corta (para tablas)
   */
  static _formatearFechaCorta(fecha) {
    if (!fecha) return "N/A";
    const date = new Date(fecha);
    return date.toLocaleDateString("es-MX", {
      month: "2-digit",
      day: "2-digit",
    });
  }

  /**
   * Formatea moneda
   */
  static _formatearMoneda(monto) {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(monto);
  }

  /**
   * Formatea método de pago
   */
  static _formatearMetodoPago(metodoPago) {
    if (!metodoPago) return "N/A";
    if (typeof metodoPago === "string") return metodoPago.toUpperCase();
    if (typeof metodoPago === "object") {
      const metodos = Object.keys(metodoPago);
      return metodos.length > 0 ? metodos.join(", ").toUpperCase() : "N/A";
    }
    return "N/A";
  }

  /**
   * Genera nombre de archivo con fechas
   */
  static _generarNombreArchivo(fechaInicio, fechaFin) {
    const inicio = fechaInicio.replace(/-/g, "");
    const fin = fechaFin.replace(/-/g, "");
    return `${inicio}_${fin}`;
  }
}
