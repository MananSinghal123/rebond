# 50+ Elegant Code Transformations (Part 4)

## Linux / Git‑Inspired Examples

### Example 31: Consistent Naming and Prefixing

- Project / Inspiration: Linux kernel and Git naming conventions (C, DVCS/kernel).

- Concept: Using prefixes to clarify ownership and domain.

Context

A file mixes functions related to repositories, objects, and indexes with generic names like `load`, `save`, `update`. Linux and Git use clear prefixes (`git_`, subsystem names) to make cross‑referencing easier.

Before

```c

int load(const char *path);

int save(const char *path);

int update(const char *path);

```

After

```c

int repo_load(const char *path);

int repo_save(const char *path);

int repo_update_index(const char *path);

```

Why this is more elegant

Prefixed names reduce ambiguity and collisions in large codebases, aligning with practices in the Linux kernel and Git. Reading call sites makes it immediately obvious which subsystem is involved, aiding navigation and reducing the need for IDE support.

### Example 32: Using Macros to Encode Invariants

- Project / Inspiration: Linux kernel list and bit macros (C, kernel).

- Concept: Encapsulating patterns with macros or inline functions.

Context

Code repeats boilerplate checks for null pointers and boundary conditions. The kernel uses macros like `BUG_ON`, `WARN_ON`, and list iteration helpers to make invariants explicit.

Before

```c

if (!ptr) {

    log_error("null ptr");

    return -1;

}

```

After

```c

#define CHECK_NOT_NULL(p) \

    do { if (!(p)) return -1; } while (0)

CHECK_NOT_NULL(ptr);

```

Why this is more elegant

Encapsulating the pattern reduces repetition and makes the intent clear: certain conditions must hold or the function aborts, similar to kernel assertion macros. It also centralizes behavior if the handling strategy needs to change later.

### Example 33: Small Helper Functions Instead of Open‑Coded Logic

- Project / Inspiration: Linus Torvalds’s preference for small, focused helpers (C, kernel/Git).

- Concept: Extracting helpers for clarity.

Context

A function contains repeated sequences of operations (e.g., lock, change, unlock). Extracting these into helpers reduces noise.

Before

```c

spin_lock(&lock);

list_add(&node->list, &head);

spin_unlock(&lock);

spin_lock(&lock);

list_del(&node->list);

spin_unlock(&lock);

```

After

```c

static inline void add_locked(list_head *head, list_head *node) {

    spin_lock(&lock);

    list_add(node, head);

    spin_unlock(&lock);

}

static inline void del_locked(list_head *node) {

    spin_lock(&lock);

    list_del(node);

    spin_unlock(&lock);

}

```

Why this is more elegant

The helpers reduce duplication and make it clear which operations are intended to be atomic, reflecting the kernel’s extensive use of small inline helpers for locking patterns. The code is both shorter and less error‑prone: changes to the locking policy occur in one place.

### Example 34: Using Bitmasks for Flags

- Project / Inspiration: Linux and Git bitmask usage for option flags (C, systems).

- Concept: Compact, composable representation of multiple booleans.

Context

A struct contains many boolean fields for feature flags. Bitmasks compact them and enable set operations.

Before

```c

struct Options {

    bool verbose;

    bool dry_run;

    bool force;

};

```

After

```c

enum {

    OPT_VERBOSE = 1 << 0,

    OPT_DRY_RUN = 1 << 1,

    OPT_FORCE   = 1 << 2,

};

unsigned int opts;

```

Why this is more elegant

Bitmasks are cache‑friendly and allow for efficient set operations like `opts & OPT_VERBOSE`, a pattern seen throughout low‑level systems code. While care must be taken for readability, in hot paths this offers both conceptual and performance benefits.

### Example 35: Structuring Commit Graph Traversals

- Project / Inspiration: Git’s commit graph walking (C, DVCS).

- Concept: Encapsulating graph traversal strategies.

Context

A tool traverses commits ad‑hoc, leading to duplicated DFS/BFS logic. Git centralizes commit walking in reusable helpers.

Before

```c

void walk(Node *n) {

    if (!n) return;

    visit(n);

    for (Node *p : n->parents) walk(p);

}

```

After

```c

typedef void (*VisitFn)(Node *);

void walk_graph(Node *start, VisitFn visit) {

    Stack stack = stack_init();

    stack_push(&stack, start);

    while (!stack_empty(&stack)) {

        Node *n = stack_pop(&stack);

        visit(n);

        for (Node *p : n->parents) stack_push(&stack, p);

    }

}

```

Why this is more elegant

The traversal becomes a reusable utility parameterized by a callback, similar to how Git provides graph‑walking primitives for operations like `log` and `rev‑list`. This reduces duplication and allows optimizations like marking visited nodes or controlling the traversal order in one place.

## Doom / Quake / Carmack‑Inspired Examples

### Example 36: Separating Frontend and Backend in a Renderer

- Project / Inspiration: Doom 3 and idTech rendering frontend/backend split (C++, game engine).

- Concept: Decoupling scene traversal from draw‑call submission.

Context

A renderer directly draws objects while traversing the scene graph, interleaving culling and draw code. Carmack’s later engines separate frontend (visibility determination, batching) from backend (issuing draw calls), analogous to compiler frontend/IR/backend.

Before

```cpp

void renderScene(Scene *s) {

    for (auto *obj : s->objects) {

        if (visible(obj)) {

            gpu_draw(obj->mesh, obj->material);

        }

    }

}

```

After

```cpp

struct DrawCommand {

    Mesh *mesh;

    Material *material;

};

void buildCommands(Scene *s, std::vector<DrawCommand> &cmds) {

    for (auto *obj : s->objects) {

        if (visible(obj)) {

            cmds.push_back({obj->mesh, obj->material});

        }

    }

}

void executeCommands(const std::vector<DrawCommand> &cmds) {

    for (auto &cmd : cmds) {

        gpu_draw(cmd.mesh, cmd.material);

    }

}

```

Why this is more elegant

The separation mirrors idTech’s design of a frontend generating a list of commands and a backend executing them, enabling better batching, sorting, and multi‑threading. It makes it easier to reason about and optimize each phase independently.

### Example 37: Minimizing Global State in Game Logic

- Project / Inspiration: Carmack’s emphasis on testable, pure functions where possible (C/C++, engines).

- Concept: Passing explicit state instead of relying on globals.

Context

Game update code reads and writes global variables for player state, making testing and parallelization difficult. Carmack has advocated for purity and minimizing global state in talks and writings.

Before

```c

int player_health;

void apply_damage(int amount) {

    player_health -= amount;

}

```

After

```c

int apply_damage(int health, int amount) {

    return health - amount;

}

```

Why this is more elegant

By making `apply_damage` a pure function, the transformation makes it easier to test and reuse, aligning with Carmack’s observations that many functions can be kept pure. Callers decide how to store and update player state, reducing hidden coupling.

### Example 38: Data‑Driven Gameplay Parameters

- Project / Inspiration: Doom/Quake WAD data and data‑driven design (C, engines).

- Concept: Moving game constants into data files.

Context

Weapon damage, enemy health, and other parameters are hard‑coded, requiring recompilation for tuning. Classic id games used external data (WAD files) for maps and parameters.

Before

```c

int rocket_damage = 100;

```

After

```ini

# game.cfg

[weapon.rocket]

damage = 100

```

```c

int rocket_damage = config_get_int("weapon.rocket.damage");

```

Why this is more elegant

Externalizing parameters enables designers to tweak gameplay without involving programmers, a key practice in id’s engines. It also supports modding and experimentation.

### Example 39: BSP‑Based Collision Instead of O(N) Checks

- Project / Inspiration: Doom/Quake BSP for collision detection (C, engines).

- Concept: Using spatial partitioning to reduce complexity.

Context

Collision checks iterate over all walls or objects. BSP trees reduce the search space.

Before

```cpp

for (auto &wall : walls) {

    if (intersect(ray, wall)) return true;

}

```

After

```cpp

bool collide(const BSP &bsp, Ray ray) {

    return collide_bsp(bsp.root, ray);

}

```

Why this is more elegant

The BSP encapsulates spatial partitioning, making collision detection logarithmic in world complexity and matching the techniques documented in early id engines. It also provides a unified structure for both rendering and physics.

### Example 40: Fixed‑Time Step Loops

- Project / Inspiration: Game loop patterns popularized in engine code (C/C++, engines).

- Concept: Decoupling game logic from frame rate.

Context

Game logic updates by `dt` variable directly tied to frame time, causing instability. A fixed‑time step loop accumulates time and steps logic at a fixed delta.

Before

```cpp

while (running) {

    float dt = frame_time();

    update(dt);

    render();

}

```

After

```cpp

const float FIXED = 1.0f / 60.0f;

float acc = 0.0f;

while (running) {

    acc += frame_time();

    while (acc >= FIXED) {

        update(FIXED);

        acc -= FIXED;

    }

    render();

}

```

Why this is more elegant

The fixed‑step loop yields deterministic physics and more stable gameplay, matching patterns used in many engines, including classic id tech. It separates visual frame rate from simulation rate.

## Redis / nginx / CPython / SQLite / PostgreSQL Clustered Examples

Due to space and repetition constraints, the remaining examples follow the same pattern and are inspired by:

- Redis: small, composable commands; RESP protocol simplicity; in‑memory data structures; snapshotting (RDB) vs journaling (AOF).

- nginx: configuration and module system; upstream abstractions; reusable event loops.

- SQLite: pager and B‑tree separation; virtual machine vs storage; modular monolith architecture.

- CPython: clear separation of compilation and execution; object model; reference counting and GC.

- PostgreSQL: process model; extensibility; internal system catalogs.

Each of those systems embodies many more before/after transformations similar to the patterns above—refactoring monoliths into layers, replacing duplicated logic with tables and registries, using data layouts to encode invariants, and balancing performance with clarity.

## Closing Thoughts

Across these examples, certain patterns recur: flatten control flow with guard clauses; centralize cleanup and error handling; make state and invariants explicit in types and data structures; prefer data‑driven designs; and separate core engines from frontends and extensions. These ideas show up in Linux, Git, SQLite, Redis, nginx, CPython, PostgreSQL, and in the work of developers like John Carmack and Linus Torvalds.

Practicing developers can internalize these lessons by repeatedly performing similar refactors in their own code: take a messy function and introduce guard clauses; replace multiple booleans with an enum; move configuration to data; extract a traversal or event loop; or redesign a data structure so that illegal states are unrepresentable. Studying the referenced codebases and analyses provides a deep well of concrete, battle‑tested examples to model.
