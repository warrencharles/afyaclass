import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useContent } from '../../contexts/ContentContext';
import { useAuth } from '../../contexts/AuthContext';
import { ContentType } from '../../types';
import { FileText, Book, Clock, Video, Lock, PlayCircle, ChevronRight, BookOpen } from 'lucide-react';
import { Modal } from '../ui/Modal';
import PDFViewer from '../ui/PDFViewer';
import { ProgressiveImage } from '../ui/ProgressiveImage';
import { GenericVideoPlayer } from '../ui/GenericVideoPlayer';
import { PaymentProofFormModal } from './PaymentProofFormModal';
import { API_BASE_URL } from '../../utils/api';
import { sortByProperty } from '../../utils/sorting';

interface ContentTabProps {
  contentType: ContentType;
  classLevel: string;
  semester: number;
  searchTerm?: string;
  selectedSubjectId: number | null;
  onModalToggle: (isOpen: boolean) => void;
  onSaveScrollPosition: () => void;
  materialTrialRemainingTime: number;
  materialPaidRemainingTime: number;
  hasMaterialAccess: boolean;
  onStartMaterialTrial: () => Promise<void>;
}

export const ContentTab: React.FC<ContentTabProps> = ({
  contentType,
  classLevel,
  semester,
  searchTerm = '',
  selectedSubjectId,
  onModalToggle,
  onSaveScrollPosition,
  hasMaterialAccess,
  onStartMaterialTrial,
}) => {
  const { getContentByType, classLevels, subjects, classes } = useContent();
  const { user, refetchUser } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ url: string; type: 'pdf' | 'image' | 'video', name: string } | null>(null);

  useEffect(() => {
    onModalToggle(isModalOpen);
  }, [isModalOpen, onModalToggle]);

  const classLevelObj = useMemo(() => {
    if (!classLevel || !user?.classType) return undefined;

    // 1. Find the class object that matches user.classType (Case-Insensitive)
    const userClass = classes.find(c => c.classCode?.toLowerCase() === user.classType.toLowerCase());
    if (!userClass) return undefined;

    // 2. Find the level scoped by that classId
    const normalize = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedSelected = normalize(classLevel);

    return classLevels.find(l =>
      Number(l.classId) === Number(userClass.id) &&
      normalize(l.name) === normalizedSelected
    );
  }, [classLevel, classLevels, classes, user?.classType]);

  const relevantSubjects = useMemo(() =>
    subjects.filter(s =>
      Number(s.classLevelId) === Number(classLevelObj?.id) &&
      Number(s.semester) === Number(semester)
    ), [subjects, classLevelObj, semester]);

  const relevantSubjectIds = useMemo(() => relevantSubjects.map(s => Number(s.id)), [relevantSubjects]);

  const getSubjectName = useCallback((id: number) => subjects.find(s => Number(s.id) === Number(id))?.name || 'Unknown', [subjects]);

  const filteredContents = useMemo(() => {
    const filtered = getContentByType(contentType).filter(content => {
      const contentSubId = Number(content.subjectId);
      const matchesSubject = selectedSubjectId
        ? contentSubId === Number(selectedSubjectId)
        : relevantSubjectIds.includes(contentSubId);

      if (!searchTerm.trim()) return matchesSubject;
      return matchesSubject && (
        content.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getSubjectName(content.subjectId).toLowerCase().includes(searchTerm.toLowerCase())
      );
    });

    return sortByProperty(filtered, 'title');
  }, [contentType, relevantSubjectIds, getContentByType, searchTerm, getSubjectName, selectedSubjectId]);

  const handleOpenContent = async (content: any) => {
    if (!hasMaterialAccess) {
      await onStartMaterialTrial();
      return;
    }

    onSaveScrollPosition();
    const type = content.videoUrl ? 'video' : (content.fileType || 'pdf');
    let url = content.videoUrl || content.fileUrl;

    if (url && !url.startsWith('http')) {
      console.log('[ContentTab] Original URL from DB:', url);
      console.log('[ContentTab] API_BASE_URL:', API_BASE_URL);

      // 1. Extract the filename from the stored path
      const parts = url.split('/');
      const filename = parts[parts.length - 1];
      console.log('[ContentTab] Extracted filename:', filename);

      // 2. Construct the URL using API_BASE_URL
      let baseUrl = API_BASE_URL.replace(/\/$/, '');
      console.log('[ContentTab] Base URL after trim:', baseUrl);

      // Force inclusion of /public if seemingly missing
      if (baseUrl.endsWith('backend-php')) {
        console.log('[ContentTab] Detected backend-php without /public, adding it');
        baseUrl += '/public';
      }
      console.log('[ContentTab] Final base URL:', baseUrl);

      url = `${baseUrl}/uploads/${filename}`;
      console.log('[ContentTab] Final constructed URL:', url);
    }

    if (url) {
      setSelectedFile({ url, type, name: content.title });
      setIsModalOpen(true);
    }
  };

  const getIcon = (type: ContentType) => {
    if (type === 'video') return <Video className="text-red-500" size={20} />;
    if (type === 'book') return <Book className="text-purple-500" size={20} />;
    if (type === 'exam') return <Clock className="text-orange-500" size={20} />;
    if (type === 'practical') return <BookOpen className="text-indigo-500" size={20} />;
    return <FileText className="text-blue-500" size={20} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            {getIcon(contentType)}
            <span>{contentType === 'video' ? 'Video Tutorials' : contentType.charAt(0).toUpperCase() + contentType.slice(1) + 's'}</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {selectedSubjectId ? getSubjectName(selectedSubjectId) : 'All Subjects'} • Semester {semester}
          </p>
        </div>
        {searchTerm && (
          <span className="text-xs bg-gray-100 px-3 py-1.5 rounded-full text-gray-600 font-medium">
            Search: "{searchTerm}"
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredContents.length > 0 ? (
          filteredContents.map(content => (
            <div
              key={content.id}
              onClick={() => hasMaterialAccess ? handleOpenContent(content) : null}
              className={`
                  relative group bg-white border rounded-xl p-3 transition-all flex items-start gap-3
                  ${hasMaterialAccess
                  ? 'border-gray-200 hover:border-blue-400 hover:shadow-md cursor-pointer'
                  : 'border-gray-100 opacity-80 cursor-not-allowed hover:bg-gray-50'}
               `}
            >
              <div className={`
                  w-10 h-10 rounded-lg flex items-center justify-center shrink-0
                  ${contentType === 'video' ? 'bg-red-50' : 'bg-blue-50'}
               `}>
                {contentType === 'video' ? <PlayCircle size={20} className="text-red-500" /> : <FileText size={20} className="text-blue-500" />}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-gray-900 truncate pr-6">{content.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 truncate max-w-[100px]">
                    {getSubjectName(content.subjectId)}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {new Date(content.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="absolute top-3 right-3">
                {!hasMaterialAccess ? (
                  <Lock size={14} className="text-gray-400" />
                ) : (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight size={16} className="text-blue-500" />
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-gray-500 text-sm">
            No content found for these filters.
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen && selectedFile?.type !== 'pdf'} onClose={() => setIsModalOpen(false)} size="full" contentPaddingClass="p-0">
        {selectedFile && selectedFile.type !== 'pdf' && (
          <div className="h-[90vh] bg-gray-900 flex flex-col">
            <div className="h-12 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 text-white">
              <span className="font-medium text-sm truncate">{selectedFile.name}</span>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white text-sm">Close</button>
            </div>
            <div className="flex-1 overflow-hidden relative">
              {selectedFile.type === 'video' && (
                <GenericVideoPlayer videoUrl={selectedFile.url} title={selectedFile.name} onClose={() => setIsModalOpen(false)} />
              )}
              {selectedFile.type === 'image' && (
                <div className="w-full h-full flex items-center justify-center overflow-auto">
                  <ProgressiveImage src={selectedFile.url} alt={selectedFile.name} className="max-w-full max-h-full" />
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Standalone PDF Viewer for better state management */}
      {isModalOpen && selectedFile?.type === 'pdf' && (
        <PDFViewer fileUrl={selectedFile.url} fileName={selectedFile.name} onClose={() => setIsModalOpen(false)} />
      )}

      <PaymentProofFormModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onPaymentProofSubmitted={refetchUser}
        userId={user?.id.toString() || ''}
        userName={user?.username || ''}
        userEmail={user?.email || ''}
      />
    </div>
  );
};
