import React, { useState, useEffect, useRef, RefObject, useCallback } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useContent } from '../../contexts/ContentContext';
import { Advertisement } from '../../types';
import { fetchAdvertisements } from '../../utils/api';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { LogOut } from 'lucide-react';
import { DashboardHeader } from '../../components/dashboard/DashboardHeader';

export interface DashboardOutletContext {
  dashboardMainRef: RefObject<HTMLElement>;
  onPdfViewerModalToggle: (isOpen: boolean) => void;
  onSaveScrollPosition: () => void;
  savedScrollPosition: number;
  setSavedScrollPosition: React.Dispatch<React.SetStateAction<number>>;
  toggleSidebar: () => void;
  advertisements: Advertisement[];
  loadingAdvertisements: boolean;
  logout: () => Promise<void>;
}

export const DashboardPage: React.FC = () => {
  const [isConfirmLogoutOpen, setIsConfirmLogoutOpen] = useState(false);
  const dashboardMainRef: RefObject<HTMLElement> = useRef(null);
  const [savedScrollPosition, setSavedScrollPosition] = useState(0);
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [loadingAdvertisements, setLoadingAdvertisements] = useState(true);

  // Header state
  const [selectedClassLevel, setSelectedClassLevel] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('1');
  const [searchTerm, setSearchTerm] = useState('');


  // Auth Context
  const { user, isAuthenticated, isAuthInitialized, logout } = useAuth();
  const { classLevels } = useContent();
  const navigate = useNavigate();

  const classLevelOptions = React.useMemo(() => {
    const userClassType = user?.classType || '';
    const filteredClassLevels = classLevels
      .filter(level => userClassType === '' || level.name.startsWith(userClassType));
    const uniqueClassLevels = Array.from(new Set(filteredClassLevels.map(level => level.name)));
    return uniqueClassLevels.map(levelName => ({ value: levelName, label: levelName }));
  }, [user, classLevels]);

  const semesterOptions = React.useMemo(() => [
    { value: '1', label: 'Semester 1' },
    { value: '2', label: 'Semester 2' }
  ], []);

  // Initialize filters from user profile
  useEffect(() => {
    if (user?.classLevel && !selectedClassLevel && classLevels.length > 0) {
      setSelectedClassLevel(user.classLevel);
    }
  }, [user, classLevels]);

  // Fetch Advertisements
  useEffect(() => {
    const loadAdvertisements = async () => {
      if (isAuthInitialized && isAuthenticated) {
        setLoadingAdvertisements(true);
        try {
          const data = await fetchAdvertisements();
          setAdvertisements(data);
        } catch (err) {
          console.error('Error fetching advertisements:', err);
        } finally {
          setLoadingAdvertisements(false);
        }
      }
    };
    loadAdvertisements();
  }, [isAuthInitialized, isAuthenticated]);

  // Logout Handlers
  const handleConfirmLogout = useCallback(async () => {
    await logout();
    setIsConfirmLogoutOpen(false);
    navigate('/login');
  }, [logout, navigate]);

  // Context Helpers
  const handlePdfViewerModalToggle = useCallback((isOpen: boolean) => {
    if (!isOpen && dashboardMainRef.current && savedScrollPosition !== 0) {
      dashboardMainRef.current.scrollTop = savedScrollPosition;
      setSavedScrollPosition(0);
    }
  }, [savedScrollPosition]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col overflow-hidden">

      {/* Restored Header with 'Amazing' Pill Nav */}
      <DashboardHeader
        user={user}
        selectedClassLevel={selectedClassLevel}
        setSelectedClassLevel={setSelectedClassLevel}
        selectedSemester={selectedSemester}
        setSelectedSemester={setSelectedSemester}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        classLevelOptions={classLevelOptions}
        semesterOptions={semesterOptions}
        onLogout={() => setIsConfirmLogoutOpen(true)}
      />

      {/* Main Content Area - Full width */}
      <main
        ref={dashboardMainRef}
        className="flex-1 relative overflow-y-auto overflow-x-hidden w-full"
      >
        <Outlet
          context={React.useMemo(() => ({
            dashboardMainRef,
            onPdfViewerModalToggle: handlePdfViewerModalToggle,
            onSaveScrollPosition: () => dashboardMainRef.current && setSavedScrollPosition(dashboardMainRef.current.scrollTop),
            savedScrollPosition,
            setSavedScrollPosition,
            toggleSidebar: () => { }, // No-op
            advertisements,
            loadingAdvertisements,
            logout: handleConfirmLogout,
            selectedClassLevel,
            selectedSemester,
            searchTerm
          }), [
            dashboardMainRef,
            handlePdfViewerModalToggle,
            savedScrollPosition,
            advertisements,
            loadingAdvertisements,
            handleConfirmLogout,
            selectedClassLevel,
            selectedSemester,
            searchTerm
          ])}
        />
      </main>

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={isConfirmLogoutOpen}
        onClose={() => setIsConfirmLogoutOpen(false)}
        title="Confirm Sign Out"
        className="max-w-sm"
      >
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <LogOut className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Signing Out?</h3>
          <p className="text-gray-500 mb-8">
            You will need to sign in again to access your learning materials.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              onClick={() => setIsConfirmLogoutOpen(false)}
              className="w-full py-3 rounded-xl font-medium border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmLogout}
              className="w-full py-3 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/30 transition-all transform hover:-translate-y-1"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
