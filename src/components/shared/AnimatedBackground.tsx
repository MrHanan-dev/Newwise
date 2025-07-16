import React from 'react';

// This component renders beautiful, moving, eye-catching background animations for both light and dark mode.
// It uses absolutely positioned divs with animated blobs, orbs, and gradients.

const AnimatedBackground: React.FC = () => (
  <div className="fixed inset-0 w-full h-full pointer-events-none z-0 select-none">
    {/* Light mode animated blobs */}
    <div className="hidden dark:block absolute inset-0 w-full h-full">
      {/* Dark mode: deep blue blobs and glowing orbs */}
      <div className="absolute bg-[#23304a] opacity-40 rounded-full blur-3xl animate-blob1" style={{width:'60vw',height:'18vw',top:'-8vw',left:'-10vw',minWidth:'320px',minHeight:'120px'}} />
      <div className="absolute bg-[#0061ff] opacity-30 rounded-full blur-3xl animate-blob2" style={{width:'40vw',height:'14vw',top:'60%',left:'70%',minWidth:'180px',minHeight:'80px'}} />
      <div className="absolute bg-[#60aaff] opacity-20 rounded-full blur-2xl animate-blob3" style={{width:'24vw',height:'8vw',top:'30%',left:'60%',minWidth:'120px',minHeight:'60px'}} />
      <div className="absolute bg-[#1b2536] opacity-30 rounded-full blur-2xl animate-blob4" style={{width:'18vw',height:'6vw',top:'75%',left:'20%',minWidth:'80px',minHeight:'40px'}} />
      {/* Glowing orbs */}
      <div className="absolute bg-[#0061ff] opacity-20 rounded-full blur-2xl animate-pulse" style={{width:'12vw',height:'12vw',top:'20%',left:'10%'}} />
      <div className="absolute bg-[#60aaff] opacity-10 rounded-full blur-2xl animate-pulse" style={{width:'18vw',height:'18vw',top:'60%',left:'80%'}} />
    </div>
    <div className="block dark:hidden absolute inset-0 w-full h-full">
      {/* Light mode: soft blue/gray blobs */}
      <div className="absolute bg-[#e5eaf2] opacity-60 rounded-full blur-3xl animate-blob1" style={{width:'60vw',height:'18vw',top:'-8vw',left:'-10vw',minWidth:'320px',minHeight:'120px'}} />
      <div className="absolute bg-[#0061ff] opacity-20 rounded-full blur-3xl animate-blob2" style={{width:'40vw',height:'14vw',top:'60%',left:'70%',minWidth:'180px',minHeight:'80px'}} />
      <div className="absolute bg-[#60aaff] opacity-10 rounded-full blur-2xl animate-blob3" style={{width:'24vw',height:'8vw',top:'30%',left:'60%',minWidth:'120px',minHeight:'60px'}} />
      <div className="absolute bg-[#bfc9d9] opacity-20 rounded-full blur-2xl animate-blob4" style={{width:'18vw',height:'6vw',top:'75%',left:'20%',minWidth:'80px',minHeight:'40px'}} />
      {/* Subtle orbs */}
      <div className="absolute bg-[#0061ff] opacity-10 rounded-full blur-2xl animate-pulse" style={{width:'12vw',height:'12vw',top:'20%',left:'10%'}} />
      <div className="absolute bg-[#60aaff] opacity-10 rounded-full blur-2xl animate-pulse" style={{width:'18vw',height:'18vw',top:'60%',left:'80%'}} />
    </div>
  </div>
);

export default AnimatedBackground; 