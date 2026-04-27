import OnboardingWizard from "../components/onboarding/OnboardingWizard";
import { type User } from "../api";
import { Navigate } from "react-router-dom";
import "./LoginPage.css";

export default function Register({
  user,
  authReady,
  onAuthed,
}: {
  user: User | null;
  authReady: boolean;
  onAuthed: (u: User) => void;
}) {
  if (!authReady) {
    return (
      <div className="login-bento min-h-screen" aria-busy="true">
        <div className="login-bento__inner">
          <p className="login-bento__subtitle">Checking your session…</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/editor" replace />;
  }

  return <OnboardingWizard onAuthed={onAuthed} />;
}