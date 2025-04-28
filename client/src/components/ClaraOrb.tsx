import React from 'react';

const ClaraOrb: React.FC = () => {
  return (
    <div className="relative flex justify-center py-6">
      <div className="floating-orb w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary shadow-lg flex items-center justify-center">
        <div className="w-20 h-20 rounded-full bg-white bg-opacity-30 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-white bg-opacity-50 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-white bg-opacity-70 flex items-center justify-center text-primary font-semibold text-xl">
              C
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClaraOrb;
