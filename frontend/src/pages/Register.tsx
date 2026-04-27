import OnboardingWizard from "../components/onboarding/OnboardingWizard";
import { Navigate } from "react-router-dom";
import { useSession } from "../sessionContext";
import "./LoginPage.css";

export default function Register() {
  const { user, authReady, setUser: onAuthed } = useSession();
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