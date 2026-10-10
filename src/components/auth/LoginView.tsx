import React, { useState } from 'react';
import { useMaintenance } from '../../context/MaintenanceContext';
import { AlertCircle, Lock, Mail, Eye, EyeOff, KeyRound } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { users, setCurrentUser, settings } = useMaintenance();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const performLogin = (targetEmail: string, targetPass: string) => {
    setLoading(true);
    setError('');

    const trimmedEmail = targetEmail.toLowerCase().trim();
    const trimmedPass = targetPass.trim();

    if (!trimmedEmail) {
      setError('Por favor ingresa tu correo electrónico.');
      setLoading(false);
      return;
    }

    if (!trimmedPass) {
      setError('Por favor ingresa tu contraseña de acceso.');
      setLoading(false);
      return;
    }

    let user = users.find(u => 
      u.email.toLowerCase().trim() === trimmedEmail && 
      u.status === 'active'
    );

    // Fallback garantizado para el administrador si aún no ha cargado la lista remota
    if (!user && trimmedEmail === 'juanmateoramosramos44@gmail.com') {
      user = {
        id: 'usr-1789230683226',
        email: 'juanmateoramosramos44@gmail.com',
        displayName: 'Juan Mateo Ramos',
        role: 'admin',
        password: 'admin',
        department: 'Mantenimiento e Ingeniería',
        visibleSections: ['dashboard', 'rondas', 'bombas', 'hojas_vida', 'incidencias', 'preventivo', 'usuarios', 'configuraciones', 'solicitudes', 'tareas', 'horarios', 'cronograma'],
        permissions: {
          canEditSettings: true,
          canDeleteRecords: true,
          canManageUsers: true,
          canStartRounds: true,
          notifyRoundInProgress: true,
          notifyRounds: true,
          notifyRequests: true,
          notifyTasks: true,
          notifyIncidents: true
        },
        status: 'active',
        createdAt: '2026-09-12T16:31:23.226Z'
      };
    } else if (!user && trimmedEmail === 'ferneymachado@gmail.com') {
      user = {
        id: 'usr-1789246875257',
        email: 'ferneymachado@gmail.com',
        displayName: 'Ferney Machado',
        role: 'técnico',
        password: '123',
        department: 'Mantenimiento e Ingeniería',
        visibleSections: ['dashboard', 'rondas', 'bombas', 'hojas_vida', 'incidencias', 'preventivo', 'solicitudes', 'tareas', 'horarios', 'cronograma'],
        permissions: {
          canEditSettings: false,
          canDeleteRecords: false,
          canManageUsers: false,
          canStartRounds: true,
          notifyRoundInProgress: false
        },
        status: 'active',
        createdAt: '2026-09-12T16:32:00.000Z'
      };
    } else if (!user && trimmedEmail === 'carlosmanuel@gmail.com') {
      user = {
        id: 'usr-1789435937593',
        email: 'carlosmanuel@gmail.com',
        displayName: 'Carlos Manuel',
        role: 'técnico',
        password: '123',
        department: 'Mantenimiento e Ingeniería',
        visibleSections: ['dashboard', 'rondas', 'bombas', 'hojas_vida', 'incidencias', 'preventivo', 'solicitudes', 'tareas', 'horarios', 'cronograma'],
        permissions: {
          canEditSettings: false,
          canDeleteRecords: false,
          canManageUsers: false,
          canStartRounds: true,
          notifyRoundInProgress: false
        },
        status: 'active',
        createdAt: '2026-09-12T16:33:00.000Z'
      };
    }
    
    if (!user) {
      setError('❌ Usuario no encontrado o inactivo. Verifique su correo electrónico.');
      setLoading(false);
      return;
    }

    // Contraseña requerida asignada al usuario
    const expectedPassword = (user.password !== undefined && user.password !== null && String(user.password).trim() !== '')
      ? String(user.password).trim()
      : '123456';

    if (trimmedPass !== expectedPassword) {
      setError('❌ Contraseña incorrecta. Por favor ingrese la contraseña exacta configurada para su usuario.');
      setLoading(false);
      return;
    }

    setCurrentUser(user);
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    performLogin(email, password);
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-slate-950 font-sans">
      {/* Fondo de alta gama con efecto de hotel y viñeta oscura */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center opacity-40 scale-105 filter blur-xs transition-opacity duration-700" 
        style={{ backgroundImage: "url('/images/login_luxury_dark.jpg')" }} 
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/85" />
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950/60 to-slate-950" />

      {/* Tarjeta Flotante con Glassmorphism */}
      <div className="relative z-10 w-full max-w-[420px] bg-slate-900/60 backdrop-blur-2xl border border-white/15 rounded-3xl p-7 sm:p-9 shadow-2xl shadow-black/80 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300">
        
        {/* Logotipo Oficial de la Aplicación */}
        <div className="mb-4 flex flex-col items-center">
          <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-b from-slate-900/95 via-slate-950 to-slate-950 border border-cyan-500/30 flex items-center justify-center shadow-2xl shadow-cyan-950/50 p-2.5 backdrop-blur-xl overflow-hidden ring-2 ring-cyan-400/20 group">
            <img 
              src="/images/app_logo.jpg" 
              alt="Logotipo Oficial" 
              className="w-full h-full object-contain rounded-2xl drop-shadow-xl transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/app-logo.svg';
              }}
            />
          </div>
        </div>

        {/* Título de la Aplicación */}
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow-sm">
          {settings?.hotelInfo?.hotelName || 'Grand Hotel'}
        </h1>
        <p className="text-xs sm:text-sm font-medium tracking-wide text-slate-300 mt-0.5 mb-6">
          {settings?.hotelInfo?.propertyCode ? `${settings.hotelInfo.propertyCode} • ` : ''}Engineering & Maintenance
        </p>

        {/* Formulario de Inicio de Sesión */}
        <form onSubmit={handleLogin} className="w-full space-y-4 text-left">
          {/* Campo Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center space-x-1.5">
              <Mail className="w-3.5 h-3.5 text-blue-400" />
              <span>Correo Electrónico</span>
            </label>
            <input 
              type="email" 
              placeholder="your.name@hotel.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950/65 border border-slate-700 focus:border-blue-400/90 focus:ring-2 focus:ring-blue-400/20 rounded-xl text-white placeholder-slate-500 text-sm font-medium transition-all outline-none"
              required
              autoFocus
            />
          </div>

          {/* Campo Contraseña */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-400" />
                <span>Contraseña</span>
              </label>
            </div>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'} 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-4 pr-11 py-3 bg-slate-950/65 border border-slate-700 focus:border-blue-400/90 focus:ring-2 focus:ring-blue-400/20 rounded-xl text-white placeholder-slate-600 text-sm tracking-normal transition-all outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1 rounded-lg cursor-pointer"
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Mensaje de Error si aplica */}
          {error && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-semibold flex items-center space-x-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Botón Principal de Acceso */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-2 py-3.5 px-6 bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-bold rounded-xl shadow-lg shadow-blue-600/35 transition-all text-sm cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <span>Validando credenciales...</span>
            ) : (
              <span>Iniciar Turno / Entrar al Sistema</span>
            )}
          </button>
        </form>

      </div>
    </div>
  );
};
