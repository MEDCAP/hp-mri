import { useState, useCallback, useRef } from 'react';
import { initUpload, putToS3, completeUpload, abortUpload } from '../../../api/uploads';
import { getApiErrorMessage } from '../../../api/client';
import { uploadConfig } from '../../../config/env';

export interface UploadFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
  currentStep?: string;
}

/**
 * Progress is split across the three phases of a presigned upload. The S3 PUT owns
 * the bulk of the bar because it is the only phase whose duration scales with file
 * size, and it is the only one that reports real byte counts.
 */
const PROGRESS_INIT_DONE = 5;
const PROGRESS_PUT_DONE = 90;

export function useUpload(opts: {
  onUploadStart?: (files: UploadFile[]) => void;
  onUploadComplete?: (files: UploadFile[]) => void;
  onClose: () => void;
  onProgressUpdate?: (fileId: string, progress: number) => void;
  /** Group to share the uploaded files with; `null` keeps them private. */
  groupName: string | null;
}) {
  const { onUploadStart, onUploadComplete, onClose, onProgressUpdate, groupName } = opts;

  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // One AbortController per in-flight file so an in-progress S3 PUT can be cancelled.
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  /**
   * Returns null if the file is acceptable, otherwise a human-readable reason.
   * Mirrors the backend's checks so bad files are rejected before any transfer.
   */
  const validateFile = (file: File): string | null => {
    const name = file.name.toLowerCase();
    if (!uploadConfig.allowedExtensions.some(ext => name.endsWith(ext))) {
      return `Unsupported file type. Supported: ${uploadConfig.allowedExtensions.join(', ')}`;
    }
    if (file.size === 0) {
      return 'File is empty';
    }
    if (file.size > uploadConfig.maxUploadBytes) {
      const maxGb = uploadConfig.maxUploadBytes / (1024 * 1024 * 1024);
      return `File exceeds the ${maxGb} GB upload limit`;
    }
    return null;
  };

  const isValidFileType = (file: File): boolean => validateFile(file) === null;

  // Handle file selection
  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const rejected: string[] = [];
    const newFiles: UploadFile[] = [];

    Array.from(selectedFiles).forEach(file => {
      const reason = validateFile(file);
      if (reason) {
        rejected.push(`${file.name}: ${reason}`);
        return;
      }
      newFiles.push({
        id: `${Date.now()}-${Math.random()}`,
        file,
        status: 'pending' as const,
        progress: 0,
      });
    });

    setFiles(prev => [...prev, ...newFiles]);
    setUploadError(rejected.length > 0 ? rejected.join('; ') : null);
  }, []);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  // Remove file
  const removeFile = (fileId: string) => {
    abortControllers.current.get(fileId)?.abort();
    abortControllers.current.delete(fileId);
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const setFileState = (fileId: string, patch: Partial<UploadFile>) => {
    setFiles(prev => prev.map(f => (f.id === fileId ? { ...f, ...patch } : f)));
  };

  const reportProgress = (fileId: string, progress: number, step: string) => {
    setFileState(fileId, { progress, currentStep: step });
    onProgressUpdate?.(fileId, progress);
  };

  /**
   * Upload one file: reserve an id, PUT the bytes to S3, then ask the backend to
   * parse and record it. On failure the staged object is discarded so it does not
   * linger until the bucket lifecycle rule catches it.
   */
  const uploadFile = async (file: UploadFile): Promise<void> => {
    const controller = new AbortController();
    abortControllers.current.set(file.id, controller);

    setFileState(file.id, { status: 'uploading', progress: 0, currentStep: 'Preparing upload...' });
    onProgressUpdate?.(file.id, 0);

    let uploadId: string | null = null;

    try {
      const init = await initUpload(file.file.name, file.file.size, groupName);
      uploadId = init.uploadId;
      reportProgress(file.id, PROGRESS_INIT_DONE, 'Uploading to cloud storage...');

      await putToS3(
        init.uploadUrl,
        file.file,
        event => {
          // `total` is absent on some browsers/proxies; fall back to the known size.
          const total = event.total ?? file.file.size;
          if (!total) return;
          const fraction = Math.min(1, event.loaded / total);
          const progress =
            PROGRESS_INIT_DONE + fraction * (PROGRESS_PUT_DONE - PROGRESS_INIT_DONE);
          reportProgress(file.id, progress, 'Uploading to cloud storage...');
        },
        controller.signal
      );

      reportProgress(file.id, PROGRESS_PUT_DONE, 'Extracting metadata...');
      await completeUpload(uploadId, file.file.name, groupName);

      setFileState(file.id, { status: 'completed', progress: 100, currentStep: 'Completed!' });
      onProgressUpdate?.(file.id, 100);
    } catch (error) {
      // The bytes may already be staged in S3; drop them rather than wait for the
      // lifecycle rule.
      if (uploadId) {
        await abortUpload(uploadId);
      }
      const errorMessage = getApiErrorMessage(error);
      setFileState(file.id, {
        status: 'error',
        error: errorMessage,
        currentStep: 'Error occurred',
      });
      throw error;
    } finally {
      abortControllers.current.delete(file.id);
    }
  };

  // Calculate overall progress
  const overallProgress = files.length > 0
    ? files.reduce((sum, file) => sum + file.progress, 0) / files.length
    : 0;

  // Handle upload
  const handleUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    // Notify parent component about upload start
    onUploadStart?.(files);

    // Bounded worker pool. The API is no longer on the data path, so several files
    // can transfer at once without competing for backend workers.
    const queue = [...files];
    const workerCount = Math.min(uploadConfig.concurrency, queue.length);
    let failures = 0;

    const worker = async () => {
      for (;;) {
        const next = queue.shift();
        if (!next) return;
        try {
          await uploadFile(next);
        } catch {
          // Per-file status is already recorded; keep the remaining files going.
          failures += 1;
        }
      }
    };

    await Promise.all(Array.from({ length: workerCount }, worker));

    if (failures > 0) {
      setUploadError(
        `${failures} of ${files.length} file${files.length === 1 ? '' : 's'} failed to upload.`
      );
      setIsUploading(false);
      return;
    }

    onUploadComplete?.(files);

    // Close modal after delay
    setTimeout(() => {
      onClose();
      setFiles([]);
      setIsUploading(false);
    }, 1500);
  };

  return { files, setFiles, isDragOver, isUploading, uploadError, isValidFileType, validateFile, handleFileSelect, handleDragOver, handleDragLeave, handleDrop, removeFile, uploadFile, handleUpload, overallProgress };
}
