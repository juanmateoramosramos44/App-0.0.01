export const DEFAULT_MAX_PHOTO_BYTES = 120 * 1024; // ~120 KB (ultra ligero para carga instantánea en señal mínima)

export interface ImageCompressionOptions {
  maxDimension?: number;
  quality?: number;
  maxBytes?: number;
}

/**
 * Calcula el peso real en bytes de una cadena Base64 / DataURL.
 */
export function estimateDataUrlBytes(dataUrl: string): number {
  if (!dataUrl || typeof dataUrl !== 'string') return 0;
  const commaIdx = dataUrl.indexOf(',');
  const base64Part = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  const paddingMatch = base64Part.match(/=+$/);
  const padding = paddingMatch ? paddingMatch[0].length : 0;
  return Math.max(0, Math.floor((base64Part.length * 3) / 4) - padding);
}

/**
 * Comprime cualquier imagen DataURL / Base64 localmente usando Canvas HTML5
 * hasta garantizar un peso máximo <= maxBytes (por defecto <= 120KB),
 * liberando de inmediato el buffer de Canvas y la referencia Image en RAM móvil.
 */
export function compressImageDataUrl(
  dataUrl: string,
  options: ImageCompressionOptions = {}
): Promise<string> {
  const {
    maxDimension = 800,
    quality = 0.65,
    maxBytes = DEFAULT_MAX_PHOTO_BYTES
  } = options;

  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
    return Promise.resolve(dataUrl);
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve(dataUrl);
  }

  // Ruta rápida: si ya es JPEG y pesa <= maxBytes, no re-comprimir innecesariamente
  if (dataUrl.startsWith('data:image/jpeg') && estimateDataUrlBytes(dataUrl) <= maxBytes) {
    return Promise.resolve(dataUrl);
  }

  return new Promise((resolve) => {
    const img = new Image();
    let canvas: HTMLCanvasElement | null = null;
    let settled = false;

    const cleanup = () => {
      img.onload = null;
      img.onerror = null;
      try {
        img.src = '';
      } catch {}
      if (canvas) {
        try {
          canvas.width = 0;
          canvas.height = 0;
        } catch {}
        canvas = null;
      }
    };

    const finish = (result: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    img.onload = () => {
      try {
        const naturalWidth = img.naturalWidth || img.width;
        const naturalHeight = img.naturalHeight || img.height;

        if (!naturalWidth || !naturalHeight) {
          finish(dataUrl);
          return;
        }

        const dimensionSteps = [maxDimension, 700, 580, 460].filter(
          (d, idx, arr) => d <= maxDimension && arr.indexOf(d) === idx
        );
        if (dimensionSteps.length === 0) dimensionSteps.push(maxDimension);

        const qualitySteps = [quality, 0.54, 0.44, 0.34, 0.26, 0.20].filter(
          (q, idx, arr) => q <= quality && arr.indexOf(q) === idx
        );
        if (qualitySteps.length === 0) qualitySteps.push(0.42);

        let bestResult = dataUrl;
        let bestBytes = estimateDataUrlBytes(dataUrl);

        canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          finish(dataUrl);
          return;
        }

        for (const dim of dimensionSteps) {
          let targetWidth = naturalWidth;
          let targetHeight = naturalHeight;
          if (naturalWidth > dim || naturalHeight > dim) {
            const ratio = Math.min(dim / naturalWidth, dim / naturalHeight);
            targetWidth = Math.max(1, Math.round(naturalWidth * ratio));
            targetHeight = Math.max(1, Math.round(naturalHeight * ratio));
          }

          canvas.width = targetWidth;
          canvas.height = targetHeight;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, targetWidth, targetHeight);
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          for (const q of qualitySteps) {
            const candidate = canvas.toDataURL('image/jpeg', q);
            if (!candidate || !candidate.startsWith('data:image/jpeg')) continue;
            const candidateBytes = estimateDataUrlBytes(candidate);
            if (candidateBytes < bestBytes) {
              bestResult = candidate;
              bestBytes = candidateBytes;
            }
            if (candidateBytes <= maxBytes) {
              finish(candidate);
              return;
            }
          }
        }

        finish(bestResult);
      } catch {
        finish(dataUrl);
      }
    };
    img.onerror = () => finish(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Lee un archivo File / Blob de imagen y lo comprime localmente al instante <= maxBytes.
 */
export function compressImageFile(
  file: File | Blob,
  optionsOrMaxDim: ImageCompressionOptions | number = {},
  qualityArg?: number,
  maxBytesArg?: number
): Promise<string> {
  const options: ImageCompressionOptions = typeof optionsOrMaxDim === 'number'
    ? { maxDimension: optionsOrMaxDim, quality: qualityArg, maxBytes: maxBytesArg }
    : optionsOrMaxDim;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const raw = ev.target?.result;
      if (typeof raw !== 'string') {
        reject(new Error('No se pudo leer el archivo de imagen'));
        return;
      }
      const compressed = await compressImageDataUrl(raw, options);
      resolve(compressed);
    };
    reader.onerror = () => reject(new Error('Error al leer la imagen seleccionada'));
    reader.readAsDataURL(file);
  });
}

/**
 * Comprime secuencialmente (una por una) todas las fotografías adjuntas en los puntos,
 * subcampos, medidores y anomalías de una ronda, evitando picos de memoria en teléfonos
 * y permitiendo cerrar rondas en baja señal de forma estable.
 */
export async function compressRoundPhotos<T extends Record<string, any>>(
  round: T,
  options: ImageCompressionOptions = {}
): Promise<T> {
  if (!round || typeof round !== 'object') return round;

  const opts: ImageCompressionOptions = {
    maxDimension: options.maxDimension ?? 800,
    quality: options.quality ?? 0.65,
    maxBytes: options.maxBytes ?? DEFAULT_MAX_PHOTO_BYTES
  };

  const cache = new Map<string, string>();
  let processedHeavyCount = 0;

  const compressOnce = async (url?: string | null): Promise<string | undefined> => {
    if (!url || typeof url !== 'string') return url ?? undefined;
    if (!url.startsWith('data:image/')) return url;
    const cached = cache.get(url);
    if (cached) return cached;
    const alreadyLightJpeg =
      url.startsWith('data:image/jpeg') && estimateDataUrlBytes(url) <= (opts.maxBytes ?? DEFAULT_MAX_PHOTO_BYTES);
    const out = alreadyLightJpeg ? url : await compressImageDataUrl(url, opts);
    cache.set(url, out);
    if (!alreadyLightJpeg) {
      processedHeavyCount += 1;
      if (processedHeavyCount % 2 === 0 && typeof window !== 'undefined') {
        await new Promise<void>((r) => setTimeout(r, 0));
      }
    }
    return out;
  };

  const compressPhotoList = async (list?: (string | undefined | null)[]): Promise<string[] | undefined> => {
    if (!Array.isArray(list) || list.length === 0) return undefined;
    const next: string[] = [];
    const seen = new Set<string>();
    for (const item of list) {
      if (!isValidRoundPhotoUrl(item)) continue;
      const compressed = await compressOnce(item);
      if (compressed && !seen.has(compressed)) {
        seen.add(compressed);
        next.push(compressed);
      }
    }
    return next.length > 0 ? next : undefined;
  };

  try {
    let nextCheckpoints = round.checkpoints;
    if (Array.isArray(round.checkpoints)) {
      nextCheckpoints = [];
      for (const chk of round.checkpoints) {
        if (!chk) {
          nextCheckpoints.push(chk);
          continue;
        }
        const compressedPhotoUrl = await compressOnce(chk.photoUrl);
        const compressedPhotos = await compressPhotoList(
          mergeUniquePhotos(chk.photos, chk.photoUrl ? [chk.photoUrl] : [])
        );

        let nextFields = chk.measurementFields;
        if (Array.isArray(chk.measurementFields)) {
          nextFields = [];
          for (const f of chk.measurementFields) {
            if (!f) {
              nextFields.push(f);
              continue;
            }
            const fUrl = await compressOnce(f.photoUrl);
            const fPhotos = await compressPhotoList(
              mergeUniquePhotos(f.photos, f.photoUrl ? [f.photoUrl] : [])
            );
            nextFields.push({
              ...f,
              photoUrl: fUrl || (fPhotos && fPhotos[fPhotos.length - 1]) || undefined,
              photos: fPhotos
            });
          }
        }

        nextCheckpoints.push({
          ...chk,
          photoUrl: compressedPhotoUrl || (compressedPhotos && compressedPhotos[compressedPhotos.length - 1]) || undefined,
          photos: compressedPhotos,
          measurementFields: nextFields
        });
      }
    }

    let nextMeterReadings = round.meterReadings;
    if (nextMeterReadings && typeof nextMeterReadings === 'object') {
      const mr: any = { ...nextMeterReadings };
      if (mr.waterMeterPhotoUrl) mr.waterMeterPhotoUrl = await compressOnce(mr.waterMeterPhotoUrl);
      if (mr.waterMeterPhotos) mr.waterMeterPhotos = await compressPhotoList(mr.waterMeterPhotos);
      if (mr.electricMeterPhotoUrl) mr.electricMeterPhotoUrl = await compressOnce(mr.electricMeterPhotoUrl);
      if (mr.electricMeterPhotos) mr.electricMeterPhotos = await compressPhotoList(mr.electricMeterPhotos);
      if (mr.gasMeterPhotoUrl) mr.gasMeterPhotoUrl = await compressOnce(mr.gasMeterPhotoUrl);
      if (mr.gasMeterPhotos) mr.gasMeterPhotos = await compressPhotoList(mr.gasMeterPhotos);

      if (mr.customMeters && typeof mr.customMeters === 'object') {
        const nextCustom: Record<string, any> = {};
        for (const k of Object.keys(mr.customMeters)) {
          const cm = mr.customMeters[k];
          if (!cm) {
            nextCustom[k] = cm;
            continue;
          }
          const cmUrl = await compressOnce(cm.photoUrl);
          const cmPhotos = await compressPhotoList(
            mergeUniquePhotos(cm.photos, cm.photoUrl ? [cm.photoUrl] : [])
          );
          nextCustom[k] = {
            ...cm,
            photoUrl: cmUrl || (cmPhotos && cmPhotos[cmPhotos.length - 1]) || undefined,
            photos: cmPhotos
          };
        }
        mr.customMeters = nextCustom;
      }
      nextMeterReadings = mr;
    }

    let nextAnomalies = round.anomalies;
    if (Array.isArray(round.anomalies)) {
      nextAnomalies = [];
      for (const a of round.anomalies) {
        if (!a) {
          nextAnomalies.push(a);
          continue;
        }
        const aUrl = await compressOnce(a.photoUrl);
        const aPhotos = await compressPhotoList(
          mergeUniquePhotos(a.photos, a.photoUrl ? [a.photoUrl] : [])
        );
        nextAnomalies.push({
          ...a,
          photoUrl: aUrl || (aPhotos && aPhotos[aPhotos.length - 1]) || undefined,
          photos: aPhotos
        });
      }
    }

    const nextRootPhotos = await compressPhotoList(round.photos);

    return {
      ...round,
      checkpoints: nextCheckpoints,
      meterReadings: nextMeterReadings,
      anomalies: nextAnomalies,
      photos: nextRootPhotos
    };
  } finally {
    cache.clear();
  }
}

export function isValidRoundPhotoUrl(u?: string | null): boolean {
  if (typeof u !== 'string') return false;
  const trimmed = u.trim();
  return (
    trimmed.length >= 25 &&
    !trimmed.includes('cached_in_db') &&
    (trimmed.startsWith('data:image/') ||
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('/assets/') ||
      trimmed.startsWith('blob:'))
  );
}

/**
 * Deduplicates and validates a photo list without ever dropping valid captured photos.
 */
export function mergeUniquePhotos(
  ...lists: ((string | undefined | null)[] | undefined | null)[]
): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  const addIfValid = (u?: string | null) => {
    if (!isValidRoundPhotoUrl(u)) return;
    const trimmed = (u as string).trim();
    if (!seen.has(trimmed)) {
      seen.add(trimmed);
      result.push(trimmed);
    }
  };

  lists.forEach((list) => {
    if (Array.isArray(list)) {
      list.forEach(addIfValid);
    }
  });

  return result;
}

/**
 * Collects every valid unique photo URL attached anywhere on a round.
 */
export function collectRoundPhotoUrls(round: any): string[] {
  if (!round || typeof round !== 'object') return [];
  const seen = new Set<string>();
  const result: string[] = [];

  const add = (u?: string | null) => {
    if (!isValidRoundPhotoUrl(u)) return;
    const trimmed = (u as string).trim();
    if (!seen.has(trimmed)) {
      seen.add(trimmed);
      result.push(trimmed);
    }
  };

  if (Array.isArray(round.checkpoints)) {
    for (const c of round.checkpoints) {
      if (!c) continue;
      add(c.photoUrl);
      if (Array.isArray(c.photos)) c.photos.forEach(add);
      if (Array.isArray(c.measurementFields)) {
        for (const f of c.measurementFields) {
          if (!f) continue;
          add(f.photoUrl);
          if (Array.isArray(f.photos)) f.photos.forEach(add);
        }
      }
    }
  }

  const mr = round.meterReadings;
  if (mr && typeof mr === 'object') {
    add(mr.waterMeterPhotoUrl);
    if (Array.isArray(mr.waterMeterPhotos)) mr.waterMeterPhotos.forEach(add);
    add(mr.electricMeterPhotoUrl);
    if (Array.isArray(mr.electricMeterPhotos)) mr.electricMeterPhotos.forEach(add);
    add(mr.gasMeterPhotoUrl);
    if (Array.isArray(mr.gasMeterPhotos)) mr.gasMeterPhotos.forEach(add);
    if (mr.customMeters && typeof mr.customMeters === 'object') {
      Object.values(mr.customMeters).forEach((cm: any) => {
        if (!cm) return;
        add(cm.photoUrl);
        if (Array.isArray(cm.photos)) cm.photos.forEach(add);
      });
    }
  }

  if (Array.isArray(round.anomalies)) {
    for (const a of round.anomalies) {
      if (!a) continue;
      add(a.photoUrl);
      if (Array.isArray(a.photos)) a.photos.forEach(add);
    }
  }

  if (Array.isArray(round.photos)) {
    round.photos.forEach(add);
  }

  return result;
}

