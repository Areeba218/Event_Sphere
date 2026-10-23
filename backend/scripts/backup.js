// JSON backup of every collection:  npm run backup
// Restore:                          npm run restore -- backups/<folder>
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require("mongoose");
const { EJSON } = require("bson");

const BACKUP_ROOT = path.join(__dirname, '..', 'backups');
const KEEP = Number(process.env.BACKUP_KEEP || 14);

async function runBackup() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.join(BACKUP_ROOT, stamp);
  fs.mkdirSync(dir, { recursive: true });
  const collections = await mongoose.connection.db.listCollections().toArray();
  for (const { name } of collections) {
    const docs = await mongoose.connection.db.collection(name).find({}).toArray();
    fs.writeFileSync(path.join(dir, `${name}.json`), EJSON.stringify(docs, { relaxed: false }));
  }
  const old = fs.readdirSync(BACKUP_ROOT).sort().reverse().slice(KEEP); // keep only the most recent backups
  old.forEach((d) => fs.rmSync(path.join(BACKUP_ROOT, d), { recursive: true, force: true }));
  return dir;
}

if (require.main === module) {
  (async () => {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Backup written to', await runBackup());
    await mongoose.disconnect();
  })().catch((e) => { console.error('Backup failed:', e.message); process.exit(1); });
}
module.exports = { runBackup };
