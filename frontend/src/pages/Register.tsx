import OnboardingWizard from "../components/onboarding/OnboardingWizard";
import { useSession } from "../sessionContext";

export default function Register() {
  const { setUser: onAuthed } = useSession();
  return <OnboardingWizard onAuthed={onAuthed} />;
}
