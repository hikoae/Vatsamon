/**
 * Schermata di accesso: Google one-tap + email/password (login o registrazione).
 * Mostrata da <AuthGate> quando Firebase è configurato e nessun utente è loggato.
 */
import { useState } from "react";
import { LogIn, Mail, Lock, Loader2 } from "lucide-react";
import { useAuth, authErrorMessage } from "../lib/auth";

export default function LoginScreen() {
  const { signInWithGoogle, signInWithEmail, registerWithEmail, signInAsTest } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleGoogle = async () => {
    setError("");
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    // Accesso di prova senza registrazione: username «test» + password «test».
    if (mode === "login" && email.trim().toLowerCase() === "test" && password === "test") {
      signInAsTest();
      return;
    }
    setBusy(true);
    try {
      if (mode === "register") {
        await registerWithEmail(email.trim(), password, name.trim() || undefined);
      } else {
        await signInWithEmail(email.trim(), password);
      }
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh w-full flex items-center justify-center p-5 text-slate-100">
      <div className="aurora-bg" />
      <div className="w-full max-w-sm bg-slate-900/90 backdrop-blur rounded-3xl border border-slate-700 shadow-xl p-6">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2 animate-float">🐄</div>
          <h1 className="text-3xl font-black title-gradient">VATSAMON GO</h1>
          <p className="text-sm text-slate-400 mt-1">
            Cattura le Reines reali della Valle d'Aosta
          </p>
        </div>

        <button
          onClick={handleGoogle}
          disabled={busy}
          className="w-full flex items-center justify-center gap-3 bg-white text-slate-800 font-semibold rounded-2xl py-3 border border-slate-300 shadow-sm disabled:opacity-60"
        >
          <GoogleGlyph />
          Continua con Google
        </button>

        <div className="flex items-center gap-3 my-5">
          <div className="h-px flex-1 bg-slate-700" />
          <span className="text-xs text-slate-400">oppure con email</span>
          <div className="h-px flex-1 bg-slate-700" />
        </div>

        <form onSubmit={handleEmail} className="space-y-3">
          {mode === "register" && (
            <Field icon={<LogIn size={16} />} >
              <input
                type="text"
                placeholder="Nome allenatore (opzionale)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-transparent outline-none w-full text-slate-100 placeholder:text-slate-400"
              />
            </Field>
          )}
          <Field icon={<Mail size={16} />}>
            <input
              type="text"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              required
              placeholder={mode === "login" ? "Email (o «test» per la demo)" : "Email"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-transparent outline-none w-full text-slate-100 placeholder:text-slate-400"
            />
          </Field>
          <Field icon={<Lock size={16} />}>
            <input
              type="password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-transparent outline-none w-full text-slate-100 placeholder:text-slate-400"
            />
          </Field>

          {error && <p className="text-sm text-rose-500 font-medium">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full nav-active text-white font-bold rounded-2xl py-3 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {busy ? <Loader2 className="animate-spin" size={18} /> : null}
            {mode === "register" ? "Crea account" : "Accedi"}
          </button>
        </form>

        {mode === "login" && (
          <button
            onClick={() => signInAsTest()}
            disabled={busy}
            className="mt-3 w-full flex flex-col items-center bg-slate-950 border border-slate-700 text-slate-200 rounded-2xl py-2.5 disabled:opacity-60 hover:border-slate-600"
          >
            <span className="font-semibold">👤 Entra come test</span>
            <span className="text-slate-500 text-[11px]">demo · senza registrazione</span>
          </button>
        )}

        <p className="text-center text-sm text-slate-400 mt-4">
          {mode === "register" ? "Hai già un account?" : "Sei nuovo qui?"}{" "}
          <button
            onClick={() => {
              setError("");
              setMode(mode === "register" ? "login" : "register");
            }}
            className="text-rose-500 font-semibold"
          >
            {mode === "register" ? "Accedi" : "Registrati"}
          </button>
        </p>
      </div>
    </div>
  );
}

function Field({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 bg-slate-950 rounded-2xl px-3 py-3 border border-slate-700">
      <span className="text-slate-400">{icon}</span>
      {children}
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
