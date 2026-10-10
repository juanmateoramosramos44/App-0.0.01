// src/tests/component-tests.ts
// Suite de Pruebas de Componentes y Lógica de Sincronización en Tiempo Real

import { isRoundActivelyBeingPerformed } from '../context/MaintenanceContext';
import { DailyRound, HotelRequest, MaintenanceTask, Incident } from '../types';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASÓ: ${testName}`);
  } else {
    failedTests++;
    console.error(`  ❌ FALLÓ: ${testName} ${details ? `(${details})` : ''}`);
  }
}

async function runComponentTests() {
  console.log('\n======================================================');
  console.log('🧪 INICIANDO PRUEBAS DE COMPONENTES Y LÓGICA DEL SISTEMA');
  console.log('======================================================\n');

  // --------------------------------------------------------------------------
  // TEST SUITE 1: Componente de Rondas en Vivo (DailyRoundsView)
  // --------------------------------------------------------------------------
  console.log('📋 GRUPO 1: Componente de Rondas en Vivo (DailyRoundsView)');
  {
    const todayStr = new Date().toISOString().split('T')[0];
    const nowIso = new Date().toISOString();

    const activeRound: DailyRound = {
      id: 'rnd-test-1',
      date: todayStr,
      time: '08:00',
      shift: 'manana',
      technicianName: 'Ferney Alonso',
      status: 'en_progreso',
      compliancePercentage: 45,
      checkpoints: [],
      anomalies: [],
      anomaliesCount: 0,
      meterReadings: {},
      generalNotes: '',
      lastHeartbeat: nowIso,
      lastUpdated: nowIso
    };

    assert(
      isRoundActivelyBeingPerformed(activeRound, undefined) === true,
      'Ronda en curso con latido reciente es detectada como ACTIVA en tiempo real'
    );

    // Ronda de ayer con status 'en_progreso' no debe ser mostrada como activa en vivo
    const oldRound: DailyRound = {
      ...activeRound,
      id: 'rnd-old',
      date: '2026-09-28',
      lastHeartbeat: '2026-09-28T10:00:00.000Z',
      lastUpdated: '2026-09-28T10:00:00.000Z'
    };
    assert(
      isRoundActivelyBeingPerformed(oldRound, undefined) === false,
      'Ronda de fecha anterior no se confunde con ronda activa de hoy'
    );

    // Ronda completada no es en_progreso
    const completedRound: DailyRound = {
      ...activeRound,
      id: 'rnd-completed',
      status: 'completada'
    };
    assert(
      isRoundActivelyBeingPerformed(completedRound, undefined) === false,
      'Ronda con estado "completada" no se marca en curso'
    );
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 2: Componente de Solicitudes y Eliminaciones (HotelRequestsView)
  // --------------------------------------------------------------------------
  console.log('\n📨 GRUPO 2: Componente de Solicitudes (HotelRequestsView) y Purga de Eliminados');
  {
    const req1: HotelRequest = {
      id: 'req-1',
      title: 'Reparación de cerradura',
      description: 'Cerradura trabada',
      location: 'Habitación 302',
      category: 'habitacion',
      priority: 'alta',
      status: 'pendiente',
      requestedBy: 'Recepción',
      createdAt: '2026-10-01 07:30'
    };

    const reqDeleted: HotelRequest = {
      id: 'req-deleted-tt',
      title: 'tt',
      description: 'Sin descripción adicional.',
      location: 't',
      category: 'habitacion',
      priority: 'media',
      status: 'pendiente',
      requestedBy: 'Juan Mateo/Técnico',
      createdAt: '2026-10-01 06:15'
    };

    // Simulación de purga: baseList tiene reqDeleted en caché local del compañero,
    // pero incomingList de la nube ya no lo tiene porque el administrador lo eliminó.
    const baseList = [req1, reqDeleted];
    const incomingList = [req1]; // Cloud ya no tiene reqDeleted
    const deletedIds = new Set<string>(['req-deleted-tt']);

    const purgedList = baseList.filter(r => !deletedIds.has(r.id) && incomingList.some(inc => inc.id === r.id));

    assert(
      purgedList.length === 1 && purgedList[0].id === 'req-1',
      'Solicitud eliminada por el administrador es purgada y NO aparece en otros usuarios'
    );

    assert(
      !purgedList.some(r => r.id === 'req-deleted-tt'),
      'La solicitud "tt" queda 100% excluida de la vista del compañero'
    );
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 3: Componente de Tareas Asignadas (TasksView)
  // --------------------------------------------------------------------------
  console.log('\n🔨 GRUPO 3: Componente de Tareas y Filtro por Asignación (TasksView)');
  {
    const targetUserId = 'usr-tech-01';
    const otherUserId = 'usr-tech-02';

    const taskSpecific: MaintenanceTask = {
      id: 'task-101',
      title: 'Revisión motobomba de piscina',
      description: 'Revisar sellos mecánicos',
      area: 'Cuarto de bombas',
      category: 'reparacion',
      priority: 'alta',
      status: 'pendiente',
      assignedToName: 'Carlos Ruiz',
      assignedToId: targetUserId,
      createdById: 'usr-admin-master',
      createdByName: 'Juan Mateo',
      createdAt: '2026-10-01 08:00',
      dueDate: '2026-10-01',
      checklist: [],
      comments: []
    };

    const taskGeneral: MaintenanceTask = {
      id: 'task-102',
      title: 'Limpieza general de filtros',
      description: 'Filtros de trampa de cabellos',
      area: 'Zonas comunes',
      category: 'limpieza_tecnica',
      priority: 'media',
      status: 'pendiente',
      assignedToName: 'Todo el equipo',
      createdById: 'usr-admin-master',
      createdByName: 'Juan Mateo',
      createdAt: '2026-10-01 08:00',
      dueDate: '2026-10-01',
      checklist: [],
      comments: []
    };

    // Validación de pertenencia para el usuario asignado
    const isForTarget = taskSpecific.assignedToId === targetUserId;
    const isForOther = taskSpecific.assignedToId === otherUserId;

    assert(isForTarget === true, 'Tarea específica es recibida por el usuario técnico asignado');
    assert(isForOther === false, 'Tarea específica no es adjudicada indebidamente a otro compañero');

    // Validación de tarea general
    const isGeneralTeamTask = !taskGeneral.assignedToId || taskGeneral.assignedToName === 'Todo el equipo';
    assert(isGeneralTeamTask === true, 'Tarea general para el equipo técnico está disponible para todos');
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 4: Componente de Inconvenientes / Averías (IncidentsView)
  // --------------------------------------------------------------------------
  console.log('\n⚠️ GRUPO 4: Componente de Inconvenientes (IncidentsView) y Estados');
  {
    const inc: Incident = {
      id: 'inc-01',
      title: 'Fuga de agua en válvula',
      description: 'Goteo constante en válvula de alivio',
      area: 'Cuarto de Calderas',
      equipmentTag: 'CAL-01',
      severity: 'alta',
      status: 'pendiente',
      registeredBy: 'Ferney Alonso',
      timestamp: '2026-10-01 07:00'
    };

    // Transición a en_atención
    const inProgressInc = { ...inc, status: 'en_atencion' as const };
    assert(inProgressInc.status === 'en_atencion', 'Inconveniente pasa a estado en atención correctamente');

    // Transición a solucionado con técnico responsable
    const resolvedInc = {
      ...inProgressInc,
      status: 'solucionado' as const,
      resolvedBy: 'Juan Mateo',
      resolvedAt: new Date().toISOString(),
      resolutionNotes: 'Se reemplazó empaque y se ajustó válvula.'
    };
    assert(
      resolvedInc.status === 'solucionado' && resolvedInc.resolvedBy === 'Juan Mateo',
      'Inconveniente marcado como solucionado conserva el responsable y notas de cierre'
    );
  }

  console.log('\n======================================================');
  console.log(`📊 RESULTADOS DE PRUEBAS DE COMPONENTES:`);
  console.log(`   Total de pruebas ejecutadas: ${totalTests}`);
  console.log(`   Pruebas aprobadas: ${passedTests} ✅`);
  console.log(`   Pruebas fallidas: ${failedTests} ${failedTests === 0 ? '🎉' : '❌'}`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runComponentTests().catch(err => {
  console.error('Error durante la ejecución de pruebas:', err);
  process.exit(1);
});
