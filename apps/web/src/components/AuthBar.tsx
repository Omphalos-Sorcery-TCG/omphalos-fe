import { useState } from "react";
import { useAuth } from "../auth";
import { AuthModal } from "./AuthModal";

interface Props {
  decksOpen: boolean;
  onToggleDecks: () => void;
}

export function AuthBar({ decksOpen, onToggleDecks }: Props) {
  const { user, ready, signOut } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  if (!ready) return <div className="authbar" />;

  return (
    <div className="authbar">
      {user ? (
        <>
          <button
            className={`ghost-btn${decksOpen ? " on" : ""}`}
            onClick={onToggleDecks}
          >
            My Decks
          </button>
          <span className="user-email" title={user.email ?? ""}>
            {user.email}
          </span>
          <button className="link" onClick={() => void signOut()}>
            Sign out
          </button>
        </>
      ) : (
        <button className="primary-btn small" onClick={() => setShowAuth(true)}>
          Sign in
        </button>
      )}

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}
