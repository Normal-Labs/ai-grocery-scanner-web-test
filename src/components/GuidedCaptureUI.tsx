/**
 * GuidedCaptureUI Component
 * 
 * Sequential capture interface for Product Hero mode with progress indicator.
 * Guides users through capturing three images in order: barcode → packaging → nutrition label.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

'use client';

import { ImageType } from '@/lib/multi-image/DataMerger';

interface GuidedCaptureUIProps {
  /** Current step (1-3) */
  currentStep: number;
  /** Callback when image is captured */
  onImageCapture: (imageType: ImageType, imageData: string) => Promise<void>;
  /** Callback to request scanner opening */
  onCaptureRequest: (imageType: ImageType) => void;
  /** Whether capture is in progress */
  isProcessing?: boolean;
  /** Error message if any */
  error?: string;
}

/**
 * Step configuration
 */
const STEPS: Array<{
  step: number;
  imageType: ImageType;
  title: string;
  description: string;
  icon: string;
  tips: string[];
}> = [
  {
    step: 1,
    imageType: 'barcode',
    title: 'Capture Barcode',
    description: 'Scan or photograph the product barcode',
    icon: '📊',
    tips: [
      'Ensure barcode is clearly visible',
      'Avoid glare and shadows',
      'Hold camera steady',
    ],
  },
  {
    step: 2,
    imageType: 'packaging',
    title: 'Capture Packaging',
    description: 'Photograph the front of the product packaging',
    icon: '📦',
    tips: [
      'Include product name and brand',
      'Capture the entire front label',
      'Ensure text is readable',
    ],
  },
  {
    step: 3,
    imageType: 'nutrition_label',
    title: 'Capture Nutrition Label',
    description: 'Photograph the nutrition facts label',
    icon: '🥗',
    tips: [
      'Include all nutritional information',
      'Ensure label is flat and well-lit',
      'Capture ingredients list if visible',
    ],
  },
];

export default function GuidedCaptureUI({
  currentStep,
  onImageCapture,
  onCaptureRequest,
  isProcessing = false,
  error,
}: GuidedCaptureUIProps) {
  const currentStepConfig = STEPS[currentStep - 1];
  const isComplete = currentStep > 3;

  const handleCaptureClick = () => {
    // Request scanner to open for this image type
    onCaptureRequest(currentStepConfig.imageType);
  };

  if (isComplete) {
    return (
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-8 border-2 border-green-200">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Product Profile Complete!
          </h2>
          <p className="text-gray-600 mb-6">
            You've successfully captured all three images for this product.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <span>📊 Barcode</span>
            <span>•</span>
            <span>📦 Packaging</span>
            <span>•</span>
            <span>🥗 Nutrition Label</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="bg-white rounded-lg p-4 border-2 border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">
            Product Hero Guided Capture
          </h3>
          <span className="text-sm font-medium text-gray-600">
            Step {currentStep} of 3
          </span>
        </div>

        {/* Progress Bar */}
        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((step) => (
              <div
                key={step.step}
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                  step.step < currentStep
                    ? 'bg-green-500 border-green-500 text-white'
                    : step.step === currentStep
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : 'bg-gray-100 border-gray-300 text-gray-400'
                }`}
              >
                {step.step < currentStep ? '✓' : step.icon}
              </div>
            ))}
          </div>
          
          {/* Progress Line */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 -z-10">
            <div
              className="h-full bg-green-500 transition-all duration-500"
              style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Labels */}
        <div className="flex items-center justify-between mt-2">
          {STEPS.map((step) => (
            <div
              key={step.step}
              className={`text-xs text-center ${
                step.step === currentStep
                  ? 'text-blue-600 font-medium'
                  : step.step < currentStep
                  ? 'text-green-600'
                  : 'text-gray-400'
              }`}
              style={{ width: '80px' }}
            >
              {step.title.split(' ')[1]}
            </div>
          ))}
        </div>
      </div>

      {/* Current Step Instructions */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border-2 border-blue-200">
        <div className="flex items-start gap-4">
          <div className="text-4xl">{currentStepConfig.icon}</div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {currentStepConfig.title}
            </h3>
            <p className="text-gray-600 mb-4">
              {currentStepConfig.description}
            </p>

            {/* Tips */}
            <div className="bg-white rounded-lg p-4 mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                📝 Tips for best results:
              </h4>
              <ul className="space-y-1">
                {currentStepConfig.tips.map((tip, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Capture Button */}
            <button
              onClick={handleCaptureClick}
              disabled={isProcessing}
              className={`w-full py-3 px-6 text-center font-semibold rounded-lg transition-colors ${
                isProcessing
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Processing...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  📸 Capture {currentStepConfig.title.split(' ')[1]}
                </span>
              )}
            </button>

            {/* Error Display */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">
                  ⚠️ {error}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
