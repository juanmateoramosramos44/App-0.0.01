import React, { useState, useRef } from 'react';
import { useMaintenance } from '../../context/MaintenanceContext';
import { CustomSelect } from '../common/CustomSelect';
import { 
  AlertTriangle, 
  X, 
  Send, 
  MapPin, 
  Layers, 
  User, 
  Radio,
  Camera,
  Image as ImageIcon,
  Trash2,
  CheckCircle2
} from 'lucide-react';

const HOTEL_AREAS = [
  'Sótano 2 - Cuarto de Bombas Principal',
  'Sótano 1 - Sala de Calderas & ACS',
  'Sótano 1 - Cuarto Eléctrico & Generador',
  'Sótano 3 - Cárcamos de Achique & Aguas Negras',
  'Piscina Principal & Jacuzzis',
  'Planta de Tratamiento de Agua',
  'Azotea - Chillers & Climatización',
  'Torre de Huéspedes - Niveles 1 al 8',
  'Cocina Principal & Restaurantes',
  'Lavandería Industrial',
  'Áreas Exteriores & Jardines'
];

export const ReportIncidentModal: React.FC = () => {
  const { 
    isIncidentModalOpen, 
    setIsIncidentModalOpen, 
    reportIncident, 
    equipments, 
    settings,
    notify 
  } = useMaintenance();

  const [title, setTitle] = useState('');
  const [area, setArea] = useState(HOTEL_AREAS[0]);
  const [equipmentId, setEquipmentId] = useState('');
  const [severity, setSeverity] = useState<'baja' | 'media' | 'alta' | 'urgente'>('media');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [reportedBy, setReportedBy] = useState(settings.technicians[0] || 'Técnico de Turno');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      if (!rawDataUrl) return;

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 1000;
        let width = img.width;
        let height = img.height;

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
          setPhotoUrl(compressed);
        } else {
          setPhotoUrl(rawDataUrl);
        }
      };
      img.onerror = () => {
        setPhotoUrl(rawDataUrl);
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  if (!isIncidentModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      notify('⚠️ Por favor ingresa el título y la descripción del inconveniente.');
      return;
    }

    setIsSubmitting(true);
    const selectedEq = equipments.find(eq => eq.id === equipmentId);

    try {
      await reportIncident({
        title: title.trim(),
        description: description.trim(),
        area,
        equipmentId: equipmentId || undefined,
        equipmentTag: selectedEq ? selectedEq.tag : undefined,
        severity,
        status: 'pendiente',
        registeredBy: reportedBy,
        photoUrl: photoUrl || undefined,
      });

      // Reset and close
      setTitle('');
      setDescription('');
      setEquipmentId('');
      setPhotoUrl('');
      setSeverity('media');
      setIsIncidentModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 my-8 animate-in fade-in zoom-in duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Reportar Inconveniente o Falla</h3>
              <p className="text-xs text-slate-500">Se transmitirá de inmediato a todos los compañeros en vivo</p>
            </div>
          </div>
          <button
            onClick={() => setIsIncidentModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-4 text-xs">
          {/* Reporter Technician */}
          <div>
            <CustomSelect
              label="Técnico que Reporta"
              value={reportedBy}
              onChange={(val) => setReportedBy(val)}
              options={settings.technicians.map(tech => ({
                value: tech,
                label: tech,
                color: 'blue'
              }))}
            />
          </div>

          {/* Title */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Título del Inconveniente / Avería *
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Fuga en sello mecánico BOM-PRES-02, goteo constante"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:outline-none text-slate-900 text-xs"
            />
          </div>

          {/* Area & Equipment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <CustomSelect
                label="Área o Sector del Hotel"
                value={area}
                onChange={(val) => setArea(val)}
                options={HOTEL_AREAS.map(a => ({
                  value: a,
                  label: a,
                  color: 'slate'
                }))}
              />
            </div>

            <div>
              <CustomSelect
                label="Equipo Asociado (Opcional)"
                value={equipmentId}
                onChange={(val) => setEquipmentId(val)}
                options={[
                  { value: '', label: 'Ninguno / Instalación General', color: 'slate' },
                  ...equipments.map(eq => ({
                    value: eq.id,
                    label: `${eq.tag} - ${eq.name}`,
                    description: eq.area,
                    color: 'blue'
                  }))
                ]}
              />
            </div>
          </div>

          {/* Severity selector pills */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Nivel de Severidad / Urgencia *
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'baja', label: 'Baja', desc: 'No urgente', color: 'border-slate-300 hover:border-slate-400 text-slate-700', active: 'bg-slate-100 border-slate-500 text-slate-900 font-bold ring-2 ring-slate-400' },
                { id: 'media', label: 'Media', desc: 'Monitorear', color: 'border-blue-200 hover:border-blue-300 text-blue-700', active: 'bg-blue-50 border-blue-500 text-blue-900 font-bold ring-2 ring-blue-500' },
                { id: 'alta', label: 'Alta', desc: 'Atender hoy', color: 'border-amber-200 hover:border-amber-300 text-amber-700', active: 'bg-amber-50 border-amber-500 text-amber-900 font-bold ring-2 ring-amber-500' },
                { id: 'urgente', label: 'Urgente', desc: 'Inmediata', color: 'border-rose-200 hover:border-rose-300 text-rose-700', active: 'bg-rose-50 border-rose-500 text-rose-900 font-bold ring-2 ring-rose-500' },
              ].map(sev => (
                <button
                  key={sev.id}
                  type="button"
                  onClick={() => setSeverity(sev.id as any)}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    severity === sev.id ? sev.active : `${sev.color} bg-white`
                  }`}
                >
                  <div className="text-xs font-semibold">{sev.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{sev.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Descripción Detallada del Hallazgo *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Describa el ruido, presión anómala, fuga de agua, temperatura o pieza dañada..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:outline-none text-slate-900 text-xs resize-none"
            />
          </div>

          {/* Evidencia Fotográfica */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Foto de Evidencia (Opcional)
            </label>

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoCapture}
              className="hidden"
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoCapture}
              className="hidden"
            />

            {photoUrl ? (
              <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-300 bg-emerald-50/50 p-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-900 border border-slate-700 shrink-0">
                    <img
                      src={photoUrl}
                      alt="Foto capturada"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-emerald-800 flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">Foto adjunta correctamente</span>
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5">Se transmitirá con el reporte en vivo.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPhotoUrl('')}
                  className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer border border-rose-200 shrink-0"
                  title="Eliminar foto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="py-2.5 px-3 rounded-xl border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-2xs"
                >
                  <Camera className="w-4 h-4 text-emerald-600" />
                  <span>Tomar Foto</span>
                </button>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="py-2.5 px-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-2xs"
                >
                  <ImageIcon className="w-4 h-4 text-slate-500" />
                  <span>Galería / Archivo</span>
                </button>
              </div>
            )}
          </div>

          {/* Real-time broadcast notice */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center space-x-2 text-[11px] text-slate-600">
            <Radio className="w-4 h-4 text-emerald-500 animate-pulse shrink-0" />
            <span>
              <strong>Transmisión en Vivo:</strong> Al guardar, este aviso aparecerá en la pantalla de todos los compañeros en milisegundos.
            </span>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsIncidentModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center space-x-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-md shadow-rose-600/20 transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Transmitiendo...' : 'Publicar Inconveniente'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
