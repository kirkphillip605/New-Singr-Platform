import React from 'react';

interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const GlassInput = React.forwardRef<HTMLInputElement, GlassInputProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`glass-input ${className}`.trim()}
        {...props}
      />
    );
  }
);

GlassInput.displayName = 'GlassInput';
