import React, { createContext, useContext, useState } from 'react';

interface ProfileContextType {
  isProfileModalOpen: boolean;
  openProfileModal: () => void;
  closeProfileModal: () => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const openProfileModal = () => {
    setIsProfileModalOpen(true);
  };

  const closeProfileModal = () => {
    setIsProfileModalOpen(false);
  };

  return (
    <ProfileContext.Provider
      value={{
        isProfileModalOpen,
        openProfileModal,
        closeProfileModal,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};