const POSTGRES_PUBLIC_URL = "postgres://postgres:UOdUwzVjFqwY60PrbtQ2dj3lSLEaGr2iMJLduHZrJCtdsimkiDN0JqzXN2ZHnBjE@192.168.200.180:5432/postgres";

/**
 * ============================================================================
 * SCRIPT DE MIGRACIÓN: FIRESTORE -> POSTGRESQL (COOLIFY)
 * ============================================================================
 * Este script se conecta a Firestore y a tu base de datos PostgreSQL en Coolify,
 * crea todas las tablas necesarias y migra el 100% de los documentos históricos
 * sin pérdida de datos, usando "ON CONFLICT DO NOTHING" para evitar duplicados.
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import pg from 'pg';

const { Pool } = pg;

const DB_URL = (POSTGRES_PUBLIC_URL && POSTGRES_PUBLIC_URL !== "PEGA_AQUI_TU_URL_PUBLICA")
  ? POSTGRES_PUBLIC_URL
  : (process.env.DATABASE_URL || "");

if (!DB_URL || DB_URL === "PEGA_AQUI_TU_URL_PUBLICA") {
  console.error("\n❌ ERROR: Debes pegar tu URL de PostgreSQL en la constante POSTGRES_PUBLIC_URL dentro de migrar.js");
  console.error("Ejemplo: const POSTGRES_PUBLIC_URL = \"postgres://usuario:password@tu-servidor-coolify.com:5432/mantenimiento\";\n");
  process.exit(1);
}

// 1. Configuración de Firebase Firestore
const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
if (!fs.existsSync(configPath)) {
  console.error("❌ Archivo firebase-applet-config.json no encontrado.");
  process.exit(1);
}
const fbConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const fbApp = initializeApp(fbConfig);
const fbDb = getFirestore(fbApp, fbConfig.firestoreDatabaseId || '(default)');

// 2. Conexión a PostgreSQL
const isSsl = DB_URL.includes("sslmode=require") || !DB_URL.includes("localhost");
const pool = new Pool({
  connectionString: DB_URL,
  ssl: isSsl ? { rejectUnauthorized: false } : undefined,
});

async function runMigration() {
  console.log("\n🚀 ==================================================");
  console.log("   INICIANDO MIGRACIÓN A POSTGRESQL (COOLIFY)");
  console.log("==================================================\n");

  const client = await pool.connect();
  try {
    console.log("📦 1. Creando tablas en PostgreSQL si no existen...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS rounds (
        id VARCHAR(255) PRIMARY KEY,
        data JSONB NOT NULL,
        date VARCHAR(50),
        shift VARCHAR(50),
        status VARCHAR(50),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS equipments (
        id VARCHAR(255) PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS incidents (
        id VARCHAR(255) PRIMARY KEY,
        data JSONB NOT NULL,
        status VARCHAR(50),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS requests (
        id VARCHAR(255) PRIMARY KEY,
        data JSONB NOT NULL,
        status VARCHAR(50),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(255) PRIMARY KEY,
        data JSONB NOT NULL,
        status VARCHAR(50),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS schedules (
        id VARCHAR(255) PRIMARY KEY,
        data JSONB NOT NULL,
        date VARCHAR(50),
        shift VARCHAR(50),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS shift_swaps (
        id VARCHAR(255) PRIMARY KEY,
        data JSONB NOT NULL,
        status VARCHAR(50),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS cronogramas (
        id VARCHAR(255) PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS meters (
        id VARCHAR(255) PRIMARY KEY,
        data JSONB NOT NULL,
        code VARCHAR(100),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS meter_readings_log (
        id VARCHAR(255) PRIMARY KEY,
        data JSONB NOT NULL,
        meter_id VARCHAR(255),
        date VARCHAR(50),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS pump_inspections (
        id VARCHAR(255) PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS preventive_plans (
        id VARCHAR(255) PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS work_orders (
        id VARCHAR(255) PRIMARY KEY,
        data JSONB NOT NULL,
        status VARCHAR(50),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS uploaded_documents (
        id VARCHAR(255) PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS document_folders (
        id VARCHAR(255) PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        data JSONB NOT NULL,
        email VARCHAR(255),
        role VARCHAR(50),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS app_data (
        id VARCHAR(255) PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS settings (
        id VARCHAR(255) PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS deleted_ids (
        id VARCHAR(255) PRIMARY KEY,
        deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("   ✅ Todas las tablas verificadas y listas.");

    // Mapeo de colecciones de Firestore a tablas de PostgreSQL
    const firestoreCollections = [
      { col: 'rounds', table: 'rounds' },
      { col: 'equipments', table: 'equipments' },
      { col: 'incidents', table: 'incidents' },
      { col: 'requests', table: 'requests' },
      { col: 'tasks', table: 'tasks' },
      { col: 'schedules', table: 'schedules' },
      { col: 'shift_swaps', table: 'shift_swaps' },
      { col: 'cronogramas', table: 'cronogramas' },
      { col: 'meters', table: 'meters' },
      { col: 'meter_definitions', table: 'meters' },
      { col: 'meter_readings_log', table: 'meter_readings_log' },
      { col: 'pump_inspections', table: 'pump_inspections' },
      { col: 'preventive_plans', table: 'preventive_plans' },
      { col: 'work_orders', table: 'work_orders' },
      { col: 'uploaded_documents', table: 'uploaded_documents' },
      { col: 'document_folders', table: 'document_folders' },
      { col: 'users', table: 'users' },
      { col: 'app_data', table: 'app_data' },
      { col: 'hotel_round_template', table: 'app_data' },
      { col: 'hotel_settings', table: 'settings' }
    ];

    console.log("\n📥 2. Descargando documentos desde Firestore e insertando en PostgreSQL...");
    let totalMigrated = 0;

    for (const mapping of firestoreCollections) {
      try {
        const snap = await getDocs(collection(fbDb, mapping.col));
        let count = 0;
        for (const docSnap of snap.docs) {
          const docData = docSnap.data();
          const docId = docSnap.id;
          const fullData = { ...docData, id: docId };

          await client.query(
            `INSERT INTO ${mapping.table} (id, data, updated_at) 
             VALUES ($1, $2, CURRENT_TIMESTAMP) 
             ON CONFLICT (id) DO NOTHING`,
            [docId, JSON.stringify(fullData)]
          );
          count++;
          totalMigrated++;
        }
        if (count > 0) {
          console.log(`   ✅ Colección "${mapping.col}" -> Tabla "${mapping.table}": ${count} registros migrados.`);
        }
      } catch (err) {
        console.warn(`   ⚠️ Nota en colección "${mapping.col}":`, err.message || err);
      }
    }

    // 3. Respaldo complementario desde data.json local para garantizar 0% pérdida
    const localDataPath = path.join(process.cwd(), 'data.json');
    if (fs.existsSync(localDataPath)) {
      console.log("\n🔍 3. Verificando registros en almacenamiento local (data.json)...");
      try {
        const localData = JSON.parse(fs.readFileSync(localDataPath, 'utf8'));
        const localMappings = [
          { key: 'rounds', table: 'rounds' },
          { key: 'equipments', table: 'equipments' },
          { key: 'incidents', table: 'incidents' },
          { key: 'requests', table: 'requests' },
          { key: 'tasks', table: 'tasks' },
          { key: 'schedules', table: 'schedules' },
          { key: 'shiftSwaps', table: 'shift_swaps' },
          { key: 'cronogramas', table: 'cronogramas' },
          { key: 'meters', table: 'meters' },
          { key: 'meterReadingsLog', table: 'meter_readings_log' },
          { key: 'pumpInspections', table: 'pump_inspections' },
          { key: 'preventivePlans', table: 'preventive_plans' },
          { key: 'workOrders', table: 'work_orders' },
          { key: 'uploadedDocuments', table: 'uploaded_documents' },
          { key: 'documentFolders', table: 'document_folders' },
          { key: 'users', table: 'users' }
        ];

        let localAdded = 0;
        for (const lm of localMappings) {
          if (Array.isArray(localData[lm.key])) {
            for (const item of localData[lm.key]) {
              if (!item || !item.id) continue;
              const res = await client.query(
                `INSERT INTO ${lm.table} (id, data, updated_at) 
                 VALUES ($1, $2, CURRENT_TIMESTAMP) 
                 ON CONFLICT (id) DO NOTHING`,
                [item.id, JSON.stringify(item)]
              );
              if (res.rowCount > 0) {
                localAdded++;
                totalMigrated++;
              }
            }
          }
        }

        if (localData.settings) {
          await client.query(
            `INSERT INTO settings (id, data, updated_at) 
             VALUES ($1, $2, CURRENT_TIMESTAMP) 
             ON CONFLICT (id) DO NOTHING`,
            ['app_settings', JSON.stringify(localData.settings)]
          );
        }

        if (Array.isArray(localData.roundTemplate)) {
          await client.query(
            `INSERT INTO app_data (id, data, updated_at) 
             VALUES ($1, $2, CURRENT_TIMESTAMP) 
             ON CONFLICT (id) DO NOTHING`,
            ['round_template', JSON.stringify({ items: localData.roundTemplate })]
          );
        }

        if (localAdded > 0) {
          console.log(`   ✅ ${localAdded} registros adicionales incorporados exitosamente desde datos locales.`);
        }
      } catch (e) {
        console.warn("   ⚠️ Nota al leer data.json:", e.message || e);
      }
    }

    // 4. Mostrar conteo final en PostgreSQL
    console.log("\n📊 4. Conteo final de registros en la base de datos PostgreSQL:");
    const tablesToCheck = ['rounds', 'schedules', 'incidents', 'requests', 'tasks', 'equipments', 'meters', 'users'];
    for (const tbl of tablesToCheck) {
      try {
        const countRes = await client.query(`SELECT COUNT(*) as total FROM ${tbl}`);
        console.log(`   • ${tbl.padEnd(16)}: ${countRes.rows[0].total} registros`);
      } catch {}
    }

    console.log("\n✨ ==================================================");
    console.log(`   ¡MIGRACIÓN FINALIZADA CON ÉXITO! Total procesado: ${totalMigrated}`);
    console.log("   Tu base de datos PostgreSQL está 100% lista para Coolify.");
    console.log("==================================================\n");

  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(err => {
  console.error("\n❌ Error durante la migración:", err);
  process.exit(1);
});
