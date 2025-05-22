// src/services/authService.js
import { auth } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

/**
 * Inicia sesión con email y contraseña.
 * @param { email: string, password: string } credentials - Credenciales del usuario.
 * @returns {Promise<ImportAttributes("firebase/auth").UserCredential>} - Credenciales del usuario.
 */
export function login({ email, password }) {
  return signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      // Inicio de sesión exitoso.
      return userCredential;
    })
    .catch((error) => {
      // Manejo de errores.
      throw new Error(error.message);
    });
}
