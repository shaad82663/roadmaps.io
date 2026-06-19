# Prerequisites

Before starting this roadmap, it is recommended to have a basic understanding of:

## Required

### TypeScript

- Variables and data types
- Functions
- Classes and interfaces
- Generics
- Async/Await
- Modules and imports

### Node.js

- npm
- Package management
- Environment variables
- File system basics
- HTTP APIs
- Working with external libraries

---

## Optional: Python Learners

Although this roadmap uses **TypeScript LangChain examples**, you can still follow the entire learning path using **Python LangChain**.

The core concepts remain the same:

- Models
- Prompts
- Runnables
- Chains
- Memory
- RAG
- Agents

Only the syntax and library APIs differ slightly between TypeScript and Python implementations.

If you prefer Python:

- Follow the same roadmap and learning order.
- Convert TypeScript examples to Python using an AI assistant (ChatGPT, Claude, Gemini, etc.).
- Focus on understanding the concepts and architecture rather than memorizing syntax.

> **Recommendation:** Learn the concepts first. Programming language syntax is easy to translate, but understanding how LangChain components work together is the real skill.

# LangChain Learning Phases

## Phase 1: Foundation (U00–U03)

The building blocks that every LangChain application relies on.

### Topics

- Models
- Prompts
- Output Parsers
- Structured Output

**Goal:** Learn how to communicate with LLMs and control their outputs.

---

## Phase 2: Core (U04–U06)

The orchestration layer that connects all LangChain components together.

### Topics

- Runnables
- LCEL (LangChain Expression Language)
- Chains
- Memory

**Recommended Learning Order:**

1. Runnables & LCEL
2. Chains
3. Memory

**Why this order?**

Runnables are the foundation of modern LangChain. Chains are built using Runnables, and Memory is commonly integrated into Chains and Agent workflows.

---

## Phase 3: RAG Pipeline (U07–U11)

A progressive journey through Retrieval-Augmented Generation (RAG), ending with a complete end-to-end implementation.

### Topics

#### U07 – Document Loaders

- PDF Loading
- Web Loading
- Database Loading

#### U08 – Text Splitters

- Chunking Strategies
- Recursive Splitters
- Semantic Splitting

#### U09 – Embeddings & Vector Stores

- Embedding Models
- Vector Databases
- Similarity Search

#### U10 – Retrievers

- Vector Store Retrievers
- MMR Retriever
- Multi-Query Retriever
- Contextual Compression Retriever

#### U11 – End-to-End RAG Project

- Ingestion Pipeline
- Retrieval Pipeline
- Answer Generation Pipeline

**Goal:** Build production-ready retrieval systems grounded in external knowledge.

---

## Phase 4: Agents (U12)

Agents are treated as a separate phase because they introduce a fundamentally different execution model.

### Topics

- Tools
- Tool Calling
- ReAct Pattern
- Agent Executors
- Multi-Step Reasoning
- Decision Making

**Difference from Chains**

Chains follow predefined workflows, whereas Agents dynamically decide what actions to take at runtime.

---

## Phase 5: Production (U13–U14)

Advanced topics focused on monitoring, debugging, and user experience.

### Topics

#### U13 – Observability

- LangSmith
- Tracing
- Debugging
- Evaluation

#### U14 – Streaming & Production Patterns

- Token Streaming
- Event Streaming
- Production Deployment Patterns

**Recommendation:** Revisit this phase after building a few real-world applications, as the concepts become much more meaningful with practical experience.
