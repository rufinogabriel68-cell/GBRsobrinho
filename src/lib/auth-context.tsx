"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "./firebase";

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export type AuthMode = "firebase" | "demo";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  mode: AuthMode;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
}

const DEMO_USER_KEY = "gbr-demo-user-v1";

const AuthContext = createContext<AuthContextValue | null>(null);

function mapFirebaseUser(u: User): AuthUser {
  return { uid: u.uid, email: u.email, displayName: u.displayName };
}

/** Converte códigos de erro do Firebase Auth em mensagens amigáveis */
export function toAuthErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";

  const map: Record<string, string> = {
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/wrong-password": "E-mail ou senha incorretos.",
    "auth/user-not-found": "E-mail ou senha incorretos.",
    "auth/invalid-email": "Informe um e-mail válido.",
    "auth/email-already-in-use": "Este e-mail já está cadastrado.",
    "auth/weak-password": "A senha deve ter pelo menos 6 caracteres.",
    "auth/too-many-requests":
      "Muitas tentativas. Aguarde alguns instantes e tente novamente.",
    "auth/operation-not-allowed":
      "Método de login não habilitado no Console do Firebase (Authentication → Sign-in method).",
    "auth/popup-closed-by-user":
      "Janela do Google fechada antes de concluir. Tente novamente.",
    "auth/popup-blocked":
      "O navegador bloqueou o pop-up do Google. Permita pop-ups para este site.",
    "auth/unauthorized-domain":
      "Domínio não autorizado no Firebase (Authentication → Settings → Authorized domains).",
    "auth/network-request-failed":
      "Falha de rede. Verifique sua conexão com a internet.",
  };

  if (code && map[code]) return map[code];
  if (code) return `Erro de autenticação (${code}).`;
  return "Não foi possível concluir a operação. Tente novamente.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const mode: AuthMode = isFirebaseConfigured ? "firebase" : "demo";

  useEffect(() => {
    if (!isFirebaseConfigured) {
      // Modo demonstração: usuário guardado no localStorage
      try {
        const raw = window.localStorage.getItem(DEMO_USER_KEY);
        setUser(raw ? (JSON.parse(raw) as AuthUser) : null);
      } catch {
        setUser(null);
      }
      setLoading(false);
      return;
    }
    return onAuthStateChanged(getFirebaseAuth(), (u) => {
      setUser(u ? mapFirebaseUser(u) : null);
      setLoading(false);
    });
  }, []);

  const demoSignIn = useCallback(async (email: string, name?: string) => {
    const demoUser: AuthUser = {
      uid: "demo-user",
      email,
      displayName:
        name?.trim() || email.split("@")[0]?.trim() || "Usuário Demo",
    };
    window.localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));
    setUser(demoUser);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (mode === "demo") return demoSignIn(email);
      await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
    },
    [mode, demoSignIn]
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      if (mode === "demo") return demoSignIn(email, name);
      const cred = await createUserWithEmailAndPassword(
        getFirebaseAuth(),
        email,
        password
      );
      if (name.trim()) {
        await updateProfile(cred.user, { displayName: name.trim() });
        setUser(mapFirebaseUser(cred.user));
      }
    },
    [mode, demoSignIn]
  );

  const signInWithGoogle = useCallback(async () => {
    if (mode === "demo") {
      return demoSignIn("demo@gbrsobrinho.com", "Gabriel (Demo)");
    }
    const provider = new GoogleAuthProvider();
    await signInWithPopup(getFirebaseAuth(), provider);
  }, [mode, demoSignIn]);

  const signOutUser = useCallback(async () => {
    if (mode === "demo") {
      window.localStorage.removeItem(DEMO_USER_KEY);
      setUser(null);
      return;
    }
    await fbSignOut(getFirebaseAuth());
  }, [mode]);

  const updateDisplayName = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      if (mode === "demo") {
        setUser((prev) => {
          const updated: AuthUser = {
            uid: prev?.uid ?? "demo-user",
            email: prev?.email ?? null,
            displayName: trimmed,
          };
          window.localStorage.setItem(DEMO_USER_KEY, JSON.stringify(updated));
          return updated;
        });
        return;
      }
      const auth = getFirebaseAuth();
      if (!auth.currentUser) return;
      await updateProfile(auth.currentUser, { displayName: trimmed });
      setUser((prev) => (prev ? { ...prev, displayName: trimmed } : prev));
    },
    [mode]
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      mode,
      signIn,
      signUp,
      signInWithGoogle,
      signOutUser,
      updateDisplayName,
    }),
    [
      user,
      loading,
      mode,
      signIn,
      signUp,
      signInWithGoogle,
      signOutUser,
      updateDisplayName,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de <AuthProvider>.");
  }
  return ctx;
}
