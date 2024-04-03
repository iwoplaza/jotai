import type { Atom, WritableAtom } from './atom';
type AnyValue = unknown;
type AnyError = unknown;
type AnyAtom = Atom<AnyValue>;
type OnUnmount = () => void;
type StoreListenerRev2 = (action: {
    type: 'write';
    flushed: Set<AnyAtom>;
} | {
    type: 'async-write';
    flushed: Set<AnyAtom>;
} | {
    type: 'sub';
    flushed: Set<AnyAtom>;
} | {
    type: 'unsub';
} | {
    type: 'restore';
    flushed: Set<AnyAtom>;
}) => void;
type OldAtomState = {
    d: Map<AnyAtom, OldAtomState>;
} & ({
    e: AnyError;
} | {
    v: AnyValue;
});
type OldMounted = {
    l: Set<() => void>;
    t: Set<AnyAtom>;
    u?: OnUnmount;
};
export type Store = {
    get: <Value>(atom: Atom<Value>) => Value;
    set: <Value, Args extends unknown[], Result>(atom: WritableAtom<Value, Args, Result>, ...args: Args) => Result;
    sub: (atom: AnyAtom, listener: () => void) => () => void;
    dev_subscribe_store?: (l: StoreListenerRev2, rev: 2) => () => void;
    dev_get_mounted_atoms?: () => IterableIterator<AnyAtom>;
    dev_get_atom_state?: (a: AnyAtom) => OldAtomState | undefined;
    dev_get_mounted?: (a: AnyAtom) => OldMounted | undefined;
    dev_restore_atoms?: (values: Iterable<readonly [AnyAtom, AnyValue]>) => void;
};
export declare const createStore: () => Store;
export declare const getDefaultStore: () => Store;
export {};
