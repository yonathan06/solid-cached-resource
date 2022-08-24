import {
  createResource,
  onCleanup,
  createMemo,
  createEffect,
  createSignal,
  batch,
} from "solid-js";
import type {
  ResourceSource,
  ResourceFetcher,
} from "solid-js/types/reactive/signal";
import {
  unifyFetcherForKey,
  getKeyForSource,
  initializeStoreFieldIfEmpty,
  store,
  getCachedValue,
  setCachedValue,
} from "./cache";

export interface CachedResourceOptions<T> {
  initialValue?: T;
  refetchOnMount?: boolean;
}

function getDefaultOptions<T>() {
  return {
    refetchOnMount: true,
  };
}

/**
 * Create a cached resource
 * ```typescript
 * const [user, { refetch, mutate }] = createCachedResource(() => ["user", props.id], async ([, userId]) => {
 *  // ...fetch data
 * });
 * ```
 * @param source - reactive data function to toggle the request - key is derived for the value (parsed to string)
 * @param fetcher - function that receives the source (or true) and an accessor for the last or initial value and returns a value or a Promise with the value
 * @param options - optional object with the initialValue and refetchOnMount flag (defaults to true)
 *
 * @description https://yonathan06.github.io/solid-cached-resource/modules.html#createCachedResource
 */
export function createCachedResource<T, S = any>(
  source: ResourceSource<S>,
  fetcher: ResourceFetcher<S, T>,
  options?: CachedResourceOptions<T>
) {
  const key = createMemo(() => getKeyForSource(source));
  options = {
    ...getDefaultOptions(),
    ...(options || {}),
  };
  const resource = createResource<T, S>(
    source,
    async (sourceValues, info) => {
      initializeStoreFieldIfEmpty(key());
      const keyString = key();
      if (
        options?.initialValue &&
        !info.refetching &&
        !getCachedValue(keyString)
      ) {
        setCachedValue(keyString, options.initialValue);
        return options.initialValue;
      }
      return unifyFetcherForKey(
        key(),
        () => fetcher(sourceValues, info),
        !options!.refetchOnMount
      );
    },
    { initialValue: getCachedValue(key()) }
  );
  createEffect(() => {
    if (key()) {
      initializeStoreFieldIfEmpty(key());
      store[key()].resourceActions.push(resource[1]);
      const mutatorIndex = store[key()].resourceActions.length - 1;
      onCleanup(() => {
        store[key()].resourceActions.splice(mutatorIndex, 1);
      });
    }
  });
  return resource;
}

export interface CreateMutationOptions<R> {
  onSuccess?: (value: R) => any;
}

/**
 * Create mutation
 * ```typescript
 * const { mutateAsync, isLoading } = createMutation(async (values) => {
 *  // ...fetch data
 * });
 * ```
 * @param mutateFunction - function to be called when mutateAsync is called
 * @param options - optional object with the onSuccess hook
 *
 * @description https://yonathan06.github.io/solid-cached-resource/modules.html#createMutation
 */
export const createMutation = <T = unknown, R = unknown>(
  fn: (args: T) => Promise<R>,
  options?: CreateMutationOptions<R>
) => {
  const [isLoading, setIsLoading] = createSignal(false);
  const [isSuccess, setIsisSuccess] = createSignal(false);
  const [error, setError] = createSignal<Error | unknown>();
  const isError = () => !!error();
  const [returnedData, setReturnedData] = createSignal<R>();
  const mutateAsync: typeof fn = async (...args) => {
    setIsLoading(true);
    try {
      const response: R = await fn(...args);
      batch(() => {
        setIsLoading(false);
        setReturnedData(() => response);
        setIsisSuccess(true);
        options?.onSuccess?.(response);
      });
      return response;
    } catch (e) {
      batch(() => {
        setIsisSuccess(false);
        setIsLoading(false);
        setError(e);
      });
      throw e;
    }
  };
  const reset = () => {
    batch(() => {
      setIsisSuccess(false);
      setIsLoading(false);
      setError(null);
      setReturnedData(undefined);
    });
  };
  return {
    mutateAsync,
    isLoading,
    isSuccess,
    isError,
    error,
    returnedData,
    reset,
  };
};

/**
 * Mutated cached value
 * ```typescript
 * mutateCachedValue(() => ["user", props.id], (prev) => {
 *  return {
 *    ...prev,
 *    ...newUserData,
 *  }
 * })
 * ```
 * Will trigger the `mutate` function on all resources that has the same key
 *
 * @param source - reactive data function to toggle the request - key is derived for the value (parsed to string)
 * @param value - The new value for the given key. Can be any data, or a function that provides the previous cached data
 *
 * @description https://yonathan06.github.io/solid-cached-resource/modules.html#mutateCachedValue
 */
export function mutateCachedValue<S, T = any>(
  source: S,
  value: T | ((prev: T) => T)
) {
  const key = getKeyForSource(source);
  initializeStoreFieldIfEmpty(key);
  store[key].cachedValue =
    typeof value === "function"
      ? (value as Function)(store[key].cachedValue)
      : value;
  batch(() => {
    for (let { mutate } of store[key].resourceActions) {
      mutate(() => store[key].cachedValue);
    }
  });
}

/**
 * 
 * Refetch resources for key 
 * ```typescript
 * refetchResourceForKey(() => ["user", props.id])
 * ```
 * 
 * Will trigger the `refresh` function on all resources that has the same key
 * @param source - reactive data function to toggle the request - key is derived for the value (parsed to string)
 */
export function refetchResourceForKey<S>(source: S) {
  const key = getKeyForSource(source);
  const actions = store[key].resourceActions;
  for (const action of actions) {
    action.refetch();
  }
}
