/**
 * Contesto di autenticazione per Vatsamon GO.
 *
 * - Con Firebase configurato: login Google (popup) + email/password, stato
 *   reattivo via onAuthStateChanged.
 * - Senza Firebase ("modalità locale"): fornisce un utente ospite sintetico,
 *   così l'app resta giocabile su questo dispositivo senza login.
 */
import React, { createContext, useContext, useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  updateProfile,
  type User,
} from "firebase/auth";
import { auth, firebaseEnabled } from "./firebase";

export interface VatUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isGuest: boolean;
}

interface AuthContextValue {
  user: VatUser | null;
  loading: boolean;
  firebaseEnabled: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const GUEST: VatUser = {
  uid: "local-guest",
  email: null,
  displayName: "Ospite",
  photoURL: null,
  isGuest: true,
};

const AuthContext = createContext<AuthContextValue | null>(null);

function toVatUser(u: User): VatUser {
  return {
    uid: u.uid,
    email: u.email,
    displayName: u.displayName,
    photoURL: u.photoURL,
    isGuest: false,
  };
}

/** Traduce i codici d'errore Firebase in messaggi leggibili in italiano. */
export function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code || "";
  const map: Record<string, string> = {
    "auth/invalid-email": "Email non valida.",
    "auth/missing-password": "Inserisci una password.",
    "auth/weak-password": "Password troppo debole (almeno 6 caratteri).",
    "auth/email-already-in-use": "Questa email ha già un account. Prova ad accedere.",
    "auth/invalid-credential": "Email o password errate.",
    "auth/wrong-password": "Password errata.",
    "auth/user-not-found": "Nessun account con questa email.",
    "auth/popup-closed-by-user": "Accesso annullato.",
    "auth/popup-blocked": "Il popup è stato bloccato dal browser.",
    "auth/network-request-failed": "Problema di rete. Riprova.",
    "auth/too-many-requests": "Troppi tentativi. Riprova tra poco.",
  };
  return map[code] || "Si è verificato un errore. Riprova.";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<VatUser | null>(firebaseEnabled ? null : GUEST);
  const [loading, setLoading] = useState<boolean>(firebaseEnabled);

  useEffect(() => {
    if (!firebaseEnabled || !auth) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u ? toVatUser(u) : null);
      setLoading(false);
    });
    return unsub;
  }, []);

  const signInWithGoogle = async () => {
    if (!auth) throw new Error("Firebase non configurato");
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signInWithEmail = async (email: string, password: string) => {
    if (!auth) throw new Error("Firebase non configurato");
    await signInWithEmailAndPassword(auth, email, password);
  };

  const registerWithEmail = async (email: string, password: string, displayName?: string) => {
    if (!auth) throw new Error("Firebase non configurato");
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName && cred.user) {
      await updateProfile(cred.user, { displayName });
    }
  };

  const signOut = async () => {
    if (!auth) return;
    await fbSignOut(auth);
  };

  const value: AuthContextValue = {
    user,
    loading,
    firebaseEnabled,
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve stare dentro <AuthProvider>");
  return ctx;
}
