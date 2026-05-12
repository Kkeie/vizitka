import React, { useState } from "react";
import Step1Username from "./Step1Username";
import Step2Account from "./Step2Account";
import { me, type User } from "../../api";

interface OnboardingWizardProps {
  onAuthed: (user: User) => void;
}

export default function OnboardingWizard({ onAuthed }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");

  const handleStep1Next = (uname: string) => {
    setUsername(uname);
    setStep(2);
  };

  const handleStep2Success = async () => {
    try {
      const user = await me();
      onAuthed(user);
      window.location.href = "/editor?onboarding=true";
    } catch (e) {
      console.error(e);
      window.location.href = "/editor";
    }
  };

  const handleStep2Back = () => {
    setStep(1);
  };

  return (
    <div className="onboarding-wizard">
      {step === 1 && <Step1Username onNext={handleStep1Next} initialUsername={username} />}
      {step === 2 && (
        <Step2Account
          username={username}
          onBack={handleStep2Back}
          onSuccess={handleStep2Success}
        />
      )}
      <style>{`
        .onboarding-wizard {
          min-height: 100vh;
          display: flex;
          align-items: stretch;
          justify-content: center;
          background: #ffffff;
        }
      `}</style>
    </div>
  );
}