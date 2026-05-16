import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

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

export const Modal = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;
  
  const modalContent = (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'var(--space-4)'
    }}>
      <div className="card animate-fade-in" style={{
        width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto',
        position: 'relative'
      }}>
        <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-4)' }}>
          <h2 className="h3 modal-title" style={{ margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-muted)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export const ConfirmModal = ({ isOpen, onClose, onConfirm, title = "Confirmar Exclusão", message, confirmText = "Sim, Excluir", cancelText = "Cancelar", variant = "danger" }) => (
  <Modal isOpen={isOpen} onClose={onClose} title={title}>
    <div style={{ padding: 'var(--space-2)' }}>
      <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-6)' }}>{message}</p>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>{cancelText}</Button>
        <Button variant={variant} onClick={() => { onConfirm(); onClose(); }}>{confirmText}</Button>
      </div>
    </div>
  </Modal>
);

export const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = {
    success: { bg: 'var(--success)', icon: '✓' },
    error: { bg: 'var(--error)', icon: '✕' },
    info: { bg: 'var(--primary)', icon: 'ℹ' }
  };

  const { bg, icon } = styles[type] || styles.success;

  return createPortal(
    <div className="animate-fade-in" style={{
      position: 'fixed', bottom: 'var(--space-6)', right: 'var(--space-6)',
      zIndex: 10000, backgroundColor: bg, color: 'white',
      padding: '12px 24px', borderRadius: 'var(--radius-md)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      display: 'flex', alignItems: 'center', gap: '12px',
      fontWeight: 500, fontSize: '0.875rem'
    }}>
      <span style={{ 
        width: '20px', height: '20px', backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '12px'
      }}>{icon}</span>
      {message}
    </div>,
    document.body
  );
};
