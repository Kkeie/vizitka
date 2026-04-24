import OnboardingWizard from "../components/onboarding/OnboardingWizard";
import { type User } from "../api";

export default function Register({ onAuthed }: { onAuthed: (u: User) => void }) {
  return <OnboardingWizard onAuthed={onAuthed} />;
}