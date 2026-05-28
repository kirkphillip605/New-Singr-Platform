import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  hoverable = false, 
  className = '', 
  ...props 
}) => {
  const baseClass = 'glass-panel';
  const hoverClass = hoverable ? 'glass-panel-hover' : '';
  return (
    <div className={`${baseClass} ${hoverClass} ${className}`.trim()} {...props}>
      {children}
    </div>
  );
};
