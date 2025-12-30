import React, { useState, useEffect } from 'react';

interface ProgressiveImageProps {
  src: string;
  alt: string;
  className?: string;
  loading?: 'eager' | 'lazy';
}

export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  src,
  alt,
  className,
  loading = 'lazy',
}) => {
  const [imageSrc, setImageSrc] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      setImageSrc(src);
      setIsLoading(false);
    };
    img.onerror = () => {
      // Fallback or error handling if image fails to load
      setIsLoading(false);
    };
  }, [src]);

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
      loading={loading}
    />
  );
};
