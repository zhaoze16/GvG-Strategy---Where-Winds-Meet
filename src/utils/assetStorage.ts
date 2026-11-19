import { MapIconType, PathIcon, PlayerRole, WeaponIcon } from '../types/gvg';

const DB_NAME = 'gvg_strategy_matrix_db';
const DB_VERSION = 1;
const STORE_NAME = 'assets';
const ASSETS_KEY = 'library_v1';

export interface StoredBinaryAssets {
  weaponIcons: WeaponIcon[];
  pathIcons: PathIcon[];
  roleIcons: Partial<Record<PlayerRole, string>>;
  roleIconColors: Partial<Record<PlayerRole, string>>;
  mapObjectIcons: Partial<Record<MapIconType, string>>;
  mapObjectIconColors: Partial<Record<MapIconType, string>>;
  customMapImage: string | null;
}

function openAssetsDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
  });
}

export async function loadBinaryAssets(): Promise<StoredBinaryAssets | null> {
  try {
    const db = await openAssetsDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(ASSETS_KEY);
      req.onsuccess = () => {
        const val = req.result as Partial<StoredBinaryAssets> | undefined;
        if (!val) {
          resolve(null);
          return;
        }
        resolve({
          weaponIcons: Array.isArray(val.weaponIcons) ? val.weaponIcons : [],
          pathIcons: Array.isArray(val.pathIcons) ? val.pathIcons : [],
          roleIcons:
            val.roleIcons && typeof val.roleIcons === 'object' && !Array.isArray(val.roleIcons)
              ? val.roleIcons
              : {},
          roleIconColors:
            val.roleIconColors &&
            typeof val.roleIconColors === 'object' &&
            !Array.isArray(val.roleIconColors)
              ? val.roleIconColors
              : {},
          mapObjectIcons:
            val.mapObjectIcons &&
            typeof val.mapObjectIcons === 'object' &&
            !Array.isArray(val.mapObjectIcons)
              ? val.mapObjectIcons
              : {},
          mapObjectIconColors:
            val.mapObjectIconColors &&
            typeof val.mapObjectIconColors === 'object' &&
            !Array.isArray(val.mapObjectIconColors)
              ? val.mapObjectIconColors
              : {},
          customMapImage: typeof val.customMapImage === 'string' ? val.customMapImage : null,
        });
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function saveBinaryAssets(assets: StoredBinaryAssets): Promise<void> {
  try {
    const db = await openAssetsDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(assets, ASSETS_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore IndexedDB write errors if browser blocks storage
  }
}
