const dependableState = (globalThis.__dependable =
  globalThis.__dependable || {});
dependableState._updated = new Set();
dependableState._references = new Map();
dependableState._listeners = new Set();

export const addStateListener = (listener) => {
  dependableState._listeners.add(listener);
};

export const removeStateListener = (listener) => {
  dependableState._listeners.delete(listener);
};

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

const registerActive = (fn) => {
  dependableState._references.set(fn.id, new WeakRef(fn));

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

export const flush = () => {
  const updated = dependableState._updated;

  const listeners = new Set();

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

      for (const listener of subscribable._listeners) {
        listeners.add(listener);
      }
    }
  }

  for (const listener of listeners) {
    listener();
  }

  notifyStateListeners(updates);

  dependableState._updated.clear();

  clearFlushHook();
};

const registerUpdate = (fn) => {
  dependableState._updated.add(fn);

  addFlushHook();
};

export const observable = (id, initialValue, isEqual = Object.is) => {
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
      fn._hasChanged = !isEqual(value, prevValue);

      if (fn._hasChanged) {
        registerUpdate(fn);
      }
    }
  };

  fn.id = id;
  fn._dependents = new Set();
  fn._listeners = new Set();
  fn._hasChanged = false;
  fn.isObservable = true;

  fn._registerDependent = (dependent) => {
    fn._dependents.add(dependent);
  };

  fn._unregisterDependent = (dependent) => {
    fn._dependents.delete(dependent);
  };

  fn.subscribe = (listener) => {
    fn._listeners.add(listener);
  };

  fn.unsubscribe = (listener) => {
    fn._listeners.delete(listener);
  };

  registerActive(fn);

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

export const computed = (id, cb, isEqual = Object.is) => {
  const listeners = new Set();
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
  fn._dependents = new Set();
  fn._dependencies = new Set();
  fn._listeners = new Set();
  fn._hasChanged = false;
  fn.isComputed = true;

  fn._update = () => {
    const parentDependencies = dependableState._dependencies;
    dependableState._dependencies = new Set();
    prevValue = value;
    value = cb();
    if (!active) {
      prevValue = value;
    }
    fn._hasChanged = !isEqual(value, prevValue);

    const unsubscribed = new Set();
    for (const dependency of fn._dependencies) {
      if (!dependableState._dependencies.has(dependency)) {
        unsubscribed.add(dependency);
      }
    }

    fn._dependencies = dependableState._dependencies;

    for (const dependency of fn._dependencies) {
      dependency._registerDependent(fn);
    }

    for (const dependency of unsubscribed) {
      dependency._unregisterDependent(fn);
    }

    dependableState._dependencies = parentDependencies;
  };

  const updateActivation = () => {
    if (active) {
      if (fn._dependents.size === 0 && fn._listeners.size === 0) {
        for (const dependency of fn._dependencies) {
          dependency._unregisterDependent(fn);
        }

        fn._dependencies = new Set();

        active = false;
      }
    } else if (fn._dependents.size > 0 || fn._listeners.size > 0) {
      if (!dependableState._dependencies) {
        // has been updated by dependency tracking
        fn._update();
      }
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

  fn.subscribe = (listener) => {
    fn._listeners.add(listener);
    updateActivation();
  };

  fn.unsubscribe = (listener) => {
    fn._listeners.delete(listener);
    updateActivation();
  };

  registerActive(fn);

  return fn;
};
