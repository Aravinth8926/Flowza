import React from 'react';
import { clsx } from 'clsx';

interface Step {
  title: string;
  description?: string;
}

interface MultiStepFormProps {
  steps: Step[];
  currentStep: number; // 0-indexed
  children: React.ReactNode;
}

export const MultiStepForm: React.FC<MultiStepFormProps> = ({
  steps,
  currentStep,
  children,
}) => {
  return (
    <div className="w-full space-y-6">
      {/* Progress Indicator */}
      <div className="w-full px-2">
        <div className="relative flex justify-between items-center w-full">
          {/* Connection line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 z-0" />
          
          {/* Active colored line */}
          <div
            className="absolute top-1/2 left-0 h-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 -translate-y-1/2 z-0 transition-all duration-300 ease-in-out"
            style={{ width: `${(currentStep / Math.max(1, steps.length - 1)) * 100}%` }}
          />

          {steps.map((step, idx) => {
            const isCompleted = currentStep > idx;
            const isActive = currentStep === idx;
            return (
              <div key={idx} className="relative z-10 flex flex-col items-center">
                <div
                  className={clsx(
                    'h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ease-in-out select-none shadow-sm',
                    isCompleted && 'bg-blue-600 border-blue-600 text-white',
                    isActive && 'bg-white border-blue-600 text-blue-600 dark:bg-slate-900 ring-4 ring-blue-500/20',
                    !isCompleted && !isActive && 'bg-slate-100 border-slate-300 text-slate-400 dark:bg-slate-800 dark:border-slate-700'
                  )}
                >
                  {isCompleted ? (
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="3"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    idx + 1
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Step labels grid */}
        <div
          className="grid gap-1 mt-3"
          style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
        >
          {steps.map((step, idx) => {
            const isCompleted = currentStep > idx;
            const isActive = currentStep === idx;
            return (
              <div key={idx} className="text-center px-0.5">
                <span
                  className={clsx(
                    'text-xs font-semibold block truncate',
                    isActive && 'text-blue-600 dark:text-blue-400 font-bold',
                    isCompleted && 'text-slate-700 dark:text-slate-300',
                    !isActive && !isCompleted && 'text-slate-400 dark:text-slate-500'
                  )}
                  title={step.title}
                >
                  {step.title}
                </span>
                {step.description && (
                  <span className="text-xxs text-slate-400 dark:text-slate-500 block truncate hidden md:block">
                    {step.description}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Form Content */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        {children}
      </div>
    </div>
  );
};
