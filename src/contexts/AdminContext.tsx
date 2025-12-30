import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Class, ClassLevel, Subject, Advertisement } from '../types';
import { API_BASE_URL } from '../utils/api';
import { useAuth } from './AuthContext'; // Import useAuth

interface AdminContextType {
  users: User[];
  classes: Class[];
  classLevels: ClassLevel[];
  subjects: Subject[];
  advertisements: Advertisement[];
  isLoading: boolean;
  error: string | null;

  // User management
  addUser: (user: Omit<User, 'id'> & { password: string }) => Promise<void>;
  updateUser: (id: number, userData: Partial<User>) => Promise<void>;
  deleteUser: (id: number) => Promise<void>;
  // Class management
  addClass: (classData: Omit<Class, 'id'>) => Promise<void>;
  updateClass: (id: number, classData: Partial<Class>) => Promise<void>;
  deleteClass: (id: number) => Promise<void>;

  // Class level management
  addClassLevel: (levelData: Omit<ClassLevel, 'id'>) => Promise<void>;
  updateClassLevel: (id: number, levelData: Partial<ClassLevel>) => Promise<void>;
  deleteClassLevel: (id: number) => Promise<void>;

  // Subject management
  addSubject: (subjectData: Omit<Subject, 'id'>) => Promise<void>;
  updateSubject: (id: number, subjectData: Partial<Subject>) => Promise<void>;
  deleteSubject: (id: number) => Promise<void>;

  // Advertisement management
  addAdvertisement: (adData: Omit<Advertisement, 'id' | 'createdAt'>) => Promise<void>;
  updateAdvertisement: (id: string, adData: Partial<Advertisement>) => Promise<void>;
  deleteAdvertisement: (id: string) => Promise<void>;

  // Bulk operations
  bulkDeleteUsers: (ids: number[]) => Promise<void>;
  bulkDeleteClasses: (ids: number[]) => Promise<void>;
  bulkDeleteClassLevels: (ids: number[]) => Promise<void>;
  bulkDeleteSubjects: (ids: number[]) => Promise<void>;
  bulkDeleteAdvertisements: (ids: string[]) => Promise<void>;

  // Data refresh
  refreshData: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth(); // Get user from AuthContext
  const [users, setUsers] = useState<User[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [classLevels, setClassLevels] = useState<ClassLevel[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize getAuthHeaders to avoid re-creating on every render
  const getAuthHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (user && user.token) {
      headers.Authorization = `Bearer ${user.token}`;
    }
    return headers;
  }, [user]);

  // Load all data on mount or when user token changes
  useEffect(() => {
    if (user?.token) { // Only refresh if a user is logged in and has a token
      refreshData();
    } else {
      // If no user or token, clear data and stop loading
      setUsers([]);
      setClasses([]);
      setClassLevels([]);
      setSubjects([]);
      setAdvertisements([]);
      setIsLoading(false);
      setError('Authentication required to load admin data.');
    }
  }, [user?.token]); // Depend on user.token

  const refreshData = async () => {
    setIsLoading(true);
    setError(null);

    if (!user?.token) {
      setError('Not authenticated. Please log in as an administrator.');
      setIsLoading(false);
      return; // Early return if not authenticated
    }

    try {
      await Promise.all([
        loadUsers(),
        loadClasses(),
        loadClassLevels(),
        loadSubjects(),
        loadAdvertisements(),
      ]);
    } catch (err) {
      console.error('Error refreshing data:', err);
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/users`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      // Handle both direct array and { users: [...] } format
      const usersData = Array.isArray(data) ? data : (data.users && Array.isArray(data.users) ? data.users : []);
      setUsers(usersData);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
    }
  };

  const loadClasses = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/classes`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const classesData = Array.isArray(data) ? data : (data.classes && Array.isArray(data.classes) ? data.classes : []);
      setClasses(classesData);
    } catch (err) {
      console.error('Error fetching classes:', err);
      setError('Failed to load classes');
    }
  };

  const loadClassLevels = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/class-levels`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const levelsData = Array.isArray(data) ? data : (data.classLevels && Array.isArray(data.classLevels) ? data.classLevels : []);
      setClassLevels(levelsData);
    } catch (err) {
      console.error('Error fetching class levels:', err);
      setError('Failed to load class levels');
    }
  };

  const loadSubjects = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/subjects`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const subjectsData = Array.isArray(data) ? data : (data.subjects && Array.isArray(data.subjects) ? data.subjects : []);
      setSubjects(subjectsData);
    } catch (err) {
      console.error('Error fetching subjects:', err);
      setError('Failed to load subjects');
    }
  };

  const loadAdvertisements = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/advertisements`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const adsData = Array.isArray(data) ? data : (data.advertisements && Array.isArray(data.advertisements) ? data.advertisements : []);
      setAdvertisements(adsData);
    } catch (err) {
      console.error('Error fetching advertisements:', err);
      setError('Failed to load advertisements');
    }
  };

  // User management functions
  const addUser = async (userData: Omit<User, 'id'> & { password: string }) => {
    try {
      const processedUserData = {
        ...userData,
        college: userData.college || null,
        phone: userData.phone || null,
        classType: userData.classType || null,
        classLevel: userData.classLevel || null,
        // Removed hasExamAccess and hasExamGuideAccess defaults
      };

      const response = await fetch(`${API_BASE_URL}/admin/users`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(processedUserData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      await refreshData(); // Refresh data after successful addition
    } catch (err) {
      console.error('Error adding user:', err);
      setError('Failed to add user');
      throw err; // Re-throw to be caught by the component
    }
  };

  const updateUser = async (id: number, userData: Partial<User>) => {
    try {
      // Extract new trial hour fields for separate handling in the backend
      // Extract new trial hour fields for separate handling in the backend
      // Removed setExamTrialHours and setExamGuideTrialHours logic
      const payload: Partial<User> = { ...userData };

      const response = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      await refreshData();
    } catch (err) {
      console.error('Error updating user:', err);
      setError('Failed to update user');
      throw err;
    }
  };

  const deleteUser = async (id: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      await refreshData();
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('Failed to delete user');
      throw err;
    }
  };


  // Exam access functions removed

  // Class management functions
  const addClass = async (classData: Omit<Class, 'id'>) => {
    try {
      const processedClassData = {
        ...classData,
        description: classData.description || null,
      };
      console.log('Sending class data to backend:', processedClassData); // Add this log
      const response = await fetch(`${API_BASE_URL}/admin/classes`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(processedClassData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      await refreshData();
    } catch (err) {
      console.error('Error adding class:', err);
      setError('Failed to add class');
      throw err;
    }
  };

  const updateClass = async (id: number, classData: Partial<Class>) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/classes/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(classData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      await refreshData();
    } catch (err) {
      console.error('Error updating class:', err);
      setError('Failed to update class');
      throw err;
    }
  };

  const deleteClass = async (id: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/classes/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      await refreshData();
    } catch (err) {
      console.error('Error deleting class:', err);
      setError('Failed to delete class');
      throw err;
    }
  };

  // Class level management functions
  const addClassLevel = async (levelData: Omit<ClassLevel, 'id'>) => {
    try {
      const processedLevelData = {
        ...levelData,
        description: levelData.description || null,
        classId: levelData.classId !== undefined && levelData.classId !== null ? levelData.classId : null,
      };
      const response = await fetch(`${API_BASE_URL}/admin/class-levels`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(processedLevelData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      await refreshData();
    } catch (err: any) {
      console.error('Error adding class level:', err);
      setError(err.message || 'Failed to add class level');
      throw err;
    }
  };

  const updateClassLevel = async (id: number, levelData: Partial<ClassLevel>) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/class-levels/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(levelData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      await refreshData();
    } catch (err) {
      console.error('Error updating class level:', err);
      setError('Failed to update class level');
      throw err;
    }
  };

  const deleteClassLevel = async (id: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/class-levels/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      await refreshData();
    } catch (err) {
      console.error('Error deleting class level:', err);
      setError('Failed to delete class level');
      throw err;
    }
  };

  // Subject management functions
  const addSubject = async (subjectData: Omit<Subject, 'id'>) => {
    try {
      const processedSubjectData = {
        ...subjectData,
        // Ensure classLevelId is sent as a number or null
        classLevelId: subjectData.classLevelId !== undefined ? subjectData.classLevelId : null,
        // Ensure semester is sent as a string or null
        semester: subjectData.semester !== undefined ? subjectData.semester : null,
      };
      const response = await fetch(`${API_BASE_URL}/admin/subjects`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(processedSubjectData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      await refreshData();
    } catch (err) {
      console.error('Error adding subject:', err);
      setError('Failed to add subject');
      throw err;
    }
  };

  const updateSubject = async (id: number, subjectData: Partial<Subject>) => {
    try {
      const processedSubjectData = {
        ...subjectData,
        // Ensure classLevelId is sent as a number or null
        classLevelId: subjectData.classLevelId !== undefined ? subjectData.classLevelId : null,
        // Ensure semester is sent as a string or null
        semester: subjectData.semester !== undefined ? subjectData.semester : null,
      };
      const response = await fetch(`${API_BASE_URL}/admin/subjects/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(processedSubjectData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      await refreshData();
    } catch (err) {
      console.error('Error updating subject:', err);
      setError('Failed to update subject');
      throw err;
    }
  };

  const deleteSubject = async (id: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/subjects/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      await refreshData();
    } catch (err) {
      console.error('Error deleting subject:', err);
      setError('Failed to delete subject');
      throw err;
    }
  };

  // Advertisement management functions
  const addAdvertisement = async (adData: Omit<Advertisement, 'id' | 'createdAt'>) => {
    try {
      const processedAdData = {
        ...adData,
        isActive: adData.isActive || false,
      };
      console.log('Sending advertisement data to backend:', processedAdData);
      const response = await fetch(`${API_BASE_URL}/admin/advertisements`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(processedAdData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Backend error response:', errorData);
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      await refreshData();
    } catch (err) {
      console.error('Error adding advertisement:', err);
      setError('Failed to add advertisement');
      throw err;
    }
  };

  const updateAdvertisement = async (id: string, adData: Partial<Advertisement>) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/advertisements/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(adData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      await refreshData();
    } catch (err) {
      console.error('Error updating advertisement:', err);
      setError('Failed to update advertisement');
      throw err;
    }
  };

  const deleteAdvertisement = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/advertisements/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      await refreshData();
    } catch (err) {
      console.error('Error deleting advertisement:', err);
      setError('Failed to delete advertisement');
      throw err;
    }
  };

  return (
    <AdminContext.Provider
      value={{
        users,
        classes,
        classLevels,
        subjects,
        advertisements,
        isLoading,
        error,
        addUser,
        updateUser,
        deleteUser,
        addClass,
        updateClass,
        deleteClass,
        addClassLevel,
        updateClassLevel,
        deleteClassLevel,
        addSubject,
        updateSubject,
        deleteSubject,
        addAdvertisement,
        updateAdvertisement,
        deleteAdvertisement,
        refreshData,
        bulkDeleteUsers: async (ids) => {
          await Promise.all(ids.map(id => deleteUser(id)));
        },
        bulkDeleteClasses: async (ids) => {
          await Promise.all(ids.map(id => deleteClass(id)));
        },
        bulkDeleteClassLevels: async (ids) => {
          await Promise.all(ids.map(id => deleteClassLevel(id)));
        },
        bulkDeleteSubjects: async (ids) => {
          await Promise.all(ids.map(id => deleteSubject(id)));
        },
        bulkDeleteAdvertisements: async (ids) => {
          await Promise.all(ids.map(id => deleteAdvertisement(id)));
        },
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};
