import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, 
  X, 
  RotateCw, 
  Zap, 
  ZapOff, 
  Check, 
  AlertCircle, 
  Sparkles, 
  RefreshCw, 
  Image as ImageIcon, 
  Gauge, 
  Smartphone,
  FolderOpen,
  Maximize2,
  Focus,
  Plus,
  Trash2
} from 'lucide-react';
import { compressImageDataUrl, compressImageFile } from '../../utils/imageCompression';

export interface MeterScanResult {
  value: number;
  rawText?: string;
  unit?: string;
  confidence?: 'high' | 'medium' | 'low';
  meterType?: string;
  notes?: string;
  photoUrl: string;
  photoUrls?: string[];
}

interface SmartMeterScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  meterName?: string;
  meterTypeHint?: string;
  expectedUnit?: string;
  initialValue?: number | string;
  initialPhotoMode?: 'ai' | 'normal';
  allowedPhotoMode?: 'ai' | 'normal' | 'both' | 'none';
  allowMultiple?: boolean;
  onApplyReading: (result: MeterScanResult) => void;
}

export const SmartMeterScannerModal: React.FC<SmartMeterScannerModalProps> = ({
  isOpen,
  onClose,
  title = "Escaneo de Contador / Punto de Ronda",
  meterName = "Contador",
  meterTypeHint = "contador",
  expectedUnit = "",
  initialValue,
  initialPhotoMode = 'ai',
  allowedPhotoMode = 'both',
  allowMultiple = false,
  onApplyReading,
}) => {
  const getResolvedMode = () => {
    if (allowedPhotoMode === 'normal') return 'normal';
    if (allowedPhotoMode === 'ai') return 'ai';
    return initialPhotoMode || 'ai';
  };

  const [photoScanMode, setPhotoScanMode] = useState<'ai' | 'normal'>(getResolvedMode);
  const [captureFrameMode, setCaptureFrameMode] = useState<'blue_box' | 'full'>(() => {
    try {
      const saved = localStorage.getItem('hotel_maint_capture_frame_pref');
      if (saved === 'blue_box' || saved === 'full') return saved;
    } catch {}
    return getResolvedMode() === 'ai' ? 'blue_box' : 'full';
  });
  const [mode, setMode] = useState<'camera' | 'upload'>(() => {
    try {
      const saved = localStorage.getItem('hotel_maint_photo_source_pref');
      if (saved === 'camera' || saved === 'upload') return saved;
    } catch {}
    return 'camera';
  });
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedQueue, setCapturedQueue] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanResult, setScanResult] = useState<{
    value: number | null;
    rawText: string;
    unit: string;
    confidence: 'high' | 'medium' | 'low';
    meterType: string;
    notes: string;
  } | null>(null);
  const [editedValue, setEditedValue] = useState<string>('');
  const [editedUnit, setEditedUnit] = useState<string>(expectedUnit);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStartingCamera, setIsStartingCamera] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const reticleRef = useRef<HTMLDivElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraAppInputRef = useRef<HTMLInputElement | null>(null);
  const cameraStartingRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const torchOnRef = useRef(false);

  useEffect(() => {
    torchOnRef.current = torchOn;
  }, [torchOn]);

  const stopCamera = useCallback(async () => {
    cameraStartingRef.current = false;
    setIsStartingCamera(false);

    const activeStreams = new Set<MediaStream>();
    if (streamRef.current) activeStreams.add(streamRef.current);
    const videoSrc = videoRef.current?.srcObject as MediaStream | null;
    if (videoSrc && typeof videoSrc.getTracks === 'function') activeStreams.add(videoSrc);

    const hadTorchOn = torchOnRef.current;
    torchOnRef.current = false;
    setTorchOn(false);

    for (const activeStream of activeStreams) {
      const videoTracks = activeStream.getVideoTracks ? activeStream.getVideoTracks() : [];
      for (const track of videoTracks) {
        try {
          if (track.readyState === 'live' && typeof (track as any).applyConstraints === 'function') {
            await (track as any).applyConstraints({ advanced: [{ torch: false }] }).catch(() => {});
          }
        } catch {
          // ignore
        }
      }
    }

    if (hadTorchOn && activeStreams.size > 0) {
      await new Promise((r) => setTimeout(r, 70));
    }

    for (const activeStream of activeStreams) {
      const tracks = activeStream.getTracks ? activeStream.getTracks() : [];
      for (const track of tracks) {
        try {
          track.stop();
        } catch {
          // ignore
        }
      }
    }

    if (videoRef.current) {
      try {
        videoRef.current.srcObject = null;
      } catch {}
    }

    streamRef.current = null;
    setStream(null);
    setHasTorch(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (cameraStartingRef.current) return;
    cameraStartingRef.current = true;
    setIsStartingCamera(true);
    setCameraError(null);

    // Ensure previous stream and hardware flash are completely shut off first
    await stopCamera();
    cameraStartingRef.current = true;
    setIsStartingCamera(true);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Tu navegador o entorno no tiene soporte de cámara web directa. Usa el botón verde para abrir la cámara de tu teléfono.');
      cameraStartingRef.current = false;
      setIsStartingCamera(false);
      return;
    }

    const constraintSets: MediaStreamConstraints[] = [
      {
        video: {
          facingMode: facingMode ? { ideal: facingMode } : 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      },
      {
        video: {
          facingMode: facingMode ? { ideal: facingMode } : 'environment'
        },
        audio: false
      },
      {
        video: true,
        audio: false
      }
    ];

    let mediaStream: MediaStream | null = null;
    let lastError: any = null;

    for (const constraints of constraintSets) {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        if (mediaStream) break;
      } catch (err: any) {
        lastError = err;
        console.warn('Camera attempt failed with constraints:', constraints, err);
      }
    }

    if (!mediaStream) {
      const errName = lastError?.name || '';
      let errMsg = 'No se pudo iniciar la cámara en vivo en este navegador.';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        errMsg = 'Permiso de cámara denegado o bloqueado por el navegador.';
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        errMsg = 'No se encontró cámara disponible en el dispositivo.';
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        errMsg = 'La cámara está ocupada por otra aplicación o pestaña.';
      }
      setCameraError(errMsg);
      cameraStartingRef.current = false;
      setIsStartingCamera(false);
      return;
    }

    streamRef.current = mediaStream;
    setStream(mediaStream);
    setCameraError(null);
    torchOnRef.current = false;
    setTorchOn(false);

    if (videoRef.current) {
      videoRef.current.srcObject = mediaStream;
      videoRef.current.setAttribute('playsinline', 'true');
      videoRef.current.setAttribute('webkit-playsinline', 'true');
      videoRef.current.muted = true;
      videoRef.current.play().catch(e => console.warn('Video play warning in startCamera:', e));
    }

    try {
      const track = mediaStream.getVideoTracks()[0];
      const capabilities = track?.getCapabilities ? (track.getCapabilities() as any) : {};
      setHasTorch(Boolean(capabilities && capabilities.torch));
    } catch {
      setHasTorch(false);
    }

    cameraStartingRef.current = false;
    setIsStartingCamera(false);
  }, [facingMode, stopCamera]);

  const handleCloseModal = useCallback(async () => {
    await stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  const switchSourceMode = (newMode: 'camera' | 'upload') => {
    setMode(newMode);
    try {
      localStorage.setItem('hotel_maint_photo_source_pref', newMode);
    } catch {}
    if (newMode === 'camera') {
      void startCamera();
    } else {
      void stopCamera();
    }
  };

  const handleFrameModeChange = (nextFrameMode: 'blue_box' | 'full') => {
    setCaptureFrameMode(nextFrameMode);
    try {
      localStorage.setItem('hotel_maint_capture_frame_pref', nextFrameMode);
    } catch {}
  };

  // Start camera when modal opens in camera mode, and ALWAYS cleanup torch/stream on close or unmount
  useEffect(() => {
    if (!isOpen) {
      void stopCamera();
      setCapturedImage(null);
      setCapturedQueue([]);
      setScanResult(null);
      setCameraError(null);
      setErrorMsg(null);
      return;
    }

    const resolved = allowedPhotoMode === 'normal' ? 'normal' : allowedPhotoMode === 'ai' ? 'ai' : (initialPhotoMode || 'ai');
    setPhotoScanMode(resolved);

    if (initialValue !== undefined && initialValue !== null && initialValue !== '') {
      setEditedValue(String(initialValue));
    } else {
      setEditedValue('');
    }
    setEditedUnit(expectedUnit);

    if (mode === 'camera') {
      void startCamera();
    } else {
      void stopCamera();
    }

    return () => {
      void stopCamera();
    };
  }, [isOpen, mode, facingMode, allowedPhotoMode, initialPhotoMode, initialValue, expectedUnit, startCamera, stopCamera]);

  // Safety net on full unmount
  useEffect(() => {
    return () => {
      void stopCamera();
    };
  }, [stopCamera]);

  // Dedicated effect to attach stream to video element whenever stream changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    video.srcObject = stream;
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    video.muted = true;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(e => {
        console.warn('Video play warning:', e);
      });
    }
  }, [stream]);

  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && stream) {
      node.srcObject = stream;
      node.setAttribute('playsinline', 'true');
      node.setAttribute('webkit-playsinline', 'true');
      node.muted = true;
      node.play().catch(e => console.warn('Video play warning on ref mount:', e));
    }
  }, [stream]);

  const toggleTorch = async () => {
    const activeStream = streamRef.current || stream;
    if (!activeStream) return;
    const track = activeStream.getVideoTracks()[0];
    if (!track) return;
    const nextTorch = !torchOnRef.current;
    try {
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }]
      });
      torchOnRef.current = nextTorch;
      setTorchOn(nextTorch);
    } catch (e) {
      console.warn("Could not toggle torch:", e);
      torchOnRef.current = false;
      setTorchOn(false);
    }
  };

  const switchFacingMode = async () => {
    await stopCamera();
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
  };

  const handleCapturePhoto = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 720;

    let sx = 0;
    let sy = 0;
    let sw = vw;
    let sh = vh;

    // Exact canvas crop for "Solo cuadro azul" accounting for object-cover scaling
    if (captureFrameMode === 'blue_box' && reticleRef.current) {
      const videoRect = video.getBoundingClientRect();
      const reticleRect = reticleRef.current.getBoundingClientRect();

      if (videoRect.width > 0 && videoRect.height > 0 && reticleRect.width > 0 && reticleRect.height > 0) {
        const scale = Math.max(videoRect.width / vw, videoRect.height / vh);
        const dispW = vw * scale;
        const dispH = vh * scale;
        const offsetX = (dispW - videoRect.width) / 2;
        const offsetY = (dispH - videoRect.height) / 2;

        const rawSx = ((reticleRect.left - videoRect.left) + offsetX) / scale;
        const rawSy = ((reticleRect.top - videoRect.top) + offsetY) / scale;
        const rawSw = reticleRect.width / scale;
        const rawSh = reticleRect.height / scale;

        sx = Math.max(0, Math.min(vw - 20, Math.round(rawSx)));
        sy = Math.max(0, Math.min(vh - 20, Math.round(rawSy)));
        sw = Math.max(20, Math.min(vw - sx, Math.round(rawSw)));
        sh = Math.max(20, Math.min(vh - sy, Math.round(rawSh)));
      }
    }

    const canvas = document.createElement('canvas');
    const maxDim = 840;
    let outW = sw;
    let outH = sh;
    if (outW > maxDim || outH > maxDim) {
      const ratio = Math.min(maxDim / outW, maxDim / outH);
      outW = Math.max(1, Math.round(outW * ratio));
      outH = Math.max(1, Math.round(outH * ratio));
    }
    canvas.width = outW;
    canvas.height = outH;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, outW, outH);
    const rawDataUrl = canvas.toDataURL('image/jpeg', 0.68);
    const compressedUrl = await compressImageDataUrl(rawDataUrl, { maxDimension: 840, quality: 0.68, maxBytes: 135 * 1024 });

    // Force torch OFF and release camera immediately after snap
    await stopCamera();

    setCapturedImage(compressedUrl);
    setCapturedQueue(prev => [...prev, compressedUrl]);

    if (photoScanMode === 'ai') {
      analyzeImage(compressedUrl);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    await stopCamera();

    const compressedList: string[] = [];
    for (const file of files) {
      try {
        const compressed = await compressImageFile(file, { maxDimension: 840, quality: 0.68, maxBytes: 135 * 1024 });
        if (compressed) compressedList.push(compressed);
      } catch (err) {
        console.warn('Error compressing uploaded photo:', err);
      }
    }

    e.target.value = '';
    if (compressedList.length === 0) return;

    const primaryImg = compressedList[compressedList.length - 1];
    setCapturedImage(primaryImg);
    setCapturedQueue(prev => allowMultiple ? [...prev, ...compressedList] : [primaryImg]);

    if (photoScanMode === 'ai') {
      analyzeImage(primaryImg);
    }
  };

  const analyzeImage = async (dataUrl: string) => {
    setIsAnalyzing(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/ai/read-meter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image: dataUrl,
          meterType: `${meterName} (${meterTypeHint}, unidad esperada: ${expectedUnit || 'm3/kWh/PSI'})`,
          context: { meterName, expectedUnit }
        })
      });

      const data = await res.json();
      if (data.success && data.result) {
        const r = data.result;
        setScanResult({
          value: r.value !== undefined && r.value !== null ? Number(r.value) : null,
          rawText: r.rawText || '',
          unit: r.unit || expectedUnit || '',
          confidence: r.confidence || 'medium',
          meterType: r.meterType || meterName,
          notes: r.notes || ''
        });

        if (r.value !== undefined && r.value !== null) {
          setEditedValue(String(r.value));
        } else if (r.rawText) {
          const match = r.rawText.replace(/,/g, '.').match(/[-+]?[0-9]*\.?[0-9]+/);
          if (match) {
            setEditedValue(match[0]);
          }
        }
        if (r.unit) {
          setEditedUnit(r.unit);
        }
      } else {
        setErrorMsg(data.error || "No se pudo interpretar los dígitos del contador. Por favor ingrese el valor manualmente.");
      }
    } catch (err: any) {
      console.error("Error analyzing meter photo:", err);
      setErrorMsg("Ocurrió un error al contactar al motor de reconocimiento visual. Puedes ingresar el valor manualmente.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCaptureAnother = () => {
    setCapturedImage(null);
    setScanResult(null);
    setErrorMsg(null);
    if (mode === 'camera') {
      void startCamera();
    }
  };

  const handleRemoveQueuedPhoto = (idx: number) => {
    setCapturedQueue(prev => {
      const next = prev.filter((_, i) => i !== idx);
      if (next.length === 0) {
        setCapturedImage(null);
        if (mode === 'camera') void startCamera();
      } else {
        setCapturedImage(next[next.length - 1]);
      }
      return next;
    });
  };

  const handleApply = async () => {
    await stopCamera();

    let num: number = 0;
    if (editedValue !== '') {
      const parsed = parseFloat(editedValue.replace(',', '.'));
      if (!isNaN(parsed)) {
        num = parsed;
      }
    } else if (initialValue !== undefined && initialValue !== null && initialValue !== '') {
      const parsed = typeof initialValue === 'number' ? initialValue : parseFloat(String(initialValue).replace(',', '.'));
      if (!isNaN(parsed)) {
        num = parsed;
      }
    }

    const allPhotos = capturedQueue.length > 0
      ? capturedQueue
      : (capturedImage ? [capturedImage] : []);

    onApplyReading({
      value: num,
      rawText: scanResult?.rawText || editedValue || String(num),
      unit: editedUnit || expectedUnit,
      confidence: photoScanMode === 'ai' ? (scanResult?.confidence || 'high') : 'high',
      meterType: scanResult?.meterType || meterName,
      notes: scanResult?.notes || (photoScanMode === 'normal' ? 'Foto de evidencia capturada' : ''),
      photoUrl: allPhotos[allPhotos.length - 1] || capturedImage || '',
      photoUrls: allPhotos
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-white/15 rounded-xl backdrop-blur-xs">
              {photoScanMode === 'ai' ? (
                <Sparkles className="w-5 h-5 text-amber-300" />
              ) : (
                <Camera className="w-5 h-5 text-emerald-300" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">
                {title}
              </h3>
              <p className="text-[11px] text-blue-100/90 font-medium">
                {meterName} {expectedUnit ? `(${expectedUnit})` : ''} • {photoScanMode === 'ai' ? 'Reconocimiento Inteligente IA' : 'Captura de Evidencia Normal'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleCloseModal()}
            className="p-1.5 text-blue-100 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector / Configured Mode Banner */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-center">
          {allowedPhotoMode === 'both' ? (
            <div className="flex items-center gap-2 w-full max-w-sm">
              <button
                type="button"
                onClick={() => {
                  setPhotoScanMode('ai');
                  if (capturedImage && !scanResult) {
                    analyzeImage(capturedImage);
                  }
                }}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 border cursor-pointer ${
                  photoScanMode === 'ai'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Modo IA (Lectura Dígitos)</span>
              </button>
              <button
                type="button"
                onClick={() => setPhotoScanMode('normal')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 border cursor-pointer ${
                  photoScanMode === 'normal'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Foto Normal (Sin IA)</span>
              </button>
            </div>
          ) : allowedPhotoMode === 'normal' ? (
            <div className="flex items-center space-x-2 py-1 px-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold">
              <Camera className="w-4 h-4 text-blue-600" />
              <span>Modo Configurado: Captura de Foto Normal (Sin Modo IA)</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 py-1 px-3.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs font-bold">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>Modo Configurado: Foto con Reconocimiento IA (Lectura Dígitos)</span>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1">
          {/* Source Selector: Cámara en Vivo vs Foto de mi Teléfono (Galería) */}
          {!capturedImage && (
            <div className="bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-2 py-0.5 mb-1 flex items-center justify-between">
                <span>¿Cómo deseas ingresar la foto?</span>
                <span className="text-[10px] text-slate-400 font-normal">Toca para cambiar</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => switchSourceMode('camera')}
                  className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    mode === 'camera'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-400/20'
                      : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <Camera className={`w-4 h-4 shrink-0 ${mode === 'camera' ? 'text-white' : 'text-blue-600'}`} />
                  <div className="text-left">
                    <div className="leading-tight font-extrabold">Cámara en Vivo</div>
                    <div className={`text-[10px] font-normal ${mode === 'camera' ? 'text-blue-100' : 'text-slate-500'}`}>Capturar en tiempo real</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => switchSourceMode('upload')}
                  className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    mode === 'upload'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-400/20'
                      : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <Smartphone className={`w-4 h-4 shrink-0 ${mode === 'upload' ? 'text-amber-300' : 'text-amber-500'}`} />
                  <div className="text-left">
                    <div className="leading-tight font-extrabold">Foto de mi Teléfono</div>
                    <div className={`text-[10px] font-normal ${mode === 'upload' ? 'text-blue-100' : 'text-slate-500'}`}>Elegir de mi galería</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Queued photos strip if taking multiple */}
          {capturedQueue.length > 0 && !capturedImage && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 overflow-x-auto">
                <span className="text-[11px] font-bold text-blue-900 shrink-0">
                  {capturedQueue.length} foto(s) lista(s):
                </span>
                {capturedQueue.map((imgUrl, idx) => (
                  <img
                    key={idx}
                    src={imgUrl}
                    alt={`Foto ${idx + 1}`}
                    className="w-10 h-10 rounded-lg object-cover border border-blue-300 shrink-0"
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => setCapturedImage(capturedQueue[capturedQueue.length - 1])}
                className="px-2.5 py-1 bg-blue-600 text-white text-[11px] font-bold rounded-lg shrink-0 cursor-pointer"
              >
                Ver / Guardar
              </button>
            </div>
          )}

          {/* Camera / Capture Section */}
          {!capturedImage ? (
            <div className="space-y-2.5">
              {mode === 'camera' ? (
                <div className="space-y-2.5">
                  {/* Blue Box vs Full Frame Selector */}
                  {!cameraError && (
                    <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => handleFrameModeChange('blue_box')}
                        className={`py-2 px-2.5 rounded-lg text-[11px] font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                          captureFrameMode === 'blue_box'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <Focus className="w-3.5 h-3.5" />
                        <span>Solo Cuadro Azul</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFrameModeChange('full')}
                        className={`py-2 px-2.5 rounded-lg text-[11px] font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                          captureFrameMode === 'full'
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>Foto Completa</span>
                      </button>
                    </div>
                  )}

                  {cameraError ? (
                    <div className="flex flex-col items-center justify-center p-6 text-center text-white bg-slate-900 rounded-2xl aspect-4/3 sm:aspect-16/10 border border-slate-800 space-y-4 shadow-inner animate-in fade-in duration-200">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-lg">
                        <Camera className="w-7 h-7" />
                      </div>
                      <div className="max-w-xs space-y-1">
                        <h4 className="font-extrabold text-sm text-slate-100">
                          Usar Cámara Directa de tu Teléfono
                        </h4>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          El navegador o la vista previa bloquea el visor web continuo. Toca el botón verde para tomar la foto directamente con la cámara de tu celular:
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2.5 w-full max-w-sm pt-1">
                        <button
                          type="button"
                          onClick={async () => {
                            await stopCamera();
                            cameraAppInputRef.current?.click();
                          }}
                          className="flex-1 py-3 px-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center space-x-2 transition-all cursor-pointer transform active:scale-95 border border-emerald-400/30"
                        >
                          <Camera className="w-4 h-4" />
                          <span>Tomar Foto con mi Celular</span>
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            await stopCamera();
                            galleryInputRef.current?.click();
                          }}
                          className="flex-1 py-3 px-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center space-x-2 transition-all cursor-pointer transform active:scale-95 border border-blue-400/30"
                        >
                          <ImageIcon className="w-4 h-4 text-amber-300" />
                          <span>Elegir de mi Galería</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => void startCamera()}
                        className="text-[11px] text-slate-400 hover:text-white underline transition-colors cursor-pointer pt-1"
                      >
                        Reintentar visor en vivo
                      </button>
                    </div>
                  ) : (
                    <div className="relative bg-slate-950 rounded-2xl overflow-hidden aspect-4/3 sm:aspect-16/10 flex items-center justify-center shadow-inner border border-slate-800">
                      <video
                        ref={setVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />

                      {/* Loading indicator while camera initializes */}
                      {isStartingCamera && !stream && (
                        <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-white space-y-2 z-20">
                          <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
                          <p className="text-xs font-semibold text-slate-200">Iniciando cámara en vivo...</p>
                        </div>
                      )}

                      {/* Optical Reticle / Target Guide */}
                      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                        {captureFrameMode === 'blue_box' ? (
                          <div
                            ref={reticleRef}
                            className={`w-4/5 ${photoScanMode === 'ai' ? 'h-32' : 'h-44'} border-2 border-blue-400 rounded-2xl relative shadow-[0_0_0_9999px_rgba(2,6,23,0.45)] flex items-center justify-center bg-blue-500/5`}
                          >
                            {/* Crisp blue corner guides */}
                            <span className="absolute -top-0.5 -left-0.5 w-4 h-4 border-t-4 border-l-4 border-blue-300 rounded-tl-xl" />
                            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 border-t-4 border-r-4 border-blue-300 rounded-tr-xl" />
                            <span className="absolute -bottom-0.5 -left-0.5 w-4 h-4 border-b-4 border-l-4 border-blue-300 rounded-bl-xl" />
                            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 border-b-4 border-r-4 border-blue-300 rounded-br-xl" />

                            <div className="absolute -top-3 px-2.5 py-0.5 bg-blue-600 text-white font-black text-[10px] tracking-wide uppercase rounded-md shadow-xs flex items-center space-x-1">
                              {photoScanMode === 'ai' ? <Gauge className="w-3 h-3" /> : <Focus className="w-3 h-3" />}
                              <span>{photoScanMode === 'ai' ? 'Solo cuadro azul (dígitos)' : 'Recorte: Solo cuadro azul'}</span>
                            </div>
                            {photoScanMode === 'ai' && (
                              <div className="w-full h-0.5 bg-blue-400/50 animate-pulse" />
                            )}
                          </div>
                        ) : (
                          <div className="w-[92%] h-[82%] border border-dashed border-white/45 rounded-2xl relative flex items-start justify-center">
                            <div className="mt-2 px-2.5 py-0.5 bg-slate-900/80 text-white font-bold text-[10px] tracking-wide uppercase rounded-md border border-white/20 flex items-center space-x-1">
                              <Maximize2 className="w-3 h-3 text-emerald-300" />
                              <span>Foto Completa (Entorno completo)</span>
                            </div>
                          </div>
                        )}
                        <p className="mt-3 text-[11px] text-white/90 text-center font-medium bg-slate-950/75 px-3 py-1 rounded-full backdrop-blur-xs shadow-xs">
                          {captureFrameMode === 'blue_box'
                            ? 'Se guardará únicamente el área dentro del cuadro azul'
                            : 'Se guardará la toma completa visible en la pantalla'}
                        </p>
                      </div>

                      {/* Camera Controls Overlay */}
                      <div className="absolute top-3 right-3 flex items-center space-x-2 z-10">
                        {hasTorch && (
                          <button
                            type="button"
                            onClick={() => void toggleTorch()}
                            className={`p-2 rounded-full backdrop-blur-md transition-all shadow-md cursor-pointer ${
                              torchOn ? 'bg-amber-400 text-slate-950' : 'bg-slate-900/80 text-white hover:bg-slate-800'
                            }`}
                            title={torchOn ? 'Apagar linterna / flash' : 'Encender linterna / flash'}
                          >
                            {torchOn ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void switchFacingMode()}
                          className="p-2 rounded-full bg-slate-900/80 text-white hover:bg-slate-800 backdrop-blur-md transition-all shadow-md cursor-pointer"
                          title="Girar cámara"
                        >
                          <RotateCw className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Snap Button */}
                      <div className="absolute bottom-3 inset-x-0 flex items-center justify-center z-10">
                        <button
                          type="button"
                          onClick={() => void handleCapturePhoto()}
                          disabled={!stream}
                          className={`group flex items-center space-x-2 text-white px-6 py-3 rounded-full font-extrabold text-sm shadow-xl hover:shadow-2xl transition-all transform active:scale-95 cursor-pointer border-2 border-white/80 ${
                            !stream
                              ? 'bg-slate-600 opacity-60 cursor-not-allowed'
                              : photoScanMode === 'ai'
                              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
                              : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700'
                          }`}
                        >
                          {photoScanMode === 'ai' ? (
                            <>
                              <Sparkles className="w-5 h-5 group-hover:scale-110 transition-transform text-amber-300" />
                              <span>{captureFrameMode === 'blue_box' ? 'Capturar Cuadro y Leer IA' : 'Capturar Completa y Leer IA'}</span>
                            </>
                          ) : (
                            <>
                              <Camera className="w-5 h-5 group-hover:scale-110 transition-transform" />
                              <span>{captureFrameMode === 'blue_box' ? 'Capturar Cuadro Azul' : 'Capturar Foto Completa'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Switch to phone gallery shortcut below live camera */}
                  <div className="flex items-center justify-center mt-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        switchSourceMode('upload');
                        setTimeout(() => galleryInputRef.current?.click(), 80);
                      }}
                      className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center space-x-1.5 py-1.5 px-3 rounded-xl hover:bg-blue-50 transition-colors cursor-pointer border border-blue-200/60 bg-blue-50/30"
                    >
                      <ImageIcon className="w-4 h-4 text-blue-600" />
                      <span>¿Ya tienes la foto en tu teléfono? Elegir de mi galería</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Upload Mode: Foto de mi teléfono / Galería */
                <div className="border-2 border-dashed border-blue-300 hover:border-blue-500 bg-gradient-to-b from-blue-50/70 to-indigo-50/40 rounded-2xl p-6 sm:p-7 text-center transition-all flex flex-col items-center justify-center space-y-4 shadow-xs">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
                    <FolderOpen className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-base">
                      Subir foto desde la galería de tu teléfono
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto leading-relaxed">
                      Selecciona {allowMultiple ? 'una o varias fotos' : 'una foto'} de contador o evidencia guardada en tu dispositivo.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5 w-full max-w-md pt-1">
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="flex-1 py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md hover:shadow-lg flex items-center justify-center space-x-2 transition-all cursor-pointer transform active:scale-98"
                    >
                      <ImageIcon className="w-4 h-4 text-amber-300" />
                      <span>Abrir Galería de mi Teléfono</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await stopCamera();
                        cameraAppInputRef.current?.click();
                      }}
                      className="py-3.5 px-4 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs rounded-xl shadow-xs flex items-center justify-center space-x-2 transition-all cursor-pointer transform active:scale-98"
                    >
                      <Camera className="w-4 h-4 text-slate-600" />
                      <span>Cámara Nativa del Móvil</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-500 font-medium">
                    Se comprime automáticamente para envío rápido incluso con baja señal.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Result & Preview Section */
            <div className="space-y-3.5">
              {/* Photo Preview & Scanning Status */}
              <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 aspect-16/10 flex items-center justify-center shadow-md">
                <img
                  src={capturedImage}
                  alt="Evidencia capturada"
                  className="w-full h-full object-contain"
                />

                {isAnalyzing && (
                  <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-white text-center space-y-3 animate-in fade-in duration-200">
                    <div className="relative">
                      <RefreshCw className="w-10 h-10 text-amber-400 animate-spin" />
                      <Sparkles className="w-4 h-4 text-emerald-300 absolute -top-1 -right-1 animate-bounce" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-white">Analizando dígitos con Visión IA...</p>
                      <p className="text-[11px] text-blue-200 mt-0.5">Detectando rodillos, diales y decimales</p>
                    </div>
                  </div>
                )}

                {!isAnalyzing && (
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (!allowMultiple) {
                          setCapturedQueue([]);
                        }
                        handleCaptureAnother();
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-900/85 hover:bg-slate-900 text-white font-bold text-[11px] backdrop-blur-md border border-white/20 shadow-md flex items-center space-x-1.5 transition-all cursor-pointer"
                      title={allowMultiple ? 'Tomar otra foto adicional' : 'Volver a tomar con cámara en vivo'}
                    >
                      {allowMultiple ? <Plus className="w-3.5 h-3.5 text-emerald-300" /> : <Camera className="w-3.5 h-3.5 text-blue-300" />}
                      <span>{allowMultiple ? 'Agregar otra foto' : 'Repetir Cámara'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!allowMultiple) {
                          setCapturedImage(null);
                          setCapturedQueue([]);
                        }
                        setScanResult(null);
                        setErrorMsg(null);
                        switchSourceMode('upload');
                        setTimeout(() => galleryInputRef.current?.click(), 80);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-900/85 hover:bg-slate-900 text-white font-bold text-[11px] backdrop-blur-md border border-white/20 shadow-md flex items-center space-x-1.5 transition-all cursor-pointer"
                      title="Elegir foto desde la galería del teléfono"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-amber-300" />
                      <span>Galería</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Multi-photo strip in preview */}
              {capturedQueue.length > 1 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                  <div className="text-[11px] font-bold text-slate-700 mb-2 flex items-center justify-between">
                    <span>Fotos capturadas ({capturedQueue.length})</span>
                    <span className="text-[10px] text-slate-500 font-normal">Se guardarán todas sin reemplazar ninguna</span>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {capturedQueue.map((imgUrl, idx) => (
                      <div key={idx} className="relative shrink-0 group">
                        <img
                          src={imgUrl}
                          alt={`Evidencia ${idx + 1}`}
                          onClick={() => setCapturedImage(imgUrl)}
                          className={`w-14 h-14 rounded-lg object-cover border-2 cursor-pointer ${
                            capturedImage === imgUrl ? 'border-blue-600' : 'border-slate-200'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveQueuedPhoto(idx)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-xs hover:bg-rose-700 cursor-pointer"
                          title="Quitar foto"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Analysis / Evidence Result Card */}
              {!isAnalyzing && (
                <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
                    <div className="flex items-center space-x-2">
                      {photoScanMode === 'ai' ? (
                        <Sparkles className="w-4 h-4 text-purple-600" />
                      ) : (
                        <Camera className="w-4 h-4 text-emerald-600" />
                      )}
                      <span className="text-xs font-bold text-slate-800">
                        {photoScanMode === 'ai'
                          ? (scanResult?.meterType || "Lectura Reconocida por IA")
                          : `Foto de Evidencia Lista (${capturedQueue.length || 1})`}
                      </span>
                    </div>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                      photoScanMode === 'ai'
                        ? scanResult?.confidence === 'high'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : scanResult?.confidence === 'medium'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-purple-100 text-purple-800 border-purple-300'
                        : 'bg-blue-100 text-blue-800 border-blue-300'
                    }`}>
                      {photoScanMode === 'ai'
                        ? (scanResult?.confidence === 'high' ? 'Confianza Alta 99%' : scanResult?.confidence === 'medium' ? 'Confianza Media' : 'Modo IA')
                        : 'Modo Normal'}
                    </span>
                  </div>

                  {/* Value Input and Verification */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      {photoScanMode === 'ai'
                        ? 'Valor Detectado (Puedes verificar o corregir antes de guardar):'
                        : 'Valor / Medición Numérica (Opcional):'}
                    </label>
                    <div className="flex items-center space-x-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={editedValue}
                          onChange={(e) => setEditedValue(e.target.value)}
                          placeholder="0.0"
                          className={`w-full text-xl sm:text-2xl font-black text-slate-900 bg-white border-2 rounded-xl px-4 py-2 text-center font-mono focus:ring-4 outline-none ${
                            photoScanMode === 'ai' ? 'border-purple-500 focus:ring-purple-100' : 'border-emerald-500 focus:ring-emerald-100'
                          }`}
                        />
                      </div>
                      {expectedUnit && (
                        <div className="w-24">
                          <input
                            type="text"
                            value={editedUnit}
                            onChange={(e) => setEditedUnit(e.target.value)}
                            placeholder="Unidad"
                            className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl px-2 py-3 text-center"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {photoScanMode === 'ai' && scanResult?.rawText && (
                    <div className="text-[11px] text-slate-500 flex items-center justify-between">
                      <span>Lectura óptica cruda: <strong className="font-mono text-slate-700">{scanResult.rawText}</strong></span>
                      {scanResult.notes && (
                        <span className="text-slate-600 truncate max-w-[200px]" title={scanResult.notes}>
                          {scanResult.notes}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Error notification if any */}
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">{errorMsg}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => void handleCloseModal()}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-200/70 font-semibold text-xs transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          {capturedImage && !isAnalyzing && (
            <button
              type="button"
              onClick={() => void handleApply()}
              className="flex-1 sm:flex-initial px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>
                {capturedQueue.length > 1
                  ? `Cargar ${capturedQueue.length} Fotos al Sistema`
                  : 'Cargar al Sistema'}
              </span>
            </button>
          )}
        </div>

        {/* Global hidden inputs: ALWAYS mounted and ready to trigger native device camera and gallery */}
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple={allowMultiple}
          onChange={handleFileUpload}
          className="hidden"
        />
        <input
          ref={cameraAppInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>
    </div>
  );
};
