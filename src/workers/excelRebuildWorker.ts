import type { UploadedDocument } from '../types';
import { rebuildWorkbookBase64FromDoc } from '../utils/excelEngine';

interface WorkerRebuildRequest {
  requestId: number;
  doc: UploadedDocument;
}

self.onmessage = async (event: MessageEvent<WorkerRebuildRequest>) => {
  const { requestId, doc } = event.data || {};
  try {
    const rawBase64 = await rebuildWorkbookBase64FromDoc(doc);
    self.postMessage({ requestId, ok: true, rawBase64 });
  } catch (err: any) {
    self.postMessage({
      requestId,
      ok: false,
      error: err?.message || 'Error reconstruyendo archivo Excel en worker'
    });
  }
};
