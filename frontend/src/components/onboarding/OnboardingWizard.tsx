import React, { useState } from "react";
import Step1Form from "./Step1Form";
import Step2Form from "./Step2Form";
import DecoCards from "./DecoCards";
import { me, type User } from "../../api";
import "../../pages/LoginPage.css";

interface OnboardingWizardProps {
  onAuthed: (user: User) => void;
}

export default function OnboardingWizard({ onAuthed }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [typedUsername, setTypedUsername] = useState("");

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
    <div className="login-bento min-h-screen">
      <div className="login-bento__inner">
        <div className="login-bento__form-col">
          {step === 1 ? (
            <Step1Form onNext={handleStep1Next} initialUsername={username} onUsernameChange={setTypedUsername} />
          ) : (
            <Step2Form
              username={username}
              onBack={handleStep2Back}
              onSuccess={handleStep2Success}
            />
          )}
        </div>
        <div className="step1-right">
          <DecoCards
            username={typedUsername || username}
            mode={step === 1 ? "floating" : "phone"}
          />
        </div>
      </div>
    </div>
  );
}
