import React from 'react';

interface ShieldLogoProps {
  className?: string;
  size?: number;
}

export default function ShieldLogo({ className = "", size = 32 }: ShieldLogoProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Shield Base Shape */}
      <path 
        d="M50 5L10 20V50C10 75 50 95 50 95C50 95 90 75 90 50V20L50 5Z" 
        fill="currentColor" 
        fillOpacity="0.1"
      />
      <path 
        d="M50 5L10 20V50C10 75 50 95 50 95C50 95 90 75 90 50V20L50 5Z" 
        stroke="currentColor" 
        strokeWidth="6" 
        strokeLinejoin="round"
      />
      
      {/* QR-inspired modular pattern internal */}
      {/* Top Left Module */}
      <rect x="25" y="28" width="12" height="12" fill="currentColor" rx="1" />
      <rect x="29" y="32" width="4" height="4" fill="white" className="dark:fill-black" rx="0.5" />
      
      {/* Top Right Module */}
      <rect x="63" y="28" width="12" height="12" fill="currentColor" rx="1" />
      <rect x="67" y="32" width="4" height="4" fill="white" className="dark:fill-black" rx="0.5" />
      
      {/* Bottom Center Module (Simplified QR style) */}
      <rect x="44" y="65" width="12" height="12" fill="currentColor" rx="1" />
      <rect x="48" y="69" width="4" height="4" fill="white" className="dark:fill-black" rx="0.5" />

      {/* Scattered Modules */}
      <rect x="44" y="28" width="4" height="4" fill="currentColor" rx="0.5" />
      <rect x="52" y="28" width="4" height="4" fill="currentColor" rx="0.5" />
      <rect x="44" y="36" width="4" height="4" fill="currentColor" rx="0.5" />
      
      <rect x="25" y="44" width="4" height="4" fill="currentColor" rx="0.5" />
      <rect x="33" y="44" width="4" height="4" fill="currentColor" rx="0.5" />
      <rect x="25" y="52" width="4" height="4" fill="currentColor" rx="0.5" />
      
      <rect x="63" y="44" width="4" height="4" fill="currentColor" rx="0.5" />
      <rect x="71" y="44" width="4" height="4" fill="currentColor" rx="0.5" />
      <rect x="71" y="52" width="4" height="4" fill="currentColor" rx="0.5" />
      
      <rect x="52" y="52" width="4" height="4" fill="currentColor" rx="0.5" />
      <rect x="44" y="44" width="4" height="4" fill="currentColor" rx="0.5" />
      <rect x="52" y="44" width="4" height="4" fill="currentColor" rx="0.5" />
    </svg>
  );
}
