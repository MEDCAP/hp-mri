import { apiClient } from './client';
import { Job, JobStatus } from './types';

/**
 * Long pipeline runs (conversion, reconstruction) are a job document the
 * frontend polls, because the work outlives any single HTTP request.
 */

const POLL_INTERVAL_MS = 2000;

/** A job is only worth polling until it reaches one of these. */
export function isTerminalJobStatus(status: JobStatus): boolean {
  return status === 'succeeded' || status === 'failed';
}

/** GET /jobs/:id */
export async function getJob(jobId: string): Promise<Job> {
  const response = await apiClient.get<Job>(`/jobs/${jobId}`);
  return response.data;
}

/** GET /jobs?fileId=&status= */
export async function listJobs(filter: { fileId?: string; status?: JobStatus } = {}): Promise<Job[]> {
  const response = await apiClient.get<Job[]>('/jobs', {
    params: { fileId: filter.fileId, status: filter.status },
  });
  return response.data;
}

/**
 * Poll a job until it succeeds or fails, reporting every reading on the way.
 *
 * Resolves with the terminal job rather than throwing on `failed`: a failed
 * stage is a result the caller renders, not an exception. An aborted signal
 * rejects, which is how a closed modal stops the poll.
 */
export async function pollJob(
  jobId: string,
  onUpdate: (job: Job) => void,
  signal?: AbortSignal
): Promise<Job> {
  for (;;) {
    if (signal?.aborted) throw new DOMException('Job polling aborted', 'AbortError');

    const job = await getJob(jobId);
    onUpdate(job);
    if (isTerminalJobStatus(job.status)) return job;

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        signal?.removeEventListener('abort', onAbort);
        resolve();
      }, POLL_INTERVAL_MS);
      const onAbort = () => {
        clearTimeout(timer);
        reject(new DOMException('Job polling aborted', 'AbortError'));
      };
      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }
}
