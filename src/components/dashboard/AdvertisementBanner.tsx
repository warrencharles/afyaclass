import React, { useMemo } from 'react';
import { ExternalLink } from 'lucide-react';
import { AccessibleCarousel } from '../ui/AccessibleCarousel';
import { ProgressiveImage } from '../ui/ProgressiveImage';
import { API_BASE_URL } from '../../utils/api'; // Import API_BASE_URL
import { Advertisement } from '../../types'; // Import Advertisement type

export const AdvertisementBanner: React.FC<{ advertisements: Advertisement[] }> = ({ advertisements }) => {
  const ads = useMemo(() => advertisements, [advertisements]);
  console.log('AdvertisementBanner: Received advertisements:', ads); // Add this console log

  if (ads.length === 0) {
    console.log('AdvertisementBanner: No advertisements to display, returning null.'); // Add this console log
    return null;
  }

  const carouselItems = ads.map(ad => ({
    id: ad.id,
    alt: ad.title,
    content: (
      <div className="relative h-[280px] md:h-[320px] rounded-3xl overflow-hidden">
        <ProgressiveImage
          src={ad.imageUrl?.startsWith('http') || ad.imageUrl?.startsWith('data:') ? ad.imageUrl : `${API_BASE_URL}/${ad.imageUrl}`}
          alt={ad.title}
          className="w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent flex items-end sm:items-center">
          <div className="p-6 sm:p-8 max-w-2xl">
            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">{ad.title}</h3>
            {ad.description && (
              <p className="text-white/90 text-sm sm:text-base mb-4 line-clamp-3">{ad.description}</p>
            )}
            {ad.targetUrl && (
              <a
                href={ad.targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-white text-primary-600 hover:bg-gray-100 py-2 px-4 rounded-lg font-medium transition-colors text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black/50"
                aria-label={`Learn more about ${ad.title} (opens in new tab)`}
              >
                Learn More <ExternalLink size={16} className="ml-1" aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      </div>
    )
  }));

  return (
    <div className="neumorphic-card rounded-3xl overflow-hidden shadow-xl border border-white/20">
      <AccessibleCarousel
        items={carouselItems}
        autoPlay={ads.length > 1}
        autoPlayInterval={5000}
        showControls={ads.length > 1}
        showIndicators={ads.length > 1}
        ariaLabel="Featured advertisements"
        className="w-full h-[280px] md:h-[320px]"
      />
    </div>
  );
};
