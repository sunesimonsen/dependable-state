import unexpected from "unexpected";
import unexpectedSinon from "unexpected-sinon";
import sinon from "sinon";
import { observable, flush } from "../src/state.js";
import { FakePromise } from "fake-promise";

const expect = unexpected.clone().use(unexpectedSinon);

const tick = () => new Promise((resolve) => setImmediate(resolve));

describe("observable", () => {
  it("returns the initial value when it hasn't been updated", () => {
    const v = observable("v", "foo");

    expect(v(), "to equal", "foo");
  });

  describe("when updating the value", () => {
    it("updates the value", () => {
      const v = observable("v", "foo");

      v("bar");

      expect(v(), "to equal", "bar");
    });
  });

  describe("subscribe", () => {
    it("notifies it's subscribers on updates", () => {
      const v = observable("v", "foo");

      const subscriptionSpy = sinon.spy();
      v.subscribe(subscriptionSpy);

      v("bar");

      flush();

      expect(v(), "to equal", "bar");

      expect(subscriptionSpy, "to have calls satisfying", () => {
        subscriptionSpy();
      });
    });
  });

  describe("unsubscribe", () => {
    it("doesn't notify on updates", () => {
      const v = observable("v", "foo");

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
      const v1 = observable("v1", "v1");
      const v2 = observable("v2", "v2");

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
        const v1 = observable("v1", "v1");
        const v2 = observable("v2", "v2");

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
