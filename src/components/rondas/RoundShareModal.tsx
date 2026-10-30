import React, { useState } from 'react';
import { 
  X, 
  FileDown, 
  Share2, 
  Copy, 
  Check, 
  Printer, 
  MessageSquare, 
  Facebook, 
  Smartphone, 
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  FileSpreadsheet,
  Settings2,
  Calendar,
  Clock,
  UserCheck,
  Building2,
  CheckCircle2,
  Edit2,
  Camera,
  Eye
} from 'lucide-react';
import { DailyRound, HotelInfo } from '../../types';
import { useMaintenance } from '../../context/MaintenanceContext';
import { 
  downloadRoundPdf, 
  generateRoundSummaryText, 
  shareRoundViaWhatsApp, 
  shareRoundViaFacebook, 
  shareRoundNative, 
  generateRoundPdf,
  evaluateCheckpointStatus,
  extractRoundEquipments
} from '../../utils/roundPdfReport';

interface RoundShareModalProps {
  round: DailyRound | null;
  hotelInfo?: HotelInfo;
  onClose: () => void;
  isJustCompleted?: boolean;
}

export const RoundShareModal: React.FC<RoundShareModalProps> = ({
  round,
  hotelInfo,
  onClose,
  isJustCompleted = false,
}) => {
  const { updateRound, notify, currentUser } = useMaintenance();
  const [copied, setCopied] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [shareSuccessMessage, setShareSuccessMessage] = useState<string | null>(null);
  
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [editingDateValue, setEditingDateValue] = useState(round?.date || '');
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [previewPhotoTitle, setPreviewPhotoTitle] = useState<string>('Evidencia Fotográfica de la Ronda');

  if (!round) return null;

  const isValidPhoto = (url?: string | null): boolean => {
    if (!url || typeof url !== 'string') return false;
    if (url.includes('cached_in_db')) return false;
    return url.startsWith('data:image/') || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/assets/') || url.startsWith('blob:');
  };

  const attachedPhotos: Array<{
    id: string;
    url: string;
    title: string;
    area: string;
    type: string;
  }> = [];
  const seenSharePhotoUrls = new Set<string>();
  const addSharePhoto = (item: {
    id: string;
    url?: string | null;
    title: string;
    area: string;
    type: string;
  }) => {
    if (!item.url || !isValidPhoto(item.url) || seenSharePhotoUrls.has(item.url)) return;
    seenSharePhotoUrls.add(item.url);
    attachedPhotos.push({
      id: item.id,
      url: item.url,
      title: item.title,
      area: item.area,
      type: item.type
    });
  };

  (round.checkpoints || []).forEach(c => {
    if (isValidPhoto(c.photoUrl)) {
      addSharePhoto({
        id: `chk-${c.id}`,
        url: c.photoUrl!,
        title: c.title,
        area: c.area || 'Zona técnica',
        type: 'Punto de ronda'
      });
    }
    if (Array.isArray(c.photos)) {
      c.photos.forEach((p, pIdx) => {
        addSharePhoto({
          id: `chk-${c.id}-${pIdx}`,
          url: p,
          title: c.title,
          area: c.area || 'Zona técnica',
          type: 'Punto de ronda'
        });
      });
    }
    (c.measurementFields || []).forEach((f, idx) => {
      if (isValidPhoto(f.photoUrl)) {
        addSharePhoto({
          id: `field-${c.id}-${f.id || idx}`,
          url: f.photoUrl!,
          title: `${c.title} — ${f.name || `Medición ${idx + 1}`}`,
          area: c.area || 'Zona técnica',
          type: 'Medición'
        });
      }
    });
  });

  if (isValidPhoto(round.meterReadings?.waterMeterPhotoUrl)) {
    addSharePhoto({
      id: 'meter-water',
      url: round.meterReadings!.waterMeterPhotoUrl!,
      title: 'Contador de Agua Potable',
      area: 'Cuarto de Contadores',
      type: 'Contador General'
    });
  }
  if (isValidPhoto(round.meterReadings?.electricMeterPhotoUrl)) {
    addSharePhoto({
      id: 'meter-electric',
      url: round.meterReadings!.electricMeterPhotoUrl!,
      title: 'Contador de Energía Eléctrica',
      area: 'Subestación Eléctrica',
      type: 'Contador General'
    });
  }
  if (isValidPhoto(round.meterReadings?.gasMeterPhotoUrl)) {
    addSharePhoto({
      id: 'meter-gas',
      url: round.meterReadings!.gasMeterPhotoUrl!,
      title: 'Contador de Gas Natural',
      area: 'Acometida Gas',
      type: 'Contador General'
    });
  }
  (round.anomalies || []).forEach((a, idx) => {
    if (isValidPhoto(a.photoUrl)) {
      addSharePhoto({
        id: `anom-${a.id || idx}`,
        url: a.photoUrl!,
        title: `Incidencia: ${a.title}`,
        area: a.area || 'Área afectada',
        type: 'Avería'
      });
    }
  });

  const handleCopyText = async () => {
    try {
      const summaryText = generateRoundSummaryText(round, hotelInfo);
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadPdf = () => {
    setIsGeneratingPdf(true);
    try {
      downloadRoundPdf(round, hotelInfo);
      setShareSuccessMessage('✅ PDF descargado exitosamente en tu dispositivo.');
      setTimeout(() => setShareSuccessMessage(null), 4000);
    } catch (e) {
      console.error('Error generating PDF:', e);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrintPdf = () => {
    try {
      const doc = generateRoundPdf(round, hotelInfo);
      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(blobUrl, '_blank');
      if (printWindow) {
        printWindow.focus();
      }
    } catch (e) {
      console.error('Error printing PDF:', e);
    }
  };

  const handleNativeShare = async () => {
    const success = await shareRoundNative(round, hotelInfo, () => {
      setShareSuccessMessage('✅ Ronda compartida correctamente.');
      setTimeout(() => setShareSuccessMessage(null), 4000);
    });
    if (!success && typeof navigator !== 'undefined' && !navigator.share) {
      // If native share not supported on this browser, fallback directly to WhatsApp
      shareRoundViaWhatsApp(round, hotelInfo);
    }
  };

  const handleWhatsAppShare = () => {
    shareRoundViaWhatsApp(round, hotelInfo);
  };

  const handleFacebookShare = () => {
    shareRoundViaFacebook(round, hotelInfo);
  };

  const shiftLabel = round.shift === 'manana' ? 'Mañana' : round.shift === 'tarde' ? 'Tarde' : 'Noche';
  const anomaliesCount = round.anomalies?.length || 0;
  const checkpointsCount = round.checkpoints?.length || 0;
  
  const allEquipments = extractRoundEquipments(round);
  const alarmedEquipmentsCount = allEquipments.filter(p => p.isAlarmed).length;
  const okEquipmentsCount = allEquipments.filter(p => p.isOk).length;
  const offEquipmentsCount = allEquipments.filter(p => p.isOff).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Modern Luxury Header */}
        <div className="relative p-5 sm:p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -top-12 -right-12 w-44 h-44 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-44 h-44 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center space-x-2">
                <span className="p-2 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-400/30 shadow-inner">
                  <Settings2 className="w-5 h-5" />
                </span>
                <div>
                  <span className="text-[10px] uppercase font-black tracking-widest text-blue-400">
                    Panel de Administración
                  </span>
                  <h3 className="text-lg sm:text-xl font-black tracking-tight text-white leading-tight">
                    Ajustes y Envío de Ronda Diaria
                  </h3>
                </div>
              </div>
              <p className="text-xs text-slate-300 font-medium">
                {hotelInfo?.hotelName || 'Gestión de Mantenimiento'} • Registro Oficial Auditado
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer shrink-0"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Info Badges inside header */}
          <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center gap-2 text-xs">
            {isEditingDate ? (
              <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-lg border border-white/20">
                <input
                  type="date"
                  value={editingDateValue}
                  onChange={(e) => setEditingDateValue(e.target.value)}
                  className="bg-slate-900 text-white px-2 py-1 rounded text-xs font-mono border border-white/20 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                <button
                  onClick={async () => {
                    if (editingDateValue && round) {
                      await updateRound(round.id, { date: editingDateValue });
                      setIsEditingDate(false);
                      setShareSuccessMessage(`✅ Fecha corregida exitosamente a ${editingDateValue}`);
                      setTimeout(() => setShareSuccessMessage(null), 4000);
                    }
                  }}
                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold cursor-pointer"
                >
                  Guardar
                </button>
                <button
                  onClick={() => setIsEditingDate(false)}
                  className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white/10 text-slate-200 backdrop-blur-xs font-semibold">
                <Calendar className="w-3.5 h-3.5 mr-1.5 text-blue-300" />
                {round.date}
                <button
                  onClick={() => {
                    setEditingDateValue(round.date);
                    setIsEditingDate(true);
                  }}
                  className="ml-2 text-blue-300 hover:text-white p-0.5 rounded hover:bg-white/20 transition-colors cursor-pointer"
                  title="Corregir la fecha de esta ronda"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </span>
            )}
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white/10 text-slate-200 backdrop-blur-xs font-semibold">
              <Clock className="w-3.5 h-3.5 mr-1.5 text-indigo-300" />
              {round.time} hs (Turno {shiftLabel})
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white/10 text-slate-200 backdrop-blur-xs font-semibold">
              <UserCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-300" />
              {round.technicianName}
            </span>
          </div>
        </div>

        {/* Verification & Compliance Status Bar */}
        <div className="bg-slate-50/90 px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2.5">
            <span className="flex items-center text-emerald-800 font-extrabold bg-emerald-100 px-3 py-1 rounded-lg border border-emerald-300 shadow-2xs">
              <ShieldCheck className="w-4 h-4 mr-1.5 text-emerald-600" />
              {checkpointsCount} Puntos Auditados ({round.compliancePercentage ?? 100}% OK)
            </span>
            {alarmedEquipmentsCount > 0 ? (
              <span className="flex items-center text-rose-800 font-black bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-300 shadow-2xs">
                <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-rose-600" />
                {alarmedEquipmentsCount} Equipo(s) Alarmado(s)
              </span>
            ) : anomaliesCount > 0 ? (
              <span className="flex items-center text-rose-700 font-bold bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-rose-600" />
                {anomaliesCount} Novedad(es)
              </span>
            ) : (
              <span className="flex items-center text-slate-600 font-medium bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                Sin alarmas (Conforme)
              </span>
            )}
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            ID: {round.id.slice(0, 10)}
          </span>
        </div>

        {/* Alarms audit notice */}
        {alarmedEquipmentsCount > 0 && (
          <div className="bg-rose-50/90 border-b border-rose-200 px-5 py-2.5 text-xs text-rose-900 flex items-center space-x-2">
            <span className="p-1 rounded bg-rose-200 text-rose-800 font-bold shrink-0 text-[10px] uppercase">
              ⚠️ Alerta Técnica
            </span>
            <p className="font-medium text-[11px] leading-tight">
              Esta ronda contiene <span className="font-bold text-rose-700">{alarmedEquipmentsCount} equipo(s) en rojo / fuera de límites seguros</span>. En el PDF descargable se audita y visualiza únicamente el equipo alarmado específico en rojo con todos sus datos.
            </p>
          </div>
        )}

        {/* Feedback message banner */}
        {shareSuccessMessage && (
          <div className="bg-emerald-600 text-white px-4 py-2.5 text-xs font-bold text-center flex items-center justify-center space-x-2 animate-in slide-in-from-top-2">
            <Check className="w-4 h-4" />
            <span>{shareSuccessMessage}</span>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          {/* Section 1: Official PDF Downloads */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-extrabold uppercase text-slate-600 tracking-wider flex items-center">
                <FileSpreadsheet className="w-4 h-4 mr-1.5 text-red-600" />
                <span>Descargas y Documentos Oficiales</span>
              </h4>
              <span className="text-[10px] text-slate-600 font-bold bg-slate-100 px-2 py-0.5 rounded">
                Formato PDF
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Download PDF button */}
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="group flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white font-bold text-xs sm:text-sm shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-center space-x-3 text-left">
                  <div className="p-2 rounded-xl bg-white/20">
                    <FileDown className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-extrabold text-white">Descargar PDF</p>
                    <p className="text-[10px] text-rose-100 font-normal">Reporte técnico oficial</p>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/20 text-white font-mono">
                  {isGeneratingPdf ? 'Creando...' : 'PDF'}
                </span>
              </button>

              {/* Print PDF button */}
              <button
                type="button"
                onClick={handlePrintPdf}
                className="group flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs sm:text-sm border-2 border-slate-200 hover:border-slate-300 shadow-2xs hover:shadow-xs transition-all cursor-pointer"
              >
                <div className="flex items-center space-x-3 text-left">
                  <div className="p-2 rounded-xl bg-slate-200/70 text-slate-700">
                    <Printer className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-extrabold text-slate-900">Imprimir / Vista</p>
                    <p className="text-[10px] text-slate-500 font-normal">Impresora o visor PDF</p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
              </button>
            </div>
          </div>

          {/* Section 2: Messaging and Social Sharing */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-extrabold uppercase text-slate-600 tracking-wider flex items-center">
                <Share2 className="w-4 h-4 mr-1.5 text-blue-600" />
                <span>Enviar Directamente a Aplicaciones</span>
              </h4>
              <span className="text-[10px] text-slate-600 font-bold bg-slate-100 px-2 py-0.5 rounded">
                Detección Nativa
              </span>
            </div>

            <div className="space-y-2.5">
              {/* WhatsApp Native App Button */}
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs sm:text-sm shadow-xs hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-center space-x-3.5 text-left">
                  <span className="p-2.5 rounded-xl bg-white/20">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </span>
                  <div>
                    <p className="font-extrabold text-white text-sm">Abrir en WhatsApp</p>
                    <p className="text-[11px] text-emerald-100 font-normal">
                      Abre tu app de WhatsApp (computador o celular) con el reporte listo para enviar
                    </p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-emerald-200 shrink-0" />
              </button>

              {/* Native OS Share Menu (Direct to installed apps) */}
              <button
                type="button"
                onClick={handleNativeShare}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold text-xs sm:text-sm shadow-xs hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-center space-x-3.5 text-left">
                  <span className="p-2.5 rounded-xl bg-white/20">
                    <Smartphone className="w-5 h-5 text-white" />
                  </span>
                  <div>
                    <p className="font-extrabold text-white text-sm">Compartir con Aplicaciones del Dispositivo</p>
                    <p className="text-[11px] text-blue-100 font-normal">
                      Menú del sistema (WhatsApp, Telegram, Gmail, Bluetooth, AirDrop...)
                    </p>
                  </div>
                </div>
                <Share2 className="w-4 h-4 text-blue-200 shrink-0" />
              </button>

              {/* Facebook Button */}
              <button
                type="button"
                onClick={handleFacebookShare}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold text-xs sm:text-sm shadow-xs hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-center space-x-3.5 text-left">
                  <span className="p-2.5 rounded-xl bg-white/20">
                    <Facebook className="w-5 h-5 text-white" />
                  </span>
                  <div>
                    <p className="font-extrabold text-white text-sm">Enviar / Compartir en Facebook</p>
                    <p className="text-[11px] text-blue-100 font-normal">
                      Abre la aplicación de Facebook o Messenger con el reporte estructurado
                    </p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-blue-200 shrink-0" />
              </button>

              {/* Copy Full Structured Text */}
              <button
                type="button"
                onClick={handleCopyText}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl font-bold text-xs sm:text-sm border-2 transition-all cursor-pointer ${
                  copied 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-400 shadow-sm' 
                    : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-3.5 text-left">
                  <span className={`p-2.5 rounded-xl ${copied ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-100 text-slate-700'}`}>
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </span>
                  <div>
                    <p className="font-extrabold text-slate-900">
                      {copied ? '¡Reporte Copiado al Portapapeles!' : 'Copiar Resumen de Texto'}
                    </p>
                    <p className="text-[11px] text-slate-500 font-normal">
                      Copia todo el informe detallado con emojis para pegarlo en cualquier chat
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                  {copied ? 'LISTO' : 'COPIAR'}
                </span>
              </button>
            </div>
          </div>

          {/* Section 3: Attached Photos & Evidences */}
          {attachedPhotos.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-extrabold uppercase text-slate-600 tracking-wider flex items-center">
                  <Camera className="w-4 h-4 mr-1.5 text-indigo-600" />
                  <span>Evidencias Fotográficas ({attachedPhotos.length})</span>
                </h4>
                <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                  ✓ {attachedPhotos.length} foto{attachedPhotos.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {attachedPhotos.map(photo => (
                  <div 
                    key={photo.id}
                    className="group bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
                  >
                    <div 
                      className="relative w-full h-28 bg-slate-900 cursor-pointer overflow-hidden"
                      onClick={() => {
                        setPreviewPhotoUrl(photo.url);
                        setPreviewPhotoTitle(`${photo.title} (${photo.area})`);
                      }}
                      title="Clic para ampliar foto"
                    >
                      <img 
                        src={photo.url} 
                        alt={photo.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Eye className="w-5 h-5 text-white drop-shadow" />
                      </div>
                    </div>
                    <div className="p-2">
                      <p className="text-[11px] font-bold text-slate-900 truncate">{photo.title}</p>
                      <p className="text-[10px] text-slate-500 truncate">📍 {photo.area}</p>
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewPhotoUrl(photo.url);
                          setPreviewPhotoTitle(`${photo.title} (${photo.area})`);
                        }}
                        className="mt-1.5 w-full py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <Camera className="w-3 h-3" />
                        <span>Ver Foto</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-colors cursor-pointer shadow-sm"
          >
            Cerrar Ventana
          </button>
        </div>
      </div>

      {/* Photo Lightbox Modal */}
      {previewPhotoUrl && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewPhotoUrl(null);
          }}
        >
          <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between gap-3">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                  <Camera className="w-4 h-4" />
                </div>
                <span className="font-bold text-xs sm:text-sm truncate">
                  {previewPhotoTitle || 'Evidencia Fotográfica de la Ronda'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPhotoUrl(null)}
                className="p-1 hover:bg-white/10 rounded-full text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-slate-950 flex items-center justify-center flex-1 overflow-hidden min-h-[260px] sm:min-h-[360px]">
              <img
                src={previewPhotoUrl}
                alt={previewPhotoTitle}
                className="max-h-[68vh] w-auto max-w-full object-contain rounded-xl shadow-xl border border-slate-800"
              />
            </div>
            <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-2">
              <a
                href={previewPhotoUrl}
                download="foto_evidencia_ronda.jpg"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-200 border border-slate-300 rounded-xl text-slate-800 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
              >
                <FileDown className="w-4 h-4 text-blue-600" />
                <span>Descargar Foto</span>
              </a>
              <button
                type="button"
                onClick={() => setPreviewPhotoUrl(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Cerrar Visor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
