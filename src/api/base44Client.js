// src/api/base44Client.js
// Phase-1 stub: the real Base44 backend is being replaced by Supabase.
// Until each entity is migrated, all calls to base44.entities.<X>.<method>(...)
// return safe defaults (empty arrays / null) so the UI does not crash.

const listMethods = new Set([
  'list', 'filter', 'find', 'findAll', 'search', 'query',
  'getAll', 'all', 'fetch', 'fetchAll',
]);

const singleMethods = new Set([
  'get', 'getOne', 'findOne', 'findById', 'byId', 'one',
]);

const writeMethods = new Set([
  'create', 'insert', 'update', 'upsert', 'save',
  'delete', 'remove', 'destroy',
]);

function makeEntityProxy(name) {
  return new Proxy(function () {}, {
    get(_t, method) {
      if (method === 'then') return undefined; // not a thenable
      if (method === Symbol.toPrimitive) return () => name;
      return async (...args) => {
        if (listMethods.has(String(method))) return [];
        if (singleMethods.has(String(method))) return null;
        if (writeMethods.has(String(method))) return { ok: true };
        // Fallback: return empty array (safest for map/filter consumers)
        return [];
      };
    },
  });
}

const entities = new Proxy({}, {
  get(_t, name) {
    if (typeof name !== 'string') return undefined;
    return makeEntityProxy(name);
  },
});

const auth = {
  me: async () => null,
  login: async () => null,
  logout: async () => null,
  signUp: async () => null,
};

const integrations = new Proxy({}, {
  get() { return async () => ({ ok: true }); },
});

export const base44 = {
  entities,
  auth,
  integrations,
  functions: new Proxy({}, { get() { return async () => ({ ok: true }); } }),
  realtime: {
    subscribe: () => ({ unsubscribe: () => {} }),
    on: () => () => {},
    off: () => {},
    emit: () => {},
  },
};

export default base44;
