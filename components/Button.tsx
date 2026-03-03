
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'error';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center font-bold uppercase tracking-wider rounded-xl transition-all duration-300 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-gradient-primary text-white shadow-btn-glow hover:shadow-btn-glow-hover hover:-translate-y-0.5 active:bg-gradient-to-br active:from-primary-deep active:to-primary-dark",
    secondary: "bg-transparent text-primary border-2 border-primary hover:bg-primary hover:text-white hover:shadow-btn-glow",
    ghost: "bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20",
    error: "bg-status-error text-white shadow-lg hover:bg-red-600"
  };

  const sizes = {
    sm: "px-4 py-2 text-xs",
    md: "px-8 py-4 text-sm",
    lg: "px-10 py-5 text-base"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
