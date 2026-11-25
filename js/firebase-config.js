import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCFySwOuzKLQDb7QN1pIyjFr8A4w8PD04g",
  authDomain: "colegioveras-719bc.firebaseapp.com",
  projectId: "colegioveras-719bc",
  storageBucket: "colegioveras-719bc.firebasestorage.app",
  messagingSenderId: "572704357839",
  appId: "1:572704357839:web:d3454d08b898fd90c626ba",
  measurementId: "G-BW02R5X7L3"
};

// Aplicação primária (para login e escrita autenticada no db principal)
export const app = getApps().some(a => a.name === "[DEFAULT]")
  ? getApp()
  : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Aplicação secundária (usada pelo Admin para cadastrar novos usuários sem ser deslogado)
export function getSecondaryApp() {
  return getApps().some(a => a.name === "SecondaryApp")
    ? getApp("SecondaryApp")
    : initializeApp(firebaseConfig, "SecondaryApp");
}

export function getOrInitSecondaryAuth() {
  return getAuth(getSecondaryApp());
}

export const secondaryApp = getSecondaryApp();
export const secondaryAuth = getOrInitSecondaryAuth();
