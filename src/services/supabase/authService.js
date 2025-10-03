// src/services/authService.js
import { FUNCTIONS_URL } from "../../utils/constants";

const API_BASE = FUNCTIONS_URL;

export class AuthService {
  static async login(email, password) {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    console.log("Datos de login:", data);

    // Lanza un error con el mensaje del servidor si el login falla.
    if (!response.ok) {
      throw new Error(data.message || "Error en login");
    }

    return data;
  }

  static async register(userData) {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    // Lanza un error con el mensaje del servidor si el registro falla.
    if (!response.ok) {
      throw new Error(data.message || "Error en registro");
    }

    return data;
  }

  static async logout() {
    // Obtener el token guardado para enviarlo al backend
    const token = localStorage.getItem("auth_token");

    if (!token) {
      // Si no hay token, no hay sesión que cerrar en el servidor
      return { success: true };
    }
    const response = await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Error al cerrar sesión en el servidor");
    }

    return data;
  }

  static async verifyToken(token) {
    const response = await fetch(`${API_BASE}/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: token }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Token inválido");
    }

    return data;
  }
}
