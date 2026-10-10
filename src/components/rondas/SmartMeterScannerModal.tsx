import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, 
  Upload, 
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
  Info,
  CheckCircle2,
  Sliders,
  Smartphone,
  FolderOpen
} from 'lucide-react';

export interface MeterScanResult {
  value: number;
  rawText?: string;
  unit?: string;
  confidence?: 'high' | 'medium' | 'low';
  meterType?: string;
  notes?: string;
  photoUrl: string;
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
  onApplyReading,
}) => {
  const getResolvedMode = () => {
    if (allowedPhotoMode === 'normal') return 'normal';
    if (allowedPhotoMode === 'ai') return 'ai';
    return initialPhotoMode || 'ai';
  };

  const [photoScanMode, setPhotoScanMode] = useState<'ai' | 'normal'>(getResolvedMode);
  const [mode, setMode] = useState<'camera' | 'upload'>(() => {
    try {
      const saved = localStorage.getItem('hotel_maint_photo_source_pref');
      if (saved === 'camera' || saved === 'upload') return saved;
    } catch {}
    return 'camera';
  });
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
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
  const [cameraAvailable, setCameraAvailable] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStartingCamera, setIsStartingCamera] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraAppInputRef = useRef<HTMLInputElement | null>(null);
  const cameraStartingRef = useRef(false);

  const switchSourceMode = (newMode: 'camera' | 'upload') => {
    setMode(newMode);
    try {
      localStorage.setItem('hotel_maint_photo_source_pref', newMode);
    } catch {}
    if (newMode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
  };

  // Start camera when modal opens in camera mode
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedImage(null);
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
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, mode, facingMode]);

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

  const startCamera = async () => {
    if (cameraStartingRef.current) return;
    cameraStartingRef.current = true;
    setIsStartingCamera(true);
    setCameraError(null);

    // Stop existing stream tracks safely
    if (stream) {
      stream.getTracks().forEach(track => {
        try { track.stop(); } catch {}
      });
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Tu navegador o entorno no tiene soporte de cámara web directa. Usa el botón verde para abrir la cámara de tu teléfono.');
      setCameraAvailable(false);
      cameraStartingRef.current = false;
      setIsStartingCamera(false);
      return;
    }

    // Flexible fallback constraint sets: from 720p down to simplest video constraint
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
      setCameraAvailable(false);
      cameraStartingRef.current = false;
      setIsStartingCamera(false);
      return;
    }

    setStream(mediaStream);
    setCameraAvailable(true);
    setCameraError(null);

    if (videoRef.current) {
      videoRef.current.srcObject = mediaStream;
      videoRef.current.setAttribute('playsinline', 'true');
      videoRef.current.setAttribute('webkit-playsinline', 'true');
      videoRef.current.muted = true;
      videoRef.current.play().catch(e => console.warn('Video play warning in startCamera:', e));
    }

    // Check torch capabilities
    try {
      const track = mediaStream.getVideoTracks()[0];
      const capabilities = track.getCapabilities ? (track.getCapabilities() as any) : {};
      setHasTorch(Boolean(capabilities && capabilities.torch));
    } catch {
      setHasTorch(false);
    }

    cameraStartingRef.current = false;
    setIsStartingCamera(false);
  };

  const stopCamera = () => {
    cameraStartingRef.current = false;
    setIsStartingCamera(false);
    if (stream) {
      stream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      setStream(null);
    }
  };

  const toggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;
    try {
      const nextTorch = !torchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }]
      });
      setTorchOn(nextTorch);
    } catch (e) {
      console.warn("Could not toggle torch:", e);
    }
  };

  const switchFacingMode = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
  };

  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    let width = video.videoWidth || 1280;
    let height = video.videoHeight || 720;
    const maxDim = 1024;
    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
    setCapturedImage(dataUrl);
    stopCamera();
    if (photoScanMode === 'ai') {
      analyzeImage(dataUrl);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      if (!rawDataUrl) return;

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1024;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.75);
          setCapturedImage(compressed);
          if (photoScanMode === 'ai') {
            analyzeImage(compressed);
          }
        } else {
          setCapturedImage(rawDataUrl);
          if (photoScanMode === 'ai') {
            analyzeImage(rawDataUrl);
          }
        }
      };
      img.onerror = () => {
        setCapturedImage(rawDataUrl);
        if (photoScanMode === 'ai') {
          analyzeImage(rawDataUrl);
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
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
          // Extract numeric parts if value was null
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

  const handleRetake = () => {
    setCapturedImage(null);
    setScanResult(null);
    setErrorMsg(null);
    if (mode === 'camera') {
      startCamera();
    }
  };

  const handleApply = () => {
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

    onApplyReading({
      value: num,
      rawText: scanResult?.rawText || editedValue || String(num),
      unit: editedUnit || expectedUnit,
      confidence: photoScanMode === 'ai' ? (scanResult?.confidence || 'high') : 'high',
      meterType: scanResult?.meterType || meterName,
      notes: scanResult?.notes || (photoScanMode === 'normal' ? 'Foto de evidencia capturada' : ''),
      photoUrl: capturedImage || ''
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
            onClick={onClose}
            className="p-1.5 text-blue-100 hover:text-white hover:bg-white/10 rounded-full transition-colors"
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
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
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

          {/* Camera / Capture Section */}
          {!capturedImage ? (
            <div>
              {mode === 'camera' ? (
                <div>
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
                          onClick={() => cameraAppInputRef.current?.click()}
                          className="flex-1 py-3 px-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center space-x-2 transition-all cursor-pointer transform active:scale-95 border border-emerald-400/30"
                        >
                          <Camera className="w-4 h-4" />
                          <span>Tomar Foto con mi Celular</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => galleryInputRef.current?.click()}
                          className="flex-1 py-3 px-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center space-x-2 transition-all cursor-pointer transform active:scale-95 border border-blue-400/30"
                        >
                          <ImageIcon className="w-4 h-4 text-amber-300" />
                          <span>Elegir de mi Galería</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => startCamera()}
                        className="text-[11px] text-slate-400 hover:text-white underline transition-colors cursor-pointer pt-1"
                      >
                        🔄 Reintentar visor en vivo
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
                        {photoScanMode === 'ai' ? (
                          <div className="w-4/5 h-32 border-2 border-dashed border-amber-400/90 rounded-2xl relative shadow-2xl flex items-center justify-center bg-blue-500/5">
                            <div className="absolute -top-3 px-2 py-0.5 bg-amber-500 text-slate-950 font-black text-[10px] tracking-wide uppercase rounded-md shadow-xs flex items-center space-x-1">
                              <Gauge className="w-3 h-3" />
                              <span>Enfoque los dígitos o dial</span>
                            </div>
                            <div className="w-full h-0.5 bg-amber-400/40 animate-pulse"></div>
                          </div>
                        ) : (
                          <div className="w-4/5 h-44 border-2 border-emerald-400/70 rounded-2xl relative shadow-2xl flex items-center justify-center bg-emerald-500/5">
                            <div className="absolute -top-3 px-2 py-0.5 bg-emerald-600 text-white font-black text-[10px] tracking-wide uppercase rounded-md shadow-xs flex items-center space-x-1">
                              <Camera className="w-3 h-3" />
                              <span>Encuadre la foto de evidencia</span>
                            </div>
                          </div>
                        )}
                        <p className="mt-4 text-[11px] text-white/80 text-center font-medium bg-slate-950/70 px-3 py-1 rounded-full backdrop-blur-xs shadow-xs">
                          {photoScanMode === 'ai' ? 'Mantenga la cámara firme e iluminada frente al contador' : 'Capture la foto con buena iluminación'}
                        </p>
                      </div>

                      {/* Camera Controls Overlay */}
                      <div className="absolute top-3 right-3 flex items-center space-x-2 z-10">
                        {hasTorch && (
                          <button
                            type="button"
                            onClick={toggleTorch}
                            className={`p-2 rounded-full backdrop-blur-md transition-all shadow-md ${
                              torchOn ? 'bg-amber-400 text-slate-950' : 'bg-slate-900/80 text-white hover:bg-slate-800'
                            }`}
                            title="Linterna"
                          >
                            {torchOn ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={switchFacingMode}
                          className="p-2 rounded-full bg-slate-900/80 text-white hover:bg-slate-800 backdrop-blur-md transition-all shadow-md"
                          title="Girar cámara"
                        >
                          <RotateCw className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Snap Button */}
                      <div className="absolute bottom-3 inset-x-0 flex items-center justify-center z-10">
                        <button
                          type="button"
                          onClick={handleCapturePhoto}
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
                              <span>Capturar y Leer con IA</span>
                            </>
                          ) : (
                            <>
                              <Camera className="w-5 h-5 group-hover:scale-110 transition-transform" />
                              <span>Capturar Foto</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Switch to phone gallery shortcut below live camera */}
                  <div className="flex items-center justify-center mt-2.5">
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
                      Selecciona una foto de contador o evidencia que ya tengas guardada en tu teléfono móvil o computador.
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
                      onClick={() => cameraAppInputRef.current?.click()}
                      className="py-3.5 px-4 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs rounded-xl shadow-xs flex items-center justify-center space-x-2 transition-all cursor-pointer transform active:scale-98"
                    >
                      <Camera className="w-4 h-4 text-slate-600" />
                      <span>Cámara Nativa del Móvil</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-500 font-medium">
                    ⚡ Se comprime y optimiza automáticamente para no saturar memoria.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Result & Preview Section */
            <div className="space-y-4">
              {/* Photo Preview & Scanning Status */}
              <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 aspect-16/10 flex items-center justify-center shadow-md">
                <img
                  src={capturedImage}
                  alt="Contador capturado"
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
                        setCapturedImage(null);
                        setScanResult(null);
                        setErrorMsg(null);
                        switchSourceMode('camera');
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-900/85 hover:bg-slate-900 text-white font-bold text-[11px] backdrop-blur-md border border-white/20 shadow-md flex items-center space-x-1.5 transition-all cursor-pointer"
                      title="Tomar otra con cámara en vivo"
                    >
                      <Camera className="w-3.5 h-3.5 text-blue-300" />
                      <span>Cámara en Vivo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCapturedImage(null);
                        setScanResult(null);
                        setErrorMsg(null);
                        switchSourceMode('upload');
                        setTimeout(() => galleryInputRef.current?.click(), 80);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-900/85 hover:bg-slate-900 text-white font-bold text-[11px] backdrop-blur-md border border-white/20 shadow-md flex items-center space-x-1.5 transition-all cursor-pointer"
                      title="Elegir otra foto de la galería del teléfono"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-amber-300" />
                      <span>Galería Teléfono</span>
                    </button>
                  </div>
                )}
              </div>

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
                          : "Foto de Evidencia Lista"}
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
                          ℹ️ {scanResult.notes}
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
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-200/70 font-semibold text-xs transition-colors"
          >
            Cancelar
          </button>

          {capturedImage && !isAnalyzing && (
            <button
              type="button"
              onClick={handleApply}
              className="flex-1 sm:flex-initial px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Cargar al Sistema</span>
            </button>
          )}
        </div>

        {/* Global hidden inputs: ALWAYS mounted and ready to trigger native device camera and gallery */}
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
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
