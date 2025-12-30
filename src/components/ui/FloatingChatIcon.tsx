import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquareText } from 'lucide-react'; // Import the new icon

interface FloatingChatIconProps {
  onClick: () => void;
}

const FloatingChatIcon: React.FC<FloatingChatIconProps> = ({ onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className="fixed bottom-8 right-8 z-[1000] cursor-pointer"
      whileHover={{ scale: 1.1, rotate: 5 }}
      whileTap={{ scale: 0.9 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 100, duration: 0.5 }}
    >
      <motion.div
        className="relative w-16 h-16 rounded-full flex items-center justify-center shadow-lg bg-neutral-700"
        style={{
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          transformStyle: 'preserve-3d',
          perspective: '1000px',
        }}
        animate={{
          rotateY: isHovered ? 15 : 0,
          rotateX: isHovered ? 15 : 0,
          boxShadow: isHovered
            ? '0 10px 30px rgba(0, 0, 0, 0.3), inset 0 0 0 1px rgba(255, 255, 255, 0.5)'
            : '0 5px 15px rgba(0, 0, 0, 0.2), inset 0 0 0 1px rgba(255, 255, 255, 0.2)',
        }}
          transition={{ duration: 0.3 }}
        >
          <MessageSquareText size={32} className="text-white" /> {/* New chat icon */}
        </motion.div>
    </motion.div>
  );
};

export default FloatingChatIcon;
