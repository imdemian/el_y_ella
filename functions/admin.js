import admin from "firebase-admin";

// Solo incializamos una vez
if (!admin.apps.length) {
  admin.initializeApp();
}

export const db = admin.firestore();
export const auth = admin.auth();
export default admin;
