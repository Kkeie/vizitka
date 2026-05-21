import React, { useEffect, useState } from "react";
import Step1Form from "./Step1Form";
import Step2Form from "./Step2Form";
import { useAuthDeco } from "../auth/AuthDecoContext";
import { me, type User } from "../../api";

interface OnboardingWizardProps {
  onAuthed: (user: User) => void;
}

export default function OnboardingWizard({ onAuthed }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [typedUsername, setTypedUsername] = useState("");
  const { setMode, setUsername: setDecoUsername } = useAuthDeco();

  useEffect(() => {
    setMode(step === 1 ? "floating" : "phone");
    setDecoUsername(typedUsername || username);
  }, [step, typedUsername, username, setMode, setDecoUsername]);

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
    <>
      {step === 1 ? (
        <Step1Form onNext={handleStep1Next} initialUsername={username} onUsernameChange={setTypedUsername} />
      ) : (
        <Step2Form
          username={username}
          onBack={handleStep2Back}
          onSuccess={handleStep2Success}
        />
      )}
    </>
  );
}
