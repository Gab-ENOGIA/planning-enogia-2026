import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

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
