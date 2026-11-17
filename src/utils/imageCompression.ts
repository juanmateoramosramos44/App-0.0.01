export interface ImageCompressionOptions {
  maxDimension?: number;
  quality?: number;
}

/**
 * Compresses any DataURL / Base64 image into a crisp, compact JPEG DataURL
 * suitable for fast upload over weak Wi-Fi / mobile signal without losing visual clarity.
 */
export function compressImageDataUrl(
  dataUrl: string,
  options: ImageCompressionOptions = {}
): Promise<string> {
  const { maxDimension = 840, quality = 0.62 } = options;

  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
    return Promise.resolve(dataUrl);
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve(dataUrl);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const naturalWidth = img.naturalWidth || img.width;
        const naturalHeight = img.naturalHeight || img.height;

        if (!naturalWidth || !naturalHeight) {
          resolve(dataUrl);
          return;
        }

        let targetWidth = naturalWidth;
        let targetHeight = naturalHeight;

        if (naturalWidth > maxDimension || naturalHeight > maxDimension) {
          const ratio = Math.min(maxDimension / naturalWidth, maxDimension / naturalHeight);
          targetWidth = Math.max(1, Math.round(naturalWidth * ratio));
          targetHeight = Math.max(1, Math.round(naturalHeight * ratio));
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        const compressed = canvas.toDataURL('image/jpeg', quality);
        // Only keep compressed if valid and actually smaller (or resized)
        if (compressed && compressed.startsWith('data:image/jpeg') && (compressed.length < dataUrl.length || targetWidth < naturalWidth || targetHeight < naturalHeight)) {
          resolve(compressed);
        } else {
          resolve(dataUrl);
        }
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Reads an image File / Blob and compresses it into a compact JPEG DataURL.
 */
export function compressImageFile(
  file: File | Blob,
  optionsOrMaxDim: ImageCompressionOptions | number = {},
  qualityArg?: number
): Promise<string> {
  const options: ImageCompressionOptions = typeof optionsOrMaxDim === 'number'
    ? { maxDimension: optionsOrMaxDim, quality: qualityArg }
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

