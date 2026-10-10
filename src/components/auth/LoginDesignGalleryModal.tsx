import React, { useState } from 'react';
import { 
  X, 
  Eye, 
  Sparkles, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Layers, 
  ShieldCheck, 
  Smartphone, 
  Monitor, 
  Cpu, 
  Sun, 
  CreditCard,
  Clock,
  Fingerprint,
  KeyRound
} from 'lucide-react';

interface LoginDesignGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DESIGNS = [
  {
    id: 'executive_dark',
    title: 'Opción 1: Executive Dark & Glassmorphism',
    shortTitle: '1. Executive Dark',
    subtitle: 'Elegancia hotelera de alta gama y modo nocturno',
    image: '/images/login_luxury_dark.jpg',
    device: 'Desktop & Tablets',
    deviceIcon: Monitor,
    badge: 'Estaciones Centrales',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    description: 'Fondo oscuro sofisticado en slate-950 con efecto de cristal translúcido (glassmorphism). Incluye emblema del hotel, campo para credencial corporativa, PIN de 4 dígitos para cambio rápido y chips inferiores de técnicos para acceso inmediato.',
    highlights: [
      'Menor fatiga visual en cuartos de control y turnos nocturnos',
      'Acceso rápido por chips de un toque para técnicos habituales',
      'Indicador en vivo de estado del servidor y sincronización segura'
    ]
  },
  {
    id: 'split_modern',
    title: 'Opción 2: Split-Screen Hotel & Operaciones',
    shortTitle: '2. Split-Screen',
    subtitle: 'Panel doble arquitectónico con métricas vivas',
    image: '/images/login_split_modern.jpg',
    device: 'Monitores & Escritorio',
    deviceIcon: Layers,
    badge: 'Corporativo & Hospitalidad',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    description: 'Diseño dividido en dos paneles: el lateral izquierdo muestra una vista arquitectónica del hotel con widgets en vivo de ocupación y calderas; el panel derecho ofrece un formulario limpio con selector visual de turno (Mañana, Tarde, Noche).',
    highlights: [
      'Presentación visual de alto impacto para salas de operaciones',
      'Selector directo de turno (Mañana / Tarde / Noche) antes de entrar',
      'Filtrado automático por departamento técnico o de pisos'
    ]
  },
  {
    id: 'tech_badge',
    title: 'Opción 3: Selector Táctil de Técnicos & PIN',
    shortTitle: '3. Selector Táctil',
    subtitle: 'Mobile-first para relevo veloz en smartphones',
    image: '/images/login_tech_badge.jpg',
    device: 'Smartphones & Tablets',
    deviceIcon: Smartphone,
    badge: 'Ultra Rápido para Campo',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    description: 'Enfocado 100% en la agilidad de los técnicos de campo: muestra tarjetas con foto de cada técnico (Juan Mateo, Ferney Machado, Carlos Manuel). Al tocar la tarjeta, se despliega un teclado numérico táctil para ingresar el PIN sin teclear correos.',
    highlights: [
      'Cero tecleo de correos largos en teléfonos móviles con guantes',
      'Relevo de guardia en menos de 5 segundos con PIN de 4 cifras',
      'Muestra el turno actual en curso y la hora oficial de la ronda'
    ]
  },
  {
    id: 'industrial_scada',
    title: 'Opción 4: Centro de Control SCADA Industrial',
    shortTitle: '4. SCADA Tech',
    subtitle: 'Consola técnica avanzada con telemetría en vivo',
    image: '/images/login_industrial_scada.jpg',
    device: 'Cuarto de Máquinas & CCTV',
    deviceIcon: Cpu,
    badge: 'Ingeniería Crítica & Plantas',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    description: 'Interfaz estilo centro de mando industrial / SCADA con widgets de telemetría de fondo (temperatura de calderas, presión de bombeo y generadores eléctricos). Cuenta con teclado numérico circular con brillo cian y autenticación técnica instantánea.',
    highlights: [
      'Monitoreo ambiental de variables críticas del hotel desde el login',
      'Consola especializada para ingenieros jefes y técnicos de planta',
      'Teclado numérico y selector de rol de alta visibilidad'
    ]
  },
  {
    id: 'minimal_luxury',
    title: 'Opción 5: Minimalista Escandinavo & Luz Natural',
    shortTitle: '5. Luxury Clean',
    subtitle: 'Diseño limpio y luminoso en tonos marfil y oro cálido',
    image: '/images/login_minimal_luxury.jpg',
    device: 'Recepción & Gerencia',
    deviceIcon: Sun,
    badge: 'Minimalismo & Hospitalidad',
    badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    description: 'Estética moderna y limpia con fondos claros, detalles dorados cálidos y vista difusa del lobby hotelero. Integra autenticación con Google Workspace, código QR para escanear con el móvil y campos limpios con etiquetas flotantes.',
    highlights: [
      'Look & feel impecable de resort y hospitalidad 5 estrellas',
      'Inicio de sesión con 1 clic con cuenta Google institucional',
      'Acceso móvil instantáneo escaneando código QR'
    ]
  },
  {
    id: 'badge_id',
    title: 'Opción 6: Credencial Digital / Carnet de Bolsillo',
    shortTitle: '6. Carnet Digital',
    subtitle: 'Credencial 3D interactiva para cada técnico',
    image: '/images/login_badge_id.jpg',
    device: 'Dispositivos de Todo Tipo',
    deviceIcon: CreditCard,
    badge: 'Identidad Digital & Carnet',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    description: 'Presenta el inicio de sesión como un carnet técnico digital con foto, nombre de usuario, cargo oficial, código de barras/QR y turno asignado. Se desbloquea con un deslizador táctil o PIN de 4 cifras con efecto holográfico.',
    highlights: [
      'Representación visual clara del carnet del empleado de mantenimiento',
      'Desbloqueo ergonómico deslizante (Slide to Unlock) o PIN',
      'Seguridad y sentido de pertenencia al equipo técnico'
    ]
  },
  {
    id: 'kiosk_matrix',
    title: 'Opción 7: Kiosco Mural de Turnos & Matriz Técnica',
    shortTitle: '7. Kiosco Mural',
    subtitle: 'Pantalla de acceso táctil para entrada al taller',
    image: '/images/login_kiosk_matrix.jpg',
    device: 'Pantallas Táctiles & Kioscos',
    deviceIcon: Clock,
    badge: 'Kiosco de Entrada a Taller',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    description: 'Diseñado para terminales táctiles de pared en la entrada de ingeniería: muestra la hora oficial del hotel, indicador de turno en curso (06:00 - 14:00), cuadrícula de disponibilidad de técnicos y teletipo en vivo con solicitudes activas de habitaciones.',
    highlights: [
      'Reloj digital maestro sincronizado con el hotel',
      'Visibilidad inmediata de quién está en ronda, disponible o asignado',
      'Teletipo de órdenes de trabajo en vivo en el pie de pantalla'
    ]
  },
  {
    id: 'matte_cobalt',
    title: 'Opción 8: Neumorfismo Táctil Carbón & Cobalto',
    shortTitle: '8. Carbón & Cobalto',
    subtitle: 'Estética mate táctil 3D con iluminación cobalto',
    image: '/images/login_matte_cobalt.jpg',
    device: 'Todo Dispositivo',
    deviceIcon: Fingerprint,
    badge: 'Alta Ergonomía & Táctil',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    description: 'Textura en carbono mate oscuro con botones 3D en relieve suave (neumorfismo) y retroiluminación cobalto. Incorpora anillo de lectura biométrica táctil, teclado numérico de alto relieve para teclear con precisión y pantalla digital de seguridad.',
    highlights: [
      'Botones con sensación física táctil de pulsación',
      'Anillo de lectura de huella/biométrica luminiscente',
      'Diseño ultra-moderno que transmite máxima solidez y seguridad'
    ]
  },
  {
    id: 'rfid_master',
    title: 'Opción 9: Llave Maestra RFID & Pase de Ingeniería',
    shortTitle: '9. Llave RFID',
    subtitle: 'Tarjeta inteligente de acceso hotelero con escudo dorado',
    image: '/images/login_rfid_master.jpg',
    device: 'Mobile & Tablets',
    deviceIcon: KeyRound,
    badge: 'Hospitality Master Key',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    description: 'Inspirada en la llave maestra electrónica de los ingenieros hoteleros: tarjeta inteligente negra mate con escudo grabado en pan de oro, zona de aproximación NFC/RFID iluminada, insignia de cargo y acceso rápido por especialidad técnica.',
    highlights: [
      'Elegancia máxima con el concepto de la Llave Maestra del hotel',
      'Acceso por aproximación NFC digital o PIN de contingencia',
      'Insignias directas para Calderas, Climatización y Piscinas'
    ]
  }
];

export const LoginDesignGalleryModal: React.FC<LoginDesignGalleryModalProps> = ({ isOpen, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!isOpen) return null;

  const current = DESIGNS[currentIndex];
  const DeviceIcon = current.deviceIcon;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl space-y-4 text-white my-auto">
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-black text-white">Galería de Diseños de Inicio de Sesión</h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {currentIndex + 1} de {DESIGNS.length}
                </span>
              </div>
              <p className="text-xs text-slate-400">9 conceptos visuales para la plataforma de ingeniería y mantenimiento</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pestañas de Selección: 9 conceptos */}
        <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-9 gap-1.5">
          {DESIGNS.map((d, idx) => (
            <button
              key={d.id}
              onClick={() => setCurrentIndex(idx)}
              className={`p-2 rounded-xl text-left border transition-all ${
                currentIndex === idx
                  ? 'bg-slate-800 border-indigo-500 shadow-md ring-1 ring-indigo-500'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
              }`}
            >
              <p className={`text-[10px] font-bold truncate ${currentIndex === idx ? 'text-white' : 'text-slate-300'}`}>
                {d.shortTitle}
              </p>
              <p className="text-[8px] text-slate-500 truncate mt-0.5">{d.device.split('&')[0]}</p>
            </button>
          ))}
        </div>

        {/* Imagen del Diseño */}
        <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 group shadow-inner max-h-[360px] sm:max-h-[420px] flex items-center justify-center">
          <img
            src={current.image}
            alt={current.title}
            className="w-full h-full object-contain sm:object-cover transition-transform duration-300 group-hover:scale-[1.01]"
          />

          {/* Botones de navegación prev/next */}
          <button
            onClick={() => setCurrentIndex((prev) => (prev === 0 ? DESIGNS.length - 1 : prev - 1))}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white border border-slate-700 shadow-lg backdrop-blur-sm transition-all"
            title="Diseño anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentIndex((prev) => (prev === DESIGNS.length - 1 ? 0 : prev + 1))}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white border border-slate-700 shadow-lg backdrop-blur-sm transition-all"
            title="Siguiente diseño"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Detalles del Concepto Activo */}
        <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/80 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="font-bold text-sm sm:text-base text-white">{current.title}</h4>
              <p className="text-xs text-slate-400">{current.subtitle}</p>
            </div>
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${current.badgeColor} flex items-center space-x-1.5`}>
              <DeviceIcon className="w-3.5 h-3.5" />
              <span>{current.badge}</span>
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {current.description}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800/60">
            {current.highlights.map((h, i) => (
              <div key={i} className="flex items-start space-x-1.5 text-[11px] text-slate-400">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>{h}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-xs text-slate-400">
          <span>Solo previsualización: no altera ni reinicia ningún dato existente de la app.</span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer"
          >
            Cerrar Galería
          </button>
        </div>
      </div>
    </div>
  );
};

