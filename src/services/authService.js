// src/services/authService.js
import { auth } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword as fbUpdatePassword,
  getIdToken,
} from "firebase/auth";

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

/**
 * Registra un nuevo usuario con email y contraseña.
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<import("firebase/auth").UserCredential>}
 */
export function register({ email, password }) {
  return createUserWithEmailAndPassword(auth, email, password);
}

/**
 * Cierra la sesión del usuario actual y limpia estado local.
 * @returns {Promise<void>}
 */
export async function logout() {
  try {
    await firebaseSignOut(auth);
  } finally {
    // Limpia lo que el Sidebar y la app usan para permisos/usuario
    localStorage.removeItem("app_roles");
    localStorage.removeItem("app_role");
    localStorage.removeItem("app_user");

    // Si guardas algo más relacionado a sesión, bórralo aquí:
    // localStorage.removeItem("some_other_key");
    // sessionStorage.removeItem("...");

    // Si en algún lugar seteaste axios.defaults.Authorization, límpialo:
    // import axios from "axios";
    // delete axios.defaults.headers.common.Authorization;
  }
}

/**
 * Callback para cambios en el estado de autenticación.
 * @param {(user: import("firebase/auth").User|null) => void} callback
 * @returns {() => void} función para desuscribirse
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Solicita un email de recuperación de contraseña.
 * @param {string} email
 * @returns {Promise<void>}
 */
export function resetPassword(email) {
  return sendPasswordResetEmail(auth, email);
}

/**
 * Reautentica al usuario antes de operaciones sensibles (p.ej. cambiar contraseña).
 * @param {string} currentPassword
 * @returns {Promise<void>}
 */
export async function reauthenticate(currentPassword) {
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error("No hay un usuario autenticado");
  }
  const cred = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, cred);
}

/**
 * Cambia la contraseña del usuario ya autenticado (debe reautenticarse antes).
 * @param {string} newPassword
 * @returns {Promise<void>}
 */
export function changePassword(newPassword) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("No hay un usuario autenticado");
  }
  return fbUpdatePassword(user, newPassword);
}

/**
 * Devuelve el usuario actualmente autenticado (o null si no hay).
 * @returns {import("firebase/auth").User|null}
 */
export function getCurrentUser() {
  return auth.currentUser;
}

/**
 * Obtiene el token de Firebase para el usuario actual (útil para llamadas a tus propias Functions).
 * @returns {Promise<string|null>}
 */
export async function getIdTokenForUser() {
  const user = auth.currentUser;
  if (!user) return null;
  return getIdToken(user, /* forceRefresh=*/ false);
}
