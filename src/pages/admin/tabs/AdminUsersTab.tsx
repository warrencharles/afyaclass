import React, { useState, useCallback, useMemo } from 'react';
import { useAdmin } from '../../../contexts/AdminContext';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { useToast } from '../../../contexts/ToastContext';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { Edit, Trash2, Lock, Unlock, Search, Mail, Plus, Users, GraduationCap, Building2, UserPlus, XCircle, Loader2 } from 'lucide-react';
import { User, Class } from '../../../types';
import { naturalSort } from '../../../utils/sorting';

export const AdminUsersTab: React.FC = () => {
  const {
    users = [],
    updateUser,
    deleteUser,
    addUser,
    isLoading,
    classes = [],
    classLevels = [],
    bulkDeleteUsers,
  } = useAdmin();
  const { showToast } = useToast();

  const [isAddFormVisible, setIsAddFormVisible] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({});
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [confirmEditPassword, setConfirmEditPassword] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'danger' | 'warning' | 'info' | 'success';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info',
    onConfirm: () => { }
  });

  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredUsers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredUsers.map(u => u.id));
    }
  };

  const triggerBulkDelete = () => {
    if (selectedIds.length === 0) return;

    // Filter out admin users
    const selectedUsers = users.filter(u => selectedIds.includes(u.id));
    const adminUsers = selectedUsers.filter(u => u.role === 'admin');
    const nonAdminIds = selectedUsers.filter(u => u.role !== 'admin').map(u => u.id);

    if (adminUsers.length > 0) {
      showToast(`Cannot delete ${adminUsers.length} admin account(s). Only non-admin users can be bulk deleted.`, 'warning');
      if (nonAdminIds.length === 0) return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Bulk Delete Users',
      message: `Permanently delete ${nonAdminIds.length} selected users? This cannot be undone.${adminUsers.length > 0 ? ` (${adminUsers.length} admin(s) excluded)` : ''}`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await bulkDeleteUsers(nonAdminIds);
          setSelectedIds([]);
          showToast(`${nonAdminIds.length} users deleted successfully`, 'success');
        } catch (error) {
          showToast('Failed to delete some users', 'error');
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const classTypeOptions = useMemo(() => {
    const sorted = [...(Array.isArray(classes) ? classes : [])].sort((a, b) => naturalSort(a.name || '', b.name || ''));
    return sorted.map(cls => ({
      value: cls.classCode,
      label: cls.name,
    }));
  }, [classes]);

  const filteredClassLevelOptions = useCallback((selectedClassCode: string | undefined) => {
    if (!Array.isArray(classes) || !Array.isArray(classLevels)) return [];
    const selectedClass = classes.find(cls => cls.classCode === selectedClassCode);
    if (!selectedClass) return [];
    return classLevels
      .filter(level => level.classId === selectedClass.id)
      .sort((a, b) => naturalSort(a.name || '', b.name || ''))
      .map(level => ({ value: level.name, label: level.name }));
  }, [classes, classLevels]);

  const filteredUsers = useMemo(() => {
    if (!Array.isArray(users)) return [];
    return users.filter(user => {
      const uName = (user.username || '').toLowerCase();
      const uEmail = (user.email || '').toLowerCase();
      const uCol = (user.college || '').toLowerCase();
      const term = searchTerm.toLowerCase();

      const matchesSearch = uName.includes(term) || uEmail.includes(term) || uCol.includes(term);
      const matchesFilter = filterRole === 'all' || (filterRole === user.role);

      return matchesSearch && matchesFilter;
    }).sort((a, b) => naturalSort(a.username || '', b.username || ''));
  }, [users, searchTerm, filterRole]);

  const roleOptions = [
    { value: 'admin', label: 'Admin' },
    { value: 'student', label: 'Student' },
  ];

  const filterOptions = [
    { value: 'all', label: 'All Roles' },
    { value: 'admin', label: 'Admins' },
    { value: 'student', label: 'Students' },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => {
      const newFormData = { ...prev, [name]: value };
      if (name === 'classType') {
        const selectedClass = classes.find(cls => cls.classCode === value);
        if (selectedClass) {
          const levelsForClass = [...classLevels]
            .filter(level => level.classId === selectedClass.id)
            .sort((a, b) => naturalSort(a.name || '', b.name || ''));
          newFormData.classLevel = levelsForClass.length > 0 ? levelsForClass[0].name : '';
        } else {
          newFormData.classLevel = '';
        }
      }
      return newFormData;
    });
  };

  const toggleAddForm = () => {
    if (!isAddFormVisible) {
      const defaultClass = classes.length > 0 ? classes[0] : undefined;
      const defaultClassType = defaultClass ? defaultClass.classCode : '';
      let defaultClassLevel = '';
      if (defaultClass) {
        const levels = classLevels.filter(level => level.classId === defaultClass.id);
        if (levels.length > 0) defaultClassLevel = levels[0].name;
      }

      setFormData({
        email: '',
        username: '',
        college: '',
        classType: defaultClassType as Class['classCode'],
        classLevel: defaultClassLevel,
        role: 'student',
      });
      setPassword('');
      setConfirmPassword('');
    }
    setIsAddFormVisible(prev => !prev);
  };

  const toggleEditForm = (user: User) => {
    if (editingUserId === user.id) {
      setEditingUserId(null);
      setFormData({});
    } else {
      setEditingUserId(user.id);
      setSelectedUser(user);
      setFormData({ ...user });
      setEditPassword('');
      setConfirmEditPassword('');
    }
  };

  const triggerDelete = (user: User) => {
    // Prevent admin deletion
    if (user.role === 'admin') {
      showToast('Admin accounts cannot be deleted for security. Change role to student first.', 'warning');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Delete Account',
      message: `Permanently delete ${user.username}'s account? This will revoke all access and wipe their history.`,
      variant: 'danger',
      onConfirm: async () => {
        await deleteUser(user.id);
        showToast('User deleted successfully', 'success');
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleAddUser = async () => {
    try {
      if (!formData.email || !formData.username) throw new Error('Email/Username required');
      if (!password || password.length < 6) throw new Error('Password min 6 chars');
      if (password !== confirmPassword) throw new Error('Passwords mismatch');
      await addUser({ ...formData as Omit<User, 'id'>, password });
      setIsAddFormVisible(false);
      showToast('User added!', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleUpdateUser = async () => {
    try {
      if (!selectedUser) return;
      if (editPassword && editPassword !== confirmEditPassword) throw new Error('Passwords mismatch');

      // Sanitize data to include ONLY updatable fields
      // This prevents sending read-only fields (like id, createdAt, etc.) which crash the backend
      // RESTRICTED LIST: Removed isConfirmed, hasPendingPayment, classTypeNameFull to avoid backend crashes on mismatch
      const allowedFields = [
        'email', 'username', 'role', 'college', 'phone',
        'classType', 'classLevel',
        'hasMaterialAccess'
      ];

      const updatedData: Partial<User> = {};
      allowedFields.forEach(field => {
        if (field in formData) {
          const value = formData[field as keyof User];
          // Handle null vs undefined for optional fields
          if (value === null) {
            // For optional fields in User type (like phone), we might need undefined instead of null
            // But backend usually expects null for "empty".
            // We cast to any to bypass strict TS check if we are sure backend handles null
            (updatedData as any)[field] = null;
          } else {
            (updatedData as any)[field] = value;
          }
        }
      });

      if (editPassword) updatedData.password = editPassword;
      await updateUser(selectedUser.id, updatedData);
      setEditingUserId(null);
      showToast('Profile updated!', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="animate-spin h-10 w-10 text-blue-500 mb-4" />
        <p className="text-sm text-slate-500 font-black uppercase tracking-widest">Directory Syncing...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Accounts</h2>
          <p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Platform Membership</p>
        </div>
        <button
          onClick={toggleAddForm}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-black transition-all shadow-lg active:scale-95 ${isAddFormVisible ? 'bg-slate-100 text-slate-600' : 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700'
            }`}
        >
          {isAddFormVisible ? <XCircle size={18} /> : <Plus size={18} />}
          <span>{isAddFormVisible ? 'Close' : 'Add User'}</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-2 bg-white/40 backdrop-blur-md p-2 rounded-2xl border border-blue-50 shadow-sm">
        <div className="relative flex-1">
          <Input
            placeholder="Search directory..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 bg-white/60 border-transparent rounded-xl focus:bg-white"
            icon={<Search size={18} className="text-slate-400" />}
            fullWidth
          />
        </div>
        <div className="w-full md:w-48">
          <Select
            value={filterRole}
            onChange={setFilterRole}
            options={filterOptions}
            fullWidth
          />
        </div>
      </div>

      {/* Bulk User Actions */}
      {selectedIds.length > 0 && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center space-x-2 text-red-700 font-bold text-sm">
            <Trash2 size={18} />
            <span>{selectedIds.length} users selected</span>
          </div>
          <button
            onClick={triggerBulkDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
          >
            Delete Selection
          </button>
        </div>
      )}

      {/* Select All Toggle */}
      <div className="flex items-center space-x-2 px-2">
        <input
          type="checkbox"
          checked={filteredUsers.length > 0 && selectedIds.length === filteredUsers.length}
          onChange={handleSelectAll}
          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Select All {filteredUsers.length > 0 && `(${filteredUsers.length})`}</span>
      </div>

      {isAddFormVisible && (
        <div className="bg-white/90 backdrop-blur-xl border border-white/60 rounded-3xl p-6 md:p-8 shadow-2xl animate-in slide-in-from-top-4 duration-300">
          <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center">
            <UserPlus className="mr-2 text-blue-600" /> New Member Profile
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Username" name="username" value={formData.username || ''} onChange={handleInputChange} fullWidth placeholder="johndoe" icon={<Users size={18} />} />
              <Input label="Email" name="email" value={formData.email || ''} onChange={handleInputChange} fullWidth placeholder="john@example.com" icon={<Mail size={18} />} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="College" name="college" value={formData.college || ''} onChange={handleInputChange} fullWidth placeholder="Medical College" icon={<Building2 size={18} />} />
              <Select label="Role" options={roleOptions} value={formData.role || 'student'} onChange={val => handleSelectChange('role', val)} fullWidth />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select label="Class Scope" options={classTypeOptions} value={formData.classType || ''} onChange={val => handleSelectChange('classType', val)} fullWidth />
              <Select label="Level Segment" options={filteredClassLevelOptions(formData.classType)} value={formData.classLevel || ''} onChange={val => handleSelectChange('classLevel', val)} fullWidth />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Credential" type="password" value={password} onChange={e => setPassword(e.target.value)} fullWidth icon={<Lock size={18} />} />
              <Input label="Verify" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} fullWidth icon={<Unlock size={18} />} />
            </div>
            <Button onClick={handleAddUser} fullWidth className="py-6 rounded-2xl bg-blue-600 font-black text-lg shadow-xl shadow-blue-200">Finalize Registration</Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map(user => (
          <Card key={user.id} className={`group relative border-0 shadow-lg shadow-blue-900/5 backdrop-blur-md rounded-[2.5rem] overflow-hidden border transition-all ${selectedIds.includes(user.id) ? 'bg-blue-50/80 border-blue-200 ring-2 ring-blue-400 ring-offset-2' : 'bg-white/80 border-white/40'}`}>
            <div className="absolute top-4 left-4 z-10">
              <input
                type="checkbox"
                checked={selectedIds.includes(user.id)}
                onChange={() => toggleSelection(user.id)}
                className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500 bg-white/50 backdrop-blur-sm cursor-pointer"
              />
            </div>
            <div className="p-4 pl-12 bg-slate-50/50 flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black shadow-lg shadow-blue-200">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-sm">{user.username}</h3>
                  <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${user.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                    {user.role}
                  </span>
                </div>
              </div>
              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => toggleEditForm(user)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-all"><Edit size={14} /></button>
                <button onClick={() => triggerDelete(user)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={14} /></button>
              </div>
            </div>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center text-[10px] text-slate-500 font-medium">
                <Mail size={12} className="mr-2 text-blue-500" />
                <span className="truncate">{user.email}</span>
              </div>
              <div className="flex items-center text-[10px] text-slate-500 font-medium">
                <Building2 size={12} className="mr-2 text-blue-500" />
                <span className="truncate">{user.college || 'No college listed'}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                <div className="flex items-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <GraduationCap size={12} className="mr-1 text-slate-300" />
                  {user.classLevel || 'N/A'}
                </div>
                <div className="text-[9px] font-black text-blue-600 uppercase tracking-widest">
                  {user.classType}
                </div>
              </div>
            </CardContent>

            {editingUserId === user.id && (
              <div className="absolute inset-0 z-30 bg-white/95 backdrop-blur-xl p-5 overflow-y-auto animate-in fade-in zoom-in duration-300">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="font-black text-slate-800">Modify Identity</h4>
                  <button onClick={() => setEditingUserId(null)} className="p-1 text-slate-400 hover:text-red-500"><XCircle size={20} /></button>
                </div>
                <div className="space-y-4">
                  <Input value={formData.username || ''} onChange={handleInputChange} name="username" fullWidth placeholder="Username" />
                  <Input value={formData.email || ''} onChange={handleInputChange} name="email" fullWidth placeholder="Email" />
                  <div className="grid grid-cols-2 gap-3">
                    <Input value={formData.college || ''} onChange={handleInputChange} name="college" fullWidth placeholder="College" icon={<Building2 size={16} />} />
                    <Select options={roleOptions} value={formData.role || ''} onChange={v => handleSelectChange('role', v)} fullWidth />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Select options={classTypeOptions} value={formData.classType || ''} onChange={val => handleSelectChange('classType', val)} fullWidth />
                    <Select options={filteredClassLevelOptions(formData.classType)} value={formData.classLevel || ''} onChange={val => handleSelectChange('classLevel', val)} fullWidth />
                  </div>
                  <div className="pt-2 space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Update Credentials</p>
                    <div className="grid grid-cols-2 gap-3">
                      <Input type="password" value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder="New Password" fullWidth icon={<Lock size={16} />} />
                      <Input type="password" value={confirmEditPassword} onChange={e => setConfirmEditPassword(e.target.value)} placeholder="Confirm New" fullWidth icon={<Unlock size={16} />} />
                    </div>
                  </div>
                  <Button onClick={handleUpdateUser} fullWidth className="bg-blue-600 text-white font-black py-4 rounded-xl shadow-xl shadow-blue-200">Commit Changes</Button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
      />
    </div>
  );
};

export default AdminUsersTab;
