import React, { useState, useMemo } from 'react';
import { useAdmin } from '../../../contexts/AdminContext';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { useToast } from '../../../contexts/ToastContext';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
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

      {/* Select All Toggle */}
      <div className="flex items-center space-x-2 px-2">
        <input
          type="checkbox"
          checked={filteredClassLevels.length > 0 && selectedIds.length === filteredClassLevels.length}
          onChange={handleSelectAll}
          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Select All {filteredClassLevels.length > 0 && `(${filteredClassLevels.length})`}</span>
      </div>

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClassLevels.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white/40 backdrop-blur-md rounded-[2.5rem] border border-white/80 border-dashed">
            <Layers size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-500 font-black uppercase tracking-widest">No routes mapped</p>
          </div>
        ) : filteredClassLevels.map(level => (
          <Card key={level.id} className={`group relative border-0 shadow-lg shadow-blue-900/5 backdrop-blur-md rounded-[2rem] overflow-hidden border ${selectedIds.includes(level.id) ? 'bg-blue-50/80 border-blue-200 ring-2 ring-blue-400 ring-offset-2' : 'bg-white/80 border-white/40'}`}>
            <div className="absolute top-4 left-4 z-10">
              <input
                type="checkbox"
                checked={selectedIds.includes(level.id)}
                onChange={() => toggleSelection(level.id)}
                className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500 bg-white/50 backdrop-blur-sm cursor-pointer"
              />
            </div>
            <div className="p-5 pl-12 flex justify-between items-center text-slate-800">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-black shadow-inner">
                  {(level.name || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-black text-sm">{level.name}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Level Segment</p>
                </div>
              </div>
              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => toggleEditForm(level)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-all"><Edit size={14} /></button>
                <button onClick={() => triggerDelete(level)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={14} /></button>
              </div>
            </div>
            <CardContent className="p-5 pt-0">
              <div className="flex items-center text-[10px] font-black text-slate-500 bg-slate-50/50 p-2.5 rounded-xl">
                <MapPin size={10} className="mr-2 text-blue-500" />
                <span>Class: {getClassName(level.classId)}</span>
              </div>
            </CardContent>

            {editingLevelId === level.id && (
              <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-xl p-5 overflow-y-auto animate-in fade-in zoom-in duration-300">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-black text-slate-800 text-sm">Modify Level</h4>
                  <button onClick={() => setEditingLevelId(null)} className="p-1 text-slate-400 hover:text-red-500"><XCircle size={18} /></button>
                </div>
                <div className="space-y-4">
                  <Input value={formData.name || ''} onChange={handleInputChange} name="name" fullWidth />
                  <Select options={classOptions} value={formData.classId?.toString() || ''} onChange={val => handleSelectChange('classId', val)} fullWidth />
                  <Button onClick={handleUpdateLevel} fullWidth className="bg-blue-600 text-white font-black py-3.5 rounded-xl shadow-xl shadow-blue-200">Save Configuration</Button>
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

export default AdminClassLevelsTab;
