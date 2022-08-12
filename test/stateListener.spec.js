import unexpected from "unexpected";
import unexpectedSinon from "unexpected-sinon";
import unexpectedDependable from "./unexpected-dependable.js";
import sinon from "sinon";
import { FakePromise } from "fake-promise";
import {
  addStateListener,
  computed,
  flush,
  observable,
  subscribables,
} from "../src/state.js";

const expect = unexpected
  .clone()
  .use(unexpectedSinon)
  .use(unexpectedDependable);

const tick = () => new Promise((resolve) => setImmediate(resolve));

describe("stateListener", () => {
  let firstName, lastName, fullName;
  beforeEach(() => {
    // Make sure other tests doesn't have registered references
    global.__dependable._references = new Map();

    firstName = observable("John", { id: "firstName" });
    lastName = observable("Doe", { id: "lastName" });

    fullName = computed(() => `${firstName()} ${lastName()}`, {
      id: "fullName",
    });
  });

  describe("when initializing an observable with an existing id", () => {
    it("returns the previous observable", () => {
      const anotherFirstName = observable("Jane", { id: "firstName" });

      expect(firstName, "to be", anotherFirstName);
    });
  });

  describe("when initializing an computed with an existing id", () => {
    it("returns the previous computed", () => {
      const anotherFullName = computed(() => `${lastName()}, ${firstName()}`, {
        id: "fullName",
      });

      expect(fullName, "to be", anotherFullName);
    });
  });

  describe("subscribables", () => {
    it("returns the current subscribables", () => {
      expect(
        subscribables(),
        "to equal",
        new Set([firstName, lastName, fullName])
      );
    });
  });

  describe("when listening to state changes", () => {
    let stateListener;

    beforeEach(() => {
      stateListener = sinon.spy();

      addStateListener(stateListener);
    });

    describe("and the state is updated", () => {
      beforeEach(() => {
        firstName("Jane");

        flush();
      });

      it("the listener is call with the state change", () => {
        expect(stateListener, "to have calls satisfying", () => {
          stateListener(new Set([firstName]));
        });
      });
    });

    describe("when subscribable appears", () => {
      let newObservable;

      beforeEach(() => {
        newObservable = observable("this is new", { id: "new" });
      });

      it("will be included in the working set", () => {
        expect(stateListener, "to have calls satisfying", () => {
          stateListener(new Set([newObservable]));
        });
      });

      it("is returned by subscribables", () => {
        expect(
          subscribables(),
          "to equal",
          new Set([firstName, lastName, fullName, newObservable])
        );
      });
    });
  });
});
