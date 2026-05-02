import React from 'react';

interface AppLoaderProps {
  className?: string;
}

export const AppLoader: React.FC<AppLoaderProps> = ({ className }) => {
  return (
    <div className={`ai-matrix-loader-wrapper ${className || ''}`}>
      <div className="ai-matrix-loader"></div>
    </div>
  );
};
