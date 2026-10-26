import React from 'react';

interface BrandLogoProps {
  size?: number;
  showAsterisk?: boolean;
  className?: string;
}

export default function BrandLogo({
  size = 40,
  showAsterisk = false,
  className = '',
}: BrandLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      {/* Bowl with leafy plant inside a rounded container */}
      <div
        style={{ width: size, height: size }}
        className="rounded-xl bg-[#F7F8F8] flex items-center justify-center p-1.5 shadow-2xs border border-stone-200/50"
      >
        <svg
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Green leaves sprout inside bowl */}
          {/* Left leaf */}
          <path
            d="M13 19C11 15 13 11 16 10C16 13 14 17 13 19Z"
            fill="#75A202"
          />
          {/* Right leaf */}
          <path
            d="M23 19C25 15 23 11 20 10C20 13 22 17 23 19Z"
            fill="#75A202"
          />
          {/* Center stem/leaf */}
          <path
            d="M18 20V9"
            stroke="#75A202"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Center bud/circle */}
          <circle cx="18" cy="7" r="2.2" fill="#75A202" />

          {/* Semicircle Bowl with dark outline */}
          <path
            d="M7 21C7 27 12 30 18 30C24 30 29 27 29 21H7Z"
            fill="#FFFFFF"
            stroke="#0D0101"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          {/* Bowl foot base */}
          <path
            d="M13 30H23"
            stroke="#0D0101"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Asterisk mark (on Login screen) */}
      {showAsterisk && (
        <div style={{ width: size * 0.65, height: size * 0.65 }} className="flex items-center justify-center">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
          >
            {/* 8-pointed star / asterisk in #6DA003 */}
            <path
              d="M12 2V22M2 12H22M4.93 4.93L19.07 19.07M19.07 4.93L4.93 19.07"
              stroke="#6DA003"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
