# @dependable/state

Observables and computeds for reactive state management.

- Easy learning curve
- Tiny, less than 1kb
- Zero dependencies
- Allows multiple versions of the library in the page
- Batches updates

## Install

```sh
# npm
npm install --save @dependable/state

# yarn
npm add @dependable/state
```

## Usage

Let's make a small todo application.

First we will import `observable` and `computed`, that is used to define the state.

```js
import { observable, computed } from "@dependable/state";
```

Then we can declare an observable for our todos.

All of our todos and computeds needs to be uniquely named, to support debugging and enabling development tools.

```js
const todos = observable("todos", []);
```

We will be putting todos inside fo the `todos` observable, so let's define a class for todos.

As you can see, we defined `title` and `completed` as observables, as those fields are allowed to be updated.

We give each todo a unique id and use that to produce a unique key for the observables.

```js
let nextId = 0;

class Todo {
  constructor(title) {
    this.id = nextId++;
    const key = `todo.${this.id}`;
    this.title = observable(`${key}.title`, title);
    this.completed = observable(`${key}.completed`, false);
  }
}
```

We would like to have a list of active todos, that is sorted by the title.

We can start by creating a `sortedTodos` computed, that will return all todos sorted by title.

```js
const compareByTitle = (a, b) => {
  if (a.title() > b.title()) return 1;
  if (a.title() < b.title()) return -1;
  return 0;
};

const sortedTodos = computed("sortedTodos", () =>
  todos().slice().sort(compareByTitle)
);
```

Then we can create another todo, that filters out any completed todos.

```js
const activeTodos = computed("activeTodos", () =>
  sortedTodos().filter((todo) => !todo.completed())
);
```

Let's add a convenient way of adding new todos to the `todos` observable.

```js
const addTodo = (title) => {
  todos([...todos(), new Todo(title)]);
};
```

Now we can add a few todos.

```js
addTodo("Paint the house");
addTodo("Mow the lawn");
addTodo("Buy garden plants");
```

Finally we need to be able to complete the todos, so let's add a function for that.

```js
const completeTodoByTitle = (title) => {
  const todo = todos().find((todo) => todo.title() === title);
  todo?.completed(true);
  return todo;
};
```

I already mowed the lawn, so let's complete that task.

```js
completeTodoByTitle("Mow the lawn");
```

Let's see what our `activeTodos` contain at this point.

```js
expect(activeTodos(), "to satisfy", [
  { title: "Buy garden plants", completed: false },
  { title: "Paint the house", completed: false },
]);
```

As you can see it is very easy to build something that is quite powerful.

## Subscribing

You can subscribe to both observables and computeds. Updates will be batched and each listener will only be called once for each batch. Listeners will only be called if the value we updated.

```js
const message = observable("message", "");
const aboveLimit = computed("aboveLimit", () => message().length > 140);

aboveLimit.subscribe(() => {
  if (aboveLimit()) {
    // show warning
  }
});
```

## Testing

`@dependable/state` is build with testing in mind from the beginning. The idea is that you update the observables to the necessary state in the test setup, do some interaction and test the updated state.

We provide a `flush` method, for synchronously notifying any listeners, when you need to make sure that derived state is updated.

```js
import { flush } from "@dependable/state";

const numbers = observable("numbers", []);
const sum = computed("sum", () => numbers.reduce((sum, v) => sum + v, 0));

let notified = false;
sum.subscribe(() => {
  notified = true;
});

numbers([1, 2, 3]);
// subscribes will be called in the next tick, but we can force the update through
flush();

expect(notified, "to be true");
```

## Acknowledgements

The observables, computeds and dependency tracking is very inspired by https://knockoutjs.com/

## License

MIT License

Copyright (c) 2022 Sune Simonsen sune@we-knowhow.dk

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.