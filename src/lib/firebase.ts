import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

/**
 * Configuração vinda das variáveis de ambiente NEXT_PUBLIC_FIREBASE_*.
 * Enquanto não forem definidas, o app roda em MODO DEMONSTRAÇÃO
 * (veja src/lib/db.ts) e nada é inicializado aqui.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** true quando as variáveis essenciais do Firebase estão presentes */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
);

export const firebaseProjectId = firebaseConfig.projectId ?? null;

let app: FirebaseApp | null = null;

if (isFirebaseConfigured) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    throw new Error(
      "Firebase não configurado. Defina as variáveis NEXT_PUBLIC_FIREBASE_* no .env.local (ou na Vercel)."
    );
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export function getFirestoreDb(): Firestore {
  return getFirestore(getFirebaseApp());
}
