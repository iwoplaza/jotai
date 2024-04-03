let keyCount = 0;
function atom(read, write) {
  const key = `atom${++keyCount}`;
  const config = {
    toString: () => key
  };
  if (typeof read === "function") {
    config.read = read;
  } else {
    config.init = read;
    config.read = defaultRead;
    config.write = defaultWrite;
  }
  if (write) {
    config.write = write;
  }
  return config;
}
function defaultRead(get) {
  return get(this);
}
function defaultWrite(get, set, arg) {
  return set(
    this,
    typeof arg === "function" ? arg(get(this)) : arg
  );
}

const isSelfAtom = (atom, a) => atom.unstable_is ? atom.unstable_is(a) : a === atom;
const hasInitialValue = (atom) => "init" in atom;
const isActuallyWritableAtom = (atom) => !!atom.write;
const createPendingPair = () => [/* @__PURE__ */ new Set(), /* @__PURE__ */ new Set()];
const addPending = (pendingPair, pending) => {
  (pendingPair[0] || pendingPair[1]).add(pending);
};
const flushPending = (pendingPair, isAsync) => {
  let pendingSet;
  if (isAsync) {
    if (pendingPair[0]) {
      return;
    }
    pendingSet = pendingPair[1];
  } else {
    if (!pendingPair[0]) {
      throw new Error("[Bug] cannot sync flush twice");
    }
    pendingSet = pendingPair[0];
  }
  const flushed = /* @__PURE__ */ new Set();
  while (pendingSet.size) {
    const copy = new Set(pendingSet);
    pendingSet.clear();
    copy.forEach((pending) => {
      if (typeof pending === "function") {
        pending();
      } else {
        const [atom, atomState] = pending;
        if (!flushed.has(atom) && atomState.m) {
          atomState.m.l.forEach((listener) => listener());
          flushed.add(atom);
        }
      }
    });
  }
  pendingPair[0] = void 0;
  return flushed;
};
const CONTINUE_PROMISE = Symbol(
  (import.meta.env ? import.meta.env.MODE : void 0) !== "production" ? "CONTINUE_PROMISE" : ""
);
const PENDING = "pending";
const FULFILLED = "fulfilled";
const REJECTED = "rejected";
const isContinuablePromise = (promise) => typeof promise === "object" && promise !== null && CONTINUE_PROMISE in promise;
const continuablePromiseMap = /* @__PURE__ */ new WeakMap();
const createContinuablePromise = (promise, abort, complete) => {
  if (!continuablePromiseMap.has(promise)) {
    let continuePromise;
    const p = new Promise((resolve, reject) => {
      let curr = promise;
      const onFullfilled = (me) => (v) => {
        if (curr === me) {
          p.status = FULFILLED;
          p.value = v;
          resolve(v);
          complete();
        }
      };
      const onRejected = (me) => (e) => {
        if (curr === me) {
          p.status = REJECTED;
          p.reason = e;
          reject(e);
          complete();
        }
      };
      promise.then(onFullfilled(promise), onRejected(promise));
      continuePromise = (nextPromise, nextAbort) => {
        if (nextPromise) {
          continuablePromiseMap.set(nextPromise, p);
          curr = nextPromise;
          nextPromise.then(onFullfilled(nextPromise), onRejected(nextPromise));
        }
        abort();
        abort = nextAbort;
      };
    });
    p.status = PENDING;
    p[CONTINUE_PROMISE] = continuePromise;
    continuablePromiseMap.set(promise, p);
  }
  return continuablePromiseMap.get(promise);
};
const isPromiseLike = (x) => typeof (x == null ? void 0 : x.then) === "function";
const getPendingContinuablePromise = (atomState) => {
  var _a;
  const value = (_a = atomState.s) == null ? void 0 : _a.v;
  if (isContinuablePromise(value) && value.status === PENDING) {
    return value;
  }
  return null;
};
const returnAtomValue = (atomState) => {
  if ("e" in atomState.s) {
    throw atomState.s.e;
  }
  return atomState.s.v;
};
const setAtomStateValueOrPromise = (atomState, valueOrPromise, abortPromise = () => {
}, completePromise = () => {
}) => {
  const pendingPromise = getPendingContinuablePromise(atomState);
  if (isPromiseLike(valueOrPromise)) {
    if (pendingPromise) {
      if (pendingPromise !== valueOrPromise) {
        pendingPromise[CONTINUE_PROMISE](valueOrPromise, abortPromise);
      }
    } else {
      const continuablePromise = createContinuablePromise(
        valueOrPromise,
        abortPromise,
        completePromise
      );
      atomState.s = { v: continuablePromise };
    }
  } else {
    if (pendingPromise) {
      pendingPromise[CONTINUE_PROMISE](
        Promise.resolve(valueOrPromise),
        abortPromise
      );
    }
    atomState.s = { v: valueOrPromise };
  }
};
const createStore = () => {
  const atomStateMap = /* @__PURE__ */ new WeakMap();
  const getAtomState = (atom) => {
    if (!atomStateMap.has(atom)) {
      const atomState = { d: /* @__PURE__ */ new Map(), t: /* @__PURE__ */ new Set() };
      atomStateMap.set(atom, atomState);
    }
    return atomStateMap.get(atom);
  };
  let storeListenersRev2;
  let mountedAtoms;
  if ((import.meta.env ? import.meta.env.MODE : void 0) !== "production") {
    storeListenersRev2 = /* @__PURE__ */ new Set();
    mountedAtoms = /* @__PURE__ */ new Set();
  }
  const clearDependencies = (atom) => {
    const atomState = getAtomState(atom);
    for (const a of atomState.d.keys()) {
      getAtomState(a).t.delete(atom);
    }
    atomState.d.clear();
  };
  const addDependency = (atom, a, aState, isSync) => {
    if ((import.meta.env ? import.meta.env.MODE : void 0) !== "production" && a === atom) {
      throw new Error("[Bug] atom cannot depend on itself");
    }
    const atomState = getAtomState(atom);
    atomState.d.set(a, aState.s);
    aState.t.add(atom);
    if (!isSync && atomState.m) {
      const pendingPair = createPendingPair();
      mountDependencies(pendingPair, atomState);
      flushPending(pendingPair);
    }
  };
  const readAtomState = (atom, force) => {
    const atomState = getAtomState(atom);
    if (!force && "s" in atomState) {
      if (atomState.m) {
        return atomState;
      }
      if (Array.from(atomState.d).every(([a, s]) => {
        const aState = readAtomState(a);
        return "v" in s && "v" in aState.s && Object.is(s.v, aState.s.v);
      })) {
        return atomState;
      }
    }
    clearDependencies(atom);
    let isSync = true;
    const getter = (a) => {
      if (isSelfAtom(atom, a)) {
        const aState2 = getAtomState(a);
        if (!aState2.s) {
          if (hasInitialValue(a)) {
            setAtomStateValueOrPromise(aState2, a.init);
          } else {
            throw new Error("no atom init");
          }
        }
        return returnAtomValue(aState2);
      }
      const aState = readAtomState(a);
      addDependency(atom, a, aState, isSync);
      return returnAtomValue(aState);
    };
    let controller;
    let setSelf;
    const options = {
      get signal() {
        if (!controller) {
          controller = new AbortController();
        }
        return controller.signal;
      },
      get setSelf() {
        if ((import.meta.env ? import.meta.env.MODE : void 0) !== "production" && !isActuallyWritableAtom(atom)) {
          console.warn("setSelf function cannot be used with read-only atom");
        }
        if (!setSelf && isActuallyWritableAtom(atom)) {
          setSelf = (...args) => {
            if ((import.meta.env ? import.meta.env.MODE : void 0) !== "production" && isSync) {
              console.warn("setSelf function cannot be called in sync");
            }
            if (!isSync) {
              return writeAtom(atom, ...args);
            }
          };
        }
        return setSelf;
      }
    };
    try {
      const valueOrPromise = atom.read(getter, options);
      setAtomStateValueOrPromise(
        atomState,
        valueOrPromise,
        () => controller == null ? void 0 : controller.abort(),
        () => {
          if (atomState.m) {
            const pendingPair = createPendingPair();
            mountDependencies(pendingPair, atomState);
            flushPending(pendingPair);
          }
        }
      );
      return atomState;
    } catch (error) {
      atomState.s = { e: error };
      return atomState;
    } finally {
      isSync = false;
    }
  };
  const readAtom = (atom) => returnAtomValue(readAtomState(atom));
  const recomputeDependents = (pendingPair, atom) => {
    const topsortedAtoms = [];
    const markedAtoms = /* @__PURE__ */ new Set();
    const visit = (n) => {
      if (markedAtoms.has(n)) {
        return;
      }
      markedAtoms.add(n);
      for (const m of getAtomState(n).t) {
        if (n !== m) {
          visit(m);
        }
      }
      topsortedAtoms.push(n);
    };
    visit(atom);
    const changedAtoms = /* @__PURE__ */ new Set([atom]);
    for (let i = topsortedAtoms.length - 1; i >= 0; --i) {
      const a = topsortedAtoms[i];
      const aState = getAtomState(a);
      const prev = aState.s;
      let hasChangedDeps = false;
      for (const dep of aState.d.keys()) {
        if (dep !== a && changedAtoms.has(dep)) {
          hasChangedDeps = true;
          break;
        }
      }
      if (hasChangedDeps) {
        if (aState.m || getPendingContinuablePromise(aState)) {
          readAtomState(a, true);
          mountDependencies(pendingPair, aState);
          if (!prev || !("v" in prev) || !("v" in aState.s) || !Object.is(prev.v, aState.s.v)) {
            addPending(pendingPair, [a, aState]);
            changedAtoms.add(a);
          }
        }
      }
    }
  };
  const writeAtomState = (pendingPair, atom, ...args) => {
    const getter = (a) => returnAtomValue(readAtomState(a));
    const setter = (a, ...args2) => {
      let r;
      if (isSelfAtom(atom, a)) {
        if (!hasInitialValue(a)) {
          throw new Error("atom not writable");
        }
        const aState = getAtomState(a);
        const prev = aState.s;
        const v = args2[0];
        setAtomStateValueOrPromise(aState, v);
        mountDependencies(pendingPair, aState);
        const curr = aState.s;
        if (!prev || !("v" in prev) || !("v" in curr) || !Object.is(prev.v, curr.v)) {
          addPending(pendingPair, [a, aState]);
          recomputeDependents(pendingPair, a);
        }
      } else {
        r = writeAtomState(pendingPair, a, ...args2);
      }
      const flushed = flushPending(pendingPair, true);
      if ((import.meta.env ? import.meta.env.MODE : void 0) !== "production" && flushed) {
        storeListenersRev2.forEach((l) => l({ type: "async-write", flushed }));
      }
      return r;
    };
    const result = atom.write(getter, setter, ...args);
    return result;
  };
  const writeAtom = (atom, ...args) => {
    const pendingPair = createPendingPair();
    const result = writeAtomState(pendingPair, atom, ...args);
    const flushed = flushPending(pendingPair);
    if ((import.meta.env ? import.meta.env.MODE : void 0) !== "production") {
      storeListenersRev2.forEach((l) => l({ type: "write", flushed }));
    }
    return result;
  };
  const mountDependencies = (pendingPair, atomState) => {
    if (atomState.m && !getPendingContinuablePromise(atomState)) {
      for (const a of atomState.d.keys()) {
        if (!atomState.m.d.has(a)) {
          mountAtom(pendingPair, a);
          atomState.m.d.add(a);
        }
      }
      for (const a of atomState.m.d || []) {
        if (!atomState.d.has(a)) {
          unmountAtom(pendingPair, a);
          atomState.m.d.delete(a);
        }
      }
    }
  };
  const mountAtom = (pendingPair, atom) => {
    const atomState = getAtomState(atom);
    if (!atomState.m) {
      readAtomState(atom);
      for (const a of atomState.d.keys()) {
        mountAtom(pendingPair, a);
      }
      atomState.m = { l: /* @__PURE__ */ new Set(), d: new Set(atomState.d.keys()) };
      if ((import.meta.env ? import.meta.env.MODE : void 0) !== "production") {
        mountedAtoms.add(atom);
      }
      if (isActuallyWritableAtom(atom) && atom.onMount) {
        const mounted = atomState.m;
        const { onMount } = atom;
        addPending(pendingPair, () => {
          const onUnmount = onMount(
            (...args) => writeAtomState(pendingPair, atom, ...args)
          );
          if (onUnmount) {
            mounted.u = onUnmount;
          }
        });
      }
    }
    return atomState.m;
  };
  const unmountAtom = (pendingPair, atom) => {
    const atomState = getAtomState(atom);
    if (atomState.m && !atomState.m.l.size && !Array.from(atomState.t).some((a) => getAtomState(a).m)) {
      const onUnmount = atomState.m.u;
      if (onUnmount) {
        addPending(pendingPair, onUnmount);
      }
      delete atomState.m;
      if ((import.meta.env ? import.meta.env.MODE : void 0) !== "production") {
        mountedAtoms.delete(atom);
      }
      for (const a of atomState.d.keys()) {
        unmountAtom(pendingPair, a);
      }
      const pendingPromise = getPendingContinuablePromise(atomState);
      if (pendingPromise) {
        pendingPromise[CONTINUE_PROMISE](void 0, () => {
        });
      }
    }
  };
  const subscribeAtom = (atom, listener) => {
    var _a;
    let prevMounted;
    if ((import.meta.env ? import.meta.env.MODE : void 0) !== "production") {
      prevMounted = (_a = atomStateMap.get(atom)) == null ? void 0 : _a.m;
    }
    const pendingPair = createPendingPair();
    const mounted = mountAtom(pendingPair, atom);
    const flushed = flushPending(pendingPair);
    const listeners = mounted.l;
    listeners.add(listener);
    if ((import.meta.env ? import.meta.env.MODE : void 0) !== "production") {
      if (!prevMounted) {
        flushed.add(atom);
      }
      storeListenersRev2.forEach((l) => l({ type: "sub", flushed }));
    }
    return () => {
      listeners.delete(listener);
      const pendingPair2 = createPendingPair();
      unmountAtom(pendingPair2, atom);
      flushPending(pendingPair2);
      if ((import.meta.env ? import.meta.env.MODE : void 0) !== "production") {
        storeListenersRev2.forEach((l) => l({ type: "unsub" }));
      }
    };
  };
  if ((import.meta.env ? import.meta.env.MODE : void 0) !== "production") {
    return {
      get: readAtom,
      set: writeAtom,
      sub: subscribeAtom,
      // store dev methods (these are tentative and subject to change without notice)
      dev_subscribe_store: (l, rev) => {
        if (rev !== 2) {
          throw new Error("The current StoreListener revision is 2.");
        }
        storeListenersRev2.add(l);
        return () => {
          storeListenersRev2.delete(l);
        };
      },
      dev_get_mounted_atoms: () => mountedAtoms.values(),
      dev_get_atom_state: (a) => {
        const getOldAtomState = (a2) => {
          const aState = atomStateMap.get(a2);
          return aState && aState.s && {
            d: new Map(
              Array.from(aState.d.keys()).flatMap((a3) => {
                const s = getOldAtomState(a3);
                return s ? [[a3, s]] : [];
              })
            ),
            ...aState.s
          };
        };
        return getOldAtomState(a);
      },
      dev_get_mounted: (a) => {
        const aState = atomStateMap.get(a);
        return aState && aState.m && {
          l: aState.m.l,
          t: /* @__PURE__ */ new Set([...aState.t, a]),
          // HACK to include self
          ...aState.m.u ? { u: aState.m.u } : {}
        };
      },
      dev_restore_atoms: (values) => {
        const pendingPair = createPendingPair();
        for (const [atom, value] of values) {
          setAtomStateValueOrPromise(getAtomState(atom), value);
          recomputeDependents(pendingPair, atom);
        }
        const flushed = flushPending(pendingPair);
        storeListenersRev2.forEach(
          (l) => l({ type: "restore", flushed })
        );
      }
    };
  }
  return {
    get: readAtom,
    set: writeAtom,
    sub: subscribeAtom
  };
};
let defaultStore;
const getDefaultStore = () => {
  if (!defaultStore) {
    defaultStore = createStore();
    if ((import.meta.env ? import.meta.env.MODE : void 0) !== "production") {
      globalThis.__JOTAI_DEFAULT_STORE__ || (globalThis.__JOTAI_DEFAULT_STORE__ = defaultStore);
      if (globalThis.__JOTAI_DEFAULT_STORE__ !== defaultStore) {
        console.warn(
          "Detected multiple Jotai instances. It may cause unexpected behavior with the default store. https://github.com/pmndrs/jotai/discussions/2044"
        );
      }
    }
  }
  return defaultStore;
};

export { atom, createStore, getDefaultStore };
