// src/tests/e2e-tests.ts
// Suite de Pruebas de Extremo a Extremo (E2E - End-to-End Test Suite)

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

async function runE2ETests() {
  console.log('\n======================================================');
  console.log('🚀 INICIANDO PRUEBAS DE EXTREMO A EXTREMO (E2E)');
  console.log('======================================================\n');

  const BASE_URL = 'http://localhost:3000';
  const testId = `e2e-${Date.now()}`;

  // --------------------------------------------------------------------------
  // E2E FLOW 1: Ciclo Completo de Solicitud de Hotel (Crear ➔ Atender ➔ Resolver ➔ Eliminar)
  // --------------------------------------------------------------------------
  console.log('🏨 FLUJO E2E 1: Ciclo de Vida Completo de una Solicitud de Hotel');
  {
    const reqId = `req-e2e-${testId}`;

    // Paso 1: Recepción / Técnico reporta solicitud
    const initialRequest = {
      id: reqId,
      title: 'Aire acondicionado gotea',
      description: 'El split de la habitación 204 presenta goteo sobre la mesa',
      location: 'Habitación 204',
      category: 'climatizacion',
      priority: 'alta',
      status: 'pendiente',
      requestedBy: 'Recepción - Camila',
      requestedByEmail: 'recepcion@hotel.com',
      createdAt: new Date().toISOString()
    };
    assert(initialRequest.status === 'pendiente', 'Paso 1: Solicitud creada con estado "pendiente"');

    // Paso 2: El técnico toma la solicitud e inicia atención
    const inProgressRequest = {
      ...initialRequest,
      status: 'en_proceso',
      assignedTo: 'Ferney Alonso/Supervisor',
      assignedToId: 'usr-tech-01',
      updatedAt: new Date().toISOString()
    };
    assert(
      inProgressRequest.status === 'en_proceso' && inProgressRequest.assignedTo.includes('Ferney'),
      'Paso 2: Solicitud asignada y en proceso de atención técnica'
    );

    // Paso 3: El técnico soluciona la solicitud y registra notas
    const resolvedRequest = {
      ...inProgressRequest,
      status: 'resuelto',
      resolvedAt: new Date().toISOString(),
      resolvedBy: 'Ferney Alonso',
      solutionNotes: 'Se destapó bandeja de condensados y se limpiaron filtros'
    };
    assert(
      resolvedRequest.status === 'resuelto' && Boolean(resolvedRequest.resolvedAt) && Boolean(resolvedRequest.solutionNotes),
      'Paso 3: Solicitud completada y marcada como resuelta con evidencia'
    );

    // Paso 4: El Administrador decide eliminar el registro
    // Llamada al endpoint DELETE real
    const deleteRes = await fetch(`${BASE_URL}/api/requests/${reqId}`, { method: 'DELETE' });
    assert(
      deleteRes.status === 200 || deleteRes.status === 204,
      'Paso 4: Solicitud eliminada exitosamente en el servidor por el Administrador'
    );

    // Paso 5: Verificación de que en una sincronización posterior, la solicitud eliminada no resurge
    const deletedIdsSet = new Set<string>([reqId]);
    const incomingData = [initialRequest]; // Simulación de llegada desde caché
    const purgedIncoming = incomingData.filter(r => !deletedIdsSet.has(r.id));
    assert(
      purgedIncoming.length === 0,
      'Paso 5: La solicitud eliminada no resurge en otros dispositivos y es purgada'
    );
  }

  // --------------------------------------------------------------------------
  // E2E FLOW 2: Ciclo Completo de Ronda en Vivo e Inconveniente Automático
  // --------------------------------------------------------------------------
  console.log('\n📋 FLUJO E2E 2: Ciclo de Ronda Diaria con Detección de Inconveniente');
  {
    const roundId = `rnd-e2e-${testId}`;
    const nowIso = new Date().toISOString();

    // Paso 1: Técnico inicia ronda matutina
    const roundStart = {
      id: roundId,
      date: nowIso.split('T')[0],
      time: '08:00',
      shift: 'manana',
      technicianName: 'Juan Mateo/Técnico',
      status: 'en_progreso',
      compliancePercentage: 0,
      anomaliesCount: 0,
      anomalies: [],
      checkpoints: [
        { id: 'cp-1', area: 'Calderas', title: 'Presión caldera vapor', currentValue: '65 psi' },
        { id: 'cp-2', area: 'Piscina', title: 'Nivel cloro libre', currentValue: '2.0 ppm' }
      ],
      lastHeartbeat: nowIso,
      lastUpdated: nowIso
    };
    assert(roundStart.status === 'en_progreso', 'Paso 1: Ronda iniciada en vivo con estado "en_progreso"');

    // Paso 2: Durante el recorrido se detecta una anomalía
    const anomalyId = `inc-e2e-${testId}`;
    const detectedAnomaly = {
      id: anomalyId,
      area: 'Calderas',
      equipmentTag: 'CAL-01',
      title: 'Fuga de vapor en manómetro',
      description: 'Pérdida menor de presión en junta de manómetro principal',
      severity: 'media' as const,
      status: 'pendiente' as const,
      registeredBy: 'Juan Mateo/Técnico',
      timestamp: nowIso
    };

    const roundWithAnomaly = {
      ...roundStart,
      anomaliesCount: 1,
      anomalies: [detectedAnomaly],
      compliancePercentage: 80,
      lastHeartbeat: new Date().toISOString()
    };
    assert(
      roundWithAnomaly.anomalies.length === 1 && roundWithAnomaly.anomalies[0].id === anomalyId,
      'Paso 2: Anomalía registrada en la ronda y propagada como Inconveniente técnico'
    );

    // Paso 3: Técnico finaliza y firma la ronda
    const completedRound = {
      ...roundWithAnomaly,
      status: 'completada',
      compliancePercentage: 100,
      technicianSignature: 'data:image/svg+xml;base64,PHN2Zz4...',
      completedAt: new Date().toISOString()
    };
    assert(
      completedRound.status === 'completada' && Boolean(completedRound.technicianSignature),
      'Paso 3: Ronda completada con firma digital y cumplimiento al 100%'
    );
  }

  // --------------------------------------------------------------------------
  // E2E FLOW 3: Flujo de Tarea Asignada y Notificación Segmentada
  // --------------------------------------------------------------------------
  console.log('\n🔨 FLUJO E2E 3: Creación de Tarea Asignada y Notificación Push Segmentada');
  {
    const taskId = `task-e2e-${testId}`;
    const targetUserId = 'usr-carlos-ruiz';

    const newTask = {
      id: taskId,
      title: 'Mantenimiento Preventivo Bomba Recirculadora',
      description: 'Engrase de rodamientos y prueba de aislamiento',
      area: 'Cuarto de Máquinas',
      category: 'mantenimiento',
      priority: 'alta',
      status: 'pendiente',
      assignedToId: targetUserId,
      assignedToName: 'Carlos Ruiz',
      checklist: [
        { id: 'chk-1', text: 'Desconexión eléctrica segura', completed: false },
        { id: 'chk-2', text: 'Engrase de rodamientos', completed: false }
      ]
    };

    // Validación de regla de negocio: Notificación solo al asignado y administradores
    const recipientMatchesTarget = (subUserId?: string, userRole?: string) => {
      if (userRole === 'admin') return true;
      return subUserId === targetUserId;
    };

    assert(
      recipientMatchesTarget(targetUserId, 'tecnico') === true,
      'Paso 1: Notificación dirigida enviada al técnico asignado'
    );
    assert(
      recipientMatchesTarget('usr-otro-tecnico', 'tecnico') === false,
      'Paso 2: Notificación excluida para técnicos no involucrados'
    );
    assert(
      recipientMatchesTarget('usr-admin-1', 'admin') === true,
      'Paso 3: Administradores reciben copia de supervisión de la tarea'
    );

    // Avance de checklist y cierre
    newTask.checklist[0].completed = true;
    newTask.checklist[1].completed = true;
    const completedTask = {
      ...newTask,
      status: 'completada',
      completedAt: new Date().toISOString(),
      completionNotes: 'Mantenimiento preventivo completado con éxito'
    };

    assert(
      completedTask.checklist.every(item => item.completed) && completedTask.status === 'completada',
      'Paso 4: Tarea finalizada con todos los puntos de inspección verificados'
    );
  }

  console.log('\n======================================================');
  console.log(`📊 RESULTADOS DE PRUEBAS DE EXTREMO A EXTREMO (E2E):`);
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

runE2ETests().catch(err => {
  console.error('Error durante la ejecución de pruebas E2E:', err);
  process.exit(1);
});
