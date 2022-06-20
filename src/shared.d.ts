/**
 * A state listener.
 */
export type StateListener = {
  (updated: Subscribables): void;
};

/**
 * A subscriber function that will be called by the subscribables that it is
 * subscribed to.
 */
export type Subscriber = {
  (): void;
};

/**
 * A subscribable object.
 */
export interface Subscribable {
  /**
   * The id of the subscribable.
   */
  id: string | null;
  /**
   * The kind of subscribable.
   */
  kind: "observable" | "computed";
  /**
   * Add the given subscriber to this subscribable.
   *
   * @param subscriber the subscriber that should be added
   */
  subscribe(subscriber: Subscriber): void;
  /**
   * Remove the given subscriber to this subscribable.
   *
   * @param subscriber the subscriber that should be removed
   */
  unsubscribe(subscriber: Subscriber): void;
}

/**
 * An observable value that can be subscribed to.
 *
 * @template T the type of the observable value.
 */
export type Observable<T> = Subscribable & {
  /**
   * Update the value of the observable.
   *
   * @param value the new value
   */
  (value: T): void;
  /**
   * Get the value of the observable.
   *
   * @returns the value of the observable.
   */
  (): T;
};

/**
 * A computed value that can be subscribed to. It updates whenever any of its
 * dependencies updates.
 *
 * @template T the type of the computed value.
 */
export type Computed<T> = Subscribable & {
  /**
   * Get the value of the computed.
   *
   * @returns the value of the computed.
   */
  (): T;
};

/**
 * An equality function deciding if two values is equal or not.
 *
 * @template T the type of the values to compare.
 */
export type Equality<T> = {
  (a: T, b: T): boolean;
};

/**
 * Options for a subscribable.
 *
 * @template T the type subscribable value.
 */
export type SubscribableOptions<T> = {
  /**
   * The id of the subscribable.
   *
   * Used for debugging and development tools.
   */
  id?: string;

  /**
   * A function deciding if the value of the subscribable has changed.
   */
  isEqual?: Equality<T>;
};

/**
 * The set of active subscribables.
 */
export type Subscribables = Set<Subscribable>;
