"use client";

import { useTour } from "@/lib/useTour";
import { TOUR_STEPS } from "@/lib/tourSteps";
import WelcomeModal from "./WelcomeModal";
import StepTooltip from "./StepTooltip";
import TourComplete from "./TourComplete";

export default function TourController() {
  const {
    isWelcomeOpen,
    isRunning,
    isDone,
    currentStep,
    startTour,
    dismissAll,
    nextStep,
    prevStep,
  } = useTour();

  return (
    <>
      {isWelcomeOpen && <WelcomeModal onStart={startTour} onSkip={dismissAll} />}
      {isRunning && !isDone && TOUR_STEPS[currentStep] && (
        <StepTooltip
          step={TOUR_STEPS[currentStep]}
          stepIndex={currentStep}
          totalSteps={TOUR_STEPS.length}
          onNext={() => nextStep(TOUR_STEPS.length)}
          onBack={prevStep}
          onClose={dismissAll}
        />
      )}
      {isDone && <TourComplete onDone={dismissAll} />}
    </>
  );
}
