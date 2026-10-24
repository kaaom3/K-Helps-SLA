const { MongoClient } = require('mongodb');

const DEFAULT_URI = 'mongodb+srv://finkmata_db_user:Kaaom321A@cluster0.jmzcsrw.mongodb.net/?retryWrites=true&w=majority';
const rawUri = process.env.MONGODB_URI || DEFAULT_URI;
const uri = rawUri.replace(/:<([^>]+)>@/, ':$1@');
const dbName = process.env.MONGODB_DB || 'khelps_sla_db';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'admin1234';

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
        cachedClient = client.connect().catch(err => {
            cachedClient = null;
            global._mongoClientPromise = null;
            throw err;
        });
        global._mongoClientPromise = cachedClient;
    }
    const client = await cachedClient;
    return client.db(dbName);
}

const VALID_STORES = {
    sessions: 'session_id',
    task_sla: '_id',
    call_records: '_id',
    abandoned_calls: '_id'
};

function isAdminAuthorized(req, body) {
    const headerPass = req.headers['x-admin-password'];
    const bodyPass = body && body.adminPassword;
    const queryPass = req.query && req.query.adminPassword;
    const provided = headerPass || bodyPass || queryPass;
    return provided === ADMIN_PASS;
}

module.exports = async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-password');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const body = typeof req.body === 'string' && req.body ? JSON.parse(req.body) : (req.body || {});

        // ─── Admin Authentication Check ──────────────────────────
        if (req.method === 'POST' && body.action === 'verify_admin') {
            if (body.password === ADMIN_PASS) {
                return res.status(200).json({ ok: true, role: 'admin' });
            }
            return res.status(401).json({ ok: false, error: 'รหัสผ่าน Admin ไม่ถูกต้อง' });
        }

        const db = await getDatabase();

        // ─── GET: Load all collections & upload logs (Public Read) ─
        if (req.method === 'GET') {
            const targetStore = req.query?.store;
            if (targetStore && VALID_STORES[targetStore]) {
                const filter = targetStore === 'abandoned_calls'
                    ? { $or: [{ callSkills: /khelps_expert/i }, { callRoutedCsq: /khelps_expert/i }] }
                    : {};
                const docs = await db.collection(targetStore).find(filter).toArray();
                return res.status(200).json({ ok: true, mode: 'mongodb', data: docs });
            }

            // Ensure abandoned_calls only keeps Khelps_Expert records in DB
            await db.collection('abandoned_calls').deleteMany({
                callSkills: { $not: /khelps_expert/i },
                callRoutedCsq: { $not: /khelps_expert/i }
            }).catch(() => {});

            const [chatSla, taskSla, callReport, abandonedCalls, uploadLogs] = await Promise.all([
                db.collection('sessions').find({}).toArray(),
                db.collection('task_sla').find({}).toArray(),
                db.collection('call_records').find({}).toArray(),
                db.collection('abandoned_calls').find({
                    $or: [{ callSkills: /khelps_expert/i }, { callRoutedCsq: /khelps_expert/i }]
                }).toArray(),
                db.collection('upload_logs').find({}).sort({ uploadedAt: -1 }).toArray()
            ]);

            // Sync uploadLogs metadata for abandoned_calls to reflect Khelps_Expert count
            uploadLogs.forEach(log => {
                if (log.store === 'abandoned_calls' || log.moduleType === 'abandoned') {
                    log.moduleLabel = 'Abandoned (Khelps_Expert)';
                    log.recordCount = abandonedCalls.length;
                }
            });

            return res.status(200).json({
                ok: true,
                mode: 'mongodb',
                chatSla,
                taskSla,
                callReport,
                abandonedCalls,
                uploadLogs
            });
        }

        // Require Admin authorization for all write/delete operations
        if (!isAdminAuthorized(req, body)) {
            return res.status(403).json({
                ok: false,
                error: 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถเพิ่ม แก้ไข หรือลบข้อมูลได้'
            });
        }

        // ─── POST: Save Upload Log or Upsert Records (Admin Only) ──
        if (req.method === 'POST') {
            // 1. Log file import metadata
            if (body.action === 'log_upload') {
                const logDoc = body.log;
                if (!logDoc || !logDoc._id) {
                    return res.status(400).json({ ok: false, error: 'Invalid upload log payload' });
                }
                await db.collection('upload_logs').replaceOne(
                    { _id: logDoc._id },
                    logDoc,
                    { upsert: true }
                );
                return res.status(200).json({ ok: true, log: logDoc });
            }

            // 2. Upsert data records
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
                .filter(doc => {
                    if (!doc || !doc[keyField]) return false;
                    if (store === 'abandoned_calls') {
                        const skills = String(doc.callSkills || doc.callRoutedCsq || '').toLowerCase();
                        return skills.includes('khelps_expert');
                    }
                    return true;
                })
                .map(doc => {
                    const cleanDoc = { ...doc };
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

        // ─── DELETE: Delete specific file's data or Clear Store (Admin Only) ─
        if (req.method === 'DELETE') {
            const fileId = req.query?.fileId || body.fileId;
            const store = req.query?.store || body.store;

            // Case 1: Delete a specific imported file and all its records from DB
            if (fileId) {
                const logEntry = await db.collection('upload_logs').findOne({ _id: fileId });
                const targetStore = store || (logEntry && logEntry.store);

                let deletedRecordsCount = 0;
                if (targetStore && VALID_STORES[targetStore]) {
                    const delRes = await db.collection(targetStore).deleteMany({ _fileId: fileId });
                    deletedRecordsCount = delRes.deletedCount || 0;
                } else {
                    // Search across all stores if store wasn't specified
                    const [r1, r2, r3, r4] = await Promise.all([
                        db.collection('sessions').deleteMany({ _fileId: fileId }),
                        db.collection('task_sla').deleteMany({ _fileId: fileId }),
                        db.collection('call_records').deleteMany({ _fileId: fileId }),
                        db.collection('abandoned_calls').deleteMany({ _fileId: fileId })
                    ]);
                    deletedRecordsCount = (r1.deletedCount || 0) + (r2.deletedCount || 0) + (r3.deletedCount || 0) + (r4.deletedCount || 0);
                }

                await db.collection('upload_logs').deleteOne({ _id: fileId });

                return res.status(200).json({
                    ok: true,
                    deletedFileId: fileId,
                    deletedRecordsCount
                });
            }

            // Case 2: Clear all stores & logs
            if (store === 'all') {
                await Promise.all([
                    db.collection('sessions').deleteMany({}),
                    db.collection('task_sla').deleteMany({}),
                    db.collection('call_records').deleteMany({}),
                    db.collection('abandoned_calls').deleteMany({}),
                    db.collection('upload_logs').deleteMany({})
                ]);
                return res.status(200).json({ ok: true, cleared: 'all' });
            }

            // Case 3: Clear a single module store & its file logs
            if (!store || !VALID_STORES[store]) {
                return res.status(400).json({ ok: false, error: `Invalid store to clear: ${store}` });
            }

            await Promise.all([
                db.collection(store).deleteMany({}),
                db.collection('upload_logs').deleteMany({ store: store })
            ]);
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
