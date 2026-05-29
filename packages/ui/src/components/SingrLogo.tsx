import React from 'react';
import logoColor from '../../assets/singr-logo-color.png';
import logoWhite from '../../assets/singr-logo-color-white.png';

interface SingrLogoProps {
  variant?: 'color' | 'white';
  className?: string;
  alt?: string;
  style?: React.CSSProperties;
}

export const SingrLogo: React.FC<SingrLogoProps> = ({
  variant = 'color',
  className = '',
  alt = 'Singr Logo',
  style,
}) => {
  const logo = variant === 'white' ? logoWhite : logoColor;
  // Handle static imports (strings in Vite, objects in Next.js/Webpack)
  const src = logo && typeof logo === 'object' && 'src' in logo ? (logo as any).src : logo;

  return (
    <img
      src={src}
      className={className}
      alt={alt}
      style={style}
    />
  );
};
