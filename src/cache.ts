import { ResourceFetcher, ResourceFetcherInfo } from "solid-js";
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

export function getKeyForSource<S>(source: ResourceSource<S>): string {
  const value = typeof source === "function" ? (source as Function)() : source;
  if (value === false || value === null || value === undefined) return value;
  // Taken from https://github.com/tannerlinsley/react-query
  const key: string = isPlainObject(value) ? stringyValue(value) : value + "";
  return key;
}

export async function getCachedValue<S, T = any>(
  source: S,
  key: string,
  fetcher: ResourceFetcher<S, T>,
  info: ResourceFetcherInfo<T>
): Promise<T> {
  // if (store[key].cachedValue && !info.refetching) return store[key].cachedValue;
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
    const value = await fetcher(source, info);
    store[key].cachedValue = value;
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
