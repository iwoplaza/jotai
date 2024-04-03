'use strict';

var keyCount = 0;
function atom(read, write) {
  var key = "atom" + ++keyCount;
  var config = {
    toString: function toString() {
      return key;
    }
  };
  if (typeof read === 'function') {
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
  return set(this, typeof arg === 'function' ? arg(get(this)) : arg);
}

function _extends() {
  _extends = Object.assign ? Object.assign.bind() : function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  };
  return _extends.apply(this, arguments);
}
function _unsupportedIterableToArray(o, minLen) {
  if (!o) return;
  if (typeof o === "string") return _arrayLikeToArray(o, minLen);
  var n = Object.prototype.toString.call(o).slice(8, -1);
  if (n === "Object" && o.constructor) n = o.constructor.name;
  if (n === "Map" || n === "Set") return Array.from(o);
  if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
}
function _arrayLikeToArray(arr, len) {
  if (len == null || len > arr.length) len = arr.length;
  for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];
  return arr2;
}
function _createForOfIteratorHelperLoose(o, allowArrayLike) {
  var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"];
  if (it) return (it = it.call(o)).next.bind(it);
  if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") {
    if (it) o = it;
    var i = 0;
    return function () {
      if (i >= o.length) return {
        done: true
      };
      return {
        done: false,
        value: o[i++]
      };
    };
  }
  throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}

var isSelfAtom = function isSelfAtom(atom, a) {
  return atom.unstable_is ? atom.unstable_is(a) : a === atom;
};
var hasInitialValue = function hasInitialValue(atom) {
  return 'init' in atom;
};
var isActuallyWritableAtom = function isActuallyWritableAtom(atom) {
  return !!atom.write;
};
var createPendingPair = function createPendingPair() {
  return [new Set(), new Set()];
};
var addPending = function addPending(pendingPair, pending) {
  (pendingPair[0] || pendingPair[1]).add(pending);
};
var flushPending = function flushPending(pendingPair, isAsync) {
  var pendingSet;
  if (isAsync) {
    if (pendingPair[0]) {
      return;
    }
    pendingSet = pendingPair[1];
  } else {
    if (!pendingPair[0]) {
      throw new Error('[Bug] cannot sync flush twice');
    }
    pendingSet = pendingPair[0];
  }
  var flushed = new Set();
  while (pendingSet.size) {
    var copy = new Set(pendingSet);
    pendingSet.clear();
    copy.forEach(function (pending) {
      if (typeof pending === 'function') {
        pending();
      } else {
        var _atom = pending[0],
          atomState = pending[1];
        if (!flushed.has(_atom) && atomState.m) {
          atomState.m.l.forEach(function (listener) {
            return listener();
          });
          flushed.add(_atom);
        }
      }
    });
  }
  pendingPair[0] = undefined;
  return flushed;
};
var CONTINUE_PROMISE = Symbol(process.env.NODE_ENV !== 'production' ? 'CONTINUE_PROMISE' : '');
var PENDING = 'pending';
var FULFILLED = 'fulfilled';
var REJECTED = 'rejected';
var isContinuablePromise = function isContinuablePromise(promise) {
  return typeof promise === 'object' && promise !== null && CONTINUE_PROMISE in promise;
};
var continuablePromiseMap = new WeakMap();
var createContinuablePromise = function createContinuablePromise(promise, abort, complete) {
  if (!continuablePromiseMap.has(promise)) {
    var continuePromise;
    var p = new Promise(function (resolve, reject) {
      var curr = promise;
      var onFullfilled = function onFullfilled(me) {
        return function (v) {
          if (curr === me) {
            p.status = FULFILLED;
            p.value = v;
            resolve(v);
            complete();
          }
        };
      };
      var onRejected = function onRejected(me) {
        return function (e) {
          if (curr === me) {
            p.status = REJECTED;
            p.reason = e;
            reject(e);
            complete();
          }
        };
      };
      promise.then(onFullfilled(promise), onRejected(promise));
      continuePromise = function continuePromise(nextPromise, nextAbort) {
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
var isPromiseLike = function isPromiseLike(x) {
  return typeof (x == null ? void 0 : x.then) === 'function';
};
var getPendingContinuablePromise = function getPendingContinuablePromise(atomState) {
  var _s;
  var value = (_s = atomState.s) == null ? void 0 : _s.v;
  if (isContinuablePromise(value) && value.status === PENDING) {
    return value;
  }
  return null;
};
var returnAtomValue = function returnAtomValue(atomState) {
  if ('e' in atomState.s) {
    throw atomState.s.e;
  }
  return atomState.s.v;
};
var setAtomStateValueOrPromise = function setAtomStateValueOrPromise(atomState, valueOrPromise, abortPromise, completePromise) {
  if (abortPromise === void 0) {
    abortPromise = function abortPromise() {};
  }
  if (completePromise === void 0) {
    completePromise = function completePromise() {};
  }
  var pendingPromise = getPendingContinuablePromise(atomState);
  if (isPromiseLike(valueOrPromise)) {
    if (pendingPromise) {
      if (pendingPromise !== valueOrPromise) {
        pendingPromise[CONTINUE_PROMISE](valueOrPromise, abortPromise);
      }
    } else {
      var continuablePromise = createContinuablePromise(valueOrPromise, abortPromise, completePromise);
      atomState.s = {
        v: continuablePromise
      };
    }
  } else {
    if (pendingPromise) {
      pendingPromise[CONTINUE_PROMISE](Promise.resolve(valueOrPromise), abortPromise);
    }
    atomState.s = {
      v: valueOrPromise
    };
  }
};
var createStore = function createStore() {
  var atomStateMap = new WeakMap();
  var getAtomState = function getAtomState(atom) {
    if (!atomStateMap.has(atom)) {
      var atomState = {
        d: new Map(),
        t: new Set()
      };
      atomStateMap.set(atom, atomState);
    }
    return atomStateMap.get(atom);
  };
  var storeListenersRev2;
  var mountedAtoms;
  if (process.env.NODE_ENV !== 'production') {
    storeListenersRev2 = new Set();
    mountedAtoms = new Set();
  }
  var clearDependencies = function clearDependencies(atom) {
    var atomState = getAtomState(atom);
    for (var _iterator = _createForOfIteratorHelperLoose(atomState.d.keys()), _step; !(_step = _iterator()).done;) {
      var _a = _step.value;
      getAtomState(_a).t.delete(atom);
    }
    atomState.d.clear();
  };
  var addDependency = function addDependency(atom, a, aState, isSync) {
    if (process.env.NODE_ENV !== 'production' && a === atom) {
      throw new Error('[Bug] atom cannot depend on itself');
    }
    var atomState = getAtomState(atom);
    atomState.d.set(a, aState.s);
    aState.t.add(atom);
    if (!isSync && atomState.m) {
      var pendingPair = createPendingPair();
      mountDependencies(pendingPair, atomState);
      flushPending(pendingPair);
    }
  };
  var readAtomState = function readAtomState(atom, force) {
    var atomState = getAtomState(atom);
    if (!force && 's' in atomState) {
      if (atomState.m) {
        return atomState;
      }
      if (Array.from(atomState.d).every(function (_ref) {
        var a = _ref[0],
          s = _ref[1];
        var aState = readAtomState(a);
        return 'v' in s && 'v' in aState.s && Object.is(s.v, aState.s.v);
      })) {
        return atomState;
      }
    }
    clearDependencies(atom);
    var isSync = true;
    var getter = function getter(a) {
      if (isSelfAtom(atom, a)) {
        var _aState = getAtomState(a);
        if (!_aState.s) {
          if (hasInitialValue(a)) {
            setAtomStateValueOrPromise(_aState, a.init);
          } else {
            throw new Error('no atom init');
          }
        }
        return returnAtomValue(_aState);
      }
      var aState = readAtomState(a);
      addDependency(atom, a, aState, isSync);
      return returnAtomValue(aState);
    };
    var controller;
    var setSelf;
    var options = {
      get signal() {
        if (!controller) {
          controller = new AbortController();
        }
        return controller.signal;
      },
      get setSelf() {
        if (process.env.NODE_ENV !== 'production' && !isActuallyWritableAtom(atom)) {
          console.warn('setSelf function cannot be used with read-only atom');
        }
        if (!setSelf && isActuallyWritableAtom(atom)) {
          setSelf = function setSelf() {
            if (process.env.NODE_ENV !== 'production' && isSync) {
              console.warn('setSelf function cannot be called in sync');
            }
            if (!isSync) {
              for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
                args[_key] = arguments[_key];
              }
              return writeAtom.apply(void 0, [atom].concat(args));
            }
          };
        }
        return setSelf;
      }
    };
    try {
      var valueOrPromise = atom.read(getter, options);
      setAtomStateValueOrPromise(atomState, valueOrPromise, function () {
        var _controller;
        return (_controller = controller) == null ? void 0 : _controller.abort();
      }, function () {
        if (atomState.m) {
          var pendingPair = createPendingPair();
          mountDependencies(pendingPair, atomState);
          flushPending(pendingPair);
        }
      });
      return atomState;
    } catch (error) {
      atomState.s = {
        e: error
      };
      return atomState;
    } finally {
      isSync = false;
    }
  };
  var readAtom = function readAtom(atom) {
    return returnAtomValue(readAtomState(atom));
  };
  var recomputeDependents = function recomputeDependents(pendingPair, atom) {
    var topsortedAtoms = [];
    var markedAtoms = new Set();
    var visit = function visit(n) {
      if (markedAtoms.has(n)) {
        return;
      }
      markedAtoms.add(n);
      for (var _iterator2 = _createForOfIteratorHelperLoose(getAtomState(n).t), _step2; !(_step2 = _iterator2()).done;) {
        var m = _step2.value;
        if (n !== m) {
          visit(m);
        }
      }
      topsortedAtoms.push(n);
    };
    visit(atom);
    var changedAtoms = new Set([atom]);
    for (var i = topsortedAtoms.length - 1; i >= 0; --i) {
      var _a2 = topsortedAtoms[i];
      var aState = getAtomState(_a2);
      var prev = aState.s;
      var hasChangedDeps = false;
      for (var _iterator3 = _createForOfIteratorHelperLoose(aState.d.keys()), _step3; !(_step3 = _iterator3()).done;) {
        var dep = _step3.value;
        if (dep !== _a2 && changedAtoms.has(dep)) {
          hasChangedDeps = true;
          break;
        }
      }
      if (hasChangedDeps) {
        if (aState.m || getPendingContinuablePromise(aState)) {
          readAtomState(_a2, true);
          mountDependencies(pendingPair, aState);
          if (!prev || !('v' in prev) || !('v' in aState.s) || !Object.is(prev.v, aState.s.v)) {
            addPending(pendingPair, [_a2, aState]);
            changedAtoms.add(_a2);
          }
        }
      }
    }
  };
  var writeAtomState = function writeAtomState(pendingPair, atom) {
    var getter = function getter(a) {
      return returnAtomValue(readAtomState(a));
    };
    var setter = function setter(a) {
      var r;
      for (var _len3 = arguments.length, args = new Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
        args[_key3 - 1] = arguments[_key3];
      }
      if (isSelfAtom(atom, a)) {
        if (!hasInitialValue(a)) {
          throw new Error('atom not writable');
        }
        var aState = getAtomState(a);
        var prev = aState.s;
        var v = args[0];
        setAtomStateValueOrPromise(aState, v);
        mountDependencies(pendingPair, aState);
        var curr = aState.s;
        if (!prev || !('v' in prev) || !('v' in curr) || !Object.is(prev.v, curr.v)) {
          addPending(pendingPair, [a, aState]);
          recomputeDependents(pendingPair, a);
        }
      } else {
        r = writeAtomState.apply(void 0, [pendingPair, a].concat(args));
      }
      var flushed = flushPending(pendingPair, true);
      if (process.env.NODE_ENV !== 'production' && flushed) {
        storeListenersRev2.forEach(function (l) {
          return l({
            type: 'async-write',
            flushed: flushed
          });
        });
      }
      return r;
    };
    for (var _len2 = arguments.length, args = new Array(_len2 > 2 ? _len2 - 2 : 0), _key2 = 2; _key2 < _len2; _key2++) {
      args[_key2 - 2] = arguments[_key2];
    }
    var result = atom.write.apply(atom, [getter, setter].concat(args));
    return result;
  };
  var writeAtom = function writeAtom(atom) {
    var pendingPair = createPendingPair();
    for (var _len4 = arguments.length, args = new Array(_len4 > 1 ? _len4 - 1 : 0), _key4 = 1; _key4 < _len4; _key4++) {
      args[_key4 - 1] = arguments[_key4];
    }
    var result = writeAtomState.apply(void 0, [pendingPair, atom].concat(args));
    var flushed = flushPending(pendingPair);
    if (process.env.NODE_ENV !== 'production') {
      storeListenersRev2.forEach(function (l) {
        return l({
          type: 'write',
          flushed: flushed
        });
      });
    }
    return result;
  };
  var mountDependencies = function mountDependencies(pendingPair, atomState) {
    if (atomState.m && !getPendingContinuablePromise(atomState)) {
      for (var _iterator4 = _createForOfIteratorHelperLoose(atomState.d.keys()), _step4; !(_step4 = _iterator4()).done;) {
        var _a3 = _step4.value;
        if (!atomState.m.d.has(_a3)) {
          mountAtom(pendingPair, _a3);
          atomState.m.d.add(_a3);
        }
      }
      for (var _iterator5 = _createForOfIteratorHelperLoose(atomState.m.d || []), _step5; !(_step5 = _iterator5()).done;) {
        var _a4 = _step5.value;
        if (!atomState.d.has(_a4)) {
          unmountAtom(pendingPair, _a4);
          atomState.m.d.delete(_a4);
        }
      }
    }
  };
  var mountAtom = function mountAtom(pendingPair, atom) {
    var atomState = getAtomState(atom);
    if (!atomState.m) {
      readAtomState(atom);
      for (var _iterator6 = _createForOfIteratorHelperLoose(atomState.d.keys()), _step6; !(_step6 = _iterator6()).done;) {
        var _a5 = _step6.value;
        mountAtom(pendingPair, _a5);
      }
      atomState.m = {
        l: new Set(),
        d: new Set(atomState.d.keys())
      };
      if (process.env.NODE_ENV !== 'production') {
        mountedAtoms.add(atom);
      }
      if (isActuallyWritableAtom(atom) && atom.onMount) {
        var mounted = atomState.m;
        var onMount = atom.onMount;
        addPending(pendingPair, function () {
          var onUnmount = onMount(function () {
            for (var _len5 = arguments.length, args = new Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
              args[_key5] = arguments[_key5];
            }
            return writeAtomState.apply(void 0, [pendingPair, atom].concat(args));
          });
          if (onUnmount) {
            mounted.u = onUnmount;
          }
        });
      }
    }
    return atomState.m;
  };
  var unmountAtom = function unmountAtom(pendingPair, atom) {
    var atomState = getAtomState(atom);
    if (atomState.m && !atomState.m.l.size && !Array.from(atomState.t).some(function (a) {
      return getAtomState(a).m;
    })) {
      var onUnmount = atomState.m.u;
      if (onUnmount) {
        addPending(pendingPair, onUnmount);
      }
      delete atomState.m;
      if (process.env.NODE_ENV !== 'production') {
        mountedAtoms.delete(atom);
      }
      for (var _iterator7 = _createForOfIteratorHelperLoose(atomState.d.keys()), _step7; !(_step7 = _iterator7()).done;) {
        var _a6 = _step7.value;
        unmountAtom(pendingPair, _a6);
      }
      var pendingPromise = getPendingContinuablePromise(atomState);
      if (pendingPromise) {
        pendingPromise[CONTINUE_PROMISE](undefined, function () {});
      }
    }
  };
  var subscribeAtom = function subscribeAtom(atom, listener) {
    var prevMounted;
    if (process.env.NODE_ENV !== 'production') {
      var _atomStateMap$get;
      prevMounted = (_atomStateMap$get = atomStateMap.get(atom)) == null ? void 0 : _atomStateMap$get.m;
    }
    var pendingPair = createPendingPair();
    var mounted = mountAtom(pendingPair, atom);
    var flushed = flushPending(pendingPair);
    var listeners = mounted.l;
    listeners.add(listener);
    if (process.env.NODE_ENV !== 'production') {
      if (!prevMounted) {
        flushed.add(atom);
      }
      storeListenersRev2.forEach(function (l) {
        return l({
          type: 'sub',
          flushed: flushed
        });
      });
    }
    return function () {
      listeners.delete(listener);
      var pendingPair = createPendingPair();
      unmountAtom(pendingPair, atom);
      flushPending(pendingPair);
      if (process.env.NODE_ENV !== 'production') {
        storeListenersRev2.forEach(function (l) {
          return l({
            type: 'unsub'
          });
        });
      }
    };
  };
  if (process.env.NODE_ENV !== 'production') {
    return {
      get: readAtom,
      set: writeAtom,
      sub: subscribeAtom,
      dev_subscribe_store: function dev_subscribe_store(l, rev) {
        if (rev !== 2) {
          throw new Error('The current StoreListener revision is 2.');
        }
        storeListenersRev2.add(l);
        return function () {
          storeListenersRev2.delete(l);
        };
      },
      dev_get_mounted_atoms: function dev_get_mounted_atoms() {
        return mountedAtoms.values();
      },
      dev_get_atom_state: function dev_get_atom_state(a) {
        var getOldAtomState = function getOldAtomState(a) {
          var aState = atomStateMap.get(a);
          return aState && aState.s && _extends({
            d: new Map(Array.from(aState.d.keys()).flatMap(function (a) {
              var s = getOldAtomState(a);
              return s ? [[a, s]] : [];
            }))
          }, aState.s);
        };
        return getOldAtomState(a);
      },
      dev_get_mounted: function dev_get_mounted(a) {
        var aState = atomStateMap.get(a);
        return aState && aState.m && _extends({
          l: aState.m.l,
          t: new Set([].concat(aState.t, [a]))
        }, aState.m.u ? {
          u: aState.m.u
        } : {});
      },
      dev_restore_atoms: function dev_restore_atoms(values) {
        var pendingPair = createPendingPair();
        for (var _iterator8 = _createForOfIteratorHelperLoose(values), _step8; !(_step8 = _iterator8()).done;) {
          var _step8$value = _step8.value,
            _atom2 = _step8$value[0],
            value = _step8$value[1];
          setAtomStateValueOrPromise(getAtomState(_atom2), value);
          recomputeDependents(pendingPair, _atom2);
        }
        var flushed = flushPending(pendingPair);
        storeListenersRev2.forEach(function (l) {
          return l({
            type: 'restore',
            flushed: flushed
          });
        });
      }
    };
  }
  return {
    get: readAtom,
    set: writeAtom,
    sub: subscribeAtom
  };
};
var defaultStore;
var getDefaultStore = function getDefaultStore() {
  if (!defaultStore) {
    defaultStore = createStore();
    if (process.env.NODE_ENV !== 'production') {
      var _ref2;
      (_ref2 = globalThis).__JOTAI_DEFAULT_STORE__ || (_ref2.__JOTAI_DEFAULT_STORE__ = defaultStore);
      if (globalThis.__JOTAI_DEFAULT_STORE__ !== defaultStore) {
        console.warn('Detected multiple Jotai instances. It may cause unexpected behavior with the default store. https://github.com/pmndrs/jotai/discussions/2044');
      }
    }
  }
  return defaultStore;
};

exports.atom = atom;
exports.createStore = createStore;
exports.getDefaultStore = getDefaultStore;
