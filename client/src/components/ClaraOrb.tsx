import React from 'react';

interface ClaraOrbProps {
  isProcessing?: boolean;
}

const ClaraOrb: React.FC<ClaraOrbProps> = ({ isProcessing = false }) => {
  return (
    <div className="flex justify-center items-center my-6">
      <div 
        className={`
          relative w-32 h-32 rounded-full 
          floating-orb
          bg-opacity-15 backdrop-blur-lg
          bg-white/10
          shadow-[0_20px_70px_rgba(0,0,0,0.6),0_0_30px_rgba(138,43,226,0.4),0_0_50px_rgba(255,0,128,0.3),inset_0_0_70px_rgba(255,255,255,0.2)]
          border border-white/60
          overflow-hidden
          transition-all duration-300 ease-in-out
        `}
      >
        {/* Crystal fluid container */}
        <div className="crystal-fluid">
          {/* Pink blob */}
          <div className="lava-blob lava-blob-1 animate-blob-float-1"></div>
          
          {/* Blue blob */}
          <div className="lava-blob lava-blob-2 animate-blob-float-2"></div>
          
          {/* Purple blob */}
          <div className="lava-blob lava-blob-3 animate-blob-float-3"></div>
          
          {/* Gold blob */}
          <div className="lava-blob lava-blob-4 animate-blob-float-4"></div>
          
          {/* Bubbles - small ones */}
          <div className="bubble bubble-iridescent" style={{ width: '3px', height: '3px', left: '40%', bottom: '0%', '--duration': '5s', '--opacity': '0.7', '--move-x': '3px' } as React.CSSProperties}></div>
          <div className="bubble bubble-iridescent" style={{ width: '2px', height: '2px', left: '60%', bottom: '5%', '--duration': '7s', '--opacity': '0.6', '--move-x': '-5px' } as React.CSSProperties}></div>
          <div className="bubble bubble-iridescent" style={{ width: '4px', height: '4px', left: '30%', bottom: '10%', '--duration': '6s', '--opacity': '0.8', '--move-x': '4px' } as React.CSSProperties}></div>
          <div className="bubble bubble-iridescent" style={{ width: '2px', height: '2px', left: '50%', bottom: '15%', '--duration': '8s', '--opacity': '0.5', '--move-x': '-3px' } as React.CSSProperties}></div>
          <div className="bubble bubble-iridescent" style={{ width: '3px', height: '3px', left: '70%', bottom: '5%', '--duration': '5.5s', '--opacity': '0.7', '--move-x': '2px' } as React.CSSProperties}></div>
          <div className="bubble bubble-iridescent" style={{ width: '2px', height: '2px', left: '35%', bottom: '8%', '--duration': '6.5s', '--opacity': '0.6', '--move-x': '-4px' } as React.CSSProperties}></div>
          <div className="bubble bubble-iridescent" style={{ width: '4px', height: '4px', left: '55%', bottom: '12%', '--duration': '7.5s', '--opacity': '0.8', '--move-x': '5px' } as React.CSSProperties}></div>
          
          {/* Iridescent overlay */}
          <div className="iridescent-layer"></div>
        </div>
        
        {/* Glass highlights */}
        <div className="crystal-highlight"></div>
        <div className="crystal-highlight-small"></div>
      </div>
    </div>
  );
};

export default ClaraOrb;