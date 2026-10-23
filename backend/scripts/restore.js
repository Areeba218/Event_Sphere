require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const { EJSON } = require('bson');
const mongoose = require('mongoose');

(async () => {
  const dir = process.argv[2];
  if (!dir || !fs.existsSync(dir)) throw new Error('Usage: npm run restore -- backups/<folder>');
  await mongoose.connect(process.env.MONGO_URI);
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const name = path.basename(file, '.json');
    const docs = EJSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'), { relaxed: false });
    await mongoose.connection.db.collection(name).deleteMany({});
    if (docs.length) await mongoose.connection.db.collection(name).insertMany(docs);
    console.log(`Restored ${name}: ${docs.length} documents`);
  }
  await mongoose.disconnect();
})().catch((e) => { console.error('Restore failed:', e.message); process.exit(1); });
