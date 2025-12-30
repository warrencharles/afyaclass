import React, { useState, useRef, useMemo } from 'react';
import { useAdmin } from '../../../contexts/AdminContext';
import { useAuth } from '../../../contexts/AuthContext';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useToast } from '../../../contexts/ToastContext';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { ProgressiveImage } from '../../../components/ui/ProgressiveImage';
import { Trash2, Upload, Link as LinkIcon, CheckCircle2, XCircle, Plus, Image as ImageIcon, ExternalLink, Edit, Search, Calendar, Globe, Loader2 } from 'lucide-react';
import { Advertisement } from '../../../types';
import { API_BASE_URL } from '../../../utils/api';

export const AdminAdvertisementsTab: React.FC = () => {
  const { advertisements = [], addAdvertisement, deleteAdvertisement, isLoading, bulkDeleteAdvertisements } = useAdmin();
  const { showToast } = useToast();
  const { user } = useAuth();

  const [isAddFormVisible, setIsAddFormVisible] = useState(false);
  const [editingAdId, setEditingAdId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<Omit<Advertisement, 'id' | 'createdAt' | 'isActive' | 'updatedAt'>>({
    title: '',
    description: '',
    imageUrl: '',
    targetUrl: '',
    startDate: '',
    endDate: '',
  });

  const [uploadMethod, setUploadMethod] = useState<'url' | 'file'>('url');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (selectedIds.length === filteredAds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAds.map(c => c.id));
    }
  };

  const triggerBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setConfirmModal({
      isOpen: true,
      title: 'Bulk Delete Campaigns',
      message: `Permanently delete ${selectedIds.length} selected campaigns? This will remove them from the dashboard immediately.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await bulkDeleteAdvertisements(selectedIds);
          setSelectedIds([]);
          showToast(`${selectedIds.length} campaigns removed`, 'success');
        } catch (error) {
          showToast('Failed to delete some campaigns', 'error');
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) { showToast('Only images allowed', 'error'); return; }
      setUploadedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const toggleAddForm = () => {
    setIsAddFormVisible(!isAddFormVisible);
    setFormData({ title: '', description: '', imageUrl: '', targetUrl: '', startDate: '', endDate: '' });
    setFilePreview(null);
    setUploadedFile(null);
  };

  const handleAddAdvertisement = async () => {
    try {
      if (!formData.title) throw new Error('Title required');
      let finalImageUrl = formData.imageUrl;

      if (uploadMethod === 'file') {
        if (!uploadedFile) throw new Error('File missing');
        setIsUploading(true);
        const uploadFormData = new FormData();
        uploadFormData.append('file', uploadedFile);
        const resp = await fetch(`${API_BASE_URL}/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${user?.token}` },
          body: uploadFormData
        });
        if (!resp.ok) throw new Error('Upload failed');
        const data = await resp.json();
        // Use full URL to ensure immediate availability and avoid relative path issues
        finalImageUrl = data.fileUrl;
        console.log('Upload successful, using URL:', finalImageUrl);
      }

      await addAdvertisement({ ...formData, imageUrl: finalImageUrl || '', isActive: true });
      setIsAddFormVisible(false);
      showToast('Promotion live!', 'success');
    } catch (err: any) {
      setIsUploading(false);
      showToast(err.message, 'error');
    }
  };

  const triggerDelete = (ad: Advertisement) => {
    setConfirmModal({
      isOpen: true,
      title: 'Remove Advertisement',
      message: `Delete "${ad.title}"? This will immediately remove it from the student dashboard.`,
      variant: 'danger',
      onConfirm: async () => {
        await deleteAdvertisement(ad.id);
        showToast('Promotion removed', 'success');
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const filteredAds = useMemo(() => {
    if (!Array.isArray(advertisements)) return [];
    return advertisements.filter(ad => {
      const title = (ad.title || '').toLowerCase();
      const term = searchTerm.toLowerCase();
      return title.includes(term);
    });
  }, [advertisements, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="animate-spin h-10 w-10 text-blue-500 mb-4" />
        <p className="text-sm text-slate-500 font-black uppercase tracking-widest">Launching Campaigns...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Campaigns</h2>
          <p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Manage platform advertisements</p>
        </div>
        <button
          onClick={toggleAddForm}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-black transition-all shadow-lg active:scale-95 ${isAddFormVisible ? 'bg-slate-100 text-slate-600' : 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700'
            }`}
        >
          {isAddFormVisible ? <XCircle size={18} /> : <Plus size={18} />}
          <span>{isAddFormVisible ? 'Close' : 'New Ad'}</span>
        </button>
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center space-x-2 text-red-700 font-bold text-sm">
            <Trash2 size={18} />
            <span>{selectedIds.length} campaigns selected</span>
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
          checked={filteredAds.length > 0 && selectedIds.length === filteredAds.length}
          onChange={handleSelectAll}
          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Select All {filteredAds.length > 0 && `(${filteredAds.length})`}</span>
      </div>

      <div className="relative">
        <Input
          placeholder="Search campaigns..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-12 bg-white/60 backdrop-blur-md border-transparent rounded-2xl focus:bg-white transition-all shadow-sm"
          icon={<Search size={18} className="text-slate-400" />}
          fullWidth
        />
      </div>

      {isAddFormVisible && (
        <div className="bg-white/90 backdrop-blur-xl border border-white/60 rounded-3xl p-6 md:p-8 shadow-2xl animate-in slide-in-from-top-4 duration-300">
          <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center">
            <ImageIcon className="mr-2 text-blue-600" /> Visualize Your Ad
          </h3>
          <div className="space-y-4">
            <Input label="Campaign Title" name="title" value={formData.title || ''} onChange={handleInputChange} fullWidth placeholder="e.g. Early Bird Discounts" />
            <textarea name="description" value={formData.description || ''} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold h-24 font-sans" placeholder="Brief copy for the ad..." />

            <div className="flex gap-2">
              {['url', 'file'].map(m => (
                <button key={m} type="button" onClick={() => setUploadMethod(m as any)} className={`flex-1 py-3 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all ${uploadMethod === m ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-100 text-slate-400'}`}>
                  {m === 'url' ? <LinkIcon size={12} className="inline mr-1" /> : <Upload size={12} className="inline mr-1" />}
                  {m}
                </button>
              ))}
            </div>

            {uploadMethod === 'url' ? (
              <Input label="Image URL" value={formData.imageUrl || ''} onChange={handleInputChange} name="imageUrl" fullWidth icon={<Globe size={18} />} />
            ) : (
              <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center hover:bg-blue-50/50 cursor-pointer group transition-all">
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                {filePreview ? <img src={filePreview} className="max-h-32 mx-auto rounded-xl shadow-md" /> : <Plus size={30} className="mx-auto text-slate-300 group-hover:text-blue-500" />}
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">{filePreview ? 'Change Image' : 'Click to Upload'}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Input label="Start" type="date" name="startDate" value={formData.startDate || ''} onChange={handleInputChange} fullWidth />
              <Input label="End" type="date" name="endDate" value={formData.endDate || ''} onChange={handleInputChange} fullWidth />
            </div>
            <Button onClick={handleAddAdvertisement} fullWidth className="py-6 rounded-2xl bg-blue-600 font-black text-lg shadow-xl shadow-blue-200 transition-all active:scale-95">
              {isUploading ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2" />}
              Launch Campaign
            </Button>
          </div>
        </div>
      )}

      {filteredAds.length === 0 ? (
        <div className="col-span-full py-20 text-center bg-white/40 backdrop-blur-md rounded-[2.5rem] border border-white/80 border-dashed">
          <ImageIcon size={48} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-500 font-black uppercase tracking-widest">No active campaigns</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAds.map(ad => (
            <Card key={ad.id} className={`group relative border-0 shadow-lg shadow-blue-900/5 backdrop-blur-md rounded-[2.5rem] overflow-hidden border ${selectedIds.includes(ad.id) ? 'bg-blue-50/80 border-blue-200 ring-2 ring-blue-400 ring-offset-2' : 'bg-white/80 border-white/40'}`}>
              <div className="absolute top-4 left-4 z-20">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(ad.id)}
                  onChange={() => toggleSelection(ad.id)}
                  className="w-5 h-5 rounded-lg border-white text-blue-600 focus:ring-blue-500 bg-white/50 backdrop-blur-sm cursor-pointer shadow-sm"
                />
              </div>
              <div className="aspect-[16/10] relative overflow-hidden">
                <ProgressiveImage src={ad.imageUrl?.startsWith('http') ? ad.imageUrl : `${API_BASE_URL}/${ad.imageUrl}`} alt={ad.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute top-4 right-4 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditingAdId(ad.id)} className="p-2 bg-white/20 backdrop-blur-md text-white rounded-xl hover:bg-white/40 active:scale-95"><Edit size={14} /></button>
                  <button onClick={() => triggerDelete(ad)} className="p-2 bg-red-500/20 backdrop-blur-md text-white rounded-xl hover:bg-red-500/40 active:scale-95"><Trash2 size={14} /></button>
                </div>
                <div className="absolute bottom-4 left-6 right-6">
                  <h3 className="text-white font-black text-lg line-clamp-1">{ad.title}</h3>
                </div>
              </div>
              <CardContent className="p-6 space-y-4">
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed line-clamp-2 h-8">{ad.description || 'No description provided.'}</p>
                <div className="flex justify-between items-center bg-slate-50/50 p-2 rounded-xl">
                  <div className="flex items-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <Calendar size={12} className="mr-1 text-blue-500" />
                    {new Date(ad.createdAt).toLocaleDateString()}
                  </div>
                  {ad.targetUrl && (
                    <a href={ad.targetUrl} target="_blank" rel="noreferrer" className="flex items-center text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline">
                      <ExternalLink size={10} className="mr-1" />
                      Visit
                    </a>
                  )}
                </div>
              </CardContent>

              {editingAdId === ad.id && (
                <div className="absolute inset-0 z-30 bg-white/95 backdrop-blur-xl p-6 overflow-y-auto animate-in fade-in zoom-in duration-300">
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="font-black text-slate-800">Update Campaign</h4>
                    <button onClick={() => setEditingAdId(null)} className="p-1 text-slate-400 hover:text-red-500"><XCircle size={20} /></button>
                  </div>
                  <div className="space-y-4">
                    <Input value={formData.title || ad.title} onChange={handleInputChange} name="title" fullWidth placeholder="Title" />
                    <textarea value={formData.description || ad.description} onChange={handleInputChange} name="description" className="w-full bg-slate-50 border-slate-100 rounded-xl p-3 text-xs font-bold h-20 font-sans" />
                    <Input value={formData.targetUrl || ad.targetUrl} onChange={handleInputChange} name="targetUrl" fullWidth placeholder="Link URL" />
                    <Button onClick={() => setEditingAdId(null)} fullWidth className="bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-200">Save Changes</Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

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

export default AdminAdvertisementsTab;
