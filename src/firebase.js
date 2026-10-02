import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCyjPOwC5m4o3jN3DMesx5g3LbixVX7Nrk",
  authDomain: "enogia-planning.firebaseapp.com",
  projectId: "enogia-planning",
  storageBucket: "enogia-planning.firebasestorage.app",
  messagingSenderId: "581496779121",
  appId: "1:581496779121:web:c30b5f936e8cde910ac6d0",
  measurementId: "G-8195RSYM8B"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// ── Authentification ───────────────────────────────────────────
// Connexion restreinte aux comptes Google du domaine @enogia.com.
export const ALLOWED_EMAIL_DOMAIN = "enogia.com";

export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
// "hd" pré-filtre le picker de comptes Google sur le domaine enogia.com
// (confort d'usage ; le contrôle de sécurité réel est fait après connexion,
// dans App.js, car ce paramètre peut être contourné côté client).
googleProvider.setCustomParameters({ hd: ALLOWED_EMAIL_DOMAIN, prompt: "select_account" });
