/**
 * ScanButton Component
 * 
 * Large touch-friendly button that triggers image analysis.
 * Displays loading spinner during analysis and prevents duplicate clicks.
 * 
 * Requirements: 3.1, 3.8, 6.3, 8.6
 */

'use client';

interface ScanButtonProps {
  onScan: () => void;
  disabled: boolean;
  isLoading: boolean;
}

export default function ScanButton({ onScan, disabled, isLoading }: ScanButtonProps) {
  /**
   * Handle button click
   * Prevents action if disabled or loading
   */
  const handleClick = () => {
    if (disabled || isLoading) return;
    onScan();
  };

  // Button is disabled if explicitly disabled OR if loading
  const isDisabled = disabled || isLoading;

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className={`
        w-full min-h-[44px] px-6 py-3
        bg-green-600 hover:bg-green-700
        text-white font-semibold text-lg
        rounded-lg shadow-md
        transition-all duration-200
        flex items-center justify-center gap-3
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}
      `}
      aria-label={isLoading ? 'Analyzing image...' : 'Scan product'}
      aria-busy={isLoading}
    >
      {/* Loading Spinner */}
      {isLoading && (
        <span
          className="inline-block w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"
          role="status"
          aria-label="Loading"
        />
      )}

      {/* Scan Icon (only shown when not loading) */}
      {!isLoading && (
        <span className="text-2xl" role="img" aria-label="scan">
          🔍
        </span>
      )}

      {/* Button Text */}
      <span>
        {isLoading ? 'Analyzing...' : 'Scan Product'}
      </span>
    </button>
  );
}
