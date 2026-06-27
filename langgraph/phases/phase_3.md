# Phase 3: Persistence & Memory
## LangGraph Mastery Roadmap — Deep Study Guide

**Stack used throughout:** Node.js + TypeScript, `@langchain/langgraph`, `@langchain/openai` (OpenAI models for any LLM calls), `@langchain/langgraph-checkpoint-sqlite` / `@langchain/langgraph-checkpoint-postgres` where relevant.

> **How to use this guide:** Read each "Concept and Theory" section slowly — don't skip the analogies, they're doing real explanatory work. Then physically type out (don't copy-paste) the Practical Lab code at least once. Finally, answer the Knowledge Check questions out loud or in writing before moving on. This phase assumes you've completed Phase 1 (Foundation: graphs, state, nodes/edges) and Phase 2 (Control Flow: conditional edges, Command/Send). If a term like "node," "edge," or "StateGraph" feels unfamiliar, pause and review Phase 1 first — this guide builds directly on top of it.

---

## Table of Contents

1. [Unit 5 — Checkpointers](#unit-5--checkpointers)
2. [Unit 6 — State Management & Time Travel](#unit-6--state-management--time-travel)
3. [Unit 7 — Long-Term Memory (Store API)](#unit-7--long-term-memory-store-api)
4. [Phase 3 Final Project — Persistent Research Companion](#phase-3-final-project--persistent-research-companion)
5. [Phase 3 Master Cheat Sheet](#phase-3-master-cheat-sheet)

---

# Unit 5 — Checkpointers

## 5.1 Concept and Theory

### 5.1.1 The problem checkpointers solve

Every graph you've built so far has lived and died inside a single `.invoke()` call. The moment that function returns, the graph's memory of what just happened evaporates. If you call it again, it starts from zero.

Think about what a real conversation needs. When you talk to a person, they don't forget what you said three sentences ago. They carry the thread forward. A LangGraph graph, by default, is like someone with severe short-term memory loss: brilliant in the moment, but unable to retain anything once the conversation pauses.

A **Checkpointer** is the piece of infrastructure that fixes this. It is an object you attach to your graph at compile time, and its job is simple: after every "super-step" (every time one or more nodes finish running), it takes a snapshot of the entire graph state and saves it somewhere durable. The next time you call the graph with the same conversation identifier, LangGraph loads that snapshot back in before running anything, so the graph picks up exactly where it left off.

### 5.1.2 Why this matters — three real reasons

1. **Multi-turn conversations.** A chatbot needs to remember turn 1 when answering turn 5. Without a checkpointer, you'd have to manually re-send the entire conversation history yourself, every single time, and manage that bookkeeping in your own application code.
2. **Pausing for humans.** Phase 4 (Human-in-the-Loop) is built entirely on top of checkpointers. To pause a graph mid-execution and resume it later — possibly hours later, possibly after a server restart — the state has to be saved somewhere outside the process's memory.
3. **Crash recovery.** If your Node.js process crashes halfway through a long-running graph, a durable checkpointer lets you resume from the last successful step instead of starting over.

### 5.1.3 The analogy: video game save files

Picture a video game with a save system. Every time you reach a checkpoint flag, the game writes your position, inventory, and stats to a save file. If you turn off the console and come back tomorrow, you load that save file and you're right back where you stood. You didn't have to replay the whole level.

A LangGraph checkpoint is exactly that save file, except it's automatic — you don't call "save" yourself. LangGraph saves after every super-step on its own, as long as you've given it a checkpointer to save *to*.

### 5.1.4 The three checkpointer implementations you need to know

| Checkpointer | Where it stores data | Survives process restart? | When to use it |
|---|---|---|---|
| `MemorySaver` | A JavaScript object in RAM | No | Local development, unit tests, quick experiments |
| `SqliteSaver` | A `.sqlite` file on disk | Yes | Single-machine apps, prototypes, small production tools, desktop apps |
| `PostgresSaver` | A Postgres database | Yes | Real production systems, multi-server deployments, anything that needs to scale |

All three implement the exact same interface. This is a deliberate design choice in LangGraph: you can develop with `MemorySaver` and swap in `PostgresSaver` for production by changing **one line of code**. Nothing else about your graph changes.

### 5.1.5 `thread_id` — how LangGraph tells conversations apart

A single compiled graph is not tied to one conversation. It's more like a *template* for a conversation. The thing that makes one run different from another is a configuration value called `thread_id`.

Think of `thread_id` like a hotel room number. The hotel building (your compiled graph) is the same physical structure for everyone, but room 204's contents are completely separate from room 305's. When you call your graph with `thread_id: "room-204"`, the checkpointer only loads and saves state under that specific key. Calling the same graph with `thread_id: "room-305"` gives you a totally independent, isolated conversation — even though it's the exact same compiled graph object in your code.

This is what lets one deployed graph serve thousands of simultaneous users without their conversations bleeding into each other.

### 5.1.6 What's actually inside a checkpoint

A checkpoint is not just "the state." It's a structured record containing:

- **`channel_values`** — the actual state snapshot (your `messages`, `counter`, or whatever fields you defined in your schema)
- **`channel_versions`** — version numbers used internally so LangGraph knows which channels changed at which step
- **Step metadata** — which step number this is, what triggered it, and a timestamp
- **A unique checkpoint `id`** — so each individual snapshot in history can be addressed directly (this becomes critical in Unit 6 for time travel)

Every time a super-step completes, a *new* checkpoint is written — old checkpoints are not overwritten. This means a checkpointer doesn't just store "the current state," it stores the **entire history** of how that thread evolved, one snapshot per step. That history is what Unit 6 (time travel) is built on.

### 5.1.7 How compiling with a checkpointer changes behavior

Without a checkpointer:
```ts
const app = graph.compile();
await app.invoke({ messages: [...] }); // stateless, one-shot
```

With a checkpointer:
```ts
const app = graph.compile({ checkpointer });
await app.invoke(
  { messages: [...] },
  { configurable: { thread_id: "user-42" } } // required once a checkpointer is attached
);
```

The moment you attach a checkpointer, LangGraph **requires** a `thread_id` in the config of every call. This makes sense once you think about it: the checkpointer needs to know *which* save file to read from and write to. Forgetting to pass `thread_id` is the single most common beginner mistake with checkpointers, and LangGraph will throw a clear error if you omit it.

---

## 5.2 Practical Lab

### Lab 5.1 — From stateless to stateful with `MemorySaver`

**Goal:** Take a simple chatbot graph and make it remember previous turns using `MemorySaver`, then prove that two different `thread_id`s stay isolated.

#### Step 0 — Project setup

```bash
mkdir langgraph-phase3 && cd langgraph-phase3
npm init -y
npm install typescript ts-node @types/node --save-dev
npm install @langchain/langgraph @langchain/openai @langchain/core zod
npx tsc --init
```

**Why we're doing this:** `@langchain/langgraph` is the graph engine itself. `@langchain/openai` gives us a chat model wrapper that knows how to call OpenAI's API in the shape LangGraph expects. `zod` is what we'll use to define our state schema with runtime validation (the modern recommended approach over plain TypeScript types, because it lets LangGraph validate inputs at runtime, not just compile time). `ts-node` lets us run `.ts` files directly without a separate compile step, which is faster for learning.

**Expected result:** A `package.json`, `node_modules/`, and `tsconfig.json` in your folder. No errors in the terminal.

**Common mistake:** Forgetting `--save-dev` for `typescript`/`ts-node` means it still works, but it's good practice to keep build tooling separate from runtime dependencies. If you forget, it's not a bug — just slightly messier dependency hygiene.

#### Step 1 — Set your API key

```bash
export OPENAI_API_KEY="sk-...your-key-here..."
```

**Why:** `@langchain/openai`'s `ChatOpenAI` class automatically reads this environment variable. You never hard-code keys in source files — if you accidentally commit a key to git, it can be scraped and abused within minutes.

**Verify:** Run `echo $OPENAI_API_KEY` (Mac/Linux) and confirm it prints your key. On Windows PowerShell use `$env:OPENAI_API_KEY="sk-..."`.

#### Step 2 — Build the base graph (no memory yet)

Create `src/lab5-1.ts`:

```ts
import { StateGraph, MessagesAnnotation, START, END } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });

// MessagesAnnotation is a prebuilt schema: { messages: BaseMessage[] }
// with a reducer that APPENDS new messages instead of overwriting the array.
async function callModel(state: typeof MessagesAnnotation.State) {
  const response = await model.invoke(state.messages);
  return { messages: [response] }; // returned messages get appended, not replace the array
}

const builder = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addEdge(START, "agent")
  .addEdge("agent", END);

const app = builder.compile(); // <-- NOTE: no checkpointer yet

async function main() {
  const r1 = await app.invoke({ messages: [{ role: "user", content: "My name is Shaad." }] });
  console.log("Turn 1:", r1.messages.at(-1)?.content);

  const r2 = await app.invoke({ messages: [{ role: "user", content: "What is my name?" }] });
  console.log("Turn 2:", r2.messages.at(-1)?.content);
}

main();
```

**What each piece means:**
- `MessagesAnnotation` is a ready-made state schema LangGraph ships with specifically for chat-style graphs. Its `messages` field uses a reducer that **appends** new messages to the existing array, rather than replacing it — that's why returning `{ messages: [response] }` from a node adds to history instead of wiping it.
- `model.invoke(state.messages)` sends the *entire current message list* to OpenAI each call. The model itself has no memory; LangGraph (and you) are responsible for handing it the full context every time.
- Compiling with no `{ checkpointer }` option means `app` is purely stateless between `.invoke()` calls.

**Run it:**
```bash
npx ts-node src/lab5-1.ts
```

**Expected result:** Turn 1 gets a reasonable greeting acknowledging the name. Turn 2 — and this is the important part — the model will say something like *"I don't have access to your name"* because each `.invoke()` call starts a brand-new `messages` array. Nothing carried over.

**This "failure" is the whole point of the lab.** You're about to fix it with one parameter.

#### Step 3 — Add `MemorySaver` and a `thread_id`

Create `src/lab5-2.ts`:

```ts
import { StateGraph, MessagesAnnotation, START, END, MemorySaver } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });

async function callModel(state: typeof MessagesAnnotation.State) {
  const response = await model.invoke(state.messages);
  return { messages: [response] };
}

const builder = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addEdge(START, "agent")
  .addEdge("agent", END);

const checkpointer = new MemorySaver();
const app = builder.compile({ checkpointer }); // <-- the only change

async function main() {
  const config = { configurable: { thread_id: "shaad-convo-1" } };

  const r1 = await app.invoke({ messages: [{ role: "user", content: "My name is Shaad." }] }, config);
  console.log("Turn 1:", r1.messages.at(-1)?.content);

  // Same thread_id, so LangGraph loads the saved checkpoint before running this turn
  const r2 = await app.invoke({ messages: [{ role: "user", content: "What is my name?" }] }, config);
  console.log("Turn 2:", r2.messages.at(-1)?.content);
}

main();
```

**What changed and why it works:**
- `new MemorySaver()` creates an in-process key-value store, keyed by `thread_id`.
- `builder.compile({ checkpointer })` tells LangGraph: "after every super-step, persist state into this checkpointer, and before every invocation, load existing state from it first."
- Passing the **same** `config.configurable.thread_id` on both calls means: before turn 2 runs, LangGraph loads the saved state (which already contains turn 1's two messages), appends your new human message to it, runs the node, and saves again.

**Run it:**
```bash
npx ts-node src/lab5-2.ts
```

**Expected result:** Turn 2 should correctly answer *"Your name is Shaad."* — proof that state persisted across two separate `.invoke()` calls.

**Verification step:** Add a `console.log((await app.getState(config)).values.messages.length)` after turn 2. It should print `4` (2 human + 2 AI messages), confirming the full history accumulated correctly.

#### Step 4 — Prove thread isolation

Append this to the bottom of `main()`:

```ts
  const otherConfig = { configurable: { thread_id: "different-user" } };
  const r3 = await app.invoke({ messages: [{ role: "user", content: "What is my name?" }] }, otherConfig);
  console.log("Different thread:", r3.messages.at(-1)?.content);
```

**Expected result:** The model should say it doesn't know the name — because `"different-user"` is a brand-new, empty thread that has never seen "Shaad." This proves `thread_id` truly isolates conversations on the same compiled graph.

**Common beginner mistakes:**
1. **Forgetting `config` on the second call.** If you only pass `config` on the first `.invoke()` but not the second, LangGraph treats the second call as `thread_id: undefined`, which either errors or starts a fresh anonymous thread — memory will appear "broken" even though your code is otherwise correct.
2. **Reusing the same `thread_id` across genuinely different users in production.** This is a privacy bug, not just a logic bug — User B would see User A's conversation history.
3. **Expecting `MemorySaver` to survive a restart.** It's RAM-only. Stop and restart your `ts-node` process and the memory is gone. That's expected — it's a dev tool, not a production store.

### Lab 5.2 — Durable persistence with `SqliteSaver`

**Goal:** Swap `MemorySaver` for `SqliteSaver` and prove state survives a full process restart.

```bash
npm install @langchain/langgraph-checkpoint-sqlite better-sqlite3
```

**Why:** `SqliteSaver` needs an actual SQLite driver to talk to a file on disk; `better-sqlite3` is the native binding LangGraph's package uses under the hood.

Create `src/lab5-3.ts`:

```ts
import { StateGraph, MessagesAnnotation, START, END } from "@langchain/langgraph";
import { SqliteSaver } from "@langchain/langgraph-checkpoint-sqlite";
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });

async function callModel(state: typeof MessagesAnnotation.State) {
  const response = await model.invoke(state.messages);
  return { messages: [response] };
}

const builder = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addEdge(START, "agent")
  .addEdge("agent", END);

// Writes to (and creates, if missing) a real file on disk
const checkpointer = SqliteSaver.fromConnString("./checkpoints.sqlite");
const app = builder.compile({ checkpointer });

async function main() {
  const config = { configurable: { thread_id: "persistent-convo" } };
  const userMsg = process.argv[2] ?? "Hello!";
  const result = await app.invoke({ messages: [{ role: "user", content: userMsg }] }, config);
  console.log("Assistant:", result.messages.at(-1)?.content);
}

main();
```

**Run it twice, as two completely separate process invocations:**
```bash
npx ts-node src/lab5-3.ts "My favorite color is teal."
npx ts-node src/lab5-3.ts "What is my favorite color?"
```

**Expected result:** The second command — a **brand new Node.js process** with zero in-memory state — correctly answers "teal." This is the proof that matters: persistence survived across process boundaries, not just across function calls within one running program.

**Verify on disk:** Run `ls -la checkpoints.sqlite` — you should see a real file with a nonzero size. Optionally inspect it with `sqlite3 checkpoints.sqlite ".tables"` if you have the `sqlite3` CLI installed; you'll see tables like `checkpoints` and `writes`.

**Common mistakes:**
- Installing `better-sqlite3` without build tools present (on some Linux machines you may need `apt install build-essential python3` first) — if `npm install` fails with node-gyp errors, this is almost always the cause.
- Forgetting that `SqliteSaver.fromConnString` is **synchronous setup** — you don't need to `await` it, only the graph calls themselves are async.
- Pointing two different graphs at the same `.sqlite` file with overlapping `thread_id`s by accident — checkpoints are keyed by `thread_id` regardless of which graph wrote them, so reusing IDs across unrelated graphs can produce confusing state shapes if their schemas differ.

### Lab 5.3 — Two parallel threads, one graph, one process

**Goal:** Demonstrate that a single compiled graph instance can safely juggle many independent conversations concurrently — this is exactly how a real chat server behaves.

```ts
import { StateGraph, MessagesAnnotation, START, END, MemorySaver } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });
async function callModel(state: typeof MessagesAnnotation.State) {
  const response = await model.invoke(state.messages);
  return { messages: [response] };
}
const app = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addEdge(START, "agent")
  .addEdge("agent", END)
  .compile({ checkpointer: new MemorySaver() });

async function main() {
  const alice = { configurable: { thread_id: "alice" } };
  const bob = { configurable: { thread_id: "bob" } };

  await app.invoke({ messages: [{ role: "user", content: "I like cats." }] }, alice);
  await app.invoke({ messages: [{ role: "user", content: "I like dogs." }] }, bob);

  // Run both follow-ups concurrently with Promise.all to mimic real traffic
  const [aliceReply, bobReply] = await Promise.all([
    app.invoke({ messages: [{ role: "user", content: "What do I like?" }] }, alice),
    app.invoke({ messages: [{ role: "user", content: "What do I like?" }] }, bob),
  ]);

  console.log("Alice:", aliceReply.messages.at(-1)?.content);
  console.log("Bob:", bobReply.messages.at(-1)?.content);
}
main();
```

**Expected result:** Alice's answer mentions cats; Bob's mentions dogs — despite both requests being sent concurrently through the same `app` object. **Verify** by checking the two responses never cross-contaminate, even if you run this 5 times.

#### Step — Inspect a raw checkpoint object

```ts
const raw = await app.getState({ configurable: { thread_id: "alice" } });
console.log(JSON.stringify(raw, null, 2));
```

**What to look for in the output:** a `values` field (your actual state), a `next` field (which node would run next, empty if the graph finished), and `config` containing the `thread_id` and a `checkpoint_id`. This structure is the foundation for everything in Unit 6.

---

## 5.3 Knowledge Check — Unit 5

### Summary
A **Checkpointer** persists graph state after every super-step, keyed by a `thread_id`. `MemorySaver` is for development (RAM only, lost on restart). `SqliteSaver` and `PostgresSaver` are durable, disk/database-backed options for production. Attaching a checkpointer makes `thread_id` mandatory in every call's config. The same compiled graph can safely serve unlimited independent conversations because each `thread_id` is fully isolated.

### Key Takeaways
- No checkpointer = stateless graph; every `.invoke()` is amnesia.
- `thread_id` is the "room number" that separates one conversation's state from another's on the same graph.
- All checkpointer implementations share one interface — swapping `MemorySaver` → `SqliteSaver` → `PostgresSaver` is a one-line change.
- A checkpoint stores more than current state — it stores step metadata and a unique ID per snapshot, enabling history traversal later.

### Practice Questions
1. What happens if you call `app.invoke()` on a graph compiled with a checkpointer, but you forget to pass `thread_id`?
2. Why is `MemorySaver` unsuitable for production, even for a low-traffic app?
3. If two users are accidentally given the same `thread_id`, what privacy problem occurs?
4. True or false: switching from `SqliteSaver` to `PostgresSaver` requires rewriting your graph's nodes and edges.

### Exercises
1. Modify Lab 5.1's graph to add a second node, `summarize`, that runs after `agent` and prints a one-line summary of the conversation so far. Confirm the summary correctly reflects multi-turn history once a checkpointer is attached.
2. Write a small CLI loop (using Node's `readline`) that lets you chat with the Lab 5.2 graph interactively in your terminal, all under one fixed `thread_id`, until you type `exit`.

### Mini Project
Build a **"Two Customer Support Agents"** simulator: one compiled graph, `SqliteSaver` persistence, and two hard-coded `thread_id`s representing two different customers asking about order status. Seed each thread with different fake "order info" in the first message, then ask a follow-up question on each thread and confirm the answers don't mix up.

---

# Unit 6 — State Management & Time Travel

## 6.1 Concept and Theory

### 6.1.1 From "save/load" to "explore history"

Unit 5 gave your graph a memory. Unit 6 gives you **X-ray vision into that memory**. Once a checkpointer is attached, LangGraph isn't just saving "the latest state" — it's saving a brand-new checkpoint after *every single super-step*. That means a thread with 10 turns doesn't have 1 saved state, it has a full timeline of intermediate states, like frames in a film reel.

Four methods let you work with that timeline:

| Method | What it does | Analogy |
|---|---|---|
| `getState(config)` | Returns the *current* (most recent) snapshot for a thread | Reading today's page in a diary |
| `updateState(config, values)` | Manually injects/overwrites state outside normal node execution | Crossing something out and rewriting it in the diary by hand |
| `getStateHistory(config)` | Returns every checkpoint ever saved for a thread, newest first | Reading every page of the diary from the beginning |
| Resuming from a past `checkpoint_id` | Re-runs the graph starting from an earlier snapshot | Tearing out today's page and continuing the story from last Tuesday instead |

### 6.1.2 `getState()` — reading the present

```ts
const snapshot = await app.getState({ configurable: { thread_id: "alice" } });
```

This returns a `StateSnapshot` object with (among other fields):
- `values` — the actual state values (e.g., `{ messages: [...] }`)
- `next` — an array of node names that *would* run next if you invoked again (empty `[]` means the graph has fully finished; non-empty means it's paused, e.g., at a human-in-the-loop interrupt from Phase 4)
- `config` — contains the exact `checkpoint_id` of this snapshot, which uniquely addresses this single moment in time

### 6.1.3 `updateState()` — editing history by hand

Sometimes you, the developer (or a human reviewer), need to correct the state without running a node. Maybe a tool returned bad data and you want to patch it before the graph continues, or a human needs to edit a draft message before it's sent (this becomes essential in Phase 4).

```ts
await app.updateState(
  { configurable: { thread_id: "alice" } },
  { messages: [{ role: "user", content: "Correction: I actually prefer dogs, not cats." }] }
);
```

**Critical detail:** `updateState()` runs through the **same reducers** your schema defines. If your `messages` field uses an append-only reducer, calling `updateState` with a new message *appends* it — it does not wipe the array. If you want to truly overwrite a field, your reducer needs to support that (e.g., a "last value wins" reducer for non-message fields like a `status: string`).

`updateState()` also creates a **brand new checkpoint** — it doesn't mutate an old one. This keeps the "every checkpoint is immutable history" guarantee intact, which matters enormously for the next concept: time travel.

### 6.1.4 `getStateHistory()` — walking the timeline

```ts
for await (const snap of app.getStateHistory({ configurable: { thread_id: "alice" } })) {
  console.log(snap.config.configurable?.checkpoint_id, snap.values);
}
```

This is an **async generator** — it yields snapshots one at a time, ordered from most recent to oldest, all the way back to the very first checkpoint of the thread. Each yielded snapshot is a complete, independently addressable point-in-time copy of state, each with its own `checkpoint_id`.

### 6.1.5 Time travel — replay and forking

This is the part that makes checkpointers feel like magic the first time you see it. Because every checkpoint is immutable and individually addressable by `checkpoint_id`, you can tell LangGraph: *"don't resume from the latest state — resume from this specific checkpoint three steps ago."*

```ts
const historicalConfig = {
  configurable: { thread_id: "alice", checkpoint_id: "1ef7a3c2-..." }
};
const result = await app.invoke(null, historicalConfig);
```

Passing `null` as the input (instead of a new message) tells LangGraph: *"don't add new input, just continue execution from wherever this checkpoint left off."* You can also pass new input here — and that's exactly how **forking** works.

**The crucial insight:** when you resume from a past checkpoint, you are **not deleting** the "future" checkpoints that came after it. You are creating a **new branch**. The original timeline still exists in history; you've simply started a second, parallel timeline that also begins from that earlier point. Think of it like a save-file "fork" in a game speedrun community: you don't erase your first playthrough by loading an earlier save and playing differently — you now just have two distinct playthroughs sharing a common ancestor checkpoint.

### 6.1.6 Why this is genuinely useful, not just a neat trick

1. **Debugging.** If a multi-step agent went wrong at step 7, you can jump straight to the checkpoint right before step 7, inspect exactly what state it saw, and re-run just that step in isolation — instead of re-running the whole 7-step pipeline from scratch every time you tweak a prompt.
2. **Undo / redo.** A "regenerate this response" button in a chat UI is, under the hood, just: load the checkpoint *before* the bad AI response, then invoke again (which forks a new branch with a fresh model call).
3. **"What-if" exploration.** Compare two different responses to the same situation by forking from one shared earlier checkpoint and sending two different follow-up inputs.

### 6.1.7 An important nuance: checkpoint IDs vs. thread IDs

Don't confuse these two identifiers:
- `thread_id` — identifies an entire *conversation lineage* (can contain many branches).
- `checkpoint_id` — identifies one *exact moment* within that lineage.

Omitting `checkpoint_id` from your config (just passing `thread_id`) always means "use the latest checkpoint on the main timeline." Including a specific `checkpoint_id` means "time travel to exactly here."

## 6.2 Practical Lab

### Lab 6.1 — Printing full state history

Create `src/lab6-1.ts`:

```ts
import { StateGraph, MessagesAnnotation, START, END, MemorySaver } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });
async function callModel(state: typeof MessagesAnnotation.State) {
  const response = await model.invoke(state.messages);
  return { messages: [response] };
}
const checkpointer = new MemorySaver();
const app = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addEdge(START, "agent")
  .addEdge("agent", END)
  .compile({ checkpointer });

async function main() {
  const config = { configurable: { thread_id: "history-demo" } };

  await app.invoke({ messages: [{ role: "user", content: "Step one: remember the number 7." }] }, config);
  await app.invoke({ messages: [{ role: "user", content: "Step two: remember the number 14." }] }, config);
  await app.invoke({ messages: [{ role: "user", content: "What numbers have I given you?" }] }, config);

  console.log("\n--- Full checkpoint history (newest first) ---");
  let i = 0;
  for await (const snap of app.getStateHistory(config)) {
    console.log(
      `[${i++}] checkpoint_id=${snap.config.configurable?.checkpoint_id} | ` +
      `messages_count=${snap.values.messages.length} | next=${JSON.stringify(snap.next)}`
    );
  }
}
main();
```

**What we're verifying:** You should see **six** checkpoints, not three. Why six and not three? Because each `.invoke()` call produces **two** super-steps: one for the `START → agent` transition consuming your input, and the resulting state after `agent` runs. Counting checkpoints, rather than assuming 1-per-invoke, is the kind of detail that trips up beginners — **always print and count, never assume.**

**Common mistake:** Trying to use `for (const snap of ...)` (without `await`) — `getStateHistory` returns an **async** iterator, so the loop must be `for await (...)`. Forgetting `await` here throws a TypeScript/runtime error about iterables.

### Lab 6.2 — Manually correcting state with `updateState()`

Create `src/lab6-2.ts`:

```ts
import { StateGraph, MessagesAnnotation, START, END, MemorySaver } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });
async function callModel(state: typeof MessagesAnnotation.State) {
  const response = await model.invoke(state.messages);
  return { messages: [response] };
}
const app = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addEdge(START, "agent")
  .addEdge("agent", END)
  .compile({ checkpointer: new MemorySaver() });

async function main() {
  const config = { configurable: { thread_id: "correction-demo" } };

  await app.invoke({ messages: [{ role: "user", content: "My order number is A100." }] }, config);

  // Oops — the order number was actually wrong. Inject a correction directly into state.
  await app.updateState(config, {
    messages: [{ role: "user", content: "Correction: the real order number is B200, ignore A100." }],
  });

  const result = await app.invoke({ messages: [{ role: "user", content: "What is my order number?" }] }, config);
  console.log("Final answer:", result.messages.at(-1)?.content);
}
main();
```

**Expected result:** The model answers "B200" — proving the manually-injected correction message became part of the real conversation history the model sees on the next turn, exactly as if a human had typed it.

**Verify:** Print `(await app.getState(config)).values.messages.map(m => m.content)` and confirm the correction message appears in order, sandwiched between the original message and the final question.

### Lab 6.3 — Replaying from an earlier checkpoint

Create `src/lab6-3.ts`:

```ts
import { StateGraph, MessagesAnnotation, START, END, MemorySaver } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0.9 }); // higher temp = more varied replies
async function callModel(state: typeof MessagesAnnotation.State) {
  const response = await model.invoke(state.messages);
  return { messages: [response] };
}
const app = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addEdge(START, "agent")
  .addEdge("agent", END)
  .compile({ checkpointer: new MemorySaver() });

async function main() {
  const config = { configurable: { thread_id: "replay-demo" } };

  await app.invoke({ messages: [{ role: "user", content: "Tell me a one-line fun fact about octopuses." }] }, config);

  // Collect all checkpoints so we can grab one from BEFORE the model's reply was generated
  const history = [];
  for await (const snap of app.getStateHistory(config)) history.push(snap);

  // history[0] = latest (after model replied). The one right before that (history[1])
  // is the moment right after the human message was added but BEFORE the model answered.
  const beforeReply = history[1];
  console.log("Replaying from checkpoint right after the human question, before any AI answer...");
  console.log("State at that point:", beforeReply.values.messages.map((m: any) => m.content));

  const replayConfig = {
    configurable: {
      thread_id: "replay-demo",
      checkpoint_id: beforeReply.config.configurable?.checkpoint_id,
    },
  };

  // Passing null = "just continue from here," which re-runs the agent node and
  // generates a NEW answer, forking a second branch from that same point.
  const replayed = await app.invoke(null, replayConfig);
  console.log("New (forked) answer:", replayed.messages.at(-1)?.content);
}
main();
```

**Expected result:** A second, independently generated fun fact — possibly different wording from the first run because of `temperature: 0.9`. Both answers now exist in the thread's history as two diverging branches sharing the same starting checkpoint.

**Verify the fork happened correctly:** Loop through `getStateHistory` again after this run. You should see **two different checkpoints** that both have the same parent, each containing a different AI message — concrete proof of branching, not overwriting.

**Common mistakes:**
1. Assuming `history[0]` (the newest checkpoint) is "before the reply" — it's actually the opposite, the newest checkpoint is the *most processed* one. Always print `next` and `messages` for each entry to be sure which checkpoint represents which moment, rather than guessing by index.
2. Forgetting to pass `null` as the first argument to `.invoke()` when resuming — passing `{}` or omitting the argument entirely can cause type errors, since `null` is the explicit LangGraph convention for "no new input, just continue."

### Lab 6.4 — Forking into two diverging conversation branches

Extend Lab 6.3: after creating the forked branch, send **different** follow-up questions down each branch and confirm they evolve independently.

```ts
// continuing from Lab 6.3's "replayConfig" checkpoint...
const branchA = await app.invoke(
  { messages: [{ role: "user", content: "Make that fact sillier." }] },
  replayConfig
);
console.log("Branch A:", branchA.messages.at(-1)?.content);

// Re-fetch the SAME original checkpoint again to start a second, separate branch
const branchB = await app.invoke(
  { messages: [{ role: "user", content: "Make that fact more scientific." }] },
  replayConfig
);
console.log("Branch B:", branchB.messages.at(-1)?.content);
```

**Expected result:** Branch A reads playful, Branch B reads technical — and crucially, neither branch "remembers" the other's follow-up question, because they both forked independently from the same shared ancestor checkpoint rather than from each other.

---

## 6.3 Knowledge Check — Unit 6

### Summary
Because every super-step writes an **immutable, individually addressable** checkpoint, LangGraph threads aren't just "current state" — they're a full timeline. `getState()` reads the latest snapshot. `updateState()` writes a manual correction (passed through your reducers) as a new checkpoint. `getStateHistory()` walks the entire timeline. Invoking with a specific `checkpoint_id` performs time travel: resuming execution from that exact past moment, which **forks** a new branch rather than erasing the original future.

### Key Takeaways
- A `thread_id` can contain many branches; a `checkpoint_id` pinpoints exactly one moment.
- `updateState()` respects your schema's reducers — it appends to append-only fields, it doesn't necessarily overwrite.
- Passing `null` as input to `.invoke()` means "just continue from this checkpoint," enabling clean forking.
- Time travel never deletes history — it only ever adds new branches.

### Practice Questions
1. Why does a single `.invoke()` call often produce more than one checkpoint?
2. If you call `updateState()` on a `messages` field that uses an append-only reducer, does it replace the array or add to it?
3. What does passing `checkpoint_id` (in addition to `thread_id`) into a config actually change about an `.invoke()` call?
4. Does resuming from an old checkpoint delete the checkpoints that came after it on the original timeline?

### Exercises
1. Build a small "undo button" function: `async function undoLastTurn(threadId)` that finds the checkpoint from *before* the most recent AI message and re-invokes from there with no new input, effectively regenerating the last response.
2. Write a function that prints a thread's history as an indented tree-like structure showing where branches diverged (hint: each `StateSnapshot` has a `parentConfig` field pointing to its parent checkpoint).

### Mini Project
Build a **"Compare 3 Answers" CLI tool**: ask the model one question, capture the checkpoint right before its answer, then fork from that single checkpoint three separate times with slightly different system instructions (e.g., "answer formally," "answer casually," "answer with a joke") and print all three resulting branches side by side.

---

# Unit 7 — Long-Term Memory (Store API)

## 7.1 Concept and Theory

### 7.1.1 Two very different kinds of "memory"

So far, "memory" has meant one thing: a checkpointer remembering everything that happened **inside one `thread_id`**. That's called **short-term memory** — it's scoped to a single conversation, and it includes *everything*, in full detail, in order.

But real assistants need a second kind of memory entirely. Imagine you tell a friend "I'm vegetarian" in one conversation, and a week later, in a completely unrelated conversation, they still remember that fact and recommend a vegetarian restaurant. That fact didn't belong to one specific conversation thread — it belongs to **you**, across all conversations. That's **long-term memory**, and in LangGraph it's handled by a completely separate piece of infrastructure called the **Store**.

| | Short-term memory (Checkpointer) | Long-term memory (Store) |
|---|---|---|
| Scope | One `thread_id` | Across all threads, often per-user |
| Contents | Full raw conversation history | Distilled facts, preferences, summaries |
| Access pattern | Loaded automatically by `thread_id` | Explicitly read/written by your nodes via `put`/`get`/`search` |
| Analogy | A single diary entry's full text | An index card in a permanent Rolodex about a person |

### 7.1.2 The `Store` interface

LangGraph's `Store` API gives you three core operations, all namespaced:

```ts
await store.put(namespace, key, value);
const item = await store.get(namespace, key);
const results = await store.search(namespace, { query: "some natural language query" });
```

- **`namespace`** — a tuple (e.g., `["users", "shaad-id-123"]`) that scopes where a memory lives. Think of it as a folder path — you choose how granular it is (per-user, per-organization, per-feature).
- **`key`** — a unique identifier within that namespace for one specific memory item (e.g., `"dietary_preference"`).
- **`value`** — any JSON-serializable object: `{ text: "User is vegetarian", source: "2026-06-10 conversation" }`.

`search()` is the powerful one: rather than knowing the exact `key` in advance, you give it a natural-language query, and a **semantic-search-capable** store backend (one configured with an embeddings model) returns the most relevant stored memories — even if the wording doesn't match exactly. This is what lets an agent "remember" something relevant without you writing exact-match retrieval logic.

### 7.1.3 `InMemoryStore` vs. persistent stores

Just like checkpointers, stores have a development version and production versions:

- **`InMemoryStore`** — RAM-only, lost on restart, perfect for learning and local dev. Can optionally be configured with an embeddings function so `search()` does real semantic similarity matching instead of just exact-key lookups.
- **Persistent stores** (e.g., Postgres-backed) — durable, used in real deployments where long-term memory must survive restarts and scale across many users.

### 7.1.4 Namespacing patterns

A namespace is just an array of strings you design yourself, but a few patterns are extremely common:

```ts
["users", userId]                       // one folder per user
["users", userId, "preferences"]        // sub-folder for a category of memory
["org", orgId, "users", userId]         // multi-tenant apps: org first, then user
```

The deeper/more specific your namespace, the more precisely scoped your `search()` calls become. `search(["users", "shaad-id-123"], { query: "food" })` only ever searches Shaad's own memories — it physically cannot leak another user's data, because the namespace boundary is enforced by the store itself, not by application-level filtering you'd have to remember to write correctly every time.

### 7.1.5 Three flavors of long-term memory (a useful mental model)

Borrowed loosely from how human memory researchers describe things, and genuinely useful for designing what to store:

1. **Semantic memory** — standalone facts: *"User prefers Python over Java." "User's company is based in Toronto."* These are timeless-ish facts you'd recall regardless of when they were said.
2. **Episodic memory** — memory of specific past *events* or *examples*: *"Last time the user asked for a resume rewrite, they wanted bullet points under 25 words."* Useful for few-shot-style retrieval of past successful interactions.
3. **Procedural memory** — memory of *how to do something*, often expressed as rules or instructions the system itself should follow: *"Always confirm budget before suggesting venues."* This can even be used to let an agent update its own system prompt over time based on feedback.

You don't need to rigidly categorize every memory you store, but thinking in these three buckets helps you decide *what's worth writing to the Store at all* — not everything that happens in a conversation deserves to become a permanent memory.

### 7.1.6 Where the Store plugs into a graph

The Store is attached at `.compile()` time, exactly like a checkpointer, and the two are completely independent of each other — you can have a checkpointer with no store, a store with no checkpointer, or (most commonly) both together:

```ts
const app = builder.compile({ checkpointer, store });
```

Inside a node, you access the store through the node function's second argument, `config`, which LangGraph injects automatically — specifically via `config.store` in recent LangGraph.js versions, or by accepting `store` as an explicit constructor parameter depending on the exact version you're using. The key idea regardless of exact syntax: **nodes read and write long-term memory explicitly**, unlike checkpointing, which happens automatically. You decide exactly what's worth remembering forever and what should just live and die with the conversation thread.

## 7.2 Practical Lab

### Lab 7.1 — Storing and retrieving a user preference across threads

```bash
npm install @langchain/langgraph-checkpoint  # if not already present
```

Create `src/lab7-1.ts`:

```ts
import { StateGraph, MessagesAnnotation, START, END, MemorySaver } from "@langchain/langgraph";
import { InMemoryStore } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });
const store = new InMemoryStore();
const checkpointer = new MemorySaver();

// userId is hardcoded here for clarity. In a real app this comes from your auth layer.
const USER_NAMESPACE = ["users", "shaad-id-123"];

async function callModel(state: typeof MessagesAnnotation.State) {
  const response = await model.invoke(state.messages);
  return { messages: [response] };
}

const app = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addEdge(START, "agent")
  .addEdge("agent", END)
  .compile({ checkpointer, store });

async function main() {
  // --- "Conversation 1" (thread A) ---
  const threadA = { configurable: { thread_id: "convo-A" } };
  await app.invoke({ messages: [{ role: "user", content: "I'm vegetarian, please remember that." }] }, threadA);

  // Manually write a distilled long-term fact to the Store (this is YOUR design decision,
  // not something LangGraph infers automatically from the conversation).
  await store.put(USER_NAMESPACE, "dietary_preference", {
    text: "User is vegetarian.",
    noted_on: new Date().toISOString(),
  });

  // --- "Conversation 2" (a totally separate thread_id, simulating a new session days later) ---
  const threadB = { configurable: { thread_id: "convo-B" } };
  const remembered = await store.get(USER_NAMESPACE, "dietary_preference");
  console.log("Recalled from long-term memory:", remembered?.value);

  // Inject that recalled fact into the new thread's context before answering
  const result = await app.invoke(
    {
      messages: [
        { role: "system", content: `Known fact about user: ${remembered?.value.text}` },
        { role: "user", content: "Recommend a restaurant for dinner tonight." },
      ],
    },
    threadB
  );
  console.log("Assistant (new thread):", result.messages.at(-1)?.content);
}
main();
```

**What's happening, step by step:**
1. We compile the graph with **both** a checkpointer (short-term, per-thread) and a store (long-term, per-user).
2. In thread A, after the user states a preference, we manually `store.put()` a distilled fact. Note this is a deliberate, explicit write — LangGraph does not automatically decide "this sentence is worth remembering forever." That judgment call belongs to your application logic (often: a small LLM call whose only job is "extract durable facts from this message, if any").
3. In thread B — a brand-new, otherwise-empty conversation — we `store.get()` the fact back and manually splice it into the prompt as a system message before the model answers.

**Expected result:** Despite `convo-B` having zero shared checkpoint history with `convo-A`, the restaurant recommendation should respect the vegetarian preference — proof that long-term memory crossed the thread boundary that short-term memory cannot.

**Verify:** Try omitting the `store.get()`/system-message injection step and re-running thread B's question. The recommendation should no longer reliably account for the dietary preference, confirming the memory genuinely came from the Store, not from the model "guessing."

**Common mistakes:**
1. Confusing `store.put(namespace, key, value)`'s argument order — `namespace` always comes first, then `key`, then `value`. Swapping `key` and `namespace` silently creates a malformed namespace rather than throwing an obvious error.
2. Expecting the Store to automatically inject memories into prompts. It does not — *you* decide what to retrieve and *you* decide how to splice it into the message list. The Store is a database, not a magic context-injector.
3. Using a single global namespace (e.g., just `["memories"]`) for all users — this works fine in a single-user demo but is a serious bug in any multi-user app, since `search()` and `get()` would then mix everyone's data together.

### Lab 7.2 — Semantic search over memories

```ts
import { InMemoryStore } from "@langchain/langgraph";
import { OpenAIEmbeddings } from "@langchain/openai";

const embeddings = new OpenAIEmbeddings({ model: "text-embedding-3-small" });

// Configuring InMemoryStore with an embeddings function enables real semantic search,
// not just exact key lookups.
const store = new InMemoryStore({
  index: {
    embeddings,
    dims: 1536, // matches text-embedding-3-small's output dimension
  },
});

const ns = ["users", "shaad-id-123"];

async function main() {
  await store.put(ns, "fact-1", { text: "User is vegetarian and avoids dairy." });
  await store.put(ns, "fact-2", { text: "User's preferred programming language is TypeScript." });
  await store.put(ns, "fact-3", { text: "User lives in Delhi, India and works remotely." });
  await store.put(ns, "fact-4", { text: "User dislikes overly long meetings, prefers async updates." });

  // Notice: the query below shares almost no exact words with "fact-1"'s text,
  // yet semantic search should still surface it as the top (or near-top) match.
  const results = await store.search(ns, { query: "What food restrictions does the user have?" });
  results.forEach((r) => console.log(r.key, "→", r.value.text, "(score:", r.score, ")"));
}
main();
```

**Expected result:** `fact-1` (vegetarian/dairy) should rank highest, despite the query never using the words "vegetarian" or "dairy." This is the core value of semantic search: retrieval by **meaning**, not by literal keyword overlap.

**Verify:** Run a second query, `"Does the user enjoy back-to-back calls?"`, and confirm `fact-4` ranks highest this time, even though "back-to-back calls" and "long meetings" share almost no vocabulary.

**Common mistake:** Forgetting that `dims` must match your embeddings model's actual output size. `text-embedding-3-small` is 1536; if you switch models (e.g., to `text-embedding-3-large`, which is 3072), forgetting to update `dims` causes a dimension-mismatch error at write time, not at query time, so test this immediately after switching embedding models rather than discovering it later.

### Lab 7.3 — Namespacing memories per simulated user

```ts
async function rememberFact(store: InMemoryStore, userId: string, key: string, text: string) {
  await store.put(["users", userId], key, { text });
}

async function recallFacts(store: InMemoryStore, userId: string, query: string) {
  return store.search(["users", userId], { query });
}

async function main() {
  await rememberFact(store, "user-shaad", "role", "Works as a professional resume writer.");
  await rememberFact(store, "user-alex", "role", "Works as a backend engineer.");

  const shaadResults = await recallFacts(store, "user-shaad", "What does this person do for work?");
  const alexResults = await recallFacts(store, "user-alex", "What does this person do for work?");

  console.log("Shaad's memories:", shaadResults.map((r) => r.value.text));
  console.log("Alex's memories:", alexResults.map((r) => r.value.text));
}
main();
```

**Expected result:** Each call only ever returns that specific user's data — never a mix. **Verify** by deliberately calling `recallFacts(store, "user-shaad", ...)` and confirming Alex's "backend engineer" fact never appears, no matter how broad the query.

### Lab 7.4 — A node that writes to long-term memory automatically

This lab combines everything: a node that, after every turn, asks a small LLM call "did the user just state a durable preference?" and writes it to the Store if so — without you manually calling `store.put()` from outside the graph like in Lab 7.1.

```ts
import { StateGraph, MessagesAnnotation, START, END, MemorySaver, InMemoryStore } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });
const extractorModel = model.withStructuredOutput(
  z.object({
    has_durable_fact: z.boolean(),
    fact_text: z.string().optional(),
  })
);

const store = new InMemoryStore();
const USER_ID = "shaad-id-123";

async function callModel(state: typeof MessagesAnnotation.State) {
  const response = await model.invoke(state.messages);
  return { messages: [response] };
}

// Runs AFTER the agent replies. Looks at the latest human message and decides
// whether it contains a fact worth remembering forever.
async function memoryWriter(state: typeof MessagesAnnotation.State) {
  const lastHuman = [...state.messages].reverse().find((m) => m.getType?.() === "human");
  if (!lastHuman) return {};

  const extraction = await extractorModel.invoke([
    { role: "system", content: "Decide if this message states a durable personal fact or preference worth remembering long-term. If yes, extract it as a clean standalone sentence." },
    { role: "user", content: String(lastHuman.content) },
  ]);

  if (extraction.has_durable_fact && extraction.fact_text) {
    const key = `fact-${Date.now()}`; // simple unique key per memory
    await store.put(["users", USER_ID], key, { text: extraction.fact_text });
    console.log("[memory] stored:", extraction.fact_text);
  }
  return {};
}

const app = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addNode("memory_writer", memoryWriter)
  .addEdge(START, "agent")
  .addEdge("agent", "memory_writer")
  .addEdge("memory_writer", END)
  .compile({ checkpointer: new MemorySaver(), store });

async function main() {
  const config = { configurable: { thread_id: "auto-memory-demo" } };
  await app.invoke({ messages: [{ role: "user", content: "By the way, I'm allergic to peanuts." }] }, config);
  await app.invoke({ messages: [{ role: "user", content: "What's the weather like today?" }] }, config); // should NOT trigger a memory write

  const results = await store.search(["users", USER_ID], { query: "allergies" });
  console.log("Stored memories matching 'allergies':", results.map((r) => r.value.text));
}
main();
```

**What each piece means:**
- `withStructuredOutput(zodSchema)` forces the model to respond in a guaranteed JSON shape matching your Zod schema, instead of free-text — critical for reliably parsing "should I remember this or not?" decisions in code.
- The `memory_writer` node runs as a **separate graph step** after `agent`, demonstrating that a single turn can do more than one thing: generate a reply *and* maintain long-term memory, as two distinct, individually testable nodes.
- The weather question deliberately should **not** produce a memory write, proving the extraction step is discriminating, not blindly storing everything.

**Expected result:** Console shows `[memory] stored: User is allergic to peanuts.` (or similar wording) after the first turn, and nothing after the second. The final search confirms the peanut allergy fact is retrievable.

**Common mistakes:**
1. Using the full `model` instead of `extractorModel` and trying to manually parse free text for "yes/no" — this is fragile compared to `withStructuredOutput`, which guarantees a parseable shape.
2. Forgetting to filter for the *human* message specifically — if you accidentally extract from the AI's own reply, you risk the model "remembering" things it said rather than things the user said.
3. Calling the extraction model on every single message in a long thread (not just the latest one) — this wastes API calls and money. Only look at what's new since the last memory-write pass.

---

## 7.3 Knowledge Check — Unit 7

### Summary
**Short-term memory** (Checkpointer) is automatic, thread-scoped, and stores raw conversation history. **Long-term memory** (Store) is explicit, cross-thread, and stores distilled facts you choose to persist via `put()`/`get()`/`search()`, scoped by a `namespace` array (commonly per-user). `InMemoryStore` configured with an embeddings function supports true semantic search, retrieving relevant memories by meaning rather than exact wording. A common, powerful pattern is a dedicated node that runs an extraction LLM call after each turn to decide what's worth writing to long-term memory.

### Key Takeaways
- Checkpointer = automatic, per-thread, everything. Store = manual, per-user (or however you namespace it), curated.
- `namespace` is your access-control boundary — design it deliberately per user/org to prevent data leakage.
- `search()` requires an embeddings-configured store to do real semantic matching; without one, it falls back to simpler matching.
- Not every message deserves to become a long-term memory — deciding what's "durable" is an explicit design and extraction step you own.

### Practice Questions
1. What's the fundamental scope difference between a Checkpointer and a Store?
2. Why might `store.search("food restrictions")` correctly return a memory about "vegetarian and avoids dairy" even though none of those words match exactly?
3. What real-world problem occurs if you use the same namespace, like `["memories"]`, for every user in a multi-tenant app?
4. Why use `withStructuredOutput` in the memory-writer node instead of asking the model to "answer yes or no in plain text"?

### Exercises
1. Extend Lab 7.4 so the memory-writer node also assigns a category (`"dietary"`, `"professional"`, `"preference"`, `"other"`) to each stored fact, and store that category as part of the value object.
2. Build a `forgetFact(userId, key)` helper using the Store's `delete()` method (check your installed version's API; some versions expose `store.delete(namespace, key)`), and write a small test proving a deleted memory no longer appears in `search()` results.

### Mini Project
Build a **"Returning Customer" demo**: simulate three separate conversation sessions (three different `thread_id`s) spread across a fictional week. In session 1, the user mentions their budget and travel dates for a trip. In session 2 (new thread), the assistant should recall those facts via the Store without the user repeating them, and the user adds a new preference (e.g., "I prefer window seats"). In session 3 (another new thread), confirm **all** accumulated facts from sessions 1 and 2 are available and correctly influence a final recommendation.

---

# Phase 3 Final Project — Persistent Research Companion

## Project Brief

You will build a command-line **"Research Companion"** assistant that combines everything from Units 5, 6, and 7 into one coherent application:

- **Checkpointer (Unit 5):** Every research session is a `thread_id`. Conversations persist across CLI restarts using `SqliteSaver`.
- **Time travel (Unit 6):** A `/regenerate` command lets the user discard the assistant's last answer and get a fresh one, implemented as a fork from the checkpoint right before that answer.
- **Long-term memory (Unit 7):** The assistant remembers the user's research interests and preferred answer style (e.g., "always include sources," "keep answers under 100 words") across **all** sessions, not just the current thread, via the Store.

This mirrors a real production pattern: thread-scoped conversation + cross-session personalization + the ability to undo/redo, all running on Node/TS with OpenAI as the model provider.

## Architecture Diagram (described)

```
START
  ↓
[load_long_term_context]  ← reads relevant memories from Store, injects as system message
  ↓
[agent]  ← ChatOpenAI call, sees short-term thread history + injected long-term context
  ↓
[memory_writer]  ← extracts any new durable facts from this turn, writes to Store
  ↓
END
```

## Full Implementation

### Step 1 — Install everything needed

```bash
npm install @langchain/langgraph @langchain/openai @langchain/core zod
npm install @langchain/langgraph-checkpoint-sqlite better-sqlite3
npm install readline
```

### Step 2 — `src/final-project.ts`

```ts
import * as readline from "readline";
import { StateGraph, MessagesAnnotation, START, END, InMemoryStore } from "@langchain/langgraph";
import { SqliteSaver } from "@langchain/langgraph-checkpoint-sqlite";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { z } from "zod";

// ---------- Setup: model, embeddings, persistence ----------
const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0.3 });
const extractorModel = model.withStructuredOutput(
  z.object({
    has_durable_fact: z.boolean(),
    fact_text: z.string().optional(),
  })
);
const embeddings = new OpenAIEmbeddings({ model: "text-embedding-3-small" });

const checkpointer = SqliteSaver.fromConnString("./research_companion.sqlite");
const store = new InMemoryStore({ index: { embeddings, dims: 1536 } });

// In a real app, USER_ID would come from auth. Hardcoded for this CLI demo.
const USER_ID = "shaad-id-123";
const userNamespace = ["users", USER_ID];

// ---------- Node 1: load relevant long-term memories before answering ----------
async function loadLongTermContext(state: typeof MessagesAnnotation.State) {
  const lastHuman = [...state.messages].reverse().find((m) => m.getType?.() === "human");
  if (!lastHuman) return {};

  const memories = await store.search(userNamespace, { query: String(lastHuman.content) });
  if (memories.length === 0) return {};

  const contextText = memories.map((m) => `- ${m.value.text}`).join("\n");
  return {
    messages: [
      {
        role: "system",
        content: `Relevant known facts about this user from past sessions:\n${contextText}`,
      },
    ],
  };
}

// ---------- Node 2: the actual answering agent ----------
async function agent(state: typeof MessagesAnnotation.State) {
  const response = await model.invoke(state.messages);
  return { messages: [response] };
}

// ---------- Node 3: extract and persist any new durable facts ----------
async function memoryWriter(state: typeof MessagesAnnotation.State) {
  const lastHuman = [...state.messages].reverse().find((m) => m.getType?.() === "human");
  if (!lastHuman) return {};

  const extraction = await extractorModel.invoke([
    {
      role: "system",
      content:
        "Decide if this message states a durable research interest or answer-style preference " +
        "worth remembering across future sessions (e.g. topics of interest, formatting preferences). " +
        "If yes, extract it as a clean standalone sentence.",
    },
    { role: "user", content: String(lastHuman.content) },
  ]);

  if (extraction.has_durable_fact && extraction.fact_text) {
    await store.put(userNamespace, `fact-${Date.now()}`, { text: extraction.fact_text });
    console.log(`\n[memory saved] ${extraction.fact_text}`);
  }
  return {};
}

const builder = new StateGraph(MessagesAnnotation)
  .addNode("load_long_term_context", loadLongTermContext)
  .addNode("agent", agent)
  .addNode("memory_writer", memoryWriter)
  .addEdge(START, "load_long_term_context")
  .addEdge("load_long_term_context", "agent")
  .addEdge("agent", "memory_writer")
  .addEdge("memory_writer", END);

const app = builder.compile({ checkpointer, store });

// ---------- Time travel: regenerate the last answer ----------
async function regenerateLastAnswer(threadId: string) {
  const config = { configurable: { thread_id: threadId } };
  const history: any[] = [];
  for await (const snap of app.getStateHistory(config)) history.push(snap);

  // Find the most recent checkpoint whose `next` step was "agent" (i.e., right
  // before the model generated its last reply) by scanning for the snapshot
  // immediately preceding the latest AI message.
  const target = history.find((snap, i) => {
    const msgs = snap.values.messages ?? [];
    const lastMsg = msgs.at(-1);
    return lastMsg?.getType?.() === "human"; // last message is human = agent hasn't replied yet at this point
  });

  if (!target) {
    console.log("Nothing to regenerate yet.");
    return;
  }

  const replayConfig = {
    configurable: { thread_id: threadId, checkpoint_id: target.config.configurable?.checkpoint_id },
  };
  const result = await app.invoke(null, replayConfig);
  console.log("\n[Regenerated] Assistant:", result.messages.at(-1)?.content);
}

// ---------- CLI loop ----------
async function main() {
  const threadId = process.argv[2] ?? "default-session";
  console.log(`Research Companion — session "${threadId}"`);
  console.log("Type a message, or '/regenerate' to redo the last answer, or 'exit' to quit.\n");

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const config = { configurable: { thread_id: threadId } };

  const ask = () =>
    rl.question("> ", async (input) => {
      if (input.trim() === "exit") {
        rl.close();
        return;
      }
      if (input.trim() === "/regenerate") {
        await regenerateLastAnswer(threadId);
        ask();
        return;
      }

      const result = await app.invoke({ messages: [{ role: "user", content: input }] }, config);
      console.log("Assistant:", result.messages.at(-1)?.content);
      ask();
    });

  ask();
}

main();
```

### Step 3 — Run it across multiple sessions to test everything

**Session 1 (new terminal run):**
```bash
npx ts-node src/final-project.ts research-session-1
```
```
> I'm researching the history of submarine cables. Please always include at least one source in your answers.
Assistant: ...
[memory saved] User is researching the history of submarine cables and wants sources included in answers.
> exit
```

**Session 2 — a completely new thread, simulating a different day:**
```bash
npx ts-node src/final-project.ts research-session-2
```
```
> What's a good starting topic for me today?
Assistant: Given your interest in submarine cable history... [includes a source, unprompted]
```

**Verify:** the assistant references the submarine-cable topic and includes a source **without you repeating that preference**, proving cross-session long-term memory worked (Unit 7).

**Now test time travel:**
```
> Tell me a fact about the first transatlantic cable.
Assistant: <some answer>
> /regenerate
[Regenerated] Assistant: <a different answer to the same underlying question>
```

**Verify:** the regenerated answer is generated fresh (not identical wording), and `getStateHistory` for this thread now shows two divergent branches from the same shared checkpoint (Unit 6).

**Now test durability:**
Close the terminal entirely, then re-run with `research-session-2` again. Ask a follow-up referencing earlier context — it should still work because `SqliteSaver` persisted it to `research_companion.sqlite` on disk (Unit 5).

## Stretch Goals (optional, push your understanding further)

1. Add a `/forget <topic>` command that searches the Store for matching memories and deletes them.
2. Add a second extraction pass that categorizes memories (`interest`, `style_preference`, `fact`) and only injects `style_preference` memories into *every* turn's system message, while `interest` memories are only injected when `search()` finds them relevant to the current question.
3. Swap `SqliteSaver` for `PostgresSaver` and confirm the exact same application code works unmodified against a real Postgres database — this is the "swap one line for production" guarantee from Unit 5 in action.

---

# Phase 3 Master Cheat Sheet

```ts
// ── Checkpointer setup ──────────────────────────────────────
import { MemorySaver } from "@langchain/langgraph";                          // dev only, RAM
import { SqliteSaver } from "@langchain/langgraph-checkpoint-sqlite";        // disk-durable
// import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres"; // production

const checkpointer = new MemorySaver();
// const checkpointer = SqliteSaver.fromConnString("./db.sqlite");

const app = builder.compile({ checkpointer });
const config = { configurable: { thread_id: "some-id" } }; // REQUIRED on every call

// ── State inspection & time travel ──────────────────────────
await app.getState(config);                       // current snapshot
await app.updateState(config, { ...values });      // manual patch, goes through reducers
for await (const snap of app.getStateHistory(config)) { /* full timeline, newest first */ }

const replayConfig = { configurable: { thread_id: "x", checkpoint_id: "..." } };
await app.invoke(null, replayConfig);              // resume/fork from a past moment

// ── Long-term memory (Store) ────────────────────────────────
import { InMemoryStore } from "@langchain/langgraph";
const store = new InMemoryStore({ index: { embeddings, dims: 1536 } }); // semantic search

await store.put(["users", userId], "key", { text: "..." });
await store.get(["users", userId], "key");
await store.search(["users", userId], { query: "natural language question" });

const app = builder.compile({ checkpointer, store }); // both can be combined freely
```

| Concept | One-line reminder |
|---|---|
| Checkpointer | Auto-saves full state, per `thread_id`, after every super-step |
| `thread_id` | Isolates one conversation from another on the same graph |
| `getState` | Read the latest snapshot |
| `updateState` | Manually patch state (through reducers), creates a new checkpoint |
| `getStateHistory` | Walk every checkpoint ever saved for a thread |
| Time travel | Invoke with an old `checkpoint_id` → forks a new branch, never deletes the old one |
| Store | Manual, cross-thread, curated long-term memory, namespaced (usually per-user) |
| `search()` | Semantic retrieval by meaning, requires an embeddings-configured store |

**You've completed Phase 3.** You can now build agents that remember conversations durably, inspect and rewind their own history, and carry meaningful facts about a user across completely separate sessions — the three pillars every production-grade conversational system needs before tackling Phase 4 (Human-in-the-Loop), which builds directly on the `interrupt()`/checkpoint mechanics you just learned.
