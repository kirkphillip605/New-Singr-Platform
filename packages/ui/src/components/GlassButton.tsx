import React from 'react';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  children,
  variant = 'primary',
  className = '',
  ...props
}) => {
  const btnClass = variant === 'primary' ? 'glass-button-primary' : 'glass-button-secondary';
  return (
    <button className={`${btnClass} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
};
