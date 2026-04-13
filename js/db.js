// ═══════════════════════════════════════════
// db.js — camada de dados (IndexedDB)
// ═══════════════════════════════════════════

const DB_NAME = 'hbs-v3';
const DB_VERSION = 1;
let db = null;

export function openDB() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('seasons'))
        d.createObjectStore('seasons', { keyPath: 'id', autoIncrement: true });
      if (!d.objectStoreNames.contains('players')) {
        const s = d.createObjectStore('players', { keyPath: 'id', autoIncrement: true });
        s.createIndex('season_id', 'season_id', { unique: false });
      }
      if (!d.objectStoreNames.contains('opponents')) {
        const s = d.createObjectStore('opponents', { keyPath: 'id', autoIncrement: true });
        s.createIndex('season_id', 'season_id', { unique: false });
      }
      if (!d.objectStoreNames.contains('matches')) {
        const s = d.createObjectStore('matches', { keyPath: 'id', autoIncrement: true });
        s.createIndex('season_id', 'season_id', { unique: false });
      }
    };

    req.onsuccess = (e) => { db = e.target.result; resolve(db); };
    req.onerror   = (e) => reject(e.target.error);
  });
}

function px(r) {
  return new Promise((res, rej) => {
    r.onsuccess = () => res(r.result);
    r.onerror   = () => rej(r.error);
  });
}

function st(name, mode = 'readonly') {
  return db.transaction(name, mode).objectStore(name);
}

function byIdx(store, idx, val) {
  return px(st(store).index(idx).getAll(IDBKeyRange.only(val)));
}

export const DB = {
  seasons: {
    all:        ()   => px(st('seasons').getAll()),
    add:        (x)  => px(st('seasons', 'readwrite').add(x)),
    put:        (x)  => px(st('seasons', 'readwrite').put(x)),
    del:        (id) => px(st('seasons', 'readwrite').delete(id)),
    allMatches: ()   => px(st('matches').getAll()),
  },
  players: {
    bySeason: (id) => byIdx('players', 'season_id', id),
    add:  (x)  => px(st('players', 'readwrite').add(x)),
    put:  (x)  => px(st('players', 'readwrite').put(x)),
    del:  (id) => px(st('players', 'readwrite').delete(id)),
  },
  opponents: {
    bySeason: (id) => byIdx('opponents', 'season_id', id),
    add:  (x)  => px(st('opponents', 'readwrite').add(x)),
    put:  (x)  => px(st('opponents', 'readwrite').put(x)),
    del:  (id) => px(st('opponents', 'readwrite').delete(id)),
  },
  matches: {
    bySeason: (id) => byIdx('matches', 'season_id', id),
    add:  (x)  => px(st('matches', 'readwrite').add(x)),
    put:  (x)  => px(st('matches', 'readwrite').put(x)),
    del:  (id) => px(st('matches', 'readwrite').delete(id)),
  },
};