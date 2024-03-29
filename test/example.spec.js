import { observable, computed, flush } from "../src/state.js";
import unexpected from "unexpected";
import unexpectedDependable from "unexpected-dependable";

const expect = unexpected.clone().use(unexpectedDependable);

const todos = observable([]);

let nextId = 0;

class Todo {
  constructor(title) {
    this.id = nextId++;
    const key = `todo.${this.id}`;
    this.title = observable(title);
    this.completed = observable(false);
  }
}

const addTodo = (title) => {
  todos([...todos(), new Todo(title)]);
};

const completeTodoByTitle = (title) => {
  const todo = todos().find((todo) => todo.title() === title);
  todo?.completed(true);
  return todo;
};

const compareByTitle = (a, b) => {
  if (a.title() > b.title()) return 1;
  if (a.title() < b.title()) return -1;
  return 0;
};

const sortedTodos = computed(() => todos().slice().sort(compareByTitle));

const activeTodos = computed(() =>
  sortedTodos().filter((todo) => !todo.completed())
);

describe("todo example", () => {
  beforeEach(() => {
    todos([]);
  });

  it("is correct", () => {
    addTodo("Paint the house");
    addTodo("Mow the lawn");
    addTodo("Buy garden plants");

    completeTodoByTitle("Mow the lawn");

    expect(activeTodos(), "to satisfy", [
      { title: "Buy garden plants", completed: false },
      { title: "Paint the house", completed: false },
    ]);
  });
});
