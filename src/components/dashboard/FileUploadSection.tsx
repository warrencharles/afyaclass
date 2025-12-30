import React, { useState, useCallback } from 'react';
import { UploadCloud, FileText, Image, XCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import api from '../../utils/api';

interface FileUploadSectionProps {
  onFileUpload: (file: File, progress: number) => void;
  onUploadComplete: (file: File, url: string) => void;
  onUploadError: (file: File, error: string) => void;
}

export const FileUploadSection: React.FC<FileUploadSectionProps> = ({ onFileUpload, onUploadComplete, onUploadError }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      // Basic validation for file type (PDF or image)
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        setSelectedFile(file);
        setUploadProgress(0);
        setUploadStatus('idle');
        setErrorMessage('');
      } else {
        setSelectedFile(null);
        setErrorMessage('Only PDF and image files are allowed.');
      }
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        setSelectedFile(file);
        setUploadProgress(0);
        setUploadStatus('idle');
        setErrorMessage('');
      } else {
        setSelectedFile(null);
        setErrorMessage('Only PDF and image files are allowed.');
      }
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadStatus('idle');
    setErrorMessage('');

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('title', selectedFile.name);
    formData.append('type', selectedFile.type.startsWith('image/') ? 'image' : 'pdf');
    formData.append('classLevelId', '1');
    formData.append('subjectId', '1');
    formData.append('classId', '1');
    formData.append('semester', '1');


    try {
      const response = await api.post('/content', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
            onFileUpload(selectedFile, progress);
          }
        },
      });

      setIsUploading(false);
      setUploadStatus('success');
      onUploadComplete(selectedFile, response.data.fileUrl);
      setSelectedFile(null);
    } catch (error: any) {
      setIsUploading(false);
      setUploadStatus('error');
      const errorMessage = error.response?.data?.message || 'An unexpected error occurred.';
      setErrorMessage(errorMessage);
      onUploadError(selectedFile, errorMessage);
    }
  }, [selectedFile, onFileUpload, onUploadComplete, onUploadError]);

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="h-10 w-10 text-primary-500" />;
    } else if (file.type === 'application/pdf') {
      return <FileText className="h-10 w-10 text-red-500" />;
    }
    return <FileText className="h-10 w-10 text-gray-500" />;
  };

  return (
    <Card className="neumorphic-card p-6 bg-gradient-to-br from-white to-gray-50 border border-gray-200/50 shadow-lg rounded-3xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl font-bold text-gray-800 flex items-center">
          <UploadCloud className="h-7 w-7 mr-3 text-primary-600" />
          Upload Content
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center cursor-pointer hover:border-primary-400 transition-colors duration-200 bg-white/80"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => document.getElementById('fileInput')?.click()}
        >
          <input
            id="fileInput"
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileChange}
            className="hidden"
            disabled={isUploading}
          />
          <UploadCloud className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg text-gray-600 font-medium">Drag & drop your files here, or <span className="text-primary-600 font-semibold">browse</span></p>
          <p className="text-sm text-gray-500 mt-1">PDF and Image files only (Max 10MB)</p>
        </div>

        {errorMessage && (
          <div className="flex items-center justify-center text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
            <XCircle className="h-5 w-5 mr-2" />
            <span className="text-sm font-medium">{errorMessage}</span>
          </div>
        )}

        {selectedFile && (
          <div className="flex items-center justify-between p-4 bg-gray-100 rounded-xl shadow-inner border border-gray-200">
            <div className="flex items-center gap-4">
              {getFileIcon(selectedFile)}
              <div>
                <p className="font-semibold text-gray-800">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
            {!isUploading && uploadStatus === 'idle' && (
              <Button
                onClick={handleUpload}
                className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold py-2 px-5 rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
              >
                Upload
              </Button>
            )}
            {isUploading && (
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
                <span className="text-primary-600 font-semibold">{uploadProgress}%</span>
              </div>
            )}
            {uploadStatus === 'success' && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-semibold">Uploaded!</span>
              </div>
            )}
          </div>
        )}

        {uploadProgress > 0 && isUploading && (
          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
            <div
              className="bg-primary-500 h-2.5 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
