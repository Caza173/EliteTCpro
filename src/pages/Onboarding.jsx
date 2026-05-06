import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "@/lib/CurrentUserContext.jsx";
import OnboardingShell from "./onboarding/OnboardingShell";
import Step1Profile from "./onboarding/Step1Profile";
import Step2Intent from "./onboarding/Step2Intent";
import Step3Transaction from "./onboarding/Step3Transaction";
import Step4Document from "./onboarding/Step4Document";
import Step5Value from "./onboarding/Step5Value";
import { authApi } from "@/api/auth";

export default function Onboarding() {
  const { currentUser, refreshUser } = useCurrentUser();
  const navigate = useNavigate();

  // Resume from saved step if available; default to 1
  const savedStep = currentUser?.onboarding_step || 1;
  const [step, setStep] = useState(
    savedStep >= 1 && savedStep <= 5 ? savedStep : 1
  );
  const [transactionId, setTransactionId] = useState(null);
  const [parsedData, setParsedData] = useState(null);

  // Step 1 → 2
  const handleStep1Complete = () => {
    refreshUser();
    setStep(2);
  };

  // Step 2 → 3 or 5
  const handleStep2Complete = (intent) => {
    if (intent === "explore_demo") {
      setStep(5);
    } else {
      setStep(3);
    }
    refreshUser();
  };

  // Step 3 → 4
  const handleStep3Complete = (txId) => {
    setTransactionId(txId);
    refreshUser();
    setStep(4);
  };

  const handleStep3Skip = async () => {
    await authApi.updateMe({ onboarding_step: 4 });
    refreshUser();
    setStep(4);
  };

  // Step 4 → 5
  const handleStep4Complete = (parsed) => {
    setParsedData(parsed);
    refreshUser();
    setStep(5);
  };

  const handleStep4Skip = async () => {
    await authApi.updateMe({ onboarding_step: 5 });
    refreshUser();
    setStep(5);
  };

  // Step 5 → Dashboard
  const handleFinish = () => {
    refreshUser();
    navigate("/Dashboard", { replace: true });
  };

  // Display step: map internal step to progress bar step
  // If user chose explore_demo and jumped to 5, show as step 5
  const displayStep = step;

  return (
    <OnboardingShell currentStep={displayStep}>
      {step === 1 && (
        <Step1Profile user={currentUser} onComplete={handleStep1Complete} />
      )}
      {step === 2 && (
        <Step2Intent onComplete={handleStep2Complete} />
      )}
      {step === 3 && (
        <Step3Transaction
          user={currentUser}
          onComplete={handleStep3Complete}
          onSkip={handleStep3Skip}
        />
      )}
      {step === 4 && (
        <Step4Document
          transactionId={transactionId}
          onComplete={handleStep4Complete}
          onSkip={handleStep4Skip}
        />
      )}
      {step === 5 && (
        <Step5Value parsedData={parsedData} onComplete={handleFinish} />
      )}
    </OnboardingShell>
  );
}