import { useState } from "react";
import { useAuth } from "../auth";

export function AuthModal({ onClose }: { onClose: () => void }) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "in") {
        await signIn(email, password);
        onClose();
      } else {
        await signUp(email, password);
        // With "Confirm email" on (Supabase default) no session is returned yet.
        setNotice(
          "Account created. If email confirmation is enabled, check your inbox to finish — otherwise you're signed in.",
        );
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <form
        className="modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <button
          type="button"
          className="close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        <h2 className="modal-title">
          {mode === "in" ? "Sign in" : "Create account"}
        </h2>

        <label className="field">
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && <p className="form-error">{error}</p>}
        {notice && <p className="form-notice">{notice}</p>}

        <button type="submit" className="primary-btn" disabled={busy}>
          {busy ? "…" : mode === "in" ? "Sign in" : "Sign up"}
        </button>

        <p className="modal-switch">
          {mode === "in" ? "No account?" : "Already have one?"}{" "}
          <button
            type="button"
            className="link"
            onClick={() => {
              setMode(mode === "in" ? "up" : "in");
              setError(null);
              setNotice(null);
            }}
          >
            {mode === "in" ? "Create one" : "Sign in"}
          </button>
        </p>
      </form>
    </div>
  );
}
