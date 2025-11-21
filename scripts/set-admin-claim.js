/**
 * Asigna el custom claim { admin: true } a un usuario de Firebase Auth.
 *
 * Uso:
 *   export GOOGLE_APPLICATION_CREDENTIALS="ruta/al/serviceAccountKey.json"
 *   export ADMIN_UID="uid-del-usuario"
 *   node scripts/set-admin-claim.js
 *
 * Nota:
 * - Necesitas un service account con permisos de editor/owner del proyecto.
 * - Tras asignar el claim, el usuario debe cerrar sesión y volver a entrar.
 */
const admin = require('firebase-admin');

async function main() {
  const uid = process.env.ADMIN_UID;
  if (!uid) {
    throw new Error('Define la variable de entorno ADMIN_UID con el UID del usuario.');
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error('Define GOOGLE_APPLICATION_CREDENTIALS apuntando al JSON del service account.');
  }

  if (!admin.apps.length) {
    admin.initializeApp();
  }

  await admin.auth().setCustomUserClaims(uid, { admin: true });
  console.log(`Claim admin asignado a ${uid}. El usuario debe volver a iniciar sesión.`);
}

main().catch((err) => {
  console.error('No se pudo asignar el claim:', err);
  process.exit(1);
});
