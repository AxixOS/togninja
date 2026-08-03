export function createLogger(component: string) {
  return {
    info: (message: string, meta?: any) => {
      console.log(`[${component}] INFO: ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
    },
    error: (message: string, error?: any) => {
      console.error(`[${component}] ERROR: ${message}`, error);
    },
    warn: (message: string, meta?: any) => {
      console.warn(`[${component}] WARN: ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
    },
    debug: (message: string, meta?: any) => {
      console.debug(`[${component}] DEBUG: ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
    },
  };
}