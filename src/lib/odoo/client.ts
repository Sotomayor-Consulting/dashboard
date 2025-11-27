import xmlrpc from 'xmlrpc';

const config = {
  url: new URL(import.meta.env.ODOO_URL),
  db: import.meta.env.ODOO_DB,
  username: import.meta.env.ODOO_USER,
  password: import.meta.env.ODOO_PASSWORD,
};

const common = xmlrpc.createSecureClient({ host: config.url.hostname, port: 443, path: '/xmlrpc/2/common' });
const object = xmlrpc.createSecureClient({ host: config.url.hostname, port: 443, path: '/xmlrpc/2/object' });

// TIMEOUT CORTO: Si Odoo está "colgado", fallamos rápido para liberar recursos
const TIMEOUT_MS = 3000; 

const withTimeout = (promise: Promise<any>) => {
  const timeout = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Odoo Connection Timeout')), TIMEOUT_MS)
  );
  return Promise.race([promise, timeout]);
};

export async function executeKw(model: string, method: string, args: any[], kwargs: any = {}) {
  // Nota: No usamos try/catch aquí para permitir que el error suba al servicio
  // y el servicio decida qué hacer (patrón "Let it crash" controlado)
  
  // 1. Auth (si falla aquí, es que Odoo está caído)
  const uid = await withTimeout(new Promise((resolve, reject) => {
      common.methodCall('authenticate', [config.db, config.username, config.password, {}], (err, val) => 
        err ? reject(err) : resolve(val));
  }));

  if (!uid) throw new Error('Authentication failed');

  // 2. Ejecución
  return await withTimeout(new Promise((resolve, reject) => {
    object.methodCall('execute_kw', [
      config.db, uid, config.password,
      model, method, args, kwargs
    ], (err, val) => err ? reject(err) : resolve(val));
  }));
}