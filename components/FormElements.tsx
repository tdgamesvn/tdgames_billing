
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> {
  label: string;
  required?: boolean;
}

export const Input: React.FC<InputProps> = ({ label, required, className = '', ...props }) => {
  const inputStyles = "w-full bg-surface/80 text-neutral-light border border-primary/20 rounded-xl px-4 h-[52px] font-montserrat focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-neutral-medium/50 flex items-center leading-none";
  
  return (
    <div className={`flex flex-col mb-4 ${className}`}>
      <label className="text-neutral-light text-sm font-semibold mb-2 flex items-center">
        {label}
        {required && <span className="text-primary ml-1">*</span>}
      </label>
      <input className={inputStyles} {...(props as React.InputHTMLAttributes<HTMLInputElement>)} />
    </div>
  );
};

export const TextArea: React.FC<InputProps> = ({ label, required, className = '', ...props }) => {
  const inputStyles = "w-full bg-surface/80 text-neutral-light border border-primary/20 rounded-xl px-4 py-4 font-montserrat focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all min-h-[120px] resize-y placeholder:text-neutral-medium/50 leading-relaxed";
  
  return (
    <div className={`flex flex-col mb-4 ${className}`}>
      <label className="text-neutral-light text-sm font-semibold mb-2 flex items-center">
        {label}
        {required && <span className="text-primary ml-1">*</span>}
      </label>
      <textarea className={inputStyles} {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)} />
    </div>
  );
};

export const Select: React.FC<InputProps> = ({ label, required, children, className = '', ...props }) => {
  const inputStyles = "w-full bg-surface/80 text-neutral-light border border-primary/20 rounded-xl px-4 h-[52px] font-montserrat focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all appearance-none cursor-pointer flex items-center leading-none";
  
  return (
    <div className={`flex flex-col mb-4 ${className}`}>
      <label className="text-neutral-light text-sm font-semibold mb-2 flex items-center">
        {label}
        {required && <span className="text-primary ml-1">*</span>}
      </label>
      <div className="relative flex items-center">
        <select className={inputStyles} {...(props as React.SelectHTMLAttributes<HTMLSelectElement>)}>
          {children}
        </select>
        <div className="absolute right-4 pointer-events-none text-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
        </div>
      </div>
    </div>
  );
};
