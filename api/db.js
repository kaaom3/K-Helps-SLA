const { MongoClient } = require('mongodb');

const DEFAULT_URI = 'mongodb+srv://finkmata_db_user:Kaaom321A@cluster0.jmzcsrw.mongodb.net/?retryWrites=true&w=majority';
const rawUri = process.env.MONGODB_URI || DEFAULT_URI;
// Automatically strip accidental < > around password if copied from Atlas template
const uri = rawUri.replace(/:<([^>]+)>@/, ':$1@');
const dbName = process.env.MONGODB_DB || 'khelps_sla_db';

let cachedClient = global._mongoClientPromise;

async function getDatabase() {
    if (!uri) {
        throw new Error('Missing MONGODB_URI environment variable');
    }
    if (!cachedClient) {
        const client = new MongoClient(uri, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 8000
        });
        cachedClient = client.connect();
        global._mongoClientPromise = cachedClient;
    }
    const client = await cachedClient;
    return client.db(dbName);
}

const VALID_STORES = {
    sessions: 'session_id',
    task_sla: '_id',
    call_records: '_id'
};

module.exports = async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (!uri) {
        return res.status(503).json({
            ok: false,
            mode: 'unconfigured',
            error: 'ยังไม่ได้ตั้งค่า MONGODB_URI ในระบบ Environment Variables'
        });
    }

    try {
        const db = await getDatabase();

        // ─── GET: Load all or specific store ─────────────────────
        if (req.method === 'GET') {
            const targetStore = req.query?.store;
            if (targetStore && VALID_STORES[targetStore]) {
                const docs = await db.collection(targetStore).find({}).toArray();
                return res.status(200).json({ ok: true, mode: 'mongodb', data: docs });
            }

            const [chatSla, taskSla, callReport] = await Promise.all([
                db.collection('sessions').find({}).toArray(),
                db.collection('task_sla').find({}).toArray(),
                db.collection('call_records').find({}).toArray()
            ]);

            return res.status(200).json({
                ok: true,
                mode: 'mongodb',
                chatSla,
                taskSla,
                callReport
            });
        }

        // ─── POST: Upsert records (batch supported) ──────────────
        if (req.method === 'POST') {
            const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
            const { store, records, clearFirst } = body;

            if (!store || !VALID_STORES[store]) {
                return res.status(400).json({ ok: false, error: `Invalid store name: ${store}` });
            }

            const col = db.collection(store);
            const keyField = VALID_STORES[store];

            if (clearFirst) {
                await col.deleteMany({});
            }

            if (!Array.isArray(records) || records.length === 0) {
                return res.status(200).json({ ok: true, count: 0 });
            }

            const ops = records
                .filter(doc => doc && doc[keyField])
                .map(doc => {
                    const cleanDoc = { ...doc };
                    // Ensure _id is string key when keyField is session_id to prevent ObjectId collision on re-upsert
                    if (keyField === 'session_id') {
                        cleanDoc._id = String(doc.session_id);
                    }
                    return {
                        replaceOne: {
                            filter: { [keyField]: cleanDoc[keyField] },
                            replacement: cleanDoc,
                            upsert: true
                        }
                    };
                });

            if (ops.length > 0) {
                await col.bulkWrite(ops, { ordered: false });
            }

            return res.status(200).json({ ok: true, count: ops.length });
        }

        // ─── DELETE: Clear specific store or all stores ──────────
        if (req.method === 'DELETE') {
            const body = typeof req.body === 'string' && req.body ? JSON.parse(req.body) : (req.body || {});
            const store = req.query?.store || body.store;

            if (store === 'all') {
                await Promise.all([
                    db.collection('sessions').deleteMany({}),
                    db.collection('task_sla').deleteMany({}),
                    db.collection('call_records').deleteMany({})
                ]);
                return res.status(200).json({ ok: true, cleared: 'all' });
            }

            if (!store || !VALID_STORES[store]) {
                return res.status(400).json({ ok: false, error: `Invalid store to clear: ${store}` });
            }

            await db.collection(store).deleteMany({});
            return res.status(200).json({ ok: true, cleared: store });
        }

        return res.status(405).json({ ok: false, error: `Method ${req.method} Not Allowed` });
    } catch (err) {
        console.error('MongoDB API Error:', err);
        return res.status(500).json({
            ok: false,
            error: err.message || 'Internal Server Error'
        });
    }
};
