export function createLazyResource<T>(factory: () => T): T {
  let actualResource: T | null = null;

  const handler: ProxyHandler<object> = {
    get(target, property, receiver) {
      if (actualResource === null) {
        actualResource = factory();
      }

      return Reflect.get(actualResource!, property, receiver);
    },

    set(target, property, value, receiver) {
      if (actualResource === null) {
        actualResource = factory();
      }
      return Reflect.set(actualResource!, property, value, receiver);
    },
  };

  return new Proxy({}, handler) as T;
}
