// src/tests/integration-tests.ts
// Suite de Pruebas de Integración (APIs, Sincronización en la Nube y Notificaciones Push)

import fs from 'fs';
import path from 'path';

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

async function runIntegrationTests() {
  console.log('\n======================================================');
  console.log('🌐 INICIANDO PRUEBAS DE INTEGRACIÓN DEL SISTEMA');
  console.log('======================================================\n');

  const BASE_URL = 'http://localhost:3000';

  // --------------------------------------------------------------------------
  // INTEGRATION SUITE 1: Endpoints API del Servidor Express
  // --------------------------------------------------------------------------
  console.log('🔌 GRUPO 1: Endpoints del Servidor Local & Integración HTTP');
  try {
    // 1.1 Test Clave Pública VAPID Web Push
    const resVapid = await fetch(`${BASE_URL}/api/push/public-key`);
    const vapidData = await resVapid.json();
    assert(
      resVapid.status === 200 && typeof vapidData.publicKey === 'string' && vapidData.publicKey.length > 20,
      'Endpoint /api/push/public-key responde 200 con clave VAPID válida'
    );

    // 1.2 Test Datos Centralizados /api/data
    const resData = await fetch(`${BASE_URL}/api/data`);
    const serverData = await resData.json();
    const hasRequiredCollections = 
      Array.isArray(serverData.rounds) &&
      Array.isArray(serverData.equipments) &&
      Array.isArray(serverData.incidents) &&
      Array.isArray(serverData.requests) &&
      Array.isArray(serverData.tasks) &&
      Array.isArray(serverData.users);

    assert(
      resData.status === 200 && hasRequiredCollections,
      'Endpoint /api/data sincroniza colecciones de Rondas, Equipos, Inconvenientes, Solicitudes, Tareas y Usuarios'
    );

    // 1.3 Test de Despacho Push /api/push/send
    const resPush = await fetch(`${BASE_URL}/api/push/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'tareas',
        title: 'Prueba de Integración',
        body: 'Verificando despacho del canal de notificaciones',
        url: '/?tab=tareas',
        data: { test: true }
      })
    });
    const pushResult = await resPush.json();
    assert(
      resPush.status === 200 && (pushResult.status === 'ok' || pushResult.status === 'no_subscriptions' || typeof pushResult.sentCount === 'number'),
      'Endpoint /api/push/send procesa y filtra el payload de notificaciones correctamente'
    );

    // 1.4 Test Endpoint DELETE de Solicitudes
    const resDelete = await fetch(`${BASE_URL}/api/requests/req-integration-test-probe`, {
      method: 'DELETE'
    });
    assert(
      resDelete.status === 200 || resDelete.status === 204,
      'Endpoint DELETE /api/requests/:id responde confirmando la eliminación inmediata'
    );
  } catch (err: any) {
    assert(false, 'Conexión a endpoints del servidor', err.message);
  }

  // --------------------------------------------------------------------------
  // INTEGRATION SUITE 2: Archivos PWA y Service Worker para Notificaciones
  // --------------------------------------------------------------------------
  console.log('\n📲 GRUPO 2: Integración de Service Worker y Notificaciones en Segundo Plano');
  {
    const swPath = path.resolve(process.cwd(), 'public/sw.js');
    const swExists = fs.existsSync(swPath);
    let swContent = '';
    if (swExists) {
      swContent = fs.readFileSync(swPath, 'utf-8');
    }

    assert(swExists, 'Archivo Service Worker /public/sw.js existe en el proyecto');
    assert(
      swContent.includes("addEventListener('push'") && swContent.includes("showNotification"),
      'Service Worker tiene configurado el manejador de eventos push para recibir alertas con app cerrada'
    );
    assert(
      swContent.includes("addEventListener('notificationclick'"),
      'Service Worker maneja la redirección al hacer clic en la notificación'
    );

    const manifestPath = path.resolve(process.cwd(), 'public/manifest.webmanifest');
    const manifestExists = fs.existsSync(manifestPath);
    assert(manifestExists, 'Archivo de Manifiesto PWA /public/manifest.webmanifest existe y es accesible');
  }

  // --------------------------------------------------------------------------
  // INTEGRATION SUITE 3: Integración de Seguridad y Reglas Firestore
  // --------------------------------------------------------------------------
  console.log('\n🔒 GRUPO 3: Integración de Seguridad y Reglas de Base de Datos Firestore');
  {
    const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
    const rulesExist = fs.existsSync(rulesPath);
    let rulesContent = '';
    if (rulesExist) {
      rulesContent = fs.readFileSync(rulesPath, 'utf-8');
    }

    assert(rulesExist, 'Archivo firestore.rules existe y está configurado');
    assert(
      rulesContent.includes('match /requests/{reqId}') &&
      rulesContent.includes('match /tasks/{taskId}') &&
      rulesContent.includes('match /rounds/{roundId}'),
      'Reglas de Firestore protegen las colecciones de Solicitudes, Tareas y Rondas'
    );
  }

  console.log('\n======================================================');
  console.log(`📊 RESULTADOS DE PRUEBAS DE INTEGRACIÓN:`);
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

runIntegrationTests().catch(err => {
  console.error('Error durante la ejecución de pruebas de integración:', err);
  process.exit(1);
});
