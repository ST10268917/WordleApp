// __mocks__/firebase.js
export const db = (() => {
  // naive in-memory store
  const store = new Map();

  const collection = (name) => ({
    doc: (id) => {
      const key = `${name}/${id}`;
      return {
        async get() {
          const data = store.get(key);
          return {
            exists: !!data,
            data: () => data
          };
        },
        async set(payload, _opts) {
          store.set(key, payload);
        },
        async update(patch) {
          const cur = store.get(key) || {};
          store.set(key, { ...cur, ...patch });
        },
        collection: (sub) => collection(`${name}/${id}/${sub}`)
      };
    },
    where: () => ({
      orderBy: () => ({ orderBy: () => ({ orderBy: () => ({ limit: () => ({ async get(){ return { forEach(){} }; } }) }) }) })
    })
  });

  return { collection };
})();
