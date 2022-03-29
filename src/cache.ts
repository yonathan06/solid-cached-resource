import {
  ResourceActions,
  ResourceSource,
} from "solid-js/types/reactive/signal";
import { isPlainObject, stringyValue } from "./utils";

type Resolve<T> = (value: T) => void;
type Reject = (reason?: any) => void;

interface StoreField<T = any> {
  cachedValue?: T;
  isFetching: boolean;
  awaiters: { resolve: Resolve<T>; reject: Reject }[];
  resourceActions: ResourceActions<T>[];
}

interface Store {
  [key: string]: StoreField;
}

export const store: Store = {};

export function initializeStoreFieldIfEmpty(key: string) {
  if (!store[key]) {
    store[key] = {
      isFetching: false,
      awaiters: [],
      resourceActions: [],
    };
  }
}

export function getCachedValue(key: string) {
  return store[key]?.cachedValue;
}

export function setCachedValue<T>(key: string, value: T) {
  initializeStoreFieldIfEmpty(key);
  store[key].cachedValue = value;
}

export function getKeyForSource<S>(source: ResourceSource<S>): string {
  const value = typeof source === "function" ? (source as Function)() : source;
  if (value === false || value === null || value === undefined) return value;
  // Taken from https://github.com/tannerlinsley/react-query
  const key: string = isPlainObject(value) ? stringyValue(value) : value + "";
  return key;
}

export async function unifyFetcherForKey<T = any>(
  key: string,
  fetcher: () => Promise<T> | T,
  avoidFetchIfCached = false
): Promise<T> {
  const cachedValue = getCachedValue(key);
  if (cachedValue && avoidFetchIfCached) return cachedValue;
  if (store[key].isFetching) {
    let resolve: Resolve<T>, reject: Reject;
    const awaiterPromise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
      store[key].awaiters.push({ resolve, reject });
    });
    return awaiterPromise as Promise<T>;
  }
  store[key].isFetching = true;
  try {
    const value = await fetcher();
    setCachedValue(key, value);
    for (let { resolve } of store[key].awaiters) {
      resolve(value);
    }
    return value;
  } catch (e) {
    for (let { reject } of store[key].awaiters) {
      reject(e);
    }
    return undefined as any;
  } finally {
    store[key].isFetching = false;
    store[key].awaiters = [];
  }
}
