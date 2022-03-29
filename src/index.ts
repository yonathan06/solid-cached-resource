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

export function createCachedResource<T, S = any>(
  source: ResourceSource<S>,
  fetcher: ResourceFetcher<S, T>,
  options?: CachedResourceOptions<T>
) {
  const key = createMemo(() => getKeyForSource(source));
  options = {
    ...getDefaultOptions(),
    ...(options ?? {}),
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

export const createMutation = <T, R = any>(
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
