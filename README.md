# Solid Cached Resource (Experimental)

Create a [resource](https://www.solidjs.com/docs/latest/api#createresource) attached to a cached state by a unique key.
Heavily inspired by [react-query](https://react-query.tanstack.com/), but for solid's [createResource](https://www.solidjs.com/docs/latest/api#createresource)
Works fluently with Solid, by keeping the same API as createResource, the resource source (the first function parameter signal) is being converted to a string key.

Features:

- Create resource with the same key in multiple places - fetch onces
- Cache results for next component mount, and refresh when wanted
- Mutate local resource by key after a successful mutation remote request

## createCachedResource

Inspired by [useQuery](https://react-query.tanstack.com/guides/queries) just for Solid `createResource`

```JavaScript
import { createCachedResource } from "solid-cached-resource";

export const createGetUserById = (userId: Accessor<string>) => {
  return createCachedResource(
    () => ["user", userId()],
    async ([, userId]) => {
      const response = fetch(`/users/${userId}`);
      return await response.json();
    });
}

// MyComp.tsx
const [user] = createGetUserById(props.userId);

<div>{user().name}</div>

// MyOtherComp.tsx
const [user] = createGetUserById(props.userId);

<span>{user().name}</span>
```

In the case above, if `props.userId` has the same value, the key will be the same, so event though both components are creating the same resource with the same fetcher only one request will be made to the server.

## createMutations

Inspired by [useMutation](https://react-query.tanstack.com/guides/mutations), with onSuccess hook, and `mutateCachedValue` utility function.

```JavaScript
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

`mutateCachedValue` will call the resources `mutate` function with the provided key, so the signals will be updated across your components.
