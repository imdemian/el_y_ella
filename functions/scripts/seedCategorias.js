/* eslint-disable no-undef */
// functions/scripts/seedCategorias.js
// ----- Versión ES Module -----

// 1) Importar dotenv automáticamente:
import "dotenv/config";

// 2) Importar el SDK de Admin:
import admin from "firebase-admin";

// 3) Extraer variables de entorno:
const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } =
  process.env;

// 4) Validar que existan todas las variables:
if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
  console.error(
    "\n❌ Faltan variables para inicializar Firebase Admin.\n" +
      "  Asegúrate de definir en tu .env:\n" +
      "  FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY\n"
  );
  process.exit(1);
}

// 5) Inicializar Admin SDK leyendo las credenciales de process.env:
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: FIREBASE_PROJECT_ID,
    clientEmail: FIREBASE_CLIENT_EMAIL,
    // Convertimos las secuencias literales "\n" en saltos de línea reales
    privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
});

// 6) Obtener instancia de Firestore:
const db = admin.firestore();

// 7) Lista de categorías a “sembrar”:
const categorias = [
  { id: "vestidos", nombre: "Vestidos" },
  { id: "ramos", nombre: "Ramos" },
  { id: "cojines", nombre: "Cojines" },
  { id: "albumes", nombre: "Álbumes" },
  { id: "velas", nombre: "Velas" },
  { id: "copas", nombre: "Copas" },
  { id: "ropa_bautizo", nombre: "Ropita/Accesorios de Bautizo" },
  { id: "muñecas", nombre: "Muñecas/Peluches" },
  { id: "accesorios_generales", nombre: "Accesorios Generales" },
];

// 8) Función asincrónica que hace el “batch” para insertar/actualizar:
async function seedCategorias() {
  const batch = db.batch();
  categorias.forEach((cat) => {
    const ref = db.collection("categorias").doc(cat.id);
    batch.set(ref, { nombre: cat.nombre });
  });
  try {
    await batch.commit();
    console.log("✅ Categorías sembradas correctamente.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error al sembrar categorías:", err);
    process.exit(1);
  }
}

// 9) Ejecutar la función:
seedCategorias();
