const dependableState = (globalThis.__dependable =
  globalThis.__dependable || {});
dependableState._updated = new Set();
dependableState._references = new Map();
dependableState._listeners = new Set();
dependableState._initial = new Map();

const defaultPriority = 0;

/**
 * Add a state listener.
 *
 * @param {import('./shared').StateListener} listener the listner to be added.
 */
export const addStateListener = (listener) => {
  dependableState._listeners.add(listener);
};

/**
 * Remove a state listener.
 *
 * @param {import('./shared').StateListener} listener the listner to be removed.
 */
export const removeStateListener = (listener) => {
  dependableState._listeners.delete(listener);
};

/**
 * Return all active subscribables
 *
 * @returns {import('./shared').Subscribables} subscribables
 */
export const subscribables = () => {
  const subscribables = new Set();

  for (const ref of dependableState._references.values()) {
    const subscribable = ref.deref();
    if (subscribable) {
      subscribables.add(subscribable);
    }
  }

  return subscribables;
};

/**
 * Register an observable that will be used when creating other observables with
 * the same id.
 *
 * @template T
 * @param {import('./shared').Observable<T>} observable the observable to register.
 */
export const registerInitial = (observable) => {
  dependableState._initial.set(observable.id, observable);
};

const registerSubscribable = (fn) => {
  if (fn.id) {
    dependableState._references.set(fn.id, new WeakRef(fn));
  }

  notifyStateListeners(new Set([fn]));
};

const clearFlushHook = () => {
  if (typeof window !== "undefined") {
    window.cancelAnimationFrame(flush);
  } else {
    clearTimeout(flush);
  }
};

const addFlushHook = () => {
  clearFlushHook();
  if (typeof window !== "undefined") {
    window.requestAnimationFrame(flush);
  } else {
    setTimeout(flush, 0);
  }
};

const notifyStateListeners = (updates) => {
  for (const listener of dependableState._listeners) {
    listener(updates);
  }
};

/**
 * Flushes all changes to computeds and calling all subscribers.
 */
export const flush = () => {
  const updated = dependableState._updated;

  const subscribers = new Map();

  const work = new Set();

  collectWork(updated, work);

  const potentialUpdates = new Set();
  const updates = new Set();

  for (const subscribable of work) {
    if (subscribable._dependencies) {
      let updatedDependencies = false;

      for (const dependency of subscribable._dependencies) {
        if (dependency._hasChanged) {
          updatedDependencies = true;
          break;
        }
      }

      if (updatedDependencies) {
        subscribable._update();
      }
    }

    if (subscribable._hasChanged) {
      updates.add(subscribable);

      for (const [
        subscriber,
        priority,
      ] of subscribable._subscribers.entries()) {
        subscribers.set(subscriber, priority);
      }
    }
  }

  dependableState._updated.clear();

  const prioritizedSubscribers = Array.from(subscribers.entries())
    .sort((a, b) => a[1] - b[1])
    .map(([s]) => s);

  for (const subscriber of prioritizedSubscribers) {
    subscriber();
  }

  notifyStateListeners(updates);

  clearFlushHook();

  if (dependableState._updated.size > 0) {
    // subscriptions made new updates
    flush();
  }
};

const registerUpdate = (fn) => {
  dependableState._updated.add(fn);

  addFlushHook();
};

/**
 * Creating a new observable with the given initial value.
 *
 * @template T
 * @param {T} initialValue Initial value
 * @param {import('./shared').SubscribableOptions<T>} options Subscribable options
 * @returns {import('./shared').Observable<T>} Observable
 */
export const observable = (initialValue, options = {}) => {
  const { id, isEqual = Object.is } = options;

  if (id && dependableState._initial.has(id)) {
    const restored = dependableState._initial.get(id);
    if (restored) {
      // override isEqual as it might not have been set
      // and restoring observables will be initialized without it.
      restored._isEqual = isEqual;

      // has been restored
      dependableState._initial.delete(id);
      return restored;
    }
  }

  if (id && dependableState._references.has(id)) {
    const cached = dependableState._references.get(id).deref();
    if (cached) return cached;
  }

  let value = initialValue;
  let prevValue = initialValue;

  const fn = (...args) => {
    if (args.length === 0) {
      if (dependableState._dependencies) {
        dependableState._dependencies.add(fn);
      }

      return value;
    } else {
      prevValue = value;
      value = args[0];
      fn._hasChanged = !fn._isEqual(value, prevValue);

      if (fn._hasChanged) {
        registerUpdate(fn);
      }
    }
  };

  fn.id = id;
  fn.kind = "observable";
  fn._isEqual = isEqual;
  fn._dependents = new Set();
  fn._subscribers = new Map();
  fn._hasChanged = false;

  fn._registerDependent = (dependent) => {
    fn._dependents.add(dependent);
  };

  fn._unregisterDependent = (dependent) => {
    fn._dependents.delete(dependent);
  };

  fn.subscribe = (subscriber, priority = defaultPriority) => {
    fn._subscribers.set(subscriber, priority);
  };

  fn.unsubscribe = (subscriber) => {
    fn._subscribers.delete(subscriber);
  };

  registerSubscribable(fn);

  return fn;
};

const collectWork = (subscribables, work) => {
  const dependents = new Set();
  for (const subscribable of subscribables) {
    work.delete(subscribable);
    work.add(subscribable);

    for (const dependent of subscribable._dependents) {
      dependents.add(dependent);
    }
  }

  if (dependents.size > 0) {
    collectWork(dependents, work);
  }
};

export const track = (cb) => {
  const parentDependencies = dependableState._dependencies;
  const capturedDependencies = new Set();
  dependableState._dependencies = capturedDependencies;
  cb();
  dependableState._dependencies = parentDependencies;
  return capturedDependencies;
};

/**
 * Creating a new computed based on the given callback function.
 *
 * @template T
 * @param {() => T} cb Function that produces the computed result
 * @param {import('./shared').SubscribableOptions<T>} options Subscribable options
 * @returns {import('./shared').Computed<T>} Computed
 */
export const computed = (cb, options = {}) => {
  const { id, isEqual = Object.is } = options;

  if (id && dependableState._references.has(id)) {
    let cached = dependableState._references.get(id).deref();
    if (cached) return cached;
  }

  let value = null;
  let prevValue = null;
  let active = false;

  const fn = () => {
    if (dependableState._dependencies) {
      dependableState._dependencies.add(fn);
    }

    if (active) {
      return value;
    } else if (dependableState._dependencies) {
      fn._update();
      return value;
    } else {
      prevValue = value;
      value = cb();
      return value;
    }
  };

  fn.id = id;
  fn.kind = "computed";
  fn._dependents = new Set();
  fn._dependencies = new Set();
  fn._subscribers = new Map();
  fn._hasChanged = false;

  fn._update = () => {
    prevValue = value;
    const capturedDependencies = track(() => {
      value = cb();
    });

    const previousDependencies = fn._dependencies;
    fn._dependencies = capturedDependencies;

    if (!active) {
      prevValue = value;
    }
    fn._hasChanged = !isEqual(value, prevValue);

    const unsubscribed = new Set();
    for (const dependency of previousDependencies) {
      if (!capturedDependencies.has(dependency)) {
        unsubscribed.add(dependency);
      }
    }

    for (const dependency of fn._dependencies) {
      dependency._registerDependent(fn);
    }

    for (const dependency of unsubscribed) {
      dependency._unregisterDependent(fn);
    }
  };

  const updateActivation = () => {
    if (active) {
      if (fn._dependents.size === 0 && fn._subscribers.size === 0) {
        for (const dependency of fn._dependencies) {
          dependency._unregisterDependent(fn);
        }

        fn._dependencies = new Set();

        active = false;
      }
    } else if (fn._dependents.size > 0) {
      active = true;
    } else if (fn._subscribers.size > 0) {
      fn._update();
      active = true;
    }
  };

  fn._registerDependent = (dependent) => {
    fn._dependents.add(dependent);
    updateActivation();
  };

  fn._unregisterDependent = (dependent) => {
    fn._dependents.delete(dependent);
    updateActivation();
  };

  fn.subscribe = (subscriber, priority = defaultPriority) => {
    fn._subscribers.set(subscriber, priority);
    updateActivation();
  };

  fn.unsubscribe = (subscriber) => {
    fn._subscribers.delete(subscriber);
    updateActivation();
  };

  registerSubscribable(fn);

  return fn;
};
