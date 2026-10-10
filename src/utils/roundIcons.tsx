import React from 'react';
import { 
  Snowflake, 
  Gauge, 
  Droplets, 
  Flame, 
  Waves, 
  Zap, 
  Shield, 
  Thermometer, 
  Activity,
  Box,
  Refrigerator,
  Wind,
  Fan,
  DoorClosed,
  Lightbulb,
  CheckCircle2,
  Wrench,
  FileText,
  Battery,
  Fuel,
  Music,
  Volume2,
  Radio,
  Cpu
} from 'lucide-react';

/**
 * Icono visual especializado de Tanque de Agua / Depósito de Almacenamiento / Cisterna
 */
export const TankIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Domo / Tapa superior curvada */}
    <path d="M5 6a7 3 0 0 1 14 0" />
    {/* Cuerpo del tanque */}
    <rect x="5" y="6" width="14" height="13" rx="1" />
    {/* Líneas de refuerzo / anillos cilíndricos del tanque */}
    <line x1="5" y1="10" x2="19" y2="10" strokeWidth="1.5" />
    <line x1="5" y1="15" x2="19" y2="15" strokeWidth="1.5" />
    {/* Visor de nivel de líquido central */}
    <line x1="12" y1="8" x2="12" y2="17" strokeWidth="1.8" strokeDasharray="1 1.5" />
    {/* Tubería de entrada superior izquierda */}
    <path d="M2 4h3v2" />
    {/* Tubería de descarga inferior derecha */}
    <path d="M19 17h3" />
    {/* Patas de anclaje */}
    <line x1="7" y1="19" x2="7" y2="22" />
    <line x1="17" y1="19" x2="17" y2="22" />
    <line x1="5" y1="22" x2="19" y2="22" />
  </svg>
);

/**
 * Icono visual especializado de Subestación Eléctrica / Transformador de Media/Alta Tensión
 */
export const SubstationIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Tanque / Gabinete de la Subestación */}
    <rect x="3" y="9" width="18" height="12" rx="2" />
    {/* Aletas laterales de refrigeración */}
    <line x1="6" y1="13" x2="6" y2="17" />
    <line x1="18" y1="13" x2="18" y2="17" />
    {/* Aisladores / Bushings de alta tensión superiores */}
    <path d="M7 9V5" />
    <path d="M12 9V3" />
    <path d="M17 9V5" />
    <path d="M5.5 5h3" />
    <path d="M10.5 3h3" />
    <path d="M15.5 5h3" />
    {/* Símbolo de rayo / alto voltaje en el centro */}
    <path d="M13 11.5l-2.5 3.5h3l-1.5 3" strokeWidth="1.8" />
  </svg>
);

/**
 * Icono visual especializado de Manómetro / Presionómetro
 */
export const ManometerIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Cuerpo circular del manómetro */}
    <circle cx="12" cy="13" r="8" />
    {/* Conexión roscada inferior */}
    <path d="M10 21h4" />
    <path d="M12 21v-3" />
    {/* Dial / Aguja marcadora */}
    <path d="M12 13l3-3" />
    {/* Pequeño pivote central */}
    <circle cx="12" cy="13" r="1" fill="currentColor" />
    {/* Rosca superior o gancho */}
    <path d="M12 5V3" />
  </svg>
);

export const WaterPumpIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Motor Eléctrico con aletas de refrigeración */}
    <rect x="2" y="7" width="7" height="9" rx="1.5" />
    <line x1="4.5" y1="7" x2="4.5" y2="16" />
    <line x1="6.5" y1="7" x2="6.5" y2="16" />
    {/* Caja de bornes superior */}
    <path d="M3.5 7V5h4v2" />
    {/* Eje de acople central */}
    <line x1="9" y1="11.5" x2="11" y2="11.5" />
    {/* Carcasa / Voluta espiral de la bomba */}
    <circle cx="15.5" cy="11.5" r="4.5" />
    {/* Ojo del impulsor central */}
    <circle cx="15.5" cy="11.5" r="1.5" />
    {/* Tubería de impulsión / descarga vertical */}
    <path d="M15.5 7V3h3" />
    {/* Base / Bancada de anclaje */}
    <line x1="2" y1="19.5" x2="21" y2="19.5" />
    <path d="M4 16v3.5" />
    <path d="M15.5 16v3.5" />
  </svg>
);

/**
 * Icono visual especializado de Condensador / Unidad Condensadora (HVAC y Climatización)
 */
export const CondenserIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Carcasa exterior de la unidad condensadora */}
    <rect x="2" y="3.5" width="20" height="17" rx="2.5" />
    {/* Serpentín y aletas del condensador a la izquierda */}
    <line x1="4.5" y1="7" x2="8.5" y2="7" />
    <line x1="4.5" y1="10" x2="8.5" y2="10" />
    <line x1="4.5" y1="13" x2="8.5" y2="13" />
    <line x1="4.5" y1="16" x2="8.5" y2="16" />
    {/* Ventilador circular de tiro forzado a la derecha */}
    <circle cx="15" cy="12" r="4.5" />
    {/* Aspas / Hélice del condensador */}
    <path d="M15 7.8v8.4" />
    <path d="M10.8 12h8.4" />
    <circle cx="15" cy="12" r="1.5" fill="currentColor" />
  </svg>
);

/**
 * Icono visual especializado de Sauna y Cold Plunge (Tina de inmersión en frío + Calor Sauna)
 */
export const SaunaColdPlungeIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Tina de Cold Plunge (bañera / pozo de inmersión en frío) */}
    <path d="M3 11h18v6a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-6z" />
    {/* Borde / Reborde superior de la tina */}
    <path d="M2 11h20" />
    {/* Ondas de agua fría / inmersión dentro de la tina */}
    <path d="M6 15c1.2-.8 2.3-.8 3.5 0s2.3.8 3.5 0 2.3-.8 3.5 0" strokeWidth="1.5" />
    {/* Copo de nieve / Cristal de hielo en la tina (indicador de frío extremo) */}
    <path d="M12 13v4" strokeWidth="1.2" />
    <path d="M10 15h4" strokeWidth="1.2" />
    {/* Ondas térmicas / Vapor de Sauna saliendo arriba */}
    <path d="M7 7c0-1.5 1-2.5 1-4" />
    <path d="M12 7c0-1.5 1-2.5 1-4" />
    <path d="M17 7c0-1.5 1-2.5 1-4" />
    {/* Patas / Base de apoyo de la tina */}
    <line x1="6" y1="20" x2="6" y2="22" />
    <line x1="18" y1="20" x2="18" y2="22" />
  </svg>
);

/**
 * Icono visual especializado de Cava de Refrigeración / Cuarto Frío / Cava Industrial
 */
export const CavaRefrigerationIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Gabinete / Estructura exterior de la Cava */}
    <rect x="3.5" y="2" width="17" height="20" rx="2" />
    {/* División horizontal de compartimentos (congelación / refrigeración) */}
    <line x1="3.5" y1="9.5" x2="20.5" y2="9.5" />
    {/* Manija industrial superior vertical */}
    <line x1="6.5" y1="4.5" x2="6.5" y2="7.5" strokeWidth="2.2" strokeLinecap="round" />
    {/* Manija industrial inferior vertical */}
    <line x1="6.5" y1="12" x2="6.5" y2="16.5" strokeWidth="2.2" strokeLinecap="round" />
    {/* Panel digital de temperatura / copo de nieve superior derecho */}
    <rect x="13.5" y="4" width="5" height="3.5" rx="0.8" strokeWidth="1.2" />
    <path d="M16 4.8v1.8" strokeWidth="1.2" />
    <path d="M15 5.7h2" strokeWidth="1.2" />
    {/* Rejillas / ranuras de ventilación inferior */}
    <line x1="12" y1="13.5" x2="18" y2="13.5" strokeWidth="1.3" />
    <line x1="12" y1="16.5" x2="18" y2="16.5" strokeWidth="1.3" />
  </svg>
);

export function getRoundItemIcon(title: string, category?: string) {
  const norm = (str?: string) => 
    (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const t = norm(title);
  const c = norm(category);

  // 1. CAVAS DE REFRIGERACIÓN / CUARTOS FRÍOS / NEVERAS / CONGELADORES
  if (
    c === 'refrigeracion' || 
    c === 'cava' || 
    c === 'cavas' || 
    c === 'nevera' || 
    c === 'neveras' || 
    c === 'congelador' || 
    c === 'congeladores' || 
    c === 'cuarto_frio' || 
    c === 'cuartos_frios' || 
    c === 'refrigerador' || 
    c === 'refrigeradores' ||
    t.includes('cava') || 
    t.includes('nevera') || 
    t.includes('congelad') || 
    t.includes('refrigera') || 
    t.includes('cuarto frio') || 
    t.includes('cuartos frios') || 
    t.includes('botellero') || 
    t.includes('freezer') || 
    t.includes('hielo') || 
    t.includes('ice maker') ||
    (t.includes('temperatura') && (t.includes('frio') || t.includes('baja') || t.includes('cocina') || t.includes('carnes') || t.includes('lacteos') || t.includes('verduras')))
  ) {
    return <CavaRefrigerationIcon className="w-4 h-4 text-cyan-600" />;
  }

  // 2. SAUNA & COLD PLUNGE / SPA
  if (
    t.includes('sauna') || 
    t.includes('cold plunge') || 
    t.includes('coldplunge') || 
    t.includes('plunge') || 
    t.includes('pozo frio') || 
    t.includes('tina fria') || 
    t.includes('inmersion') || 
    t.includes('zona humeda') || 
    t.includes('turco') || 
    c === 'sauna_cold_plunge' || 
    c === 'sauna' || 
    c === 'cold_plunge' || 
    c === 'spa'
  ) {
    return <SaunaColdPlungeIcon className="w-4 h-4 text-cyan-600" />;
  }

  // 3. SUBESTACIÓN ELÉCTRICA / TRANSFORMADOR
  if (
    t.includes('subestacion') || 
    t.includes('transformador') || 
    t.includes('media tension') || 
    t.includes('alta tension') || 
    t.includes('celda electrica') || 
    c === 'subestacion' || 
    c === 'transformador'
  ) {
    return <SubstationIcon className="w-4 h-4 text-amber-600" />;
  }

  // 4. MÚSICA & AUDIO
  if (
    t.includes('musica') || 
    t.includes('audio') || 
    t.includes('sonido') || 
    t.includes('parlante') || 
    t.includes('bafle') || 
    t.includes('amplificador') || 
    c === 'musica' || 
    c === 'audio' || 
    c === 'sonido'
  ) {
    return <Music className="w-4 h-4 text-violet-600" />;
  }

  // 5. MANÓMETROS & PRESIÓN
  if (
    t.includes('manometr') || 
    t.includes('presion') || 
    t.includes('psi') || 
    t.includes('bar') || 
    c === 'manometro' || 
    c === 'manometros'
  ) {
    return <ManometerIcon className="w-4 h-4 text-blue-600" />;
  }

  // 6. CONDENSADORES HVAC
  if (
    t.includes('condensad') || 
    c === 'condensador' || 
    c === 'condensadores'
  ) {
    return <CondenserIcon className="w-4 h-4 text-cyan-600" />;
  }

  // 7. TEMPERATURA / SENSORES
  if (
    c === 'temperatura' || 
    c === 'temperaturas' || 
    t.includes('temperatura') || 
    t.includes('termometr')
  ) {
    return <Thermometer className="w-4 h-4 text-rose-500" />;
  }

  // 8. COMBUSTIBLE & ACPM / DIÉSEL
  if (
    t.includes('combustible') || 
    t.includes('diesel') || 
    t.includes('acpm') || 
    t.includes('gasoil') || 
    t.includes('gasolina') || 
    t.includes('petroleo') || 
    t.includes('tanque combustible') || 
    t.includes('fuel') || 
    c === 'combustible' || 
    c === 'fuel'
  ) {
    return <Fuel className="w-4 h-4 text-orange-600" />;
  }

  // 9. TANQUES DE AGUA & RESERVORIOS
  if (
    t.includes('tanque') || 
    t.includes('cisterna') || 
    t.includes('aljibe') || 
    t.includes('deposito') || 
    t.includes('reserva de agua') || 
    c === 'tanque' || 
    c === 'tanques' || 
    c === 'deposito' || 
    c === 'cisterna'
  ) {
    return <TankIcon className="w-4 h-4 text-sky-600" />;
  }

  // 10. BATERÍAS & UPS
  if (
    t.includes('bater') || 
    t.includes('battery') || 
    t.includes('ups') || 
    t.includes('acumulador') || 
    t.includes('pila') || 
    t.includes('inversor') || 
    c === 'bateria' || 
    c === 'baterias' || 
    c === 'battery'
  ) {
    return <Battery className="w-4 h-4 text-emerald-600" />;
  }

  // 11. EXTRACCIÓN & VENTILACIÓN
  if (
    t.includes('extrac') || 
    t.includes('ventil') || 
    t.includes('aire') || 
    t.includes('fan') || 
    t.includes('ducto') || 
    c === 'extraccion' || 
    c === 'ventilacion' || 
    c === 'climatizacion'
  ) {
    return <Wind className="w-4 h-4 text-teal-600" />;
  }

  // 12. HABITACIONES & PUERTAS
  if (
    t.includes('habitaci') || 
    t.includes('hab') || 
    t.includes('puerta') || 
    t.includes('baño') || 
    c === 'habitaciones'
  ) {
    return <DoorClosed className="w-4 h-4 text-indigo-600" />;
  }

  // 13. ILUMINACIÓN & LÁMPARAS
  if (
    t.includes('luz') || 
    t.includes('iluminac') || 
    t.includes('lampara') || 
    t.includes('foco') || 
    c === 'iluminacion'
  ) {
    return <Lightbulb className="w-4 h-4 text-amber-500" />;
  }

  // 14. CONTADORES Y MEDIDORES
  if (
    t.includes('contador') || 
    t.includes('medidor') || 
    t.includes('kwh') || 
    t.includes('m³') || 
    t.includes('consumo') || 
    c === 'contador'
  ) {
    return <Gauge className="w-4 h-4 text-emerald-600" />;
  }

  // 15. BOMBAS DE AGUA & EQUIPO HIDRÁULICO
  if (
    t.includes('bomba') || 
    t.includes('hidro') || 
    c === 'bombeo' || 
    c === 'hidraulico' || 
    c.includes('bomba')
  ) {
    return <WaterPumpIcon className="w-4 h-4 text-blue-600" />;
  }

  // 16. CALDERAS & AGUA CALIENTE
  if (
    t.includes('caldera') || 
    t.includes('calentador') || 
    t.includes('acs') || 
    t.includes('termotanque') || 
    c === 'caldera'
  ) {
    return <Flame className="w-4 h-4 text-amber-600" />;
  }

  // 17. PISCINAS & JACUZZIS
  if (
    t.includes('piscina') || 
    t.includes('cloro') || 
    t.includes('ph') || 
    c === 'piscina'
  ) {
    return <Waves className="w-4 h-4 text-indigo-600" />;
  }

  // 18. TABLEROS ELÉCTRICOS
  if (
    t.includes('electric') || 
    t.includes('tablero') || 
    t.includes('energia') || 
    c === 'electrico'
  ) {
    return <Zap className="w-4 h-4 text-yellow-600" />;
  }

  return <Shield className="w-4 h-4 text-slate-600" />;
}

export function getRoundItemBadgeColor(title: string, category?: string) {
  const norm = (str?: string) => 
    (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const t = norm(title);
  const c = norm(category);

  if (
    c === 'refrigeracion' || 
    c === 'cava' || 
    c === 'cavas' || 
    c === 'nevera' || 
    c === 'congelador' || 
    c === 'cuarto_frio' ||
    t.includes('cava') || 
    t.includes('nevera') || 
    t.includes('congelad') || 
    t.includes('refrigera') || 
    t.includes('cuarto frio')
  ) {
    return 'bg-cyan-50 text-cyan-800 border-cyan-200';
  }
  if (
    t.includes('sauna') || 
    t.includes('cold plunge') || 
    t.includes('spa') || 
    c === 'sauna_cold_plunge' || 
    c === 'sauna' || 
    c === 'cold_plunge'
  ) {
    return 'bg-cyan-50 text-cyan-800 border-cyan-200';
  }
  if (t.includes('subestacion') || t.includes('transformador') || c === 'subestacion') {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }
  if (t.includes('musica') || t.includes('audio') || t.includes('sonido') || c === 'musica' || c === 'audio') {
    return 'bg-violet-50 text-violet-700 border-violet-200';
  }
  if (t.includes('manometr') || t.includes('presion') || t.includes('psi') || t.includes('bar') || c === 'manometro') {
    return 'bg-blue-50 text-blue-700 border-blue-200';
  }
  if (t.includes('condensad') || c === 'condensador') {
    return 'bg-cyan-50 text-cyan-700 border-cyan-200';
  }
  if (c === 'temperatura' || t.includes('temperatura') || t.includes('termometr')) {
    return 'bg-rose-50 text-rose-700 border-rose-200';
  }
  if (t.includes('combustible') || t.includes('diesel') || t.includes('acpm') || c === 'combustible' || c === 'fuel') {
    return 'bg-orange-50 text-orange-700 border-orange-200';
  }
  if (t.includes('tanque') || t.includes('cisterna') || t.includes('deposito') || c === 'tanque') {
    return 'bg-sky-50 text-sky-700 border-sky-200';
  }
  if (t.includes('bater') || t.includes('battery') || t.includes('ups') || c === 'bateria') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (t.includes('extrac') || t.includes('ventil') || t.includes('aire') || t.includes('fan') || c === 'extraccion') {
    return 'bg-teal-50 text-teal-700 border-teal-200';
  }
  if (t.includes('habitaci') || t.includes('hab') || c === 'habitaciones') {
    return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  }
  if (t.includes('contador') || t.includes('medidor') || t.includes('kwh') || t.includes('m³') || c === 'contador') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (t.includes('bomba') || c === 'bombeo' || c === 'hidraulico') {
    return 'bg-blue-50 text-blue-700 border-blue-200';
  }
  if (t.includes('caldera') || t.includes('acs') || c === 'caldera') {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }
  if (t.includes('piscina') || t.includes('cloro') || c === 'piscina') {
    return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  }

  return 'bg-slate-50 text-slate-700 border-slate-200';
}
