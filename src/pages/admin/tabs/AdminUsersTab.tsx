import React, { useState, useCallback, useMemo } from 'react';
import { useAdmin } from '../../../contexts/AdminContext';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { useToast } from '../../../contexts/ToastContext';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { Modal } from '../../../components/ui/Modal';
import { Edit, Trash2, Lock, Unlock, Search, Mail, Plus, Users, GraduationCap, Building2, UserPlus, XCircle, Loader2, FileSpreadsheet, FileText, Phone } from 'lucide-react';
import { User, Class } from '../../../types';
import { naturalSort } from '../../../utils/sorting';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
      id: cls.id // Add ID for filtering levels
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
      const uPhone = (user.phone || '').toLowerCase();
      const term = searchTerm.toLowerCase();

      const matchesSearch = uName.includes(term) || uEmail.includes(term) || uCol.includes(term) || uPhone.includes(term);
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
        phone: '', // Initialize phone
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
      const allowedFields = [
        'email', 'username', 'role', 'college', 'phone',
        'classType', 'classLevel',
        'hasMaterialAccess'
      ];

      const updatedData: Partial<User> = {};
      allowedFields.forEach(field => {
        if (field in formData) {
          const value = formData[field as keyof User];
          if (value === null) {
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

  const exportToExcel = () => {
    const data = filteredUsers.map(user => ({
      Username: user.username,
      Email: user.email,
      Phone: user.phone || 'N/A',
      College: user.college || 'N/A',
      Role: user.role,
      'Class Type': user.classType,
      'Class Level': user.classLevel,
      'Joined': new Date(user.createdAt || Date.now()).toLocaleDateString()
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');
    XLSX.writeFile(workbook, 'AfyaHub_Users.xlsx');
    showToast('Users exported to Excel', 'success');
  };

  const exportToPDF = () => {
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(18);
    doc.text('AfyaHub Users Directory', 14, 22);
    doc.setFontSize(11);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

    const tableColumn = ["Username", "Email", "Phone", "College", "Role", "Class"];
    const tableRows = filteredUsers.map(user => [
      user.username,
      user.email,
      user.phone || 'N/A',
      user.college || 'N/A',
      user.role,
      `${user.classType} - ${user.classLevel}`
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    });

    doc.save('AfyaHub_Users.pdf');
    showToast('Users exported to PDF', 'success');
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Accounts</h2>
          <p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Platform Membership Management</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportToExcel}
            className="flex items-center space-x-2 px-3 py-2 bg-emerald-600 text-white rounded-xl text-sm font-black transition-all shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-95"
          >
            <FileSpreadsheet size={16} />
            <span>Excel</span>
          </button>
          <button
            onClick={exportToPDF}
            className="flex items-center space-x-2 px-3 py-2 bg-rose-600 text-white rounded-xl text-sm font-black transition-all shadow-lg shadow-rose-200 hover:bg-rose-700 active:scale-95"
          >
            <FileText size={16} />
            <span>PDF</span>
          </button>
          <button
            onClick={toggleAddForm}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-black transition-all shadow-lg active:scale-95 ${isAddFormVisible ? 'bg-slate-100 text-slate-600' : 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700'
              }`}
          >
            {isAddFormVisible ? <XCircle size={18} /> : <Plus size={18} />}
            <span>{isAddFormVisible ? 'Close' : 'Add User'}</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-2 bg-white/40 backdrop-blur-md p-2 rounded-2xl border border-blue-50 shadow-sm">
        <div className="relative flex-1">
          <Input
            placeholder="Search by name, email, phone..."
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

      {/* Select All Toggle logic is now inside the table header */}

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
              <Input label="Phone Number" name="phone" value={formData.phone || ''} onChange={handleInputChange} fullWidth placeholder="+255..." icon={<Phone size={18} />} />
              <Input label="College" name="college" value={formData.college || ''} onChange={handleInputChange} fullWidth placeholder="Medical College" icon={<Building2 size={18} />} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Class Scope and Level Segment */}
              <div className="grid grid-cols-2 gap-2">
                <Select label="Role" options={roleOptions} value={formData.role || 'student'} onChange={val => handleSelectChange('role', val)} fullWidth />
                <Select label="Type" options={classTypeOptions} value={formData.classType || ''} onChange={val => handleSelectChange('classType', val)} fullWidth />
              </div>
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

      {/* Table View */}
      <div className="bg-white/60 backdrop-blur-md border border-white/40 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-4 text-left w-12">
                  <input
                    type="checkbox"
                    checked={filteredUsers.length > 0 && selectedIds.length === filteredUsers.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-left">User</th>
                <th className="px-4 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-left">Contact Info</th>
                <th className="px-4 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-left">Academic Info</th>
                <th className="px-4 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-left">Status</th>
                <th className="px-4 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map(user => (
                <tr key={user.id} className={`group hover:bg-blue-50/30 transition-colors ${selectedIds.includes(user.id) ? 'bg-blue-50/80' : ''}`}>
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(user.id)}
                      onChange={() => toggleSelection(user.id)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 font-black text-xs">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-sm">{user.username}</div>
                        <div className="text-[10px] text-slate-500 font-medium">ID: {user.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center text-xs text-slate-600">
                        <Mail size={12} className="mr-1.5 text-blue-400" />
                        {user.email}
                      </div>
                      <div className="flex items-center text-xs text-slate-600">
                        <Phone size={12} className="mr-1.5 text-emerald-400" />
                        {user.phone || <span className="text-slate-300 italic">No phone</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center text-xs text-slate-600">
                        <Building2 size={12} className="mr-1.5 text-indigo-400" />
                        <span className="truncate max-w-[150px]">{user.college || 'N/A'}</span>
                      </div>
                      <div className="flex items-center text-[10px] text-slate-400 uppercase tracking-wide">
                        <GraduationCap size={12} className="mr-1.5" />
                        {user.classType} • {user.classLevel}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${user.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-600'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => toggleEditForm(user)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><Edit size={14} /></button>
                      <button onClick={() => triggerDelete(user)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">
                    No users found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Modal */}
      <Modal
        isOpen={!!editingUserId && !!selectedUser}
        onClose={() => setEditingUserId(null)}
        title={selectedUser ? `Edit User: ${selectedUser.username}` : 'Edit User'}
        size="lg"
      >
        {selectedUser && (
          <div className="space-y-4">
            <Input value={formData.username || ''} onChange={handleInputChange} name="username" fullWidth placeholder="Username" label="Username" />
            <Input value={formData.email || ''} onChange={handleInputChange} name="email" fullWidth placeholder="Email" label="Email" />
            <Input value={formData.phone || ''} onChange={handleInputChange} name="phone" fullWidth placeholder="Phone Number" label="Phone Number" icon={<Phone size={16} />} />

            <div className="grid grid-cols-2 gap-3">
              <Input value={formData.college || ''} onChange={handleInputChange} name="college" fullWidth placeholder="College" icon={<Building2 size={16} />} label="College" />
              <Select options={roleOptions} value={formData.role || ''} onChange={v => handleSelectChange('role', v)} fullWidth label="Role" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select options={classTypeOptions} value={formData.classType || ''} onChange={val => handleSelectChange('classType', val)} fullWidth label="Class Type" />
              <Select options={filteredClassLevelOptions(formData.classType)} value={formData.classLevel || ''} onChange={val => handleSelectChange('classLevel', val)} fullWidth label="Level" />
            </div>
            <div className="pt-4 space-y-3 border-t border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Update Password (Optional)</p>
              <div className="grid grid-cols-2 gap-3">
                <Input type="password" value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder="New Password" fullWidth icon={<Lock size={16} />} />
                <Input type="password" value={confirmEditPassword} onChange={e => setConfirmEditPassword(e.target.value)} placeholder="Confirm New" fullWidth icon={<Unlock size={16} />} />
              </div>
            </div>
            <div className="pt-4 flex gap-3">
              <Button onClick={() => setEditingUserId(null)} className="flex-1 bg-slate-100 text-slate-600 hover:bg-slate-200" >Cancel</Button>
              <Button onClick={handleUpdateUser} className="flex-1 bg-blue-600 text-white shadow-lg shadow-blue-200">Save Changes</Button>
            </div>
          </div>
        )}
      </Modal>

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
