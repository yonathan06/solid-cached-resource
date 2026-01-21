import type {
	ResourceActions,
	ResourceSource,
} from "solid-js";
import { isPlainObject, stringyValue } from "./utils.js";

type Resolve<T> = (value: T) => void;
type Reject = (reason?: unknown) => void;

export interface StoreField<T = unknown> {
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

export function getCachedValue<T>(key: string): T {
	return store[key]?.cachedValue as T;
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

export async function unifyFetcherForKey<T>(
	key: string,
	fetcher: () => Promise<T> | T,
	avoidFetchIfCached = false,
): Promise<T> {
	const cachedValue = getCachedValue<T>(key);
	if (cachedValue && avoidFetchIfCached) return cachedValue;
	if (store[key].isFetching) {
		const promise = new Promise<T>((resolve, reject) => {
			(store[key] as StoreField<T>).awaiters.push({ resolve, reject });
		});
		return promise;
	}
	store[key].isFetching = true;
	try {
		const value = await fetcher();
		setCachedValue(key, value);
		for (const { resolve } of store[key].awaiters) {
			resolve(value);
		}
		for (const { mutate } of store[key].resourceActions) {
			mutate(value as never);
		}
		return value;
	} catch (e) {
		for (const { reject } of store[key].awaiters) {
			reject(e);
		}
		for (const { mutate } of store[key].resourceActions) {
			mutate(undefined);
		}
		throw e;
	} finally {
		store[key].isFetching = false;
		store[key].awaiters = [];
	}
}
