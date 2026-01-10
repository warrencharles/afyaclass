import React, { useState, useEffect, useMemo, useCallback, useRef, RefObject } from 'react'; // Re-added RefObject
import { useOutletContext } from 'react-router-dom'; // Removed useNavigate
import { useAuth } from '../../contexts/AuthContext';
import { useContent } from '../../contexts/ContentContext';
import { ContentType, Subject, Advertisement } from '../../types';
import { FileText, Book, File, Clock, ClipboardList, Book as BookIcon, ChevronLeft, Video, AlertTriangle, Search, BookOpen } from 'lucide-react';
import { Button } from '../ui/Button';
import { useToast } from '../../contexts/ToastContext'; // Import Toast
// Removed Card import
import { AdvertisementBanner } from './AdvertisementBanner';
import { ContentTab } from './ContentTab';
import { PaymentProofFormModal } from './PaymentProofFormModal';
import { AccessStatusSection } from './AccessStatusSection';
import { SubjectGrid } from './SubjectGrid';

export interface DashboardOutletContext {
  dashboardMainRef: RefObject<HTMLElement>;
  onPdfViewerModalToggle: (isOpen: boolean) => void;
  onSaveScrollPosition: () => void;
  savedScrollPosition: number;
  setSavedScrollPosition: React.Dispatch<React.SetStateAction<number>>;
  toggleSidebar: () => void;
  advertisements: Advertisement[];
  loadingAdvertisements: boolean;
  logout: () => void;
  selectedClassLevel: string;
  selectedSemester: string;
  searchTerm: string;
}

interface DashboardContentProps { }

export const DashboardContent: React.FC<DashboardContentProps> = () => {
  const {
    onPdfViewerModalToggle,
    onSaveScrollPosition,
    advertisements,
    selectedClassLevel,
    selectedSemester,
    searchTerm
  } = useOutletContext<DashboardOutletContext>();

  const [activeTab, setActiveTab] = useState<ContentType>('note');
  const { user, refetchUser, startMaterialTrial } = useAuth();
  const { classLevels, classes, getSubjectsByClassLevel, isLoading: isContentLoading } = useContent();

  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const learningMaterialsRef = useRef<HTMLDivElement>(null);
  const [timeTick, setTimeTick] = useState(0);
  const { addToast } = useToast();
  const prevHasMaterialAccess = useRef<boolean | undefined>(user?.hasMaterialAccess);

  // --- Real-time Polling & Notifications ---
  useEffect(() => {
    // Poll user data every 30 seconds to check for admin access toggle
    const pollInterval = setInterval(async () => {
      const updatedUser = await refetchUser();

      // Check for access status change
      if (updatedUser && prevHasMaterialAccess.current !== undefined) {
        if (!prevHasMaterialAccess.current && updatedUser.hasMaterialAccess) {
          addToast('Global Free Access has been enabled by the admin!', 'success');
        } else if (prevHasMaterialAccess.current && !updatedUser.hasMaterialAccess) {
          addToast('Global Free Access has ended.', 'info');
        }
      }

      // Update ref *after* check
      if (updatedUser) {
        prevHasMaterialAccess.current = updatedUser.hasMaterialAccess;
      }

    }, 10000); // Poll every 10 seconds for faster feedback (as requested "instant" - though 10s is reasonable load)

    return () => clearInterval(pollInterval);
  }, [refetchUser, addToast]);

  // Update ref when user object changes naturally (e.g. manual refetch or initial load)
  useEffect(() => {
    prevHasMaterialAccess.current = user?.hasMaterialAccess;
  }, [user?.hasMaterialAccess]);

  // --- Logic for Access Control (Overlay) ---
  const handleAccessEnd = useCallback(() => {
    console.log('Access period ended, refetching user data...');
    refetchUser();
  }, [refetchUser]);

  const materialTrialRemainingTime = useMemo(() => {
    // Depend on timeTick to force re-calc
    if (user?.hasMaterialAccess) return 0;

    if (!user?.materialTrialStartTime && !user?.materialTrialEndTime) return 0;

    const currentUtcTimeMs = Date.now();
    let calculatedRemainingSeconds = 0;

    if (user?.materialTrialEndTime) {
      const trialEndTime = new Date(user.materialTrialEndTime).getTime();
      const remaining = Math.max(0, trialEndTime - currentUtcTimeMs);
      calculatedRemainingSeconds = Math.floor(remaining / 1000);
    } else if (user?.materialTrialStartTime) {
      const trialStartTime = new Date(user.materialTrialStartTime).getTime();
      const trialDuration = 15 * 60 * 1000; // 15 minutes trial
      const trialEndTime = trialStartTime + trialDuration;
      const remaining = Math.max(0, trialEndTime - currentUtcTimeMs);
      calculatedRemainingSeconds = Math.floor(remaining / 1000);
    }
    return calculatedRemainingSeconds;
  }, [user?.materialTrialStartTime, user?.materialTrialEndTime, user?.hasMaterialAccess, user, timeTick]);

  const materialPaidRemainingTime = useMemo(() => {
    if (!user?.materialPaidAccessEndTime || !user.hasMaterialAccess) return 0;
    const paidEndTime = new Date(user.materialPaidAccessEndTime).getTime();
    const currentTime = new Date().getTime();
    return Math.floor(Math.max(0, paidEndTime - currentTime) / 1000);
  }, [user?.materialPaidAccessEndTime, user?.hasMaterialAccess]);

  // Effect: Tick Timer if active
  useEffect(() => {
    if (user?.materialTrialStartTime && !user?.hasMaterialAccess) {
      const interval = setInterval(() => {
        setTimeTick(t => t + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const hasRefetchedOnExpiry = useRef(false);

  // Monitor Expiry
  useEffect(() => {
    if (user?.materialTrialStartTime && !user?.hasMaterialAccess) {
      if (materialTrialRemainingTime <= 0) {
        // Time ended
        if (!hasRefetchedOnExpiry.current) {
          console.log('Access period ended, triggering single refetch...');
          handleAccessEnd();
          hasRefetchedOnExpiry.current = true;
        }
      } else {
        // Reset ref if time is positive (e.g. trial just started or time sync)
        hasRefetchedOnExpiry.current = false;
      }
    }
  }, [materialTrialRemainingTime, user?.materialTrialStartTime, user?.hasMaterialAccess, handleAccessEnd]);

  // Condition to show the overlay (only if no paid access AND trial has ended or never started)
  const shouldShowMaterialOverlay = useMemo(() => {
    return !user?.hasMaterialAccess && (!user?.materialTrialStartTime || materialTrialRemainingTime <= 0);
  }, [user?.hasMaterialAccess, user?.materialTrialStartTime, materialTrialRemainingTime]);

  const handleStartMaterialTrial = useCallback(async () => {
    if (user && !user.hasMaterialAccess && (!user.materialTrialStartTime || materialTrialRemainingTime <= 0)) {
      try {
        await startMaterialTrial(user.id);
      } catch (error) {
        console.error('Failed to start material trial:', error);
      }
    }
  }, [user, startMaterialTrial, refetchUser, materialTrialRemainingTime]);

  // --- Filtering Logic ---
  const currentClassLevel = useMemo(() => {
    if (!selectedClassLevel || !user?.classType) return undefined;

    // 1. Find the class object that matches user.classType (Case-Insensitive)
    const userClass = classes.find(c => c.classCode?.toLowerCase() === user.classType.toLowerCase());
    if (!userClass) return undefined;

    // 2. Find the level scoped by that classId
    const normalize = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedSelected = normalize(selectedClassLevel);

    const scopedMatch = classLevels.find(level =>
      Number(level.classId) === Number(userClass.id) &&
      normalize(level.name) === normalizedSelected
    );

    if (scopedMatch) return scopedMatch;

    // Fallback search for legacy records without classId
    return classLevels.find(level =>
      (!level.classId || Number(level.classId) === 0) &&
      normalize(level.name) === normalizedSelected
    );
  }, [classLevels, classes, selectedClassLevel, user?.classType]);

  const filteredSubjects = useMemo(() => {
    if (!currentClassLevel) return [];
    let initialFiltered = getSubjectsByClassLevel(currentClassLevel.id).filter(
      subject => Number(subject.semester) === parseInt(selectedSemester, 10)
    );
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      initialFiltered = initialFiltered.filter(s => s.name.toLowerCase().includes(lowerTerm));
    }
    return initialFiltered;
  }, [currentClassLevel, getSubjectsByClassLevel, selectedSemester, searchTerm]);

  const getClassType = useMemo(() => {
    if (!selectedClassLevel) return '';
    return selectedClassLevel.replace(/[0-9]/g, '');
  }, [selectedClassLevel]);

  const tabs = useMemo(() => [
    { type: 'note' as ContentType, label: 'Notes', icon: FileText, color: 'text-primary-500', bgColor: 'bg-primary-50' },
    { type: 'book' as ContentType, label: 'Books', icon: Book, color: 'text-secondary-600', bgColor: 'bg-secondary-50' },
    { type: 'nactvet' as ContentType, label: 'NACTVET Tools', icon: File, color: 'text-warning-500', bgColor: 'bg-warning-50' },
    { type: 'exam' as ContentType, label: 'Exams', icon: Clock, color: 'text-accent-500', bgColor: 'bg-accent-50' },
    { type: 'examGuide' as ContentType, label: 'Exam Guides', icon: ClipboardList, color: 'text-accent-500', bgColor: 'bg-accent-50' },
    { type: 'video' as ContentType, label: 'Video Tutorials', icon: Video, color: 'text-purple-600', bgColor: 'bg-purple-50' },
    { type: 'practical' as ContentType, label: 'Practicals', icon: BookOpen, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
  ], []);

  /* Removed unused options memos */


  // --- Effects ---
  useEffect(() => {
    if (!selectedSubject) {
      // Only clear selected subject if explicitly navigating back
      setSelectedSubject(null);
    }
  }, [selectedClassLevel, selectedSemester]);

  useEffect(() => {
    if (learningMaterialsRef.current) {
      // Only scroll if we are in "Content View" mode or if specific user interaction required it.
      // For now, removing auto-scroll on filter change to avoid jumpiness, or keep if user prefers.
      // learningMaterialsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedClassLevel, selectedSemester]);

  if (isContentLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 animate-pulse">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

      {/* Main Content Area */}
      <div className="flex flex-col gap-8">

        <AdvertisementBanner advertisements={advertisements} />

        <AccessStatusSection user={user} onAccessEnd={handleAccessEnd} />

        {/* Learning Hub */}

        {/* Header for Section - Moved Outside Relative Container for Visibility */}
        {!selectedSubject && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-xl shadow-lg shadow-primary-500/30">
                <BookIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">My Subjects</h2>
                <p className="text-sm text-gray-500">
                  {currentClassLevel?.name || 'Select Class'} • Semester {selectedSemester}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Locked Content Container */}
        <div ref={learningMaterialsRef} className="relative min-h-[400px]">

          {/* Minimal Overlay */}
          {shouldShowMaterialOverlay && (
            <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[2px] rounded-xl flex items-start justify-center pt-20">
              <div className="bg-white px-8 py-6 rounded-2xl shadow-xl border border-gray-100 max-w-sm text-center transform transition-all hover:scale-105">
                <div className="mb-4">
                  <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <AlertTriangle size={24} className="text-amber-500" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Access Restricted</h3>
                  <p className="text-xs text-gray-500 max-w-[200px] mx-auto">
                    Your trial or subscription has expired.
                  </p>
                </div>

                <div className="flex gap-3 justify-center mt-2">
                  {!user?.materialTrialStartTime && !user?.hasMaterialAccess && (
                    <Button
                      onClick={handleStartMaterialTrial}
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-2 rounded-lg font-medium"
                    >
                      Start Free Trial
                    </Button>
                  )}
                  <Button
                    onClick={() => setIsPaymentModalOpen(true)}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-6 py-2 rounded-lg font-bold shadow-lg shadow-blue-500/30"
                  >
                    Unlock Full Access
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Content Area */}
          {!selectedSubject ? (
            <>
              {/* Universal Search Results Section */}
              {searchTerm && (
                <div className="mb-8 animate-fade-in-up">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Search className="h-5 w-5 text-purple-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800">Matching Content</h2>
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Reusing Tab System for Universal Search */}
                    <div className="flex overflow-x-auto border-b border-gray-100 bg-gray-50/50 p-1 gap-1">
                      {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                          <button
                            key={tab.type}
                            onClick={() => setActiveTab(tab.type)}
                            className={`
                                     flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap
                                     ${activeTab === tab.type
                                ? 'bg-white text-primary-600 shadow-sm ring-1 ring-gray-100'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}
                                  `}
                          >
                            <Icon size={16} className={activeTab === tab.type ? 'text-primary-500' : ''} />
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="p-0">
                      <ContentTab
                        key={`universal-search-${activeTab}`} // Force re-render on tab change
                        contentType={activeTab}
                        classLevel={selectedClassLevel}
                        semester={parseInt(selectedSemester)}
                        searchTerm={searchTerm}
                        selectedSubjectId={null} // Pass null to search all subjects
                        onModalToggle={onPdfViewerModalToggle}
                        onSaveScrollPosition={onSaveScrollPosition}
                        materialTrialRemainingTime={materialTrialRemainingTime}
                        materialPaidRemainingTime={materialPaidRemainingTime}
                        hasMaterialAccess={!shouldShowMaterialOverlay}
                        onStartMaterialTrial={handleStartMaterialTrial}
                      />
                    </div>
                  </div>

                  <div className="my-8 border-t border-gray-100"></div>
                </div>
              )}

              <SubjectGrid
                subjects={filteredSubjects}
                currentClassLevel={currentClassLevel}
                onSelectSubject={setSelectedSubject}
                classType={getClassType}
              />
            </>
          ) : (
            <div className="animate-fade-in-up">
              <div className="flex items-center gap-4 mb-6">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedSubject(null)}
                  className="p-2 rounded-xl hover:bg-white hover:shadow-sm text-gray-500 hover:text-gray-900 transition-all"
                >
                  <ChevronLeft size={24} />
                </Button>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedSubject.name}</h2>
                  <p className="text-gray-500 text-sm">Learning Materials</p>
                </div>
              </div>

              {/* Tabs (Keeping original tab UI for content, but wrapped nicely) */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex overflow-x-auto border-b border-gray-100 bg-gray-50/50 p-1 gap-1">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.type}
                        onClick={() => setActiveTab(tab.type)}
                        className={`
                                     flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap
                                     ${activeTab === tab.type
                            ? 'bg-white text-primary-600 shadow-sm ring-1 ring-gray-100'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}
                                  `}
                      >
                        <Icon size={16} className={activeTab === tab.type ? 'text-primary-500' : ''} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                <div className="p-0">
                  <ContentTab
                    contentType={activeTab}
                    classLevel={selectedClassLevel}
                    semester={parseInt(selectedSemester)}
                    searchTerm={searchTerm}
                    selectedSubjectId={selectedSubject.id}
                    onModalToggle={onPdfViewerModalToggle}
                    onSaveScrollPosition={onSaveScrollPosition}
                    materialTrialRemainingTime={materialTrialRemainingTime}
                    materialPaidRemainingTime={materialPaidRemainingTime}
                    hasMaterialAccess={!shouldShowMaterialOverlay}
                    onStartMaterialTrial={handleStartMaterialTrial}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {user && (
        <PaymentProofFormModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          onPaymentProofSubmitted={refetchUser}
          userId={user.id ? user.id.toString() : ''}
          userName={user.username || ''}
          userEmail={user.email || ''}
        />
      )}
    </div>
  );
};
