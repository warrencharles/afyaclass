import React, { useState, useEffect, useCallback } from 'react';

interface CarouselItem {
  id: string;
  alt: string;
  content: React.ReactNode;
}

interface AccessibleCarouselProps {
  items: CarouselItem[];
  autoPlay?: boolean;
  autoPlayInterval?: number;
  showControls?: boolean;
  showIndicators?: boolean;
  ariaLabel?: string;
  className?: string;
}

export const AccessibleCarousel: React.FC<AccessibleCarouselProps> = ({
  items,
  autoPlay = false,
  autoPlayInterval = 5000,
  showControls = true,
  showIndicators = true,
  ariaLabel = "Carousel",
  className,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToNext = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length);
  }, [items.length]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + items.length) % items.length);
  }, [items.length]);

  useEffect(() => {
    if (autoPlay) {
      const interval = setInterval(goToNext, autoPlayInterval);
      return () => clearInterval(interval);
    }
  }, [autoPlay, autoPlayInterval, goToNext]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={`relative ${className}`} aria-label={ariaLabel}>
      <div className="overflow-hidden rounded-3xl h-[280px] md:h-[320px]">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`absolute inset-0 transition-opacity duration-500 ${
              index === currentIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            aria-hidden={index !== currentIndex}
            role="tabpanel"
            id={`carousel-item-${item.id}`}
            aria-labelledby={`carousel-indicator-${item.id}`}
          >
            {item.content}
          </div>
        ))}
      </div>

      {showControls && items.length > 1 && (
        <>
          <button
            onClick={goToPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black/50"
            aria-label="Previous slide"
          >
            {'<'}
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black/50"
            aria-label="Next slide"
          >
            {'>'}
          </button>
        </>
      )}

      {showIndicators && items.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
          {items.map((item, index) => (
            <button
              key={item.id}
              id={`carousel-indicator-${item.id}`}
              role="tab"
              aria-controls={`carousel-item-${item.id}`}
              aria-selected={index === currentIndex}
              onClick={() => setCurrentIndex(index)}
              className={`w-3 h-3 rounded-full ${
                index === currentIndex ? 'bg-white' : 'bg-white/50'
              } focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black/50`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
