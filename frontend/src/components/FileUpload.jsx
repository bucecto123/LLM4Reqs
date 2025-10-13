import React, { useState, useRef } from 'react';
import { Paperclip, X, Upload, File, FileText, FileImage } from 'lucide-react';

const FileUpload = ({ onFilesSelected, onClose, maxFiles = 5, maxSizePerFile = 10 }) => {
  const [files, setFiles] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Supported file types
  const supportedTypes = {
    'application/pdf': { icon: FileText, color: 'text-red-500', label: 'PDF' },
    'application/msword': { icon: FileText, color: 'text-blue-500', label: 'DOC' },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: FileText, color: 'text-blue-500', label: 'DOCX' },
    'text/plain': { icon: File, color: 'text-gray-500', label: 'TXT' },
    'application/vnd.ms-excel': { icon: FileText, color: 'text-green-500', label: 'XLS' },
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: FileText, color: 'text-green-500', label: 'XLSX' },
    'application/vnd.ms-powerpoint': { icon: FileText, color: 'text-orange-500', label: 'PPT' },
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': { icon: FileText, color: 'text-orange-500', label: 'PPTX' },
    'image/jpeg': { icon: FileImage, color: 'text-purple-500', label: 'JPEG' },
    'image/png': { icon: FileImage, color: 'text-purple-500', label: 'PNG' },
    'image/gif': { icon: FileImage, color: 'text-purple-500', label: 'GIF' },
    'text/markdown': { icon: FileText, color: 'text-indigo-500', label: 'MD' },
    'text/csv': { icon: FileText, color: 'text-green-500', label: 'CSV' }
  };

  const validateFile = (file) => {
    // Check file size (convert MB to bytes)
    if (file.size > maxSizePerFile * 1024 * 1024) {
      return `File "${file.name}" is too large. Maximum size is ${maxSizePerFile}MB.`;
    }

    // Check file type
    if (!supportedTypes[file.type]) {
      return `File type "${file.type}" is not supported for "${file.name}".`;
    }

    return null;
  };

  const handleFiles = (newFiles) => {
    setError(null);
    
    // Convert FileList to Array and validate
    const fileArray = Array.from(newFiles);
    
    // Check total number of files
    if (files.length + fileArray.length > maxFiles) {
      setError(`You can only upload up to ${maxFiles} files at once.`);
      return;
    }

    // Validate each file
    const validFiles = [];
    for (const file of fileArray) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      
      // Check for duplicates
      const isDuplicate = files.some(existingFile => 
        existingFile.name === file.name && existingFile.size === file.size
      );
      
      if (!isDuplicate) {
        validFiles.push({
          file,
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          size: file.size,
          type: file.type
        });
      }
    }

    setFiles(prev => [...prev, ...validFiles]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFiles(droppedFiles);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const removeFile = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    setError(null);
  };

  const handleUpload = () => {
    if (files.length === 0) {
      setError('Please select at least one file to upload.');
      return;
    }

    // Pass the files to the parent component
    onFilesSelected(files.map(f => f.file));
    
    // Reset the component
    setFiles([]);
    setError(null);
    onClose();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType) => {
    const fileInfo = supportedTypes[fileType] || { icon: File, color: 'text-gray-500' };
    const IconComponent = fileInfo.icon;
    return <IconComponent className={`w-4 h-4 ${fileInfo.color}`} />;
  };

  const getFileLabel = (fileType) => {
    return supportedTypes[fileType]?.label || 'FILE';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Paperclip className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Upload Files</h3>
              <p className="text-sm text-gray-500">
                Upload up to {maxFiles} files (max {maxSizePerFile}MB each)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {/* Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragOver 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }`}
          >
            <Upload className={`w-12 h-12 mx-auto mb-4 ${
              isDragOver ? 'text-blue-500' : 'text-gray-400'
            }`} />
            <p className="text-lg font-medium text-gray-700 mb-2">
              Drop files here or click to browse
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Supports PDF, DOC, DOCX, TXT, XLS, XLSX, PPT, PPTX, images, and more
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.md,.csv"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Selected Files */}
          {files.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Selected Files ({files.length}/{maxFiles})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {files.map((fileWrapper) => (
                  <div
                    key={fileWrapper.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      {getFileIcon(fileWrapper.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">
                          {fileWrapper.name}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-gray-500">
                            {formatFileSize(fileWrapper.size)}
                          </span>
                          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                            {getFileLabel(fileWrapper.type)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(fileWrapper.id)}
                      className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-700 transition-colors ml-2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-500">
            {files.length > 0 && (
              <span>{files.length} file{files.length !== 1 ? 's' : ''} ready to upload</span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={files.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Upload Files
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;