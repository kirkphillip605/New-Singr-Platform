import React from 'react';
import iconImg from '../../assets/singr-icon.png';

interface SingrIconProps {
  className?: string;
  alt?: string;
  style?: React.CSSProperties;
}

export const SingrIcon: React.FC<SingrIconProps> = ({
  className = '',
  alt = 'Singr Icon',
  style,
}) => {
  // Handle static imports (strings in Vite, objects in Next.js/Webpack)
  const src = iconImg && typeof iconImg === 'object' && 'src' in iconImg ? (iconImg as any).src : iconImg;

  return (
    <img
      src={src}
      className={className}
      alt={alt}
      style={style}
    />
  );
};
