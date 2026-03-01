/**
 * CompletionPrompt Component
 * 
 * Displays missing image types and provides actionable capture buttons
 * for progressive capture mode. Shows completion confirmation when all
 * three image types are captured.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

'use client';

import { ImageType } from '@/lib/multi-image/DataMerger';

interface CompletionPromptProps {
  /** Array of already captured image types */
  capturedTypes: ImageType[];
  /** Callback when user wants to capture a specific image type */
  onCaptureRequest: (imageType: ImageType) => void;
  /** Whether capture is in progress */
  isProcessing?: boolean;
}

/**
 * Image type configuration
 */
const IMAGE_TYPE_CONFIG: Record<ImageType, {
  title: string;
  description: string;
  icon: string;
  color: string;
}> = {
  barcode: {
    title: 'Barcode',
    description: 'Product identification and database lookup',
    icon: '📊',
    color: 'blue',
  },
  packaging: {
    title: 'Packaging',
    description: 'Product name, brand, size, and dimensions',
    icon: '📦',
    color: 'purple',
  },
  nutrition_label: {
    title: 'Nutrition Label',
    description: 'Nutritional facts, ingredients, and health score',
    icon: '🥗',
    color: 'green',
  },
};

export default function CompletionPrompt({
  capturedTypes,
  onCaptureRequest,
  isProcessing = false,
}: CompletionPromptProps) {
  const allTypes: ImageType[] = ['barcode', 'packaging', 'nutrition_label'];
  const missingTypes = allTypes.filter(type => !capturedTypes.includes(type));
  const progress = (capturedTypes.length / allTypes.length) * 100;
  const isComplete = capturedTypes.length === 3;

  // Requirement 7.5: Display completion confirmation when all three types captured
  if (isComplete) {
    return (
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border-2 border-green-200">
        <div className="flex items-start gap-4">
          <div className="text-4xl">✅</div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Complete Product Profile!
            </h3>
            <p className="text-gray-600 mb-4">
              You've captured all three image types for this product. The product profile is now complete with comprehensive information.
            </p>
            
            {/* Captured Types Summary */}
            <div className="grid grid-cols-3 gap-3">
              {allTypes.map((type) => {
                const config = IMAGE_TYPE_CONFIG[type];
                return (
                  <div
                    key={type}
                    className="bg-white rounded-lg p-3 border border-green-200"
                  >
                    <div className="text-2xl mb-1">{config.icon}</div>
                    <div className="text-xs font-semibold text-gray-700">
                      {config.title}
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      ✓ Captured
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Requirement 7.1, 7.2: Show completion prompt with missing image types
  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-6 border-2 border-amber-200">
      <div className="flex items-start gap-4">
        <div className="text-4xl">📸</div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            Complete This Product
          </h3>
          
          {/* Requirement 7.3, 7.4: Show progress and missing types */}
          <p className="text-gray-600 mb-4">
            {capturedTypes.length === 1 && (
              <>You've captured 1 image. Add {missingTypes.length} more to complete the product profile.</>
            )}
            {capturedTypes.length === 2 && (
              <>You've captured 2 images. Add 1 more to complete the product profile.</>
            )}
            {capturedTypes.length === 0 && (
              <>Capture all 3 image types to build a complete product profile.</>
            )}
          </p>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Progress
              </span>
              <span className="text-sm font-medium text-gray-700">
                {capturedTypes.length} / 3
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Captured Types */}
          {capturedTypes.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                ✓ Already Captured:
              </h4>
              <div className="flex flex-wrap gap-2">
                {capturedTypes.map((type) => {
                  const config = IMAGE_TYPE_CONFIG[type];
                  return (
                    <div
                      key={type}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-green-200"
                    >
                      <span>{config.icon}</span>
                      <span className="text-sm font-medium text-gray-700">
                        {config.title}
                      </span>
                      <span className="text-green-600">✓</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Missing Types - Requirement 7.6: Actionable capture buttons */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              📋 Still Needed:
            </h4>
            <div className="space-y-3">
              {missingTypes.map((type) => {
                const config = IMAGE_TYPE_CONFIG[type];
                const colorClasses = {
                  blue: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
                  purple: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
                  green: 'bg-green-50 border-green-200 hover:bg-green-100',
                };
                const buttonColorClasses = {
                  blue: 'bg-blue-600 hover:bg-blue-700',
                  purple: 'bg-purple-600 hover:bg-purple-700',
                  green: 'bg-green-600 hover:bg-green-700',
                };

                return (
                  <div
                    key={type}
                    className={`flex items-center justify-between p-4 rounded-lg border-2 transition-colors ${
                      colorClasses[config.color as keyof typeof colorClasses]
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{config.icon}</div>
                      <div>
                        <div className="font-semibold text-gray-800">
                          {config.title}
                        </div>
                        <div className="text-sm text-gray-600">
                          {config.description}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => onCaptureRequest(type)}
                      disabled={isProcessing}
                      className={`px-4 py-2 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        buttonColorClasses[config.color as keyof typeof buttonColorClasses]
                      }`}
                    >
                      {isProcessing ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin">⏳</span>
                          Processing...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          📸 Capture
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Benefits */}
          <div className="mt-4 p-3 bg-white rounded-lg border border-amber-200">
            <div className="text-xs text-gray-600">
              <span className="font-semibold">💡 Why complete the profile?</span>
              <br />
              More images = more accurate product information, better health insights, and comprehensive nutritional data.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
