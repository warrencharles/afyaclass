import React from 'react';
import { Heart, Mail } from 'lucide-react'; // Import Mail icon
import { FaWhatsapp, FaInstagram } from 'react-icons/fa'; // Import social icons

interface FooterProps {
  // Removed isAuthPage prop
}

export const Footer: React.FC<FooterProps> = () => {
  return (
    <footer className="bg-white/70 backdrop-blur-md border-t border-gray-100 text-gray-800 py-3 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm">
        <div className="flex flex-col md:flex-row justify-center items-center gap-4 md:gap-8 mb-4 md:mb-6">
          {/* App Download Badge */}
          <div className="flex flex-row items-center gap-3">
            <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Download Our App</span>
            <a
              href="https://afyaclass.co.tz/backend-php/public/downloads/afyaclasshub.apk"
              download="afyaclasshub.apk"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-transform duration-300 hover:scale-105 active:scale-95"
            >
              <img
                src="/play_store_badge.png"
                alt="Get it on Google Play"
                className="h-14 w-auto drop-shadow-md hover:drop-shadow-lg"
              />
            </a>
          </div>

          {/* Social Media Icons */}
          <div className="flex space-x-6">
            <a
              href="https://chat.whatsapp.com/DKLiADY59Aj9Br5XTPNFGc?mode=wwt"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-green-600 transition-colors duration-200"
              aria-label="WhatsApp"
            >
              <FaWhatsapp size={20} />
            </a>
            <a
              href="https://www.instagram.com/afya_class_hub?igsh=MW01Y3JjY3BoZ2VnZw%3D%3D"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-pink-600 transition-colors duration-200"
              aria-label="Instagram"
            >
              <FaInstagram size={20} />
            </a>
            <a
              href="mailto:info@afyaclass.co.tz"
              className="text-gray-600 hover:text-red-600 transition-colors duration-200"
              aria-label="Email"
            >
              <Mail size={20} />
            </a>
          </div>
        </div>

        <p className="text-gray-600 mb-1 text-xs">
          &copy; {new Date().getFullYear()} AfyaClass. All rights reserved.
        </p>
        <div className="flex items-center justify-center text-gray-600 text-xs">
          <span>Engineered with</span>
          <Heart className="w-3 h-3 mx-1 text-red-500 animate-pulse fill-current" />
          <span>by <a href="https://wa.me/255675048028" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-500 font-medium">WCM</a> for healthcare education</span>
        </div>
      </div>
    </footer>
  );
};
