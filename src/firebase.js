// ============================================================
// Configuration Firebase — ENOGIA Planning Ordonnancement 2026
// ============================================================
// 1. Va sur https://console.firebase.google.com
// 2. Ouvre ton projet existant
// 3. Paramètres du projet (⚙️ en haut à gauche) > Tes applications
// 4. Si tu n'as pas encore d'app "Web" (icône </>), crée-en une
// 5. Copie les valeurs de "firebaseConfig" et remplace ci-dessous
//
// IMPORTANT : Active aussi Firestore Database si ce n'est pas
// déjà fait (Build > Firestore Database > Créer une base de
// données), sinon le dashboard ne pourra pas lire/écrire les
// données de planning.
// ============================================================

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCyjPOwC5m4o3jN3DMesx5g3LbixVX7Nrk",
  authDomain: "enogia-planning.firebaseapp.com",
  projectId: "enogia-planning",
  storageBucket: "enogia-planning.firebasestorage.app",
  messagingSenderId: "581496779121",
  appId: "1:581496779121:web:c30b5f936e8cde910ac6d0",
  measurementId: "G-8195RSYM8B"};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);