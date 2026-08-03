import { readFileSync } from 'fs';

const sql = readFileSync('./server/migrations/008-workflow-wizard-schema.sql', 'utf-8');

const errorPos = 14102;
const start = Math.max(0, errorPos - 200);
const end = Math.min(sql.length, errorPos + 200);

console.log('Position:', errorPos);
console.log('Context around error:\n');
console.log(sql.substring(start, end));
console.log('\n--- ERROR HERE ---');
console.log(sql.substring(errorPos, errorPos + 100));
