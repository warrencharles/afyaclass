import React, { useState, useMemo } from 'react';
import { useAdmin } from '../../../contexts/AdminContext';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { useToast } from '../../../contexts/ToastContext';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { Modal } from '../../../components/ui/Modal';
import { Edit, Trash2, Plus, GraduationCap, Search, BookOpen, Loader2, MapPin, XCircle } from 'lucide-react';
import { Subject } from '../../../types';
import { naturalSort } from '../../../utils/sorting';

export const AdminSubjectsTab: React.FC = () => {
  const { subjects = [], addSubject, updateSubject, deleteSubject, classLevels = [], classes = [], isLoading, bulkDeleteSubjects } = useAdmin();

  const { showToast } = useToast();

  const [isAddFormVisible, setIsAddFormVisible] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState<Partial<Subject>>({});
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
    if (selectedIds.length === filteredSubjects.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredSubjects.map(c => c.id));
    }
  };

  const triggerBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setConfirmModal({
      isOpen: true,
      title: 'Bulk Delete Subjects',
      message: `Permanently delete ${selectedIds.length} selected subjects? This will remove all materials linked to these subjects.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await bulkDeleteSubjects(selectedIds);
          setSelectedIds([]);
          showToast(`${selectedIds.length} subjects deleted successfully`, 'success');
        } catch (error) {
          showToast('Failed to delete some subjects', 'error');
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
    setFormData(prev => ({ ...prev, [name]: name === 'semester' ? value : parseInt(value, 10) }));
  };

  const toggleAddForm = () => {
    if (!isAddFormVisible) {
      setFormData({ name: '', classLevelId: undefined, semester: '1' });
    }
    setIsAddFormVisible(prev => !prev);
  };

  const toggleEditForm = (subject: Subject) => {
    if (editingSubjectId === subject.id) {
      setEditingSubjectId(null);
    } else {
      setEditingSubjectId(subject.id);
      setSelectedSubject(subject);
      setFormData({ ...subject, semester: subject.semester ?? '1' });
    }
  };

  const triggerDelete = (subject: Subject) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Subject',
      message: `Permanently delete "${subject.name}"? This will remove all materials linked to this subject.`,
      variant: 'danger',
      onConfirm: async () => {
        await deleteSubject(subject.id);
        showToast('Subject removed', 'success');
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleAddSubject = async () => {
    try {
      if (!formData.name || formData.classLevelId === undefined) throw new Error('Incomplete data');
      await addSubject(formData as Omit<Subject, 'id'>);
      setIsAddFormVisible(false);
      showToast('Subject registered!', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleUpdateSubject = async () => {
    try {
      if (!selectedSubject || formData.classLevelId === undefined) return;
      await updateSubject(selectedSubject.id, formData);
      setEditingSubjectId(null);
      showToast('Subject updated!', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const getClassLevelName = (classLevelId: number | undefined) => {
    if (classLevelId === undefined || !Array.isArray(classLevels)) return 'N/A';
    const classLevel = classLevels.find(cl => cl.id === classLevelId);
    return classLevel ? classLevel.name : 'N/A';
  };

  const getClassName = (classLevelId: number | undefined) => {
    if (classLevelId === undefined || !Array.isArray(classLevels) || !Array.isArray(classes)) return 'N/A';
    const classLevel = classLevels.find(cl => cl.id === classLevelId);
    if (!classLevel) return 'N/A';
    const classItem = classes.find(c => c.id === classLevel.classId);
    return classItem ? classItem.name : 'N/A';
  };

  const classLevelOptions = useMemo(() => {
    const sorted = [...classLevels].sort((a, b) => naturalSort(a.name || '', b.name || ''));
    return [
      { value: '', label: 'Select Pathway' },
      ...sorted.map(cl => ({
        value: cl.id.toString(),
        label: `${cl.name} - ${getClassName(cl.id)}`,
      }))
    ];
  }, [classLevels, classes]);

  const semesterOptions = [
    { value: '1', label: 'Semester 1' },
    { value: '2', label: 'Semester 2' }
  ];

  const filteredSubjects = useMemo(() => {
    if (!Array.isArray(subjects)) return [];
    return subjects.filter(subject => {
      const name = (subject.name || '').toLowerCase();
      const levelName = getClassLevelName(subject.classLevelId).toLowerCase();
      const term = searchTerm.toLowerCase();
      return name.includes(term) || levelName.includes(term);
    }).sort((a, b) => naturalSort(a.name || '', b.name || ''));
  }, [subjects, searchTerm, classLevels]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="animate-spin h-10 w-10 text-blue-500 mb-4" />
        <p className="text-sm text-slate-500 font-black uppercase tracking-widest">Syllabus Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Curriculum</h2>
          <p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Manage academic subjects</p>
        </div>
        <button
          onClick={toggleAddForm}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-black transition-all shadow-lg active:scale-95 ${isAddFormVisible ? 'bg-slate-100 text-slate-600' : 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700'
            }`}
        >
          {isAddFormVisible ? <XCircle size={18} /> : <Plus size={18} />}
          <span>{isAddFormVisible ? 'Close' : 'Add Subject'}</span>
        </button>
      </div>

      <div className="relative">
        <Input
          placeholder="Search curriculum..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-12 bg-white/60 backdrop-blur-md border-transparent rounded-2xl focus:bg-white shadow-sm"
          icon={<Search size={18} className="text-slate-400" />}
          fullWidth
        />
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center space-x-2 text-red-700 font-bold text-sm">
            <Trash2 size={18} />
            <span>{selectedIds.length} subjects selected</span>
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
            <GraduationCap className="mr-2 text-blue-600" /> New Subject Entry
          </h3>
          <div className="space-y-4">
            <Input label="Subject Name" name="name" value={formData.name || ''} onChange={handleInputChange} fullWidth placeholder="e.g. Clinical Pharmacology" icon={<BookOpen size={18} />} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select label="Class Level" options={classLevelOptions} value={formData.classLevelId?.toString() || ''} onChange={val => handleSelectChange('classLevelId', val)} fullWidth />
              <Select label="Semester" options={semesterOptions} value={formData.semester || '1'} onChange={val => handleSelectChange('semester', val)} fullWidth />
            </div>
            <Button onClick={handleAddSubject} fullWidth className="py-6 rounded-2xl bg-blue-600 font-black text-lg shadow-xl shadow-blue-200">Register Subject</Button>
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
                    checked={filteredSubjects.length > 0 && selectedIds.length === filteredSubjects.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-left">Subject Name</th>
                <th className="px-4 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-left">Class Level</th>
                <th className="px-4 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-left">Semester</th>
                <th className="px-4 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSubjects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-400 text-sm">
                    No subjects found.
                  </td>
                </tr>
              ) : (
                filteredSubjects.map(subject => (
                  <tr key={subject.id} className={`group hover:bg-blue-50/30 transition-colors ${selectedIds.includes(subject.id) ? 'bg-blue-50/80' : ''}`}>
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(subject.id)}
                        onChange={() => toggleSelection(subject.id)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-black text-slate-800 text-sm">{subject.name}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center text-xs font-bold text-slate-500">
                        <MapPin size={12} className="mr-1.5 text-blue-400" />
                        {getClassLevelName(subject.classLevelId)}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs font-bold text-slate-600">Sem {subject.semester}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => toggleEditForm(subject)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><Edit size={14} /></button>
                        <button onClick={() => triggerDelete(subject)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Subject Modal */}
      <Modal
        isOpen={!!editingSubjectId}
        onClose={() => setEditingSubjectId(null)}
        title="Update Subject"
        size="md"
      >
        <div className="space-y-4">
          <Input value={formData.name || ''} onChange={handleInputChange} name="name" fullWidth placeholder="Name" label="Subject Name" />
          <Select options={classLevelOptions} value={formData.classLevelId?.toString() || ''} onChange={val => handleSelectChange('classLevelId', val)} fullWidth label="Class Level" />
          <Select options={semesterOptions} value={formData.semester || '1'} onChange={val => handleSelectChange('semester', val)} fullWidth label="Semester" />
          <div className="pt-2 flex gap-3">
            <Button onClick={() => setEditingSubjectId(null)} className="flex-1 bg-slate-100 text-slate-600 hover:bg-slate-200">Cancel</Button>
            <Button onClick={handleUpdateSubject} className="flex-1 bg-blue-600 text-white shadow-lg shadow-blue-200">Save Changes</Button>
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

export default AdminSubjectsTab;
