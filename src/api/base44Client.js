// Stub replacement for the Base44 SDK client.
// Returns safe defaults for every entity / integration / function call
// so the app can render while we migrate to Supabase.

const listMethods = new Set(['list', 'filter', 'find', 'findAll', 'search', 'query', 'getAll', 'all', 'fetch', 'fetchAll']);
const singleMethods = new Set(['get', 'getOne', 'findOne', 'findById', 'byId', 'one']);
const writeMethods = new Set(['create', 'insert', 'update', 'upsert', 'save', 'delete', 'remove', 'destroy']);

function makeEntityProxy(name) {
  return new Proxy(function () {}, {
    get(_t, method) {
      if (method === 'then') return undefined;
      if (method === Symbol.toPrimitive) return () => name;
      return async (...args) => {
        if (listMethods.has(String(method))) return [];
        if (singleMethods.has(String(method))) return null;
        if (writeMethods.has(String(method))) return { ok: true };
        return [];
      };
    },
  });
}

function makeCallableProxy() {
  const fn = function () {};
  return new Proxy(fn, {
    get(_t, prop) {
      if (prop === 'then') return undefined;
      if (prop === Symbol.toPrimitive) return () => '';
      return makeCallableProxy();
    },
    apply() {
      return Promise.resolve({ ok: true });
    },
    construct() {
      return makeCallableProxy();
    },
  });
}

const realFields = {
  entities: new Proxy({}, {
    get(_t, name) {
      if (typeof name !== 'string') return undefined;
      return makeEntityProxy(name);
    },
  }),
  auth: {
    me: async () => null,
    login: async () => null,
    logout: async () => null,
    signUp: async () => null,
  },
  integrations: makeCallableProxy(),
  functions: makeCallableProxy(),
  realtime: {
    subscribe: () => ({ unsubscribe: () => {} }),
    on: () => () => {},
    off: () => {},
    emit: () => {},
  },
};

export const base44 = new Proxy(realFields, {
  get(target, prop) {
    if (prop in target) return target[prop];
    if (prop === 'then') return undefined;
    if (typeof prop === 'symbol') return undefined;
    return makeCallableProxy();
  },
});

export default base44;
