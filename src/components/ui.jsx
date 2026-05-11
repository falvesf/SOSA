import React from 'react';

export const Card = ({ children, className = '', ...props }) => (
  <div className={`card ${className}`} {...props}>
    {children}
  </div>
);

export const Button = ({ children, variant = 'primary', className = '', ...props }) => (
  <button className={`btn btn-${variant} ${className}`} {...props}>
    {children}
  </button>
);

export const Input = ({ label, id, error, ...props }) => (
  <div className="form-group">
    {label && <label htmlFor={id} className="form-label">{label}</label>}
    <input id={id} className="form-input" {...props} />
    {error && <span className="text-xs" style={{ color: 'var(--error)' }}>{error}</span>}
  </div>
);

export const Select = ({ label, id, options = [], error, ...props }) => (
  <div className="form-group">
    {label && <label htmlFor={id} className="form-label">{label}</label>}
    <select id={id} className="form-input" {...props}>
      <option value="">Selecione...</option>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    {error && <span className="text-xs" style={{ color: 'var(--error)' }}>{error}</span>}
  </div>
);
