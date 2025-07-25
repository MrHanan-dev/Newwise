import React from 'react';

const FancyUniverseButton = ({ onClick, children }: { onClick?: () => void; children?: React.ReactNode }) => {
  return (
    <button
      style={{
        width: 120,
        height: 60,
        borderRadius: '0.875em',
        background: 'var(--primary, #00B6F0)',
        color: 'var(--primary-foreground, #FFFFFF)',
        fontWeight: 600,
        fontSize: '1rem',
        border: 'none',
        boxShadow: '0 2px 8px 0 rgba(0,0,0,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
      onClick={onClick}
      type="button"
    >
      {children || 'Button'}
    </button>
  );
};

export default FancyUniverseButton;
