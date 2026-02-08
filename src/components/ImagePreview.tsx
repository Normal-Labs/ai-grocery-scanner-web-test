/**
 * ImagePreview Component
 * 
 * Displays the captured image with a retake option.
 * Renders image with mobile-optimized dimensions and responsive scaling.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 6.2, 6.3
 */

'use client';

interface ImagePreviewProps {
  imageData: string;
  onRetake: () => void;
}

export default function ImagePreview({ imageData, onRetake }: ImagePreviewProps) {
  return (
    <div className="w-full">
      {/* Image Container */}
      <div className="relative w-full rounded-lg overflow-hidden shadow-lg bg-gray-100">
        {/* Captured Image */}
        <img
          src={imageData}
          alt="Captured product"
          className="w-full h-auto max-h-[70vh] object-contain"
          loading="eager"
        />
        
        {/* Image Overlay for Better Button Visibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20 pointer-events-none" />
      </div>

      {/* Retake Button */}
      <button
        onClick={onRetake}
        className="
          w-full min-h-[44px] px-6 py-3 mt-4
          bg-gray-100 hover:bg-gray-200
          text-gray-700 font-semibold text-lg
          rounded-lg border-2 border-gray-300
          transition-all duration-200
          flex items-center justify-center gap-3
          active:scale-95
        "
        aria-label="Retake photo"
      >
        {/* Retake Icon */}
        <span className="text-2xl" role="img" aria-label="retake">
          🔄
        </span>
        
        {/* Button Text */}
        <span>Retake Photo</span>
      </button>

      {/* Image Info (Optional - helpful for debugging) */}
      <div className="mt-3 text-center text-sm text-gray-500">
        <p>Preview your captured image above</p>
      </div>
    </div>
  );
}
