import React from 'react';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', style }) => {
  return (
    <div
      style={style}
      aria-hidden="true"
      className={`bg-[#EEF1F6] animate-pulse rounded-[3px] ${className}`}
    />
  );
};
