import React, { useState, useMemo } from 'react';
import { useAdmin } from '../../../contexts/AdminContext';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { useToast } from '../../../contexts/ToastContext';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { Edit, Trash2, Plus, GraduationCap, Search, BookOpen, Calendar, MapPin, XCircle, Loader2 } from 'lucide-react';
import { Subject } from '../../../types';

export const AdminSubjectsTab: React.FC = () => {
  const { subjects = [], addSubject, updateSubject, deleteSubject, classLevels = [], classes = [], isLoading, bulkDeleteSubjects } = useAdmin();
  const { showToast } = showToastContext(); // Wait, I should use useToast()

  function showToastContext() {
    return useToast();
  }

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
    if (!Array.isArray(classLevels)) return [{ value: '', label: 'Select Pathway' }];
    return [
      { value: '', label: 'Select Pathway' },
      ...classLevels.map(cl => ({
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
    });
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

      {/* Select All Toggle */}
      <div className="flex items-center space-x-2 px-2">
        <input
          type="checkbox"
          checked={filteredSubjects.length > 0 && selectedIds.length === filteredSubjects.length}
          onChange={handleSelectAll}
          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Select All {filteredSubjects.length > 0 && `(${filteredSubjects.length})`}</span>
      </div>

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSubjects.length === 0 ? (
          <div className="col-span-full py-20 bg-white/40 backdrop-blur-md rounded-[2.5rem] border border-white/80 border-dashed text-center">
            <GraduationCap size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-500 font-black uppercase tracking-widest">No subjects found</p>
          </div>
        ) : (
          filteredSubjects.map(subject => (
            <Card key={subject.id} className={`group relative border-0 shadow-lg shadow-blue-900/5 backdrop-blur-md hover:shadow-xl transition-all duration-500 rounded-[2rem] overflow-hidden border ${selectedIds.includes(subject.id) ? 'bg-blue-50/80 border-blue-200 ring-2 ring-blue-400 ring-offset-2' : 'bg-white/80 border-white/40'}`}>
              <div className="absolute top-4 left-4 z-10">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(subject.id)}
                  onChange={() => toggleSelection(subject.id)}
                  className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500 bg-white/50 backdrop-blur-sm cursor-pointer"
                />
              </div>
              <div className="p-4 pl-12 bg-slate-50/50 flex justify-between items-center border-b border-slate-100/50">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-blue-600 font-black shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                    {(subject.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-sm truncate max-w-[120px]">{subject.name}</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">Subject Unit</p>
                  </div>
                </div>
                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => toggleEditForm(subject)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-all"><Edit size={14} /></button>
                  <button onClick={() => triggerDelete(subject)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={14} /></button>
                </div>
              </div>

              <CardContent className="p-5 space-y-3">
                <div className="flex items-center text-[10px] font-bold text-slate-500 bg-slate-50/50 p-2 rounded-xl">
                  <MapPin size={10} className="mr-2 text-blue-500" />
                  <span className="truncate">{getClassLevelName(subject.classLevelId)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <Calendar size={10} className="mr-1" />
                    Sem {subject.semester}
                  </div>
                  <div className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-widest">
                    {getClassName(subject.classLevelId)}
                  </div>
                </div>
              </CardContent>

              {editingSubjectId === subject.id && (
                <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-xl p-5 overflow-y-auto animate-in fade-in zoom-in duration-300">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-black text-slate-800 text-sm">Update Subject</h4>
                    <button onClick={() => setEditingSubjectId(null)} className="p-1 text-slate-400 hover:text-red-500"><XCircle size={18} /></button>
                  </div>
                  <div className="space-y-4">
                    <Input value={formData.name || ''} onChange={handleInputChange} name="name" fullWidth placeholder="Name" />
                    <Select options={classLevelOptions} value={formData.classLevelId?.toString() || ''} onChange={val => handleSelectChange('classLevelId', val)} fullWidth />
                    <Select options={semesterOptions} value={formData.semester || '1'} onChange={val => handleSelectChange('semester', val)} fullWidth />
                    <Button onClick={handleUpdateSubject} fullWidth className="bg-blue-600 text-white font-black py-3 rounded-xl shadow-xl shadow-blue-200">Save Changes</Button>
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
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

export default AdminSubjectsTab;
