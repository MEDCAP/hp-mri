import { useState, useCallback, useRef } from 'react';
import {
  initUpload,
  putToS3,
  completeUpload,
  convertUpload,
  abortUpload,
} from '../../../api/uploads';
import { deleteMrdFiles } from '../../../api/mrdFiles';
import { pollJob, isTerminalJobStatus } from '../../../api/jobs';
import type { Job } from '../../../api/types';
import { getApiErrorMessage } from '../../../api/client';
import { uploadConfig } from '../../../config/env';
import { buildTar } from '../utils/tar';

export interface UploadFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
  currentStep?: string;
}

/**
 * One dropped experiment folder. Its statuses are the stages of the raw path in
 * order: the folder is tarred in the browser ('packing'), staged in S3
 * ('uploading'), then run through the converter container as a job the frontend
 * polls ('converting'). `fileId` is the converted MRD the job produced.
 */
export interface UploadFolder {
  id: string;
  name: string;
  fileCount: number;
  totalBytes: number;
  status: 'pending' | 'packing' | 'uploading' | 'converting' | 'completed' | 'error';
  progress: number;
  jobId?: string;
  fileId?: string;
  error?: string;
}

/** One file inside a folder, with its path relative to the folder's parent. */
interface FolderFile {
  path: string;
  file: File;
}

/**
 * The only converter that exists today. Two of the three codespecs in the source
 * repo name container images that were never built and pass flags the converter's
 * argument parser rejects, so offering a choice would offer failures that only
 * surface inside the container where the user cannot see them. This constant is
 * the one place to change when a second converter is real.
 */
const CONVERTER = 'convert';

/**
 * Progress is split across the phases of a presigned upload. The S3 PUT owns
 * the bulk of the bar because it is the only phase whose duration scales with file
 * size, and it is the only one that reports real byte counts. A folder spends the
 * last slice in conversion, where the job's stages are the only available signal.
 */
const PROGRESS_INIT_DONE = 5;
const PROGRESS_PUT_DONE = 90;

/** `readEntries` yields a batch at a time and signals the end with an empty one. */
function readAllEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  const all: FileSystemEntry[] = [];
  return new Promise((resolve, reject) => {
    const readBatch = () => {
      reader.readEntries(batch => {
        if (batch.length === 0) {
          resolve(all);
          return;
        }
        all.push(...batch);
        readBatch();
      }, reject);
    };
    readBatch();
  });
}

function readEntryFile(entry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => entry.file(resolve, reject));
}

async function walkDirectory(
  directory: FileSystemDirectoryEntry,
  prefix: string
): Promise<FolderFile[]> {
  const collected: FolderFile[] = [];
  for (const entry of await readAllEntries(directory.createReader())) {
    const path = `${prefix}/${entry.name}`;
    if (entry.isDirectory) {
      collected.push(...(await walkDirectory(entry as FileSystemDirectoryEntry, path)));
    } else {
      collected.push({ path, file: await readEntryFile(entry as FileSystemFileEntry) });
    }
  }
  return collected;
}

/** How far a conversion job has got, by the share of its stages that have ended. */
function jobStageFraction(job: Job): number {
  if (job.stages.length === 0) return 0;
  const done = job.stages.filter(stage => isTerminalJobStatus(stage.status)).length;
  return done / job.stages.length;
}

/**
 * Returns null if the file is acceptable, otherwise a human-readable reason.
 * Mirrors the backend's checks so bad files are rejected before any transfer.
 */
function validateFile(file: File): string | null {
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
}

const isValidFileType = (file: File): boolean => validateFile(file) === null;

const newItemId = (): string => `${Date.now()}-${Math.random()}`;

/**
 * The name an item is stored under as `original_filename`: a file's own name,
 * or the tar a folder is packed into. Same-name detection compares on it.
 */
export const uploadNameOfFile = (file: UploadFile): string => file.file.name;
export const uploadNameOfFolder = (folder: UploadFolder): string => `${folder.name}.tar`;

/** Upload name -> ids of the caller's existing files to delete once it lands. */
export type ReplaceTargets = Map<string, string[]>;

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
  const [folders, setFolders] = useState<UploadFolder[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // One AbortController per in-flight item so an in-progress S3 PUT can be cancelled.
  const abortControllers = useRef<Map<string, AbortController>>(new Map());
  // A folder's files are only needed to build its tar, so they stay out of state.
  const folderFiles = useRef<Map<string, FolderFile[]>>(new Map());


  /** Queues acceptable files and returns a reason for each one rejected. */
  const addFiles = useCallback((incoming: File[]): string[] => {
    const rejected: string[] = [];
    const newFiles: UploadFile[] = [];

    incoming.forEach(file => {
      const reason = validateFile(file);
      if (reason) {
        rejected.push(`${file.name}: ${reason}`);
        return;
      }
      newFiles.push({
        id: newItemId(),
        file,
        status: 'pending' as const,
        progress: 0,
      });
    });

    setFiles(prev => [...prev, ...newFiles]);
    return rejected;
  }, []);

  /**
   * Queues experiment folders. Their contents are not checked against the allowed
   * extensions: these are the scanner's raw files, and what they may be is the
   * converter's business rather than the browser's.
   */
  const addFolders = useCallback((incoming: { name: string; files: FolderFile[] }[]): string[] => {
    const rejected: string[] = [];
    const newFolders: UploadFolder[] = [];

    incoming.forEach(folder => {
      if (folder.files.length === 0) {
        rejected.push(`${folder.name}: folder is empty`);
        return;
      }
      const id = newItemId();
      folderFiles.current.set(id, folder.files);
      newFolders.push({
        id,
        name: folder.name,
        fileCount: folder.files.length,
        totalBytes: folder.files.reduce((sum, entry) => sum + entry.file.size, 0),
        status: 'pending' as const,
        progress: 0,
      });
    });

    setFolders(prev => [...prev, ...newFolders]);
    return rejected;
  }, []);

  const reportRejections = useCallback((rejected: string[]) => {
    setUploadError(rejected.length > 0 ? rejected.join('; ') : null);
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    reportRejections(addFiles(Array.from(selectedFiles)));
  }, [addFiles, reportRejections]);

  /**
   * Files chosen through a `webkitdirectory` input arrive flat, each carrying a
   * `webkitRelativePath` like `ischemia_121_1/sub1/file.MRD`; the leading segment
   * is the experiment folder, which is how the selection is grouped back up.
   */
  const handleFolderSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const grouped = new Map<string, FolderFile[]>();
    Array.from(selectedFiles).forEach(file => {
      const path = file.webkitRelativePath || file.name;
      const root = path.split('/')[0];
      const group = grouped.get(root);
      if (group) {
        group.push({ path, file });
      } else {
        grouped.set(root, [{ path, file }]);
      }
    });

    reportRejections(
      addFolders(Array.from(grouped, ([name, groupFiles]) => ({ name, files: groupFiles })))
    );
  }, [addFolders, reportRejections]);

  const collectDroppedEntries = useCallback(async (entries: FileSystemEntry[]) => {
    const looseFiles: File[] = [];
    const droppedFolders: { name: string; files: FolderFile[] }[] = [];

    for (const entry of entries) {
      if (entry.isDirectory) {
        const directory = entry as FileSystemDirectoryEntry;
        droppedFolders.push({
          name: directory.name,
          files: await walkDirectory(directory, directory.name),
        });
      } else {
        looseFiles.push(await readEntryFile(entry as FileSystemFileEntry));
      }
    }

    reportRejections([...addFiles(looseFiles), ...addFolders(droppedFolders)]);
  }, [addFiles, addFolders, reportRejections]);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  /**
   * `dataTransfer.files` flattens a dropped folder away, so the drop is read
   * through the entry API instead, where a directory can be walked. The items are
   * taken synchronously because the DataTransfer is emptied the moment this
   * handler returns.
   */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const entries = Array.from(e.dataTransfer.items)
      .map(item => item.webkitGetAsEntry())
      .filter((entry): entry is FileSystemEntry => entry !== null);

    if (entries.length === 0) {
      handleFileSelect(e.dataTransfer.files);
      return;
    }

    void collectDroppedEntries(entries);
  }, [handleFileSelect, collectDroppedEntries]);

  // Remove file
  const removeFile = (fileId: string) => {
    abortControllers.current.get(fileId)?.abort();
    abortControllers.current.delete(fileId);
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const removeFolder = (folderId: string) => {
    abortControllers.current.get(folderId)?.abort();
    abortControllers.current.delete(folderId);
    folderFiles.current.delete(folderId);
    setFolders(prev => prev.filter(f => f.id !== folderId));
  };

  const setFileState = (fileId: string, patch: Partial<UploadFile>) => {
    setFiles(prev => prev.map(f => (f.id === fileId ? { ...f, ...patch } : f)));
  };

  const setFolderState = (folderId: string, patch: Partial<UploadFolder>) => {
    setFolders(prev => prev.map(f => (f.id === folderId ? { ...f, ...patch } : f)));
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
  const uploadFile = async (file: UploadFile, replace?: ReplaceTargets): Promise<void> => {
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
      await replaceOldCopies(uploadNameOfFile(file), replace);
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

  /**
   * Upload one experiment folder: tar it in the browser, stage the tar, then hand
   * it to the converter and follow the job it returns. There is no `complete`
   * step, because the file the user ends up with is the converter's output rather
   * than the thing that was uploaded.
   */
  const uploadFolder = async (folder: UploadFolder, replace?: ReplaceTargets): Promise<void> => {
    const controller = new AbortController();
    abortControllers.current.set(folder.id, controller);

    const entries = folderFiles.current.get(folder.id) ?? [];
    const tarName = `${folder.name}.tar`;

    let uploadId: string | null = null;

    try {
      setFolderState(folder.id, { status: 'packing', progress: 0 });
      const tar = buildTar(entries.map(entry => ({ path: entry.path, data: entry.file })));

      const init = await initUpload(tarName, tar.size, groupName, 'raw-tar');
      uploadId = init.uploadId;
      setFolderState(folder.id, { status: 'uploading', progress: PROGRESS_INIT_DONE });

      await putToS3(
        init.uploadUrl,
        tar,
        event => {
          const total = event.total ?? tar.size;
          if (!total) return;
          const fraction = Math.min(1, event.loaded / total);
          setFolderState(folder.id, {
            progress: PROGRESS_INIT_DONE + fraction * (PROGRESS_PUT_DONE - PROGRESS_INIT_DONE),
          });
        },
        controller.signal
      );

      const { jobId } = await convertUpload(uploadId, tarName, groupName, CONVERTER);
      // The job owns the staged object from here, so aborting the upload would
      // pull the tar out from under the converter.
      uploadId = null;
      setFolderState(folder.id, { status: 'converting', progress: PROGRESS_PUT_DONE, jobId });

      const job = await pollJob(
        jobId,
        current => {
          setFolderState(folder.id, {
            progress: PROGRESS_PUT_DONE + jobStageFraction(current) * (100 - PROGRESS_PUT_DONE),
          });
        },
        controller.signal
      );

      if (job.status !== 'succeeded') {
        throw new Error(job.error || 'Conversion failed');
      }

      setFolderState(folder.id, {
        status: 'completed',
        progress: 100,
        fileId: job.output_file_id ?? undefined,
      });
      await replaceOldCopies(uploadNameOfFolder(folder), replace);
    } catch (error) {
      if (uploadId) {
        await abortUpload(uploadId);
      }
      setFolderState(folder.id, { status: 'error', error: getApiErrorMessage(error) });
      throw error;
    } finally {
      abortControllers.current.delete(folder.id);
    }
  };

  // Old copies that could not be removed after a replacing upload landed.
  const replaceFailures = useRef<string[]>([]);

  const replaceOldCopies = async (name: string, replace?: ReplaceTargets) => {
    const ids = replace?.get(name);
    if (!ids || ids.length === 0) return;
    try {
      await deleteMrdFiles(ids);
    } catch (error) {
      replaceFailures.current.push(
        `${name} uploaded, but the old copy could not be removed: ${getApiErrorMessage(error)}`
      );
    }
  };

  // Calculate overall progress
  const itemCount = files.length + folders.length;
  const overallProgress = itemCount > 0
    ? [...files, ...folders].reduce((sum, item) => sum + item.progress, 0) / itemCount
    : 0;

  /**
   * Handle upload. With `replace`, an item whose name matches files the caller
   * already owns deletes those once the new copy has landed -- never before, so
   * a failed upload loses nothing.
   */
  const handleUpload = async (replace?: ReplaceTargets) => {
    if (itemCount === 0) return;

    setIsUploading(true);
    setUploadError(null);
    replaceFailures.current = [];

    // Notify parent component about upload start
    onUploadStart?.(files);

    // Bounded worker pool. The API is no longer on the data path, so several items
    // can transfer at once without competing for backend workers. Files and folders
    // share the queue so the bound holds across both.
    const queue: (() => Promise<void>)[] = [
      ...files.map(file => () => uploadFile(file, replace)),
      ...folders.map(folder => () => uploadFolder(folder, replace)),
    ];
    const workerCount = Math.min(uploadConfig.concurrency, queue.length);
    let failures = 0;

    const worker = async () => {
      for (;;) {
        const next = queue.shift();
        if (!next) return;
        try {
          await next();
        } catch {
          // Per-item status is already recorded; keep the remaining items going.
          failures += 1;
        }
      }
    };

    await Promise.all(Array.from({ length: workerCount }, worker));

    if (failures > 0 || replaceFailures.current.length > 0) {
      const messages = failures > 0
        ? [`${failures} of ${itemCount} item${itemCount === 1 ? '' : 's'} failed to upload.`]
        : [];
      setUploadError([...messages, ...replaceFailures.current].join(' '));
      setIsUploading(false);
      if (failures === 0) onUploadComplete?.(files);
      return;
    }

    onUploadComplete?.(files);

    // Close modal after delay
    setTimeout(() => {
      onClose();
      setFiles([]);
      setFolders([]);
      folderFiles.current.clear();
      setIsUploading(false);
    }, 1500);
  };

  return { files, setFiles, folders, isDragOver, isUploading, uploadError, isValidFileType, validateFile, handleFileSelect, handleFolderSelect, handleDragOver, handleDragLeave, handleDrop, removeFile, removeFolder, uploadFile, uploadFolder, handleUpload, overallProgress };
}
