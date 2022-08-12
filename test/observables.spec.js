import unexpected from "unexpected";
import unexpectedSinon from "unexpected-sinon";
import unexpectedDependable from "unexpected-dependable";
import sinon from "sinon";
import { observable, flush } from "../src/state.js";
import { FakePromise } from "fake-promise";

const expect = unexpected
  .clone()
  .use(unexpectedSinon)
  .use(unexpectedDependable);

const tick = () => new Promise((resolve) => setImmediate(resolve));

describe("observable", () => {
  it("returns the initial value when it hasn't been updated", () => {
    const v = observable("foo");

    expect(v(), "to equal", "foo");
    expect(v.kind, "to be", "observable");
  });

  describe("when updating the value", () => {
    it("updates the value", () => {
      const v = observable("foo");

      v("bar");

      expect(v(), "to equal", "bar");
    });
  });

  describe("subscribe", () => {
    it("notifies it's subscribers on updates", () => {
      const v = observable("foo");

      const subscriptionSpy = sinon.spy();
      v.subscribe(subscriptionSpy);

      v("bar");

      flush();

      expect(v(), "to equal", "bar");

      expect(subscriptionSpy, "to have calls satisfying", () => {
        subscriptionSpy();
      });
    });

    describe("when given a priority", () => {
      it("lower numbers takes precedence", () => {
        const v = observable("foo");

        const priority0Spy = sinon.spy();
        const priority10Spy = sinon.spy();
        const priority100Spy = sinon.spy();

        v.subscribe(priority100Spy, 100);
        v.subscribe(priority0Spy);
        v.subscribe(priority10Spy, 10);

        v("bar");

        flush();

        expect(v(), "to equal", "bar");

        expect(
          [priority0Spy, priority10Spy, priority100Spy],
          "to have calls satisfying",
          () => {
            priority0Spy();
            priority10Spy();
            priority100Spy();
          }
        );
      });
    });

    describe("when the subscribe makes a new update", () => {
      it("is excuted in the same batch", () => {
        const foo = observable("foo");
        const bar = observable("bar");
        const qux = observable("qux");

        foo.subscribe(() => {
          bar(foo());
        });

        bar.subscribe(() => {
          qux(bar());
        });

        const subscriptionSpy = sinon.spy();
        qux.subscribe(subscriptionSpy);

        foo("updated");

        flush();

        expect(foo(), "to equal", "updated");
        expect(bar(), "to equal", "updated");
        expect(qux(), "to equal", "updated");

        expect(subscriptionSpy, "to have calls satisfying", () => {
          subscriptionSpy();
        });
      });
    });

    it("doesn't notify if the value hasn't changed", () => {
      const v = observable("foo");

      const subscriptionSpy = sinon.spy();
      v.subscribe(subscriptionSpy);

      v("foo");

      flush();

      expect(v(), "to equal", "foo");

      expect(subscriptionSpy, "was not called");
    });

    it("doesn't notify if the value hasn't changed, according to the given equal function", () => {
      const v = observable(
        { id: 0, value: "foo" },
        { isEqual: (a, b) => a.id === b.id }
      );

      const subscriptionSpy = sinon.spy();
      v.subscribe(subscriptionSpy);

      v({ id: 0, value: "foo" });

      flush();

      expect(v(), "to equal", { id: 0, value: "foo" });

      expect(subscriptionSpy, "was not called");
    });
  });

  describe("unsubscribe", () => {
    it("doesn't notify on updates", () => {
      const v = observable("foo");

      const subscriptionSpy = sinon.spy();

      v.subscribe(subscriptionSpy);
      v.unsubscribe(subscriptionSpy);

      v("bar");

      flush();

      expect(v(), "to equal", "bar");

      expect(subscriptionSpy, "was not called");
    });
  });

  describe("when updating multiple observables", () => {
    it("only notifies each subscriber once", () => {
      const v1 = observable("v1");
      const v2 = observable("v2");

      const subscriptionSpy = sinon.spy();
      v1.subscribe(subscriptionSpy);
      v2.subscribe(subscriptionSpy);

      v1("updated");
      v2("updated");

      flush();

      expect(v1(), "to equal", "updated");
      expect(v2(), "to equal", "updated");

      expect(subscriptionSpy, "to have calls satisfying", () => {
        subscriptionSpy();
      });
    });

    describe("with async updates", () => {
      it("submit updates in batches", async () => {
        const v1 = observable("v1");
        const v2 = observable("v2");

        const subscriptionSpy = sinon.spy();
        v1.subscribe(subscriptionSpy);
        v2.subscribe(subscriptionSpy);

        const fakePromise = new FakePromise();

        const updateFoo = async (value) => {
          v1(value);
          await fakePromise;
          v2(value);
        };

        updateFoo("updated");

        flush();

        expect(v1(), "to equal", "updated");
        expect(v2(), "to equal", "v2");

        expect(subscriptionSpy, "to have calls satisfying", () => {
          subscriptionSpy();
        });

        fakePromise.resolve();
        // wait for async function to finish.
        await tick();

        flush();

        expect(v1(), "to equal", "updated");
        expect(v2(), "to equal", "updated");

        expect(subscriptionSpy, "to have calls satisfying", () => {
          subscriptionSpy();
          subscriptionSpy();
        });
      });
    });
  });
});
