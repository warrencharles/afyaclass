import React, { useState, useMemo } from 'react';
import { useAdmin } from '../../../contexts/AdminContext';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { useToast } from '../../../contexts/ToastContext';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { Modal } from '../../../components/ui/Modal';
import { Edit, Trash2, Plus, Layers, Search, XCircle, GraduationCap, MapPin, Loader2 } from 'lucide-react';
import { ClassLevel } from '../../../types';
import { naturalSort } from '../../../utils/sorting';

export const AdminClassLevelsTab: React.FC = () => {
  const { classLevels = [], classes = [], addClassLevel, updateClassLevel, deleteClassLevel, isLoading, bulkDeleteClassLevels } = useAdmin();
  const { showToast } = useToast();

  const [isAddFormVisible, setIsAddFormVisible] = useState(false);
  const [editingLevelId, setEditingLevelId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<ClassLevel>>({});
  const [searchTerm, setSearchTerm] = useState('');

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
    if (selectedIds.length === filteredClassLevels.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredClassLevels.map(c => c.id));
    }
  };

  const triggerBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setConfirmModal({
      isOpen: true,
      title: 'Bulk Delete Levels',
      message: `Permanently delete ${selectedIds.length} selected levels? This will affect all associated subjects and materials.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await bulkDeleteClassLevels(selectedIds);
          setSelectedIds([]);
          showToast(`${selectedIds.length} levels deleted successfully`, 'success');
        } catch (error) {
          showToast('Failed to delete some levels', 'error');
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value === '' ? undefined : parseInt(value, 10) }));
  };

  const toggleAddForm = () => {
    if (!isAddFormVisible) setFormData({ name: '', classId: undefined });
    setIsAddFormVisible(!isAddFormVisible);
  };

  const toggleEditForm = (level: ClassLevel) => {
    if (editingLevelId === level.id) setEditingLevelId(null);
    else {
      setEditingLevelId(level.id);
      setFormData({ ...level });
    }
  };

  const triggerDelete = (level: ClassLevel) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Class Level',
      message: `Are you sure you want to delete "${level.name}"? This will affect all associated subjects and materials.`,
      variant: 'danger',
      onConfirm: async () => {
        await deleteClassLevel(level.id);
        showToast('Level purged', 'success');
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleAddLevel = async () => {
    try {
      if (!formData.name || !formData.classId) throw new Error('Data incomplete');
      await addClassLevel(formData as Omit<ClassLevel, 'id'>);
      setIsAddFormVisible(false);
      showToast('New level established!', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleUpdateLevel = async () => {
    try {
      if (!editingLevelId) return;
      await updateClassLevel(editingLevelId, formData);
      setEditingLevelId(null);
      showToast('Level configuration updated', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const getClassName = (classId: number | undefined) => {
    if (!Array.isArray(classes)) return 'Unknown';
    const found = classes.find(c => c.id === classId);
    return found ? found.name : 'Unknown';
  };

  const classOptions = useMemo(() => {
    if (!Array.isArray(classes)) return [{ value: '', label: 'Choose Parent Class' }];
    const sorted = [...classes].sort((a, b) => naturalSort(a.name || '', b.name || ''));
    return [
      { value: '', label: 'Choose Parent Class' },
      ...sorted.map(c => ({ value: c.id.toString(), label: c.name }))
    ];
  }, [classes]);

  const filteredClassLevels = useMemo(() => {
    if (!Array.isArray(classLevels)) return [];
    return classLevels.filter(l => {
      const name = (l.name || '').toLowerCase();
      const cName = getClassName(l.classId).toLowerCase();
      const term = searchTerm.toLowerCase();
      return name.includes(term) || cName.includes(term);
    }).sort((a, b) => naturalSort(a.name || '', b.name || ''));
  }, [classLevels, searchTerm, classes]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="animate-spin h-10 w-10 text-blue-500 mb-4" />
        <p className="text-sm text-slate-500 font-black uppercase tracking-widest">Constructing Paths...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Academic Pathways</h2>
          <p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Manage Class Branches</p>
        </div>
        <button
          onClick={toggleAddForm}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-black transition-all shadow-lg active:scale-95 ${isAddFormVisible ? 'bg-slate-100 text-slate-600' : 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700'
            }`}
        >
          {isAddFormVisible ? <XCircle size={18} /> : <Plus size={18} />}
          <span>{isAddFormVisible ? 'Close' : 'Add Level'}</span>
        </button>
      </div>

      <div className="relative">
        <Input
          placeholder="Filter levels..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-12 bg-white/60 backdrop-blur-md border-transparent rounded-2xl focus:bg-white transition-all shadow-sm"
          icon={<Search size={18} className="text-slate-400" />}
          fullWidth
        />
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center space-x-2 text-red-700 font-bold text-sm">
            <Trash2 size={18} />
            <span>{selectedIds.length} levels selected</span>
          </div>
          <button
            onClick={triggerBulkDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
          >
            Delete Selection
          </button>
        </div>
      )}

      {isAddFormVisible && (
        <div className="bg-white/90 backdrop-blur-xl border border-white/60 rounded-3xl p-6 md:p-8 shadow-2xl animate-in slide-in-from-top-4 duration-300">
          <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center">
            <Layers className="mr-2 text-blue-600" /> Define New Level
          </h3>
          <div className="space-y-4">
            <Input label="Level Identifier" name="name" value={formData.name || ''} onChange={handleInputChange} fullWidth placeholder="e.g. YEAR 2, CMT 5" icon={<GraduationCap size={18} />} />
            <Select label="Parent Class" options={classOptions} value={formData.classId?.toString() || ''} onChange={val => handleSelectChange('classId', val)} fullWidth />
            <Button onClick={handleAddLevel} fullWidth className="py-6 rounded-2xl bg-blue-600 font-black text-lg shadow-xl shadow-blue-200 transition-all active:scale-95">Establish Level</Button>
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
                    checked={filteredClassLevels.length > 0 && selectedIds.length === filteredClassLevels.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-left">Level Name</th>
                <th className="px-4 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-left">Parent Class</th>
                <th className="px-4 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClassLevels.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-400 text-sm">
                    No levels found.
                  </td>
                </tr>
              ) : (
                filteredClassLevels.map(level => (
                  <tr key={level.id} className={`group hover:bg-blue-50/30 transition-colors ${selectedIds.includes(level.id) ? 'bg-blue-50/80' : ''}`}>
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(level.id)}
                        onChange={() => toggleSelection(level.id)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-bold text-slate-800 text-sm">{level.name}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-xs font-bold">
                        {getClassName(level.classId)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => toggleEditForm(level)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><Edit size={14} /></button>
                        <button onClick={() => triggerDelete(level)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Level Modal */}
      <Modal
        isOpen={!!editingLevelId}
        onClose={() => setEditingLevelId(null)}
        title="Modify Level"
        size="md"
      >
        <div className="space-y-4">
          <Input value={formData.name || ''} onChange={handleInputChange} name="name" fullWidth label="Level Name" />
          <Select options={classOptions} value={formData.classId?.toString() || ''} onChange={val => handleSelectChange('classId', val)} fullWidth label="Parent Class" />
          <div className="pt-2 flex gap-3">
            <Button onClick={() => setEditingLevelId(null)} className="flex-1 bg-slate-100 text-slate-600 hover:bg-slate-200">Cancel</Button>
            <Button onClick={handleUpdateLevel} className="flex-1 bg-blue-600 text-white shadow-lg shadow-blue-200">Save Configuration</Button>
          </div>
        </div>
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

export default AdminClassLevelsTab;
