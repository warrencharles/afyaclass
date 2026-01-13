import React, { useState, useMemo } from 'react';
import { useAdmin } from '../../../contexts/AdminContext';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useToast } from '../../../contexts/ToastContext';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { Modal } from '../../../components/ui/Modal';
import { Edit, Trash2, Plus, BookOpen, Search, Layers, Hash, XCircle, Loader2 } from 'lucide-react';
import { Class } from '../../../types';
import { naturalSort } from '../../../utils/sorting';

const MAX_DESCRIPTION_LENGTH = 100;

export const AdminClassesTab: React.FC = () => {
  const { classes = [], addClass, updateClass, deleteClass, isLoading, bulkDeleteClasses } = useAdmin();
  const { showToast } = useToast();

  const [isAddFormVisible, setIsAddFormVisible] = useState(false);
  const [editingClassId, setEditingClassId] = useState<number | null>(null);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [formData, setFormData] = useState<Partial<Class>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<number, boolean>>({});

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
    if (selectedIds.length === filteredClasses.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredClasses.map(c => c.id));
    }
  };

  const triggerBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setConfirmModal({
      isOpen: true,
      title: 'Bulk Delete Classes',
      message: `Permanently delete ${selectedIds.length} selected classes? This will affect all associated levels and materials.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await bulkDeleteClasses(selectedIds);
          setSelectedIds([]);
          showToast(`${selectedIds.length} classes deleted successfully`, 'success');
        } catch (error) {
          showToast('Failed to delete some classes', 'error');
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const filteredClasses = useMemo(() => {
    if (!Array.isArray(classes)) return [];
    return classes.filter(classItem => {
      const name = (classItem.name || '').toLowerCase();
      const code = (classItem.classCode || '').toLowerCase();
      const term = searchTerm.toLowerCase();
      return name.includes(term) || code.includes(term);
    }).sort((a, b) => naturalSort(a.name || '', b.name || ''));
  }, [classes, searchTerm]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleDescriptionExpansion = (classId: number) => {
    setExpandedDescriptions(prev => ({ ...prev, [classId]: !prev[classId] }));
  };

  const toggleAddForm = () => {
    if (!isAddFormVisible) {
      setFormData({ name: '', description: '' });
    }
    setIsAddFormVisible(prev => !prev);
  };

  const toggleEditForm = (classItem: Class) => {
    if (editingClassId === classItem.id) {
      setEditingClassId(null);
    } else {
      setEditingClassId(classItem.id);
      setSelectedClass(classItem);
      setFormData({ ...classItem });
    }
  };

  const triggerDelete = (classItem: Class) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Class',
      message: `Permanently remove "${classItem.name}"? This will affect all associated levels and materials.`,
      variant: 'danger',
      onConfirm: async () => {
        await deleteClass(classItem.id);
        showToast('Class deleted', 'success');
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleAddClass = async () => {
    try {
      if (!formData.name || !formData.classCode) throw new Error('Name and Code required');
      await addClass(formData as Omit<Class, 'id'>);
      setIsAddFormVisible(false);
      showToast('Class added!', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleUpdateClass = async () => {
    try {
      if (!selectedClass) return;
      await updateClass(selectedClass.id, formData);
      setEditingClassId(null);
      showToast('Class updated!', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="animate-spin h-10 w-10 text-blue-500 mb-4" />
        <p className="text-sm text-slate-500 font-black uppercase tracking-widest">Loading Academic Paths...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">System Classes</h2>
          <p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Manage academic programs</p>
        </div>
        <button
          onClick={toggleAddForm}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-black transition-all shadow-lg active:scale-95 ${isAddFormVisible ? 'bg-slate-100 text-slate-600' : 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700'
            }`}
        >
          {isAddFormVisible ? <XCircle size={18} /> : <Plus size={18} />}
          <span>{isAddFormVisible ? 'Close' : 'Add Class'}</span>
        </button>
      </div>

      <div className="relative">
        <Input
          placeholder="Search classes..."
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
            <span>{selectedIds.length} classes selected</span>
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
            <Layers className="mr-2 text-blue-600" /> New Category Entry
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Short Code" name="classCode" value={formData.classCode || ''} onChange={handleInputChange} fullWidth placeholder="e.g. CMT" icon={<Hash size={18} />} />
              <Input label="Program Name" name="name" value={formData.name || ''} onChange={handleInputChange} fullWidth placeholder="Clinical Medicine" icon={<BookOpen size={18} />} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Detail Summary</label>
              <textarea
                name="description"
                value={formData.description || ''}
                onChange={handleInputChange}
                rows={3}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all font-sans"
                placeholder="What is this program about?"
              />
            </div>
            <Button onClick={handleAddClass} fullWidth className="py-6 rounded-2xl bg-blue-600 font-black text-lg shadow-xl shadow-blue-200 transition-all active:scale-[0.98]">
              Initialize Program
            </Button>
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
                    checked={filteredClasses.length > 0 && selectedIds.length === filteredClasses.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-left">Code</th>
                <th className="px-4 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-left">Program Name</th>
                <th className="px-4 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-left">Description</th>
                <th className="px-4 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClasses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-400 text-sm">
                    No classes found.
                  </td>
                </tr>
              ) : (
                filteredClasses.map(classItem => (
                  <tr key={classItem.id} className={`group hover:bg-blue-50/30 transition-colors ${selectedIds.includes(classItem.id) ? 'bg-blue-50/80' : ''}`}>
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(classItem.id)}
                        onChange={() => toggleSelection(classItem.id)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-black text-slate-700 text-sm">{classItem.classCode}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-bold text-slate-800 text-sm">{classItem.name}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-xs text-slate-500 max-w-xs">
                        {classItem.description ? (
                          <>
                            {expandedDescriptions[classItem.id]
                              ? classItem.description
                              : `${classItem.description.substring(0, MAX_DESCRIPTION_LENGTH)}${classItem.description.length > MAX_DESCRIPTION_LENGTH ? '...' : ''}`}
                            {classItem.description.length > MAX_DESCRIPTION_LENGTH && (
                              <button onClick={() => toggleDescriptionExpansion(classItem.id)} className="ml-1 text-blue-600 font-bold hover:underline">
                                {expandedDescriptions[classItem.id] ? '(less)' : '(more)'}
                              </button>
                            )}
                          </>
                        ) : <span className="text-slate-300 italic">No description</span>}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => toggleEditForm(classItem)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><Edit size={14} /></button>
                        <button onClick={() => triggerDelete(classItem)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Class Modal */}
      <Modal
        isOpen={!!editingClassId}
        onClose={() => setEditingClassId(null)}
        title="Update Program"
        size="md"
      >
        <div className="space-y-4">
          <Input value={formData.classCode || ''} onChange={handleInputChange} name="classCode" fullWidth placeholder="Code" label="Short Code" />
          <Input value={formData.name || ''} onChange={handleInputChange} name="name" fullWidth placeholder="Name" label="Program Name" />
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Description</label>
            <textarea value={formData.description || ''} onChange={handleInputChange} name="description" rows={4} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
          </div>
          <div className="pt-2 flex gap-3">
            <Button onClick={() => setEditingClassId(null)} className="flex-1 bg-slate-100 text-slate-600 hover:bg-slate-200">Cancel</Button>
            <Button onClick={handleUpdateClass} className="flex-1 bg-blue-600 text-white shadow-lg shadow-blue-200">Save Changes</Button>
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

export default AdminClassesTab;
