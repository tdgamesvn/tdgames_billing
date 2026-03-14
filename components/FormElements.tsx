
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> {
  label: string;
  required?: boolean;
}

export const Input: React.FC<InputProps> = ({ label, required, className = '', type, ...props }) => {
  const inputStyles = "w-full bg-surface/80 text-neutral-light border border-primary/20 rounded-xl px-4 h-[52px] font-montserrat focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-neutral-medium/50 flex items-center leading-none";
  const inputRef = React.useRef<HTMLInputElement>(null);

  if (type === 'date') {
    return (
      <div className={`flex flex-col mb-4 ${className}`}>
        <label className="text-neutral-light text-sm font-semibold mb-2 flex items-center">
          {label}
          {required && <span className="text-primary ml-1">*</span>}
        </label>
        <div className="relative flex items-center">
          <input ref={inputRef} type="date" className={`${inputStyles} pr-12 date-input-custom`} {...(props as React.InputHTMLAttributes<HTMLInputElement>)} />
          <button
            type="button"
            className="absolute right-3 w-8 h-8 flex items-center justify-center rounded-lg text-primary hover:bg-primary/15 transition-all cursor-pointer"
            onClick={() => inputRef.current?.showPicker?.()}
            tabIndex={-1}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col mb-4 ${className}`}>
      <label className="text-neutral-light text-sm font-semibold mb-2 flex items-center">
        {label}
        {required && <span className="text-primary ml-1">*</span>}
      </label>
      <input type={type} className={inputStyles} {...(props as React.InputHTMLAttributes<HTMLInputElement>)} />
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
