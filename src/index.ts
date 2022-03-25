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
  getCachedValue,
  getKeyForSource,
  initializeStoreFieldIfEmpty,
  store,
} from "./cache";

export function createCachedResource<T, S>(
  source: ResourceSource<S>,
  fetcher: ResourceFetcher<S, T>
) {
  const key = createMemo(() => getKeyForSource(source));
  const resource = createResource<T, S>(source, async (sourceValues, info) => {
    initializeStoreFieldIfEmpty(key());
    return getCachedValue(sourceValues, key(), fetcher, info);
  });
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

export const createMutation = <T = any, R = any>(
  fn: (input?: T) => Promise<R>,
  options?: CreateMutationOptions<R>
) => {
  const [isLoading, setIsLoading] = createSignal(false);
  const [isSuccess, setIsisSuccess] = createSignal(false);
  const [error, setError] = createSignal<Error | any>();
  const isError = () => !!error();
  const [returnedData, setReturnedData] = createSignal<R>();
  const mutateAsync = async (input?: T) => {
    setIsLoading(true);
    try {
      const response: R = await fn(input);
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
