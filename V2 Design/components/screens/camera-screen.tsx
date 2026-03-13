"use client"

import { X, Zap, RotateCcw, ImageIcon } from "lucide-react"

interface CameraScreenProps {
  onClose: () => void
  onCapture: () => void
}

export function CameraScreen({ onClose, onCapture }: CameraScreenProps) {
  return (
    <div className="h-full flex flex-col bg-foreground pt-14">
      {/* Top controls */}
      <div className="flex items-center justify-between px-5 py-4">
        <button 
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-background/20 backdrop-blur-sm flex items-center justify-center"
        >
          <X className="w-5 h-5 text-background" />
        </button>
        <button className="w-10 h-10 rounded-full bg-background/20 backdrop-blur-sm flex items-center justify-center">
          <Zap className="w-5 h-5 text-background" />
        </button>
      </div>

      {/* Camera viewfinder */}
      <div className="flex-1 relative flex items-center justify-center">
        {/* Simple centered text */}
        <div className="text-center">
          <p className="text-sm font-medium text-background/80">Point at any product</p>
          <p className="text-xs text-background/60 mt-1">or scan a barcode</p>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="px-5 pb-10">
        <div className="flex items-center justify-between">
          {/* Gallery */}
          <button className="w-12 h-12 rounded-xl bg-background/20 backdrop-blur-sm flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-background" />
          </button>
          
          {/* Capture button */}
          <button 
            onClick={onCapture}
            className="w-20 h-20 rounded-full bg-background flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          >
            <div className="w-16 h-16 rounded-full border-4 border-foreground" />
          </button>
          
          {/* Flip camera */}
          <button className="w-12 h-12 rounded-xl bg-background/20 backdrop-blur-sm flex items-center justify-center">
            <RotateCcw className="w-5 h-5 text-background" />
          </button>
        </div>
        
        <p className="text-center text-xs text-background/60 mt-4">
          Supports barcodes, QR codes, and product labels
        </p>
      </div>
    </div>
  )
}
