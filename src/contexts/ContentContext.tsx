import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Content, ContentType, Subject, ClassLevel } from '../types';
import api from '../utils/api'; // Import the centralized axios instance
import { useAuth } from './AuthContext'; // Import useAuth

interface ContentContextType {
  contents: Content[];
  subjects: Subject[];
  classLevels: ClassLevel[];
  isLoading: boolean;
  error: string | null;
  addContent: (content: Omit<Content, 'id' | 'createdAt' | 'updatedAt' | 'description' | 'accessStatus' | 'remainingTrialTime' | 'file'>) => Promise<void>;
  updateContent: (id: string, updatedData: Partial<Omit<Content, 'id' | 'createdAt' | 'updatedAt' | 'description' | 'accessStatus' | 'remainingTrialTime' | 'file'>>) => Promise<void>;
  deleteContent: (id: string) => Promise<void>;
  bulkDeleteContent: (ids: string[]) => Promise<void>;
  getContentByType: (type: ContentType) => Content[];
  getContentBySubject: (subjectId: number) => Content[];
  getSubjectsByClassLevel: (classLevelId: number) => Subject[];
  getClassLevelById: (id: number) => ClassLevel | undefined;
  refreshData: () => Promise<void>;
  refetchUserContent: () => Promise<void>; // New function to refetch user-specific content
  refetchAllContent: () => Promise<void>; // New function to refetch all content for admin
}

const ContentContext = createContext<ContentContextType | undefined>(undefined);

export const useContent = () => {
  const context = useContext(ContentContext);
  if (context === undefined) {
    throw new Error('useContent must be used within a ContentProvider');
  }
  return context;
};

export const ContentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [contents, setContents] = useState<Content[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classLevels, setClassLevels] = useState<ClassLevel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth(); // Get user from AuthContext

  // Effect to load initial data and re-load when user changes (e.g., login/logout, trial status update)
  useEffect(() => {
    if (user?.id) {
      refreshData();
    } else {
      // Clear content if no user is logged in
      setContents([]);
      setSubjects([]);
      setClassLevels([]);
      setIsLoading(false);
    }
  }, [user?.id, user?.role, user?.classType, user?.classLevel]); // Depend on user academic fields to trigger re-fetch

  const refetchUserContent = useCallback(async () => {
    if (!user?.id) {
      setContents([]);
      return;
    }
    try {
      const response = await api.get(`/user/${user.id}/content`);
      const data: Content[] = response.data;
      setContents(data);
    } catch (err) {
      console.error('Error fetching user-specific content:', err);
      setError('Failed to load user content');
    }
  }, [user?.id]); // Depend on user.id

  const refetchAllContent = useCallback(async () => {
    try {
      const response = await api.get('/admin/content'); // New endpoint for all content
      const data: Content[] = response.data;
      setContents(data);
    } catch (err) {
      console.error('Error fetching all content:', err);
      setError('Failed to load all content');
    }
  }, []); // No dependencies, fetches all content

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const fetchPromises = [
        loadSubjects(),
        loadClassLevels(),
      ];

      if (user?.role === 'admin') {
        fetchPromises.push(refetchAllContent());
      } else if (user?.id) {
        fetchPromises.push(refetchUserContent());
      } else {
        setContents([]); // Clear contents if no user or not admin
      }

      await Promise.all(fetchPromises);
    } catch (err) {
      console.error('Error refreshing content data:', err);
      setError('Failed to load content data');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, user?.role, refetchUserContent, refetchAllContent]);

  const loadSubjects = async () => {
    try {
      const response = await api.get('/subjects');
      const data: Subject[] = response.data;
      setSubjects(data);
    } catch (err) {
      console.error('Error fetching subjects:', err);
      setError('Failed to load subjects');
    }
  };

  const loadClassLevels = async () => {
    try {
      const response = await api.get('/class-levels');
      const data: ClassLevel[] = response.data;
      setClassLevels(data);
    } catch (err) {
      console.error('Error fetching class levels:', err);
      setError('Failed to load class levels');
    }
  };

  const addContent = async (contentData: Omit<Content, 'id' | 'createdAt' | 'updatedAt' | 'description' | 'accessStatus' | 'remainingTrialTime' | 'file'>) => {
    try {
      console.log('[ContentContext] addContent - Data received:', contentData);
      const formData = new FormData();

      // Append all key-value pairs from contentData to formData
      for (const key in contentData) {
        if (contentData.hasOwnProperty(key)) {
          const value = contentData[key as keyof typeof contentData];
          if (value !== null && value !== undefined) {
            formData.append(key, String(value));
          }
        }
      }

      // Log FormData content for debugging
      const formDataEntries = Array.from(formData.entries());
      console.log('[ContentContext] addContent - FormData entries:', Object.fromEntries(formDataEntries));

      await api.post('/admin/content', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      await refreshData(); // Refresh data after successful addition
    } catch (err: any) {
      console.error('[ContentContext] Error adding content:', err);
      const errorMessage = err.response?.data?.message || 'Failed to add content';
      setError(errorMessage);
      throw err; // Re-throw the error to be caught in the component
    }
  };

  const updateContent = async (id: string, updatedData: Partial<Omit<Content, 'id' | 'createdAt' | 'updatedAt' | 'description' | 'accessStatus' | 'remainingTrialTime'>>) => {
    try {
      const formData = new FormData();
      Object.keys(updatedData).forEach(key => {
        const value = updatedData[key as keyof typeof updatedData];
        if (value !== null && value !== undefined) {
          formData.append(key, String(value));
        }
      });

      await api.post(`/admin/content/${id}`, formData, { // Changed from api.put to api.post
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      await refreshData();
    } catch (err: any) {
      console.error('Error updating content:', err);
      const errorMessage = err.response?.data?.message || 'Failed to update content';
      setError(errorMessage);
      throw err;
    }
  };

  const deleteContent = async (id: string) => {
    try {
      await api.delete(`/admin/content/${id}`);
      await refreshData(); // Call refreshData to update content based on user role
    } catch (err: any) {
      console.error('Error deleting content:', err);
      const errorMessage = err.response?.data?.message || 'Failed to delete content';
      setError(errorMessage);
      throw err;
    }
  };

  const getContentByType = (type: ContentType) => {
    return contents.filter(content => content.type === type);
  };

  const getContentBySubject = (subjectId: number) => {
    return contents.filter(content => content.subjectId === subjectId);
  };

  const getSubjectsByClassLevel = (classLevelId: number) => {
    return subjects.filter(subject => subject.classLevelId === classLevelId);
  };

  const getClassLevelById = (id: number) => {
    return classLevels.find(level => level.id === id);
  };

  return (
    <ContentContext.Provider
      value={{
        contents,
        subjects,
        classLevels,
        isLoading,
        error,
        addContent,
        updateContent,
        deleteContent,
        bulkDeleteContent: async (ids: string[]) => {
          await Promise.all(ids.map(id => deleteContent(id)));
        },
        getContentByType,
        getContentBySubject,
        getSubjectsByClassLevel,
        getClassLevelById,
        refreshData,
        refetchUserContent,
        refetchAllContent, // Provide the new function
      }}
    >
      {children}
    </ContentContext.Provider>
  );
};
