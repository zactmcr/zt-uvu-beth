import { Elysia, t} from "elysia";
import { html } from "@elysiajs/html"
import * as elements from "typed-html"
import { db } from "./db"
import { Todo, todos } from "./db/schema"
import { eq } from "drizzle-orm"

const BaseHtml = ({children}: elements.Children) => `
<! DOCTYPE html> <html lang="en">
  <head>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/htmx.org@1.9.9" integrity="sha384-QFjmbokDn2DjBjq+fM+8LUIVrAgqcNW2s0PjAxHETgRn9l4fvX31ZxDxvwQnyMOX" crossorigin="anonymous"></script>
    <meta name= "viewport"content="width=device-width, initial-scale=1.0">
    <title›THE BETH STACK</title>
</head>
${children}
`

const app = new Elysia()
.use(html())
.get("/", ({html}) => 
  html(
    <BaseHtml>
      <body
        class="flex w-full h-screen justify-center items-center"
        hx-get="/todos"
        hx-trigger="load"
        hx-swap="innerHTML"
      />
    </BaseHtml>
  )
)
.get("/todos", async () => {
  const data = await db.select().from(todos);
  return <TodoList todos={data}/>
})
.post(
  "/todos/toggle/:id",
  async ({ params }) => {
    const oldTodo = await db
      .select()
      .from(todos)
      .where(eq(todos.id, params.id))
      .get();
    const newTodo = await db
      .update(todos)
      .set({ completed: !oldTodo?.completed })
      .where(eq(todos.id, params.id))
      .returning()
      .get();
    return <TodoItem {...newTodo}/>
  },
  {
    params: t.Object({
      id: t.Numeric(),
    }),
  }
)
.delete(
  "/todos/:id",
  async ({params}) => {
    await db.delete(todos).where(eq(todos.id, params.id)).run();
    // const todo = db.find((todo) => todo.id === params.id);
    // if (todo) {
    //   db.splice(db.indexOf(todo), 1);
    // }
  },
  {
    params: t.Object({
      id: t.Numeric(),
    }),
  }
)
.post(
  "/todos",
  async ({ body }: any) => {
    // if (body.content.length === 0) {
    //   throw new Error("Content cannot be empty");
    // }
    // const newTodo: Todo = {
    //   id: lastID++,
    //   content: body.content,
    //   completed: false,
    // };
    // db.push(newTodo);
    // return <TodoItem {...newTodo}/>;

    if (body.content.length === 0) {
      throw new Error("Content cannot be empty");
    }
    const newTodo = await db.insert(todos).values(body).returning().get();
    return <TodoItem {...newTodo} />;
  },
  {
    body: t.Object({
      content: t.String(),
    }),
  }
)
.listen(3000);


function TodoItem({ content, completed, id }: Todo) {
  return (
    <div class="flex flex-row space-x-3">
      <p>{content}</p>
      <input
        type="checkbox"
        checked={completed}
        hx-post={`/todos/toggle/${id}`}
        hx-target="closest div"
        hx-swap="outerHTML"
      />
      <button 
        class="text-red-500"
        hx-delete={`/todos/${id}`}
        hx-swap="outerHTML"
        hx-target="closest div"
      >
        X
      </button>
    </div>
  );
}


function TodoList({ todos }: { todos: Todo[] }) {
  return (
    <div class="outline outline-2 outline-offset-2 p-5">
      <h3 class="mb-4 text-4xl font-extrabold leading-none tracking-tight text-gray-900 md:text-5xl lg:text-6xl dark:text-white">Beautiful TODO list</h3>
      {todos.map((todo) => (
        <TodoItem {...todo} />
      ))}
      <TodoForm/>
    </div>
  );
}

function TodoForm() {
  return (
    <form
      class="flex flex-row space-x-3"
      hx-post="/todos"
      hx-swap="beforebegin"
    >
      <input type="text" name="content" class="border border-black" />
      <button type="submit">Add</button>
    </form>
  )
}
