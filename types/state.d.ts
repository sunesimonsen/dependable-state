export function addStateListener(listener: import('./shared').StateListener): void;
export function removeStateListener(listener: import('./shared').StateListener): void;
export function subscribables(): import('./shared').Subscribables;
export function flush(): void;
export function observable<T>(initialValue: T, options?: import("./shared").SubscribableOptions<T>): import("./shared").Observable<T>;
export function computed<T>(cb: () => T, options?: import("./shared").SubscribableOptions<T>): import("./shared").Computed<T>;
//# sourceMappingURL=state.d.ts.map