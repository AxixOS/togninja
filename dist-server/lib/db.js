"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.db = db;
const pg_1 = require("pg");
exports.pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});
async function db(q, p = []) {
    const c = await exports.pool.connect();
    try {
        return await c.query(q, p);
    }
    finally {
        c.release();
    }
}
