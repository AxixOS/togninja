import fs from 'fs';
import path from 'path';

(async () => {
  const session: any = {
    id: 'debug-test-002',
    startTime: '2025-09-13T09:00:00.000Z',
    endTime: '2025-09-13T10:00:00.000Z',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const tmpDir = process.env.TEMP || process.env.TMP || 'C:\\Windows\\Temp';
  const debugPath = path.join(tmpDir, 'clean-crm-debug_import.log');

  try {
    const inspectFields = ['startTime', 'endTime', 'deliveryDate', 'createdAt', 'updatedAt'];
    const parts: string[] = [];
    for (const f of inspectFields) {
      const v = session[f];
      const t = v === undefined ? 'undefined' : (v && v.constructor ? v.constructor.name : typeof v);
      const val = v instanceof Date ? v.toISOString() : (v === undefined ? 'null' : String(v));
      parts.push(`${f}=${t}:${val}`);
    }
    const line = `DEBUG_LOG | sessionId=${session.id || ''} | ${parts.join(' | ')}\n`;
    fs.appendFileSync(debugPath, line, { encoding: 'utf8' });
    console.error(`WROTE_DEBUG_IMPORT | path=${debugPath} | ${parts.join(' | ')}`);

    // normalization
    const normalizeFields = ['startTime', 'endTime', 'deliveryDate', 'createdAt', 'updatedAt'];
    for (const f of normalizeFields) {
      const v = session[f];
      if (v !== undefined && !(v instanceof Date)) {
        const nd = new Date(v);
        if (!isNaN(nd.getTime())) {
          session[f] = nd;
        } else {
          if (f === 'startTime' || f === 'endTime') {
            session[f] = new Date();
          } else {
            session[f] = null as any;
          }
        }
      }
    }

    const parts2: string[] = [];
    for (const f of inspectFields) {
      const v = session[f];
      const t = v === undefined ? 'undefined' : (v && v.constructor ? v.constructor.name : typeof v);
      const val = v instanceof Date ? v.toISOString() : (v === undefined ? 'null' : String(v));
      parts2.push(`${f}=${t}:${val}`);
    }
    console.error(`STORAGE_DIAG_SINGLELINE | sessionId=${session.id || ''} | ${parts2.join(' | ')}`);
    console.log('Normalizer completed');
  } catch (err) {
    console.error('Normalizer error', err);
  }
})();
