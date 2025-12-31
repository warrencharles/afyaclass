import React, { useState, useMemo } from 'react';
import { useAdmin } from '../../../contexts/AdminContext';
import { useContent } from '../../../contexts/ContentContext';
import { useAuth } from '../../../contexts/AuthContext';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { useToast } from '../../../contexts/ToastContext';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { Trash2, FileText, Book, Clock, ClipboardList, Plus, Search, BookOpen, Video, MapPin, ShieldPlus, Edit, UploadCloud, XCircle, CheckCircle, Loader2, Eye } from 'lucide-react';
import { ContentType, Content } from '../../../types';
import { Modal } from '../../../components/ui/Modal';
import PDFViewer from '../../../components/ui/PDFViewer';
import { ProgressiveImage } from '../../../components/ui/ProgressiveImage';
import { GenericVideoPlayer } from '../../../components/ui/GenericVideoPlayer';
import { API_BASE_URL } from '../../../utils/api';

export const AdminContentTab: React.FC = () => {
  const { subjects = [], classes = [], classLevels = [], isLoading: isAdminLoading } = useAdmin();
  const { contents = [], addContent, updateContent, deleteContent, isLoading: isContentLoading, bulkDeleteContent } = useContent();
  const { user } = useAuth();
  const { showToast } = useToast();

  const isLoading = isAdminLoading || isContentLoading;

  const [isAddFormVisible, setIsAddFormVisible] = useState(false);
  const [editingContentId, setEditingContentId] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [selectedContentType, setSelectedContentType] = useState<ContentType | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [alert, setAlert] = useState<{ variant: 'success' | 'error', message: string } | null>(null);

  // Modal states
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

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredContents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredContents.map(c => c.id));
    }
  };

  const triggerBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setConfirmModal({
      isOpen: true,
      title: 'Bulk Delete Content',
      message: `Permanently delete ${selectedIds.length} items? This cannot be undone.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await bulkDeleteContent(selectedIds);
          setSelectedIds([]);
          showToast(`${selectedIds.length} items deleted`, 'success');
        } catch (error) {
          showToast('Failed to delete some items', 'error');
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const [formData, setFormData] = useState({
    title: '',
    classId: undefined as number | undefined,
    classLevelId: undefined as number | undefined,
    semester: null as string | null,
    subjectId: undefined as number | undefined,
    type: 'note' as ContentType,
    videoUrl: null as string | null,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFileForView, setSelectedFileForView] = useState<{ title: string; url?: string; videoUrl?: string | null; type: 'pdf' | 'image' | 'video' } | null>(null);
  const [selectedFileForUpload, setSelectedFileForUpload] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadErrorMessage, setUploadErrorMessage] = useState<string>('');
  const [contentFormat, setContentFormat] = useState<'file' | 'video'>('file');

  const toggleAddForm = () => {
    setIsAddFormVisible(prev => {
      if (prev) {
        setSelectedFileForUpload(null);
        setUploadProgress(0);
        setIsUploading(false);
        setUploadErrorMessage('');
      }
      return !prev;
    });
    resetForm();
    setAlert(null);
    setEditingContentId(null);
  };

  const toggleEditForm = (contentItem: Content) => {
    if (editingContentId === contentItem.id) {
      setEditingContentId(null);
      resetForm();
    } else {
      if (editingContentId !== null) {
        setEditingContentId(null);
      }
      setEditingContentId(contentItem.id);
      setSelectedContent(contentItem);
      setFormData({
        title: contentItem.title,
        classId: contentItem.classId || undefined,
        classLevelId: contentItem.classLevelId || undefined,
        semester: contentItem.semester ?? null,
        subjectId: contentItem.subjectId || undefined,
        type: contentItem.type,
        videoUrl: contentItem.videoUrl || null,
      });
      setContentFormat(contentItem.videoUrl ? 'video' : 'file');
      setSelectedFileForUpload(null);
      setUploadProgress(0);
      setUploadErrorMessage('');
    }
  };

  const contentTypes = [
    { value: 'all', label: 'All Content' },
    { value: 'note', label: 'Notes' },
    { value: 'book', label: 'Books' },
    { value: 'nactvet', label: 'NACTVET Tools' },
    { value: 'exam', label: 'Exams' },
    { value: 'examGuide', label: 'Exam Guides' },
    { value: 'video', label: 'Video Tutorials' },
    { value: 'practical', label: 'Practicals' },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: keyof typeof formData, value: string) => {
    setFormData(prev => {
      const newData = { ...prev };
      if (name === 'classId' || name === 'classLevelId' || name === 'subjectId') {
        (newData[name] as number | undefined) = value === '' ? undefined : parseInt(value);
      } else if (name === 'semester') {
        (newData[name] as string | null) = value === '' ? null : value;
      } else if (name === 'type') {
        (newData[name] as ContentType) = value as ContentType;
        if (value === 'video') {
          setSelectedFileForUpload(null);
          setContentFormat('video');
        } else {
          newData.videoUrl = null;
          setContentFormat('file');
        }
      }

      if (name === 'classId') {
        newData.classLevelId = undefined;
        newData.semester = null;
        newData.subjectId = undefined;
      }
      if (name === 'classLevelId' || name === 'semester') {
        newData.subjectId = undefined;
      }

      return newData;
    });
  };

  const getContentTypeIcon = (type: ContentType) => {
    switch (type) {
      case 'note': return <FileText className="h-4 w-4 text-blue-500" />;
      case 'book': return <Book className="h-4 w-4 text-indigo-500" />;
      case 'nactvet': return <ShieldPlus className="h-4 w-4 text-amber-500" />;
      case 'exam': return <Clock className="h-4 w-4 text-orange-500" />;
      case 'examGuide': return <ClipboardList className="h-4 w-4 text-rose-500" />;
      case 'video': return <Video className="h-4 w-4 text-red-500" />;
      case 'practical': return <BookOpen className="h-4 w-4 text-emerald-500" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getSubjectName = (subjectId: number | undefined) => {
    if (subjectId === undefined || !Array.isArray(subjects)) return 'N/A';
    return subjects.find(s => s.id === subjectId)?.name || 'N/A';
  };

  const classOptions = useMemo(() => {
    if (!Array.isArray(classes)) return [{ value: '', label: 'Select Class' }];
    return [
      { value: '', label: 'Select Class' },
      ...classes.map(c => ({ value: c.id.toString(), label: c.name }))
    ];
  }, [classes]);

  const classLevelOptions = useMemo(() => {
    if (!Array.isArray(classLevels)) return [{ value: '', label: 'Select Level' }];
    return [
      { value: '', label: 'Select Level' },
      ...classLevels
        .filter(level => level.classId === formData.classId)
        .map(level => ({ value: level.id.toString(), label: level.name }))
    ];
  }, [classLevels, formData.classId]);

  const semesterOptions = [
    { value: '', label: 'Select Semester' },
    { value: '1', label: 'Semester 1' },
    { value: '2', label: 'Semester 2' },
  ];

  const subjectOptions = useMemo(() => {
    if (!Array.isArray(subjects)) return [{ value: '', label: 'Select Subject' }];
    const filtered = subjects.filter(subject => {
      const matchesClassLevel = formData.classLevelId === undefined || subject.classLevelId === formData.classLevelId;
      const matchesSemester = formData.semester === null
        ? (subject.semester === null || subject.semester === '')
        : subject.semester === formData.semester;
      return matchesClassLevel && matchesSemester;
    }).map(subject => ({ value: subject.id.toString(), label: subject.name }));

    return [{ value: '', label: 'Select Subject' }, ...filtered];
  }, [subjects, formData.classLevelId, formData.semester]);

  const filteredContents = useMemo(() => {
    if (!Array.isArray(contents)) return [];
    return contents.filter(content => {
      const matchesType = selectedContentType === 'all' || content.type === selectedContentType;
      const title = (content.title || '').toLowerCase();
      const sName = getSubjectName(content.subjectId).toLowerCase();
      const term = searchTerm.toLowerCase();
      const matchesSearch = title.includes(term) || sName.includes(term);
      return matchesType && matchesSearch;
    });
  }, [contents, selectedContentType, searchTerm, subjects]);

  const resetForm = () => {
    setFormData({
      title: '',
      classId: undefined,
      classLevelId: undefined,
      semester: null,
      subjectId: undefined,
      type: 'note',
      videoUrl: null,
    });
    setSelectedFileForUpload(null);
    setUploadProgress(0);
    setUploadErrorMessage('');
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        setSelectedFileForUpload(file);
        setUploadErrorMessage('');
      } else {
        showToast('Only PDF and image files allowed', 'error');
      }
    }
  };

  const uploadFileToServer = async (file: File): Promise<{ filePath: string; originalFileName: string }> => {
    setIsUploading(true);
    const apiFormData = new FormData();
    apiFormData.append('file', file);
    try {
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user?.token}` },
        body: apiFormData,
      });
      if (!response.ok) throw new Error('Upload failed');
      const data = await response.json();
      setUploadProgress(100);
      return { filePath: data.filePath, originalFileName: data.originalFileName };
    } catch (error: any) {
      showToast(error.message, 'error');
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddContent = async () => {
    try {
      if (!formData.title || !formData.classId || !formData.subjectId) throw new Error('Missing required fields');
      let contentPayload: any = { ...formData, uploadedBy: user!.id };

      if (contentFormat === 'video') {
        if (!formData.videoUrl) throw new Error('Video URL missing');
        contentPayload.fileType = 'video';
      } else {
        if (!selectedFileForUpload) throw new Error('No file selected');
        const { filePath, originalFileName } = await uploadFileToServer(selectedFileForUpload);
        contentPayload.fileUrl = filePath;
        contentPayload.originalFileName = originalFileName;
        contentPayload.fileType = selectedFileForUpload.type.startsWith('image/') ? 'image' : 'pdf';
      }

      await addContent(contentPayload);
      setIsAddFormVisible(false);
      resetForm();
      showToast('Content added successfully!', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleUpdateContent = async () => {
    try {
      if (!selectedContent) return;
      let updateData: Partial<Content> = { ...formData, uploadedBy: user?.id };

      if (contentFormat === 'video') {
        updateData.fileType = 'video';
        updateData.fileUrl = undefined;
      } else if (selectedFileForUpload) {
        const { filePath, originalFileName } = await uploadFileToServer(selectedFileForUpload);
        updateData.fileUrl = filePath;
        updateData.originalFileName = originalFileName;
        updateData.fileType = selectedFileForUpload.type.startsWith('image/') ? 'image' : 'pdf';
        updateData.videoUrl = null;
      }

      await updateContent(selectedContent.id, updateData);
      setEditingContentId(null);
      setSelectedContent(null);
      showToast('Content updated successfully!', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const triggerDelete = (content: Content) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Content',
      message: `Permanently delete "${content.title}"? This action cannot be reversed.`,
      variant: 'danger',
      onConfirm: async () => {
        await deleteContent(content.id);
        showToast('Content deleted', 'success');
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleViewEdit = (content: Content) => {
    if (content.type === 'video') {
      setSelectedFileForView({ title: content.title, videoUrl: content.videoUrl, type: 'video' });
    } else {
      let fullFileUrl = content.fileUrl || '';
      if (fullFileUrl && !fullFileUrl.startsWith('http')) {
        fullFileUrl = `${API_BASE_URL}/${fullFileUrl}`;
      }
      setSelectedFileForView({ title: content.title, url: fullFileUrl, type: content.fileType || 'pdf' });
    }
    setIsModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="animate-spin h-10 w-10 text-blue-500 mb-4" />
        <p className="text-sm text-slate-500 font-black uppercase tracking-widest">Cataloging Materials...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Content Library</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Manage educational materials</p>
        </div>
        <button
          onClick={toggleAddForm}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-black transition-all shadow-lg active:scale-95 ${isAddFormVisible ? 'bg-slate-100 text-slate-600' : 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700'
            }`}
        >
          {isAddFormVisible ? <XCircle size={18} /> : <Plus size={18} />}
          <span>{isAddFormVisible ? 'Close' : 'Add Content'}</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white/50 backdrop-blur-md p-2 rounded-2xl border border-blue-50 shadow-sm flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Input
            placeholder="Search materials..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 bg-white/60 border-transparent rounded-xl focus:bg-white"
            icon={<Search size={18} className="text-slate-400" />}
            fullWidth
          />
        </div>
        <div className="flex overflow-x-auto no-scrollbar gap-2 px-1">
          {contentTypes.map(type => (
            <button
              key={type.value}
              onClick={() => setSelectedContentType(type.value as any)}
              className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all ${selectedContentType === type.value
                ? 'bg-blue-50 text-blue-600 border border-blue-100'
                : 'text-slate-500 hover:bg-slate-50'
                }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center space-x-2 text-red-700 font-bold text-sm">
            <Trash2 size={18} />
            <span>{selectedIds.length} items selected</span>
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
          checked={filteredContents.length > 0 && selectedIds.length === filteredContents.length}
          onChange={handleSelectAll}
          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Select All {filteredContents.length > 0 && `(${filteredContents.length})`}</span>
      </div>

      {isAddFormVisible && (
        <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-6 md:p-8 shadow-2xl animate-in slide-in-from-top-4 duration-300">
          <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center">
            <Plus className="mr-2 text-blue-600" /> New Content Entry
          </h3>
          <div className="space-y-6">
            <Input label="Title" name="title" value={formData.title || ''} onChange={handleInputChange} fullWidth placeholder="e.g. Organic Chemistry Notes" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select label="Class" options={classOptions} value={formData.classId?.toString() || ''} onChange={val => handleSelectChange('classId', val)} fullWidth />
              <Select label="Level" options={classLevelOptions} value={formData.classLevelId?.toString() || ''} onChange={val => handleSelectChange('classLevelId', val)} fullWidth />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select label="Semester" options={semesterOptions} value={formData.semester || ''} onChange={val => handleSelectChange('semester', val)} fullWidth />
              <Select label="Subject" options={subjectOptions} value={formData.subjectId?.toString() || ''} onChange={val => handleSelectChange('subjectId', val)} fullWidth />
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Resource Type</label>
              <div className="flex gap-2">
                <Select
                  options={[
                    { value: 'note', label: 'Notes' },
                    { value: 'book', label: 'Books' },
                    { value: 'video', label: 'Video Tutorials' },
                    { value: 'practical', label: 'Practicals' },
                    { value: 'exam', label: 'Exams' },
                    { value: 'examGuide', label: 'Exam Guides' },
                    { value: 'nactvet', label: 'NACTVET Tools' }
                  ]}
                  value={formData.type}
                  onChange={val => handleSelectChange('type', val)}
                  fullWidth
                />
              </div>
            </div>

            {formData.type === 'video' ? (
              <Input label="Video URL" value={formData.videoUrl || ''} onChange={handleInputChange} name="videoUrl" fullWidth placeholder="Paste link here..." icon={<Video size={18} />} />
            ) : (
              <div
                onClick={() => document.getElementById('fileUpload')?.click()}
                className="border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center hover:bg-blue-50/50 hover:border-blue-300 transition-all group cursor-pointer"
              >
                <input type="file" id="fileUpload" className="hidden" onChange={handleFileChange} />
                <UploadCloud className="mx-auto h-10 w-10 text-slate-300 group-hover:text-blue-500 mb-3" />
                <p className="text-sm font-black text-slate-600">{selectedFileForUpload ? selectedFileForUpload.name : 'Upload PDF or Image'}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Maximum size 10MB</p>
              </div>
            )}

            <Button onClick={handleAddContent} fullWidth className="py-6 rounded-2xl bg-blue-600 text-white font-black text-lg shadow-xl shadow-blue-200 active:scale-95 transition-all">
              {isUploading ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="mr-2" />}
              Publish Content
            </Button>
          </div>
        </div>
      )}

      {/* Content Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredContents.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white/40 backdrop-blur-md rounded-[2rem] border border-white/80 border-dashed">
            <BookOpen size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-500 font-black uppercase tracking-widest">No resources found</p>
          </div>
        ) : filteredContents.map(content => (
          <Card key={content.id} className={`group relative border-0 shadow-lg shadow-blue-900/5 bg-white hover:shadow-xl transition-all duration-500 rounded-[2rem] overflow-hidden border ${selectedIds.includes(content.id) ? 'bg-blue-50/80 border-blue-200 ring-2 ring-blue-400 ring-offset-2' : 'border-slate-100'}`}>
            <div className="p-2 border-b border-slate-50 flex items-center gap-2">
              <div className="flex-shrink-0 h-8 flex items-center">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(content.id)}
                  onChange={() => toggleSelection(content.id)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 bg-white/50 backdrop-blur-sm cursor-pointer"
                />
              </div>
              <div className="flex-shrink-0 p-1.5 bg-white rounded-xl shadow-sm">
                {getContentTypeIcon(content.type)}
              </div>
              <div className="min-w-0 flex-1 flex flex-col justify-center">
                <h3 className="font-black text-slate-800 text-xs sm:text-sm line-clamp-2 leading-tight">{content.title}</h3>
                <div className="flex items-center text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 truncate">
                  <MapPin size={9} className="mr-1 flex-shrink-0" />
                  <span className="truncate">{getSubjectName(content.subjectId)}</span>
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0 items-center">
                <button onClick={() => handleViewEdit(content)} className="p-1.5 sm:p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all opacity-100" title="View"><Eye size={16} /></button>
                <button onClick={() => toggleEditForm(content)} className="p-1.5 sm:p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-all opacity-100" title="Edit"><Edit size={16} /></button>
                <button onClick={() => triggerDelete(content)} className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-100" title="Delete"><Trash2 size={16} /></button>
              </div>
            </div>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="space-y-0.5">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Semester</p>
                  <p className="text-xs font-bold text-slate-600">{content.semester || 'N/A'}</p>
                </div>
                <div className="space-y-0.5 text-right">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Date Added</p>
                  <p className="text-xs font-bold text-slate-600">{new Date(content.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex justify-between items-center bg-slate-50/50 p-2 rounded-xl">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${content.fileType === 'pdf' ? 'bg-red-100 text-red-600' :
                  content.fileType === 'image' ? 'bg-blue-100 text-blue-600' :
                    'bg-purple-100 text-purple-600'
                  }`}>
                  {content.fileType || 'File'}
                </span>
                {/* Text button removed as requested, Eye icon in header handles opening */}
              </div>
            </CardContent>

            {/* In-Card Editor - Mobile Friendly */}
            {editingContentId === content.id && (
              <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-xl p-5 overflow-y-auto animate-in fade-in zoom-in duration-300">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-black text-slate-800 text-sm">Update Content</h4>
                  <button onClick={() => setEditingContentId(null)} className="p-1 text-slate-400 hover:text-red-500"><XCircle size={18} /></button>
                </div>
                <div className="space-y-4">
                  <Input value={formData.title || ''} onChange={handleInputChange} name="title" fullWidth placeholder="Title" />
                  <div className="grid grid-cols-2 gap-2">
                    <Select options={classOptions} value={formData.classId?.toString() || ''} onChange={v => handleSelectChange('classId', v)} fullWidth />
                    <Select options={subjectOptions} value={formData.subjectId?.toString() || ''} onChange={v => handleSelectChange('subjectId', v)} fullWidth />
                  </div>
                  <Button onClick={handleUpdateContent} fullWidth className="bg-blue-600 text-white font-black py-3 rounded-xl active:scale-95 transition-all text-sm">
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Viewer Modal - Use 'full' size for PDF to match User experience */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedFileForView?.title || "Viewer"}
        size={selectedFileForView?.type === 'pdf' ? 'full' : '5xl'}
        contentPaddingClass="p-0"
      >
        <div className="w-full h-[85vh] bg-slate-900 overflow-hidden flex items-center justify-center">
          {selectedFileForView?.type === 'image' && (
            <div className="w-full h-full flex items-center justify-center p-4">
              <ProgressiveImage src={selectedFileForView.url || ''} alt={selectedFileForView.title} className="max-w-full max-h-full object-contain shadow-2xl rounded-lg" />
            </div>
          )}
          {selectedFileForView?.type === 'video' && selectedFileForView.videoUrl && (
            <GenericVideoPlayer videoUrl={selectedFileForView.videoUrl} title={selectedFileForView.title} onClose={() => setIsModalOpen(false)} />
          )}
        </div>
        {selectedFileForView?.type === 'pdf' && (
          <PDFViewer fileUrl={selectedFileForView.url || ''} fileName={selectedFileForView.title} onClose={() => setIsModalOpen(false)} />
        )}
      </Modal>

      {/* Confirmation Popup */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
      />
      {/* Full Screen PDF Viewer (Outside Modal for correct z-index/fixed positioning) */}
      {isModalOpen && selectedFileForView?.type === 'pdf' && (
        <PDFViewer
          fileUrl={selectedFileForView.url || ''}
          fileName={selectedFileForView.title}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminContentTab;
