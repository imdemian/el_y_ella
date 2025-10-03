// frontend/src/services/empleadoService.js
import { FUNCTIONS_URL } from "../../utils/constants";
const API_BASE = FUNCTIONS_URL;

export class EmpleadoService {
  static async crearEmpleado(empleadoData, token) {
    const response = await fetch(`${API_BASE}/empleados`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(empleadoData),
    });

    if (!response.ok) {
      throw new Error("Error creando empleado");
    }

    return await response.json();
  }

  static async listarEmpleados(token, filtros = {}) {
    const queryParams = new URLSearchParams(filtros).toString();
    const url = `${API_BASE}/empleados${queryParams ? `?${queryParams}` : ""}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Error obteniendo empleados");
    }

    return await response.json();
  }

  static async obtenerEmpleado(id, token) {
    const response = await fetch(`${API_BASE}/empleados/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Error obteniendo empleado");
    }

    return await response.json();
  }
}
