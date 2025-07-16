import React from 'react';
import styled from 'styled-components';

const FancyUniverseButton = ({ onClick, children }: { onClick?: () => void; children?: React.ReactNode }) => {
  return (
    <StyledWrapper>
      <div style={{ position: 'relative' }}>
        <svg style={{ position: 'absolute', width: 0, height: 0 }}>
          <filter width="300%" x="-100%" height="300%" y="-100%" id="unopaq">
            <feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 9 0" />
          </filter>
          <filter width="300%" x="-100%" height="300%" y="-100%" id="unopaq2">
            <feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 3 0" />
          </filter>
          <filter width="300%" x="-100%" height="300%" y="-100%" id="unopaq3">
            <feColorMatrix values="1 0 0 0.2 0 0 1 0 0.2 0 0 0 1 0.2 0 0 0 0 2 0" />
          </filter>
        </svg>
        <button className="fancy-universe-btn-real" onClick={onClick} />
        <div className="fancy-universe-btn-backdrop" />
        <div className="fancy-universe-btn-container">
          <div className="fancy-universe-btn-spin fancy-universe-btn-spin-blur" />
          <div className="fancy-universe-btn-spin fancy-universe-btn-spin-intense" />
          <div className="fancy-universe-btn-backdrop" />
          <div className="fancy-universe-btn-border">
            <div className="fancy-universe-btn-spin fancy-universe-btn-spin-inside" />
            <div className="fancy-universe-btn">{children || 'Button'}</div>
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  /* Scope all styles to .fancy-universe-btn only */
  .fancy-universe-btn-container { position: relative; margin: 0 2em; }
  .fancy-universe-btn-border { padding: 3px; inset: 0; background: #0005; border-radius: inherit; clip-path: path("M 90 0 C 121 0 126 5 126 33 C 126 61 121 66 90 66 L 33 66 C 5 66 0 61 0 33 C 0 5 5 0 33 0 Z"); }
  .fancy-universe-btn { justify-content: center; align-items: center; border: none; border-radius: 0.875em; clip-path: path("M 90 0 C 115 0 120 5 120 30 C 120 55 115 60 90 60 L 30 60 C 5 60 0 55 0 30 C 0 5 5 0 30 0 Z"); width: 120px; height: 60px; background: #111215; display: flex; flex-direction: column; color: #fff; overflow: hidden; }
  .fancy-universe-btn-real { position: absolute; width: 120px; height: 60px; z-index: 1; outline: none; border: none; border-radius: 17px; cursor: pointer; opacity: 0; }
  .fancy-universe-btn-backdrop { position: absolute; inset: -9900%; background: radial-gradient(circle at 50% 50%, #0000 0, #0000 20%, #111111aa 50%); background-size: 3px 3px; z-index: -1; }
  .fancy-universe-btn-spin { position: absolute; inset: 0; z-index: -2; opacity: 0.5; overflow: hidden; transition: 0.3s; }
  .fancy-universe-btn-real:active ~ div .fancy-universe-btn-spin { opacity: 1; }
  .fancy-universe-btn-spin-blur { filter: blur(2em) url(#unopaq); }
  .fancy-universe-btn-spin-intense { inset: -0.125em; filter: blur(0.25em) url(#unopaq2); border-radius: 0.75em; }
  .fancy-universe-btn-spin-inside { inset: -2px; border-radius: inherit; filter: blur(2px) url(#unopaq3); z-index: 0; }
  .fancy-universe-btn-spin::before { content: ""; position: absolute; inset: -150%; animation: speen 8s cubic-bezier(0.56, 0.15, 0.28, 0.86) infinite, woah 4s infinite; animation-play-state: paused; }
  .fancy-universe-btn-real:hover ~ div .fancy-universe-btn-spin::before { animation-play-state: running; }
  .fancy-universe-btn-spin-blur::before { background: linear-gradient(90deg, #f50 30%, #0000 50%, #05f 70%); }
  .fancy-universe-btn-spin-intense::before { background: linear-gradient(90deg, #f95 20%, #0000 45% 55%, #59f 80%); }
  .fancy-universe-btn-spin-inside::before { background: linear-gradient(90deg, #fc9 30%, #0000 45% 55%, #9cf 70%); }
  @keyframes speen { 0% { rotate: 10deg; } 50% { rotate: 190deg; } to { rotate: 370deg; } }
  @keyframes woah { 0% { scale: 1; } 50% { scale: 0.75; } to { scale: 1; } }
`;

export default FancyUniverseButton;
