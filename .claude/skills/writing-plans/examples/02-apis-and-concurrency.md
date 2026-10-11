# 50+ Elegant Code Transformations (Part 2)

## APIs and Abstractions

### Example 11: Narrowing Interfaces for HTTP Handlers

- Project / Inspiration: Go net/http handler interfaces (Go, networking).

- Concept: Designing small, composable interfaces rather than kitchen‑sink types.

Context

An HTTP framework passes a giant `Context` object into every handler, mixing configuration, logging, DB access, and request data. Go’s standard library demonstrates that a minimal `Handler` interface with `ResponseWriter` and `*Request` is enough for powerful composition.

Before

```go

type Context struct {

    Request  *http.Request

    Writer   http.ResponseWriter

    Logger   *Logger

    DB       *DB

    Config   *Config

    // many more fields

}

type Handler func(*Context)

```

After

```go

type HandlerFunc func(http.ResponseWriter, *http.Request)

// Additional capabilities are added via helpers that accept HandlerFunc

func WithLogging(h HandlerFunc, logger *Logger) HandlerFunc {

    return func(w http.ResponseWriter, r *http.Request) {

        logger.Info("start")

        h(w, r)

    }

}

```

Why this is more elegant

The narrower `HandlerFunc` mirrors Go’s net/http design, where the core interface is small and decorators supply additional concerns. This reduces coupling—handlers depend only on HTTP primitives, while logging and DB access are injected explicitly. It also encourages composition and testing, since a handler can be invoked with minimal scaffolding and wrapped as needed.

### Example 12: Plumbing vs Porcelain Separation

- Project / Inspiration: Git’s internal plumbing commands vs user‑facing porcelain (C, DVCS).

- Concept: Separating stable, scriptable APIs from user‑oriented frontends.

Context

A CLI tool exposes many commands that are both used by users and by scripts, leading to fragile automation when human‑oriented formatting changes. Git’s design clearly distinguishes “plumbing” commands with stable output from “porcelain” commands intended for humans.

Before

```bash

$ mytool list

ID  NAME       SIZE

1   alpha      10

2   beta       20

# scripts parse this table

```

After

```bash

# plumbing: stable, machine‑friendly

$ mytool ls --format=json

[{"id":1,"name":"alpha","size":10}, {"id":2,"name":"beta","size":20}]

# porcelain: human‑friendly, can change formatting

$ mytool list

1  alpha  10

2  beta   20

```

Why this is more elegant

By introducing a clear separation between machine‑oriented output (`--format=json`) and human‑oriented presentation, the tool follows Git’s plumbing/porcelain philosophy. Scripts now depend only on the plumbing interface, which can be kept stable, while the porcelain remains free to evolve.

### Example 13: Explicit Evaluation Loop Instead of Recursion Everywhere

- Project / Inspiration: CPython’s `_PyEval_EvalFrameDefault` and central eval loop (C, interpreter).

- Concept: Centralizing control of execution in a well‑structured loop.

Context

An expression evaluator recursively calls itself for each node type. While simple for small trees, deep or complex programs make it hard to track evaluation state and introduce risk of stack overflows. CPython uses a central bytecode evaluation loop that explicitly manages frames and instruction pointers.

Before

```python

def eval_expr(node):

    if node.kind == "add":

        return eval_expr(node.left) + eval_expr(node.right)

    if node.kind == "neg":

        return -eval_expr(node.child)

    # ... many more cases ...

```

After

```python

def eval_program(bytecode):

    ip = 0

    stack = []

    while ip < len(bytecode):

        op, arg = bytecode[ip]

        if op == "PUSH_CONST":

            stack.append(arg)

        elif op == "ADD":

            b = stack.pop(); a = stack.pop()

            stack.append(a + b)

        elif op == "NEG":

            stack[-1] = -stack[-1]

        # ...

        ip += 1

    return stack[-1]

```

Why this is more elegant

The explicit evaluation loop makes control flow and state transition explicit rather than relying on the language call stack, matching CPython’s architecture. It allows easy instrumentation, supports features like generators, and avoids recursion limits.

### Example 14: Small, Orthogonal Modules Instead of a Monolith

- Project / Inspiration: LLVM/Clang library‑based modularity (C++, compiler).

- Concept: Breaking a compiler front‑end into reusable libraries.

Context

A compiler front‑end is implemented as one massive binary, with parsing, semantic analysis, and code generation tightly coupled. LLVM/Clang’s design separates these into libraries that can be mixed and matched for different tools.

Before

```cpp

int main(int argc, char** argv) {

    parse_args(argc, argv);

    parse_source();

    analyze();

    generate_code();

}

```

After

```cpp

// libparse, libsema, libcodegen provide reusable APIs

int main(int argc, char** argv) {

    Options opts = parse_args(argc, argv);

    AST ast = parse_file(opts.input);

    Semantics sema(ast);

    sema.run();

    IRModule ir = lower_to_ir(ast);

    write_output(ir, opts);

}

```

Why this is more elegant

The refactor mirrors Clang’s approach of offering its front‑end as a collection of libraries usable by IDEs, static analyzers, and other tools. Parsing, semantic analysis, and lowering are separate modules with clear responsibilities rather than ad‑hoc phases inside `main`.

### Example 15: Tight Core with Extension Points

- Project / Inspiration: PostgreSQL extensibility (custom types, functions, indexes) (C, database).

- Concept: Exposing stable hooks so the core can stay small.

Context

An application embeds lots of special‑case logic (custom validation, indexing) directly into the main query engine, making it hard to extend. PostgreSQL instead keeps the core engine relatively generic and offers hooks for user‑defined types, functions, and indexes.

Before

```c

if (col.type == TYPE_JSON) {

    // special indexing logic

}

if (col.type == TYPE_GEO) {

    // more special logic

}

```

After

```c

typedef IndexFn (*IndexBuilder)(Column *);

IndexBuilder lookup_index_builder(TypeId t);

Index *build_index(Column *col) {

    IndexBuilder builder = lookup_index_builder(col->type);

    return builder(col);

}

```

Why this is more elegant

Dispatching on a registry of type‑specific behaviors lets the core engine avoid accumulating special cases, following PostgreSQL’s extensible design. New types and index methods can be added without modifying central control flow.

## Concurrency and State

### Example 16: Single‑Threaded Event Loop Instead of Ad‑Hoc Threads

- Project / Inspiration: Redis single‑threaded event loop (C, in‑memory DB).

- Concept: Using multiplexed I/O to simplify concurrency.

Context

A high‑throughput server spawns a thread per connection, leading to context‑switch overhead and complex locking. Redis demonstrates that a single‑threaded event loop built on epoll/kqueue can serve thousands of clients efficiently.

Before

```c

void *worker(void *arg) {

    int fd = (int)(intptr_t)arg;

    handle_client(fd);

    close(fd);

    return NULL;

}

void server_loop(int listen_fd) {

    while (1) {

        int fd = accept(listen_fd, NULL, NULL);

        pthread_t t;

        pthread_create(&t, NULL, worker, (void*)(intptr_t)fd);

        pthread_detach(t);

    }

}

```

After

```c

void main_loop(EventLoop *loop) {

    loop->stop = 0;

    while (!loop->stop) {

        process_time_events(loop);

        process_file_events(loop);

    }

}

```

Why this is more elegant

The event‑loop architecture centralizes concurrency and I/O multiplexing, eliminating the need for per‑connection threads and associated locking, mirroring Redis’s design. This reduces complexity, makes performance more predictable, and keeps the code path per request straightforward.

### Example 17: Event‑Driven Worker Model for High‑Concurrency HTTP

- Project / Inspiration: nginx worker processes and event‑driven architecture (C, web server).

- Concept: Combining event loops with multi‑process design for scalability.

Context

A web server uses a single process and blocking I/O, limiting throughput. nginx instead uses a master process that forks workers, each running an event loop handling thousands of connections.

Before

```c

while (1) {

    int fd = accept(listen_fd, NULL, NULL);

    handle_request(fd);

    close(fd);

}

```

After

```c

void worker_process(int listen_fd) {

    EventLoop *loop = init_loop(listen_fd);

    main_loop(loop); // event‑driven, non‑blocking

}

int main() {

    int listen_fd = create_listen_socket();

    for (int i = 0; i < num_workers; ++i) {

        if (fork() == 0) {

            worker_process(listen_fd);

            exit(0);

        }

    }

    wait_for_workers();

}

```

Why this is more elegant

The refactor combines Unix process isolation with event‑driven I/O, mirroring nginx’s ability to handle millions of concurrent connections. Each worker runs a simple loop similar to Redis’s, but multiple workers allow multi‑core scaling. Blocking calls move to non‑blocking variants.

### Example 18: Immutable Data for Safer Concurrency

- Project / Inspiration: Git’s immutable objects and functional style advocated by John Carmack (C, C++, systems).

- Concept: Favoring immutability to avoid races.

Context

A shared configuration object is mutated by multiple threads, requiring heavy locking. By treating configurations as immutable snapshots (like Git objects) and swapping references atomically, concurrency is simplified.

Before

```cpp

struct Config {

    std::map<std::string, std::string> kv;

    std::mutex m;

};

void set(Config *c, std::string k, std::string v) {

    std::lock_guard<std::mutex> g(c->m);

    c->kv[k] = v;

}

```

After

```cpp

using ConfigPtr = std::shared_ptrst Config>;

std::atomic<ConfigPtr> current_config;

void set(ConfigPtr old_cfg, std::string k, std::string v) {

    auto new_cfg = std::make_shared<Config>(*old_cfg);

    new_cfg->kv[k] = v;

    current_config.store(new_cfg, std::memory_order_release);

}

```

Why this is more elegant

Immutable snapshots avoid in‑place mutation, echoing Git’s object model and Carmack’s advocacy for pure functions. Readers always see a consistent configuration without needing locks, and writers create new snapshots. Atomic pointer swaps replace complex fine‑grained locking, reducing the chance of deadlocks and subtle races.

### Example 19: Channels Instead of Shared Queues

- Project / Inspiration: Go’s concurrency model (“do not communicate by sharing memory”) (Go, systems).

- Concept: Structuring concurrency around message passing.

Context

Workers read and write a shared queue protected by a mutex, leading to contention and tricky lifetime issues. Go’s idiomatic style uses channels to pass ownership of work items between goroutines.

Before

```go

var mu sync.Mutex

var queue []Job

func producer(j Job) {

    mu.Lock()

    queue = append(queue, j)

    mu.Unlock()

}

func consumer() {

    for {

        mu.Lock()

        if len(queue) > 0 {

            j := queue[0]

            queue = queue[1:]

            mu.Unlock()

            handle(j)

        } else {

            mu.Unlock()

        }

    }

}

```

After

```go

var jobs = make(chan Job, 1024)

func producer(j Job) {

    jobs <- j

}

func consumer() {

    for j := range jobs {

        handle(j)

    }

}

```

Why this is more elegant

Channels encapsulate synchronization, eliminating explicit locking and shared mutable slices, in line with Go’s concurrency philosophy. Ownership of each `Job` transfers from producer to consumer via the channel. The consumer loop is simple and cannot see inconsistent intermediate states.

### Example 20: Explicit Process Model for Database Connections

- Project / Inspiration: PostgreSQL’s per‑connection forked backend processes (C, database).

- Concept: Using OS processes to isolate connections.

Context

A database server handles all client connections in a single process with threads that share a giant global state. PostgreSQL adopts a process‑per‑connection model: the master process accepts connections and forks a backend process for each, simplifying isolation and crash recovery.

Before

```c

// single process, many threads share global state

static GlobalState G;

void *thread_main(void *arg) {

    int fd = (int)(intptr_t)arg;

    serve_connection(fd, &G);

}

```

After

```c

int main(void) {

    int listen_fd = create_listen_socket();

    while (1) {

        int fd = accept(listen_fd, NULL, NULL);

        if (fork() == 0) {

            GlobalState local = init_state();

            serve_connection(fd, &local);

            exit(0);

        }

    }

}

```

Why this is more elegant

Forked backend processes isolate each client’s memory and state, which improves robustness: a crash affects only one connection, not the whole server. It simplifies reasoning about concurrency because each backend can often be written as if it were single‑threaded.
