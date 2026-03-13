"use client"

import type { ReactNode } from "react"

interface PhoneFrameProps {
  children: ReactNode
  label?: string
}

export function PhoneFrame({ children, label }: PhoneFrameProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        {/* Phone bezel */}
        <div className="relative w-[320px] h-[680px] bg-foreground rounded-[3rem] p-3 shadow-2xl">
          {/* Screen */}
          <div className="relative w-full h-full bg-background rounded-[2.25rem] overflow-hidden">
            {/* Status bar */}
            <div className="absolute top-0 left-0 right-0 h-12 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-between px-6">
              <span className="text-xs font-medium text-foreground">9:41</span>
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4 text-foreground" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 16c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7z" opacity="0.3"/>
                  <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6z"/>
                </svg>
                <svg className="w-4 h-4 text-foreground" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M2 22h20V2H2v20zm2-2V4h16v16H4z" opacity="0.3"/>
                  <path d="M4 4h16v16H4z"/>
                </svg>
              </div>
            </div>
            {/* Dynamic island / notch */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-6 bg-foreground rounded-full z-50" />
            {/* Content */}
            <div className="h-full overflow-hidden">
              {children}
            </div>
          </div>
        </div>
      </div>
      {label && (
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      )}
    </div>
  )
}
