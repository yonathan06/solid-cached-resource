![NPM Version](https://img.shields.io/npm/v/solid-cached-resource) ![npm bundle size](https://img.shields.io/bundlephobia/min/solid-cached-resource) ![NPM License](https://img.shields.io/npm/l/solid-cached-resource)

# Solid Cached Resource

Create a [solid resource](https://www.solidjs.com/docs/latest/api#createresource) attached to a cached state by a unique key.
Heavily inspired by [react-query](https://react-query.tanstack.com/), but for solid's [createResource](https://www.solidjs.com/docs/latest/api#createresource)
Works fluently with Solid, by keeping the same API as createResource, the resource source (the first function parameter signal) is being converted to a string key.

[API references](https://yonathan06.github.io/solid-cached-resource/)

Features:

- Create resource with the same key in multiple places - fetch once
- Cache results for next component mount, and refresh when wanted
- Mutate local resource by key after a successful remote mutation request

## install

```sh
pnpm add solid-cached-resource
```

or `npm`/`yarn`

## createCachedResource

Inspired by [useQuery](https://react-query.tanstack.com/guides/queries) just for Solid `createResource`

```TypeScript
import { createCachedResource } from "solid-cached-resource";

export const createGetUserById = (userId: Accessor<string>) => {
  return createCachedResource(
    () => ["user", userId()],
    async ([, userId]) => {
      const response = await fetch(`/users/${userId}`);
      return response.json();
    });
}

// MyComp.tsx
const [user] = createGetUserById(() => props.userId);

<div>{user().name}</div>

// MyOtherComp.tsx
const [user] = createGetUserById(() => props.userId);

<span>{user().name}</span>
```

In the case above, if `props.userId` has the same value, the key will be the same, so even though both components are creating the same resource with the same fetcher, only one request will be made to the server.

### With options

`createCachedResource` accepts an optional [options](https://yonathan06.github.io/solid-cached-resource/interfaces/CachedResourceOptions.html) object as its third argument

```TypeScript
{
  initialValue?: T (default undefined)
  refetchOnMount?: boolean (default true)
}
```

## createMutations

Inspired by [useMutation](https://react-query.tanstack.com/guides/mutations), with onSuccess hook, and `mutateCachedValue` utility function.

```TypeScript
import {
  mutateCachedValue,
  createMutation,
} from "solid-cached-resource";

export const createUpdateUser = (userId: Accessor<string>) => {
  return createMutation(async (values) => {
    const response = fetch(`user/${userId()}`, {
      method: "POST",
      body: values,
    });
    return await response.json()
  }, {
    onSuccess: (user) => {
      mutateCachedValue(() => ["user", userId()], user);
    }
  });
}
```

`mutateCachedValue` will call the resources' `mutate` function with the provided key, so the signals will be updated across your components.
