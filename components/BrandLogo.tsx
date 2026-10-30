import React from 'react';
import Image from 'next/image';

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
      {/* Official Porsi Kita Logo */}
      <div
        style={{ width: size, height: size }}
        className="relative rounded-xl overflow-hidden flex items-center justify-center shrink-0"
      >
        <Image
          src="/logo.png"
          alt="Logo Porsi Kita"
          width={size}
          height={size}
          className="w-full h-full object-contain"
          priority
        />
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
