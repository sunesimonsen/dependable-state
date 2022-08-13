import unexpected from "unexpected";
import unexpectedSinon from "unexpected-sinon";
import unexpectedDependable from "unexpected-dependable";
import sinon from "sinon";
import { observable, computed, flush } from "../src/state.js";

const expect = unexpected
  .clone()
  .use(unexpectedSinon)
  .use(unexpectedDependable);

describe("computed", () => {
  it("creates a computed", () => {
    const name = observable("Jane Doe");

    const greeting = computed(() => `Hello, ${name()}`);

    expect(greeting.kind, "to be", "computed");
  });

  describe("when not subscribed", () => {
    it("the value is still readable", () => {
      const name = observable("Jane Doe");

      const greeting = computed(() => `Hello, ${name()}`);

      expect(greeting(), "to equal", "Hello, Jane Doe");
    });
  });

  describe("when subscribed to", () => {
    describe("and it's dependencies changes", () => {
      let greeting, subscriptionSpy;

      beforeEach(() => {
        const name = observable("Jane Doe");

        greeting = computed(() => `Hello, ${name()}`);

        subscriptionSpy = sinon.spy();
        greeting.subscribe(subscriptionSpy);

        name("John Doe");

        flush();
      });

      it("returns the updated value", () => {
        expect(greeting(), "to equal", "Hello, John Doe");
      });

      it("calls the subscribers only once", () => {
        expect(subscriptionSpy, "to have calls satisfying", () => {
          subscriptionSpy();
        });
      });
    });

    describe("and it's dependencies updates to the same value", () => {
      let greeting, subscriptionSpy;

      beforeEach(() => {
        const name = observable("Jane Doe");

        greeting = computed(() => `Hello, ${name()}`);

        subscriptionSpy = sinon.spy();
        greeting.subscribe(subscriptionSpy);

        name("Jane Doe");

        flush();
      });

      it("returns the old value", () => {
        expect(greeting(), "to equal", "Hello, Jane Doe");
      });

      it("doesn't call the subscribers", () => {
        expect(subscriptionSpy, "was not called");
      });
    });

    describe("and it's dependencies updates to the same value, according to the equal function", () => {
      let greeting, subscriptionSpy;

      beforeEach(() => {
        const name = observable("Jane Doe");

        greeting = computed(() => `Hello, ${name()}`, {
          isEqual: (a, b) => a.toLowerCase() === b.toLowerCase(),
        });

        subscriptionSpy = sinon.spy();
        greeting.subscribe(subscriptionSpy);

        name("Jane DOE");

        flush();
      });

      it("returns the old value", () => {
        expect(greeting(), "to equal", "Hello, Jane DOE");
      });

      it("doesn't call the subscribers", () => {
        expect(subscriptionSpy, "was not called");
      });
    });
  });

  describe("with a nested dependency chain", () => {
    let output;
    let outputSubscriptionSpy, sumSubscriptionSpy;
    let sumSpy, productSpy, outputSpy;
    let a, b;

    beforeEach(() => {
      a = observable(0);
      b = observable(0);

      sumSpy = sinon.spy(() => a() + b()).named("sum");
      const sum = computed(sumSpy);
      productSpy = sinon.spy(() => a() * b()).named("product");
      const product = computed(productSpy);

      outputSpy = sinon
        .spy(() => `a: ${a()}, b: ${b()}, sum: ${sum()}, product: ${product()}`)
        .named("output");

      output = computed(outputSpy);

      sumSubscriptionSpy = sinon.spy().named("sumSubscription");
      sum.subscribe(sumSubscriptionSpy);

      outputSubscriptionSpy = sinon.spy().named("outputSubscription");
      output.subscribe(outputSubscriptionSpy);
    });

    describe("and the values is updated", () => {
      beforeEach(() => {
        a(4);
        b(2);

        flush();

        // Should only change the output
        a(4);
        b(2);

        flush();

        // Should only change the output
        a(2);
        b(4);

        flush();
      });

      it("calculated the computed value correctly", () => {
        expect(output(), "to equal", "a: 2, b: 4, sum: 6, product: 8");
      });

      it("calls the subscribers only once per change", () => {
        expect(
          [sumSubscriptionSpy, outputSubscriptionSpy],
          "to have calls satisfying",
          () => {
            // When a=4 b=2
            sumSubscriptionSpy();
            outputSubscriptionSpy();

            // When a=2 b=4 only the output changes
            outputSubscriptionSpy();
          }
        );
      });

      it("calls computed functions a minimal number of times", () => {
        expect(
          [sumSpy, productSpy, outputSpy],
          "to have calls satisfying",
          () => {
            // when subscribing to sum
            sumSpy();

            // when subscribing to output
            outputSpy();
            productSpy();

            // When a=4 b=2
            sumSpy();
            productSpy();
            outputSpy();

            // When a=4 b=2 again
            sumSpy();
            productSpy();
            outputSpy();

            // When a=2 b=4
            sumSpy();
            productSpy();
            outputSpy();
          }
        );
      });
    });

    describe("when unsubscribing from the computed", () => {
      beforeEach(() => {
        output.unsubscribe(outputSubscriptionSpy);

        a(4);
        b(2);

        flush();
      });

      it("becomes inactive and recomputes on demand", () => {
        expect(output(), "to equal", "a: 4, b: 2, sum: 6, product: 8");

        output();

        expect([outputSpy], "to have calls satisfying", () => {
          // when subscribing to output
          outputSpy();

          // when called
          outputSpy();
          outputSpy();
        });
      });
    });
  });

  describe("when the observables is conditional", () => {
    let conditional, choice, a, b, c;
    let computedSpy;

    beforeEach(() => {
      choice = observable("a");
      a = observable("a");
      b = observable("b");
      c = observable("c");

      conditional = computed(() => {
        switch (choice()) {
          case "a":
            return a();
          case "b":
            return b();
          default:
            return c();
        }
      });

      computedSpy = sinon.spy();
      conditional.subscribe(computedSpy);
    });

    it("computes the correct value", () => {
      expect(conditional(), "to equal", "a");
    });

    describe("when the condition is updated", () => {
      beforeEach(() => {
        choice("b");
        flush();
      });

      it("computes the correct value", () => {
        expect(conditional(), "to equal", "b");
      });

      describe("when updating variables that isn't currently used", () => {
        beforeEach(() => {
          a("updated a");
          flush();
        });

        it("doesn't trigger a recomputation", () => {
          expect(computedSpy, "to have calls satisfying", () => {
            // When the choice changed
            computedSpy();
          });
        });
      });

      describe("when updating new newly returned observables", () => {
        beforeEach(() => {
          b("updated b");
          flush();
        });

        it("computes the correct value", () => {
          expect(conditional(), "to equal", "updated b");
        });

        it("triggers a recomputation", () => {
          expect(computedSpy, "to have calls satisfying", () => {
            // When the choice changed
            computedSpy();

            // When the observable changed
            computedSpy();
          });
        });
      });
    });
  });

  it("only updates when value changes", () => {
    const a = observable(0);
    const b = observable(0);
    const c = computed(() => b() % 2);
    const d = computed(() => `a:${a()}, c:${c()}`);

    const computedSpy = sinon.spy();
    d.subscribe(computedSpy);

    a(1);
    b(2);

    flush();

    b(4);

    flush();

    expect(d(), "to equal", "a:1, c:0");

    expect(computedSpy, "to have calls satisfying", () => {
      computedSpy();
    });
  });
});
