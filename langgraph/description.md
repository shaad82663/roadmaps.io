# Prerequisites

Before starting this roadmap, it is recommended to have a basic understanding of:

## Required

### LangChain Core Concepts

- Models, Prompts, Output Parsers
- Runnables & LCEL
- Chains
- Memory (basic conversational memory)
- Tools & Tool Calling
- Basic Agents (ReAct pattern)

> LangGraph is built by the LangChain team as a lower-level orchestration layer. It assumes you already understand Runnables and basic Agent concepts — LangGraph exists to give you **full control** over the execution flow that standard Agents abstract away.

### TypeScript

- Variables and data types
- Functions, Classes and interfaces
- Generics
- Async/Await, Generators
- Modules and imports

### Node.js

- npm, Package management
- Environment variables
- Working with external libraries

---

## Optional: Python Learners

Although this roadmap uses **TypeScript LangGraph.js examples**, you can follow the entire path using **Python LangGraph**.

The core concepts remain identical:

- State, Nodes, Edges
- Graphs, Checkpointers
- Human-in-the-loop, Memory Stores
- Multi-Agent architectures

Only syntax and library APIs differ between LangGraph.js and LangGraph (Python).

> **Recommendation:** Learn the graph execution model first. The mental model (state machines, channels, reducers) is identical across languages — only function signatures change.

# LangGraph Learning Phases

## Phase 1: Foundation (U00–U02)

The mental model shift from "chains" to "graphs."

### Topics

#### U00 – Why LangGraph

- Limitations of Chains (linear, no cycles)
- Limitations of standard Agents (black-box loop, no control)
- LangGraph's core idea: agent workflows as **state machines / graphs**
- When to use LangGraph vs. a simple Chain vs. a simple Agent

#### U01 – State & Schema

- Defining State (TypedDict / Annotated / Zod schema in JS)
- Reducers (how state updates are merged — `operator.add`, custom reducer functions)
- `MessagesState` and the built-in messages reducer
- Channels (how LangGraph propagates state under the hood)

#### U02 – Nodes & Edges

- `StateGraph` — creating a graph instance
- Nodes (`addNode` / `add_node`) — functions that read and return partial state
- Normal Edges (`addEdge` / `add_edge`)
- `START` and `END` virtual nodes
- Compiling a graph (`.compile()`)
- Running a graph: `invoke`, `stream`, `batch`

**Goal:** Understand state, nodes, and edges as the atomic building blocks of any LangGraph application.

---

## Phase 2: Control Flow (U03–U04)

The features that make graphs more powerful than linear chains.

### Topics

#### U03 – Conditional Edges & Branching

- `addConditionalEdges` / `add_conditional_edges`
- Routing functions (deciding the next node based on state)
- Multiple branches and fan-out
- Cycles / loops (the key differentiator from Chains)
- Recursion limits and avoiding infinite loops

#### U04 – Command Object & the Send API

- `Command` object — combining state update + routing (`goto`) in one return
- Dynamic routing from inside a node (vs. static conditional edges)
- `Send` API — fan-out / map-reduce style parallel branching
- Parallel node execution and result aggregation

**Recommended Learning Order:** Conditional Edges → Cycles → Command → Send API

**Why this order?** Conditional edges teach static branching first. Command and Send introduce dynamic, runtime-decided routing and parallelism, which are easier to grasp once static branching is second nature.

---

## Phase 3: Persistence & Memory (U05–U07)

What separates LangGraph from a one-shot function call: durable, resumable state.

### Topics

#### U05 – Checkpointers

- What a Checkpointer is and why graphs need one
- `MemorySaver` (in-memory, dev/testing)
- `SqliteSaver`, `PostgresSaver` (persistent, production-grade)
- `thread_id` — isolating conversations/sessions
- Checkpoint structure (state snapshot + metadata)

#### U06 – State Management & Time Travel

- `getState` / `get_state` — inspecting current state of a thread
- `updateState` / `update_state` — manually editing state
- `getStateHistory` / `get_state_history` — full checkpoint history
- Time travel — replaying or forking execution from a past checkpoint
- Use cases: debugging, undo/redo, "what-if" exploration

#### U07 – Long-Term Memory (Store API)

- Short-term memory (thread-scoped, via Checkpointer) vs. Long-term memory (cross-thread, via Store)
- `InMemoryStore`, persistent store backends
- `put` / `get` / `search` — storing and retrieving memories
- Namespacing memories (per-user, per-application)
- Patterns: semantic memory, episodic memory, procedural memory

**Goal:** Build agents that remember across turns, sessions, and users.

---

## Phase 4: Human-in-the-Loop (U08)

Pausing graph execution for human review, approval, or input.

### Topics

- `interrupt()` — dynamic, in-node pausing
- Static breakpoints: `interruptBefore` / `interruptAfter`
- Resuming execution after an interrupt (`Command(resume=...)`)
- Approval workflows (e.g., approving a tool call before execution)
- Editing state mid-execution (human correction of agent state)
- Validating/rejecting agent actions before they run

**Goal:** Build agents that are safe to deploy in high-stakes workflows by keeping a human in the loop at critical decision points.

---

## Phase 5: Multi-Agent Systems (U09–U10)

Composing multiple graphs and agents into larger systems.

### Topics

#### U09 – Subgraphs

- Nesting one compiled graph inside another as a node
- State schema mapping between parent and subgraph
- Reusability — building modular, composable agent components
- Subgraph streaming and checkpointing behavior

#### U10 – Multi-Agent Architectures

- **Network** — agents can call any other agent
- **Supervisor** — a router/orchestrator agent delegates to worker agents
- **Hierarchical Teams** — supervisors of supervisors
- **Swarm** — agents dynamically hand off control to one another
- Handoffs — passing context and control between agents
- Shared vs. private state across agents

**Goal:** Design systems where multiple specialized agents collaborate on a single task.

---

## Phase 6: Tools & Prebuilt Components (U11)

LangGraph's pre-built abstractions for common agent patterns.

### Topics

- `ToolNode` — executing tool calls as a graph node
- Tool-calling loop pattern (agent node → tool node → agent node)
- `createReactAgent` / `create_react_agent` — prebuilt ReAct-style agent graph
- When to use prebuilt agents vs. hand-rolled graphs
- Customizing prebuilt agents (system prompts, state schema, hooks)

**Goal:** Know when to reach for LangGraph's high-level helpers instead of building everything from scratch.

---

## Phase 7: Advanced Execution Patterns (U12)

Patterns for robustness, efficiency, and alternate programming models.

### Topics

- **Functional API** — `entrypoint` and `task` (a lighter-weight, code-first alternative to `StateGraph`)
- Node-level caching (avoiding redundant work on re-runs)
- Retry policies and error handling per node
- Durable execution — surviving process crashes/restarts mid-run
- Async graph execution
- Configurable runtime fields (`RunnableConfig`, per-call configuration)

**Goal:** Make graphs resilient and efficient enough for real workloads, and know LangGraph's alternative coding style.

---

## Phase 8: Production (U13–U14)

Observability, deployment, and operating LangGraph applications at scale.

### Topics

#### U13 – Observability & Debugging

- LangSmith tracing for graph runs
- Visualizing graphs: `getGraph` / `get_graph`, Mermaid diagram export
- LangGraph Studio — visual debugger and graph inspector
- Streaming modes: `values`, `updates`, `messages`, `custom`, `debug`
- Evaluating multi-step agent behavior

#### U14 – Deployment & Production Patterns

- LangGraph Platform / LangGraph Cloud — managed deployment
- Persistence backends for production (Postgres-backed checkpointers/stores)
- Scaling considerations for stateful, long-running graphs
- Testing strategies for graphs (unit-testing nodes, integration-testing full runs)
- Versioning graphs and migrating state schemas

**Recommendation:** Revisit this phase after building 2–3 real multi-agent or stateful projects — production concerns (persistence backends, recursion limits, durable execution) click faster once you've hit them in practice.
