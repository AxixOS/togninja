"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.q = q;
const db_1 = require("../db");
async function q(text, params) {
    const result = await db_1.pool.query(text, params || []);
    return result.rows;
}
