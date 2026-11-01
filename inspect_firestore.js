import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
const fbConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const fbApp = initializeApp(fbConfig);
const fbDb = getFirestore(fbApp, fbConfig.firestoreDatabaseId || '(default)');

async function check() {
  const colNames = ['tasks', 'tasks_archive', 'tasks_deleted', 'system', 'history', 'rounds', 'users'];
  for (const name of colNames) {
    try {
      const snap = await getDocs(collection(fbDb, name));
      console.log('Collection:', name, 'Docs:', snap.size);
      snap.forEach(d => {
        if (name === 'tasks') {
          console.log('TASK:', d.id, d.data().title, d.data().status);
        } else if (name === 'system') {
          console.log('SYSTEM:', d.id, JSON.stringify(d.data()));
        }
      });
    } catch (e) {
      console.error('Error on', name, e.message);
    }
  }
}
check().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
