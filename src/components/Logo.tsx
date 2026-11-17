import React from 'react';

interface LogoProps {
  className?: string;
  sparkle?: boolean;
}

export function Logo({ className = "w-10 h-10", sparkle = true }: LogoProps) {
  return (
    <div className="relative flex items-center justify-center shrink-0">
      <svg 
        className={className} 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          {/* Main gradient for the brain (microphone head capsule) */}
          <linearGradient id="logoBrainGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2563EB" /> {/* Primary Blue */}
            <stop offset="100%" stopColor="#14B8A6" /> {/* Accent Teal */}
          </linearGradient>

          {/* Core glow filter for high design fidelity */}
          <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer subtle glow/orbit representing mental frequency wave */}
        <circle 
          cx="50" 
          cy="34" 
          r="30" 
          stroke="#14B8A6" 
          strokeWidth="1" 
          strokeDasharray="4 6" 
          opacity="0.3" 
          className="animate-[spin_40s_linear_infinite]"
        />

        {/* Microphone stand base */}
        <rect 
          x="47" 
          y="72" 
          width="6" 
          height="12" 
          rx="3" 
          fill="#0F172A" /* Dark Navy */
          opacity="0.95" 
        />
        <path 
          d="M38 84 H62" 
          stroke="#0F172A" /* Dark Navy */
          strokeWidth="4.5" 
          strokeLinecap="round" 
        />

        {/* U-shaped support cradle */}
        <path 
          d="M26 44 C26 62 74 62 74 44" 
          stroke="#0F172A" /* Dark Navy */
          strokeWidth="4.5" 
          strokeLinecap="round" 
          fill="none" 
        />
        <path 
          d="M50 56 V72" 
          stroke="#0F172A" /* Dark Navy */
          strokeWidth="4" 
          strokeLinecap="round" 
        />

        {/* Brain capsule (microphone head) */}
        {/* Outline of left and right hemispheres forming the microphone head */}
        <path 
          d="M50 48 
             C45 48, 43 49, 39 49
             C30 49, 24 43, 24 35
             C24 28, 28 23, 34 22
             C33 19, 35 14, 40 13
             C45 12, 48 15, 50 17
             C52 15, 55 12, 60 13
             C65 14, 67 19, 66 22
             C72 23, 76 28, 76 35
             C76 43, 70 49, 61 49
             C57 49, 55 48, 50 48 Z" 
          fill="url(#logoBrainGradient)" 
          stroke="#0F172A" /* Dark Navy border for beautiful definition */
          strokeWidth="3" 
          strokeLinejoin="round" 
          filter="url(#logoGlow)"
        />

        {/* Central Hemisphere Divider */}
        <path 
          d="M50 17 V45" 
          stroke="#FFFFFF" 
          strokeWidth="2" 
          strokeLinecap="round" 
          opacity="0.75"
        />

        {/* Left hemisphere brain lobes mapping */}
        <path 
          d="M38 29 C34 31, 35 37, 41 35 
             C43 34, 42 41, 46 42" 
          stroke="#FFFFFF" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          fill="none"
          opacity="0.85"
        />

        {/* Right hemisphere brain lobes mapping */}
        <path 
          d="M62 29 C66 31, 65 37, 59 35 
             C57 34, 58 41, 54 42" 
          stroke="#FFFFFF" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          fill="none"
          opacity="0.85"
        />

        {/* Microphone traditional horizontal grille meshes (integrated with lobes) */}
        <path d="M29 35 H71" stroke="#FFFFFF" strokeWidth="1" opacity="0.25" strokeLinecap="round" />
        <path d="M33 29 H67" stroke="#FFFFFF" strokeWidth="1" opacity="0.25" strokeLinecap="round" />
        <path d="M33 41 H67" stroke="#FFFFFF" strokeWidth="1" opacity="0.25" strokeLinecap="round" />
      </svg>
      {sparkle && (
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#14B8A6] rounded-full animate-ping opacity-75"></span>
      )}
    </div>
  );
}
