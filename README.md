# Handoff

**A shared workspace where your agent is a visible collaborator, not a black box.**

Built for [The WebMCP Challenge](https://webmcp.devpost.com). Ten tools on `document.modelContext`, no backend, no API keys.

**Live:** https://handoff-webmcp.netlify.app · **Demo video:** _(YouTube link, added at submission)_ · **License:** MIT

---

Handoff is a dense triage table: 187 pieces of raw customer feedback for a fictional invoicing SaaS, each needing an area, a severity and a status. ChatGPT sits in the table with you as a second collaborator. It has a named cursor you can see move, it changes the view you are both looking at, it proposes edits as inline diffs that you accept or reject, and it learns from what you rejected. While you are typing in a cell, its write tools stop existing.

## Try it

Handoff needs a browser with WebMCP:

- **ChatGPT desktop app** (macOS or Windows) with its built-in browser. Use GPT-5.6 Sol or Terra; per OpenAI's docs, Luna has site tools disabled.
- **Chrome 149+** with `chrome://flags/#enable-webmcp-testing` set to Enabled, then relaunch.

Open the live URL, then ask:

1. *"What's in this workspace right now?"*
2. *"Show me everything about billing and put your cursor on it."*
3. *"Some of these look like the same bug reported twice. Point them out."*
4. *"Assign a severity to all the untagged billing rows."* — then accept most of the diffs and reject a few.
5. *"How did I do?"*
6. *"Tag the rest of the untagged rows for me, there are a lot."* — a control request dialog opens.
7. Click into any cell and start typing. Watch the **Live tools** panel: the write tools disappear.

Without WebMCP the page still loads and you can edit by hand; a banner explains the agent seat is empty.

## The four principles

| | |
|---|---|
| **Presence over prose** | The agent does not narrate what it did. You watch it do it: a cursor, a highlight, a reason in a bubble. |
| **Propose, don't mutate** | Every destructive write becomes a proposal rendered as a diff inside the cell. You accept or reject, per edit or in bulk. |
| **One wheel, one driver** | When you edit, the agent's write tools are unregistered at the protocol level. If it tries anyway, the page refuses and says why. |
| **Everything is logged** | Every tool call, result, refusal, registration and withdrawal lands in a timestamped activity log with its arguments. |

## Tools

| Tool | Registered when | Does | Annotations |
|---|---|---|---|
| `get_workspace_state` | always | Row counts, active view, both selections, pending proposals, who holds control | `readOnlyHint` |
| `get_column_schema` | always | Columns, types, editable flags, allowed enum values and guidance (e.g. what P0 means) | `readOnlyHint` |
| `read_rows` | always | Filtered, paginated rows (default 10, max 50) with `total`, `hasMore`, `nextOffset` | `readOnlyHint`, **`untrustedContentHint`** |
| `focus_cells` | always | Moves the agent cursor to rows (and optionally a column), highlights them, scrolls into view, shows a reason | |
| `set_view` | always | Applies a filter, sort or grouping to the table the human is looking at | |
| `propose_edits` | control ≠ human | Batch of up to 50 cell edits, rendered as inline diffs, applied only when accepted. Strict validation with descriptive errors | |
| `annotate` | control ≠ human | Appends a note to one row immediately. Additive, so no review needed | |
| `request_control` | control ≠ human, or a request is pending | Elicitation: opens a dialog and resolves only on the human's click (or a 60 s timeout) | |
| `get_proposal_status` | at least one proposal exists | Accepted / rejected / pending counts plus samples of what was rejected, with the row text | `readOnlyHint` |
| `hand_back` | control = agent | Returns control and records a summary | |

`read_rows` carries `untrustedContentHint: true` because it returns verbatim customer text written by third parties: exactly the prompt-injection surface that flag exists to mark. Its description says the same thing in words.

Tool results are plain JSON objects. The spec serialises whatever `execute` resolves with, so an object reaches the agent as clean JSON with an `ok` flag, a one-line `summary`, and structured data. Failures return `ok: false` with an `error` the model can act on: `"Critical" is not a valid severity. Allowed: P0, P1, P2, P3.`

## How the control lock works

There is no `unregisterTool`. A tool is withdrawn by aborting the `AbortSignal` it was registered with:

```ts
const ctrl = new AbortController();
await document.modelContext.registerTool(tool, { signal: ctrl.signal });
// later
ctrl.abort(); // gone from getTools(), toolchange fires
```

`src/webmcp/registry.ts` is a reconciler. It computes the toolset the application state calls for, diffs it against what is registered, aborts what should go and registers what is missing:

```
always                 get_workspace_state, get_column_schema, read_rows, focus_cells, set_view
control !== 'human'    + propose_edits, annotate, request_control
proposals.length > 0   + get_proposal_status
control === 'agent'    + hand_back
```

`control` becomes `human` the moment a cell enters edit mode and returns to `shared` two seconds after it closes. The reconciler subscribes to the *shape* of the state (`control`, "any proposals", "request pending"), never to the data, so tools are registered once and their `execute` closures read fresh state through `useStore.getState()`.

Two details that matter in practice:

- **In-flight tools are never aborted.** Before Chrome 153, aborting a tool mid-execution dropped its result. The registry counts running executions and defers withdrawal until the call returns, so `hand_back` can withdraw itself cleanly.
- **Defence in depth.** Every write tool also checks `control === 'human'` at the top of `execute`. That covers the race between the state change and the abort, and it produces the "Blocked — you were editing" line in the log.

**On static vs dynamic registration.** Chrome's best-practices guidance recommends static registration by default, for simplicity. Handoff registers dynamically on purpose: which tools exist *is* the product behaviour. This is the case the guidance itself describes as legitimate ("register a tool when it is useful in a given page state, remove it when it is not"), applied to authority rather than navigation.

The **Live tools** panel is not rendered from our state. It calls `getTools()` and re-reads on every `toolchange` event, so what you see on screen is the browser's view of our registrations.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Browser (ChatGPT desktop, or Chrome 149+ with the flag)      │
│                                                                │
│   ┌────────────┐            ┌───────────────────────────┐     │
│   │  The agent │ ─ calls ─► │  document.modelContext     │     │
│   │  (ChatGPT) │ ◄─ JSON ── │   .registerTool / getTools │     │
│   └────────────┘            └─────────────┬──────────────┘     │
│                                           │ execute()          │
│                             ┌─────────────▼──────────────┐     │
│                             │  src/webmcp/registry.ts     │     │
│                             │  reconciler + AbortControllers │  │
│                             └─────────────┬──────────────┘     │
│                                           │ useStore.getState()│
│                             ┌─────────────▼──────────────┐     │
│                             │  Zustand store (rows, view, │     │
│                             │  control, proposals, log)   │     │
│                             └─────────────┬──────────────┘     │
│                                           │                    │
│                             ┌─────────────▼──────────────┐     │
│                             │  React: table, cursor,      │     │
│                             │  diffs, log, live tools     │     │
│                             └────────────────────────────┘     │
└──────────────────────────────────────────────────────────────┘
                 No server. No keys. localStorage only.
```

```
src/
├── data/
│   ├── schema.ts          column vocabulary — what get_column_schema teaches the agent
│   └── feedback.json      187 hand-written rows (scripts/gen-feedback.mjs)
├── store/useStore.ts      Zustand: rows, view, control, proposals, log, persistence
├── webmcp/
│   ├── registry.ts        syncTools() reconciler, per-tool AbortControllers, logging wrapper
│   ├── support.ts         feature detection, ok()/fail() result helpers
│   └── tools/             read.ts · presence.ts · write.ts · control.ts
├── hooks/useLiveTools.ts  getTools() + toolchange → the Live tools panel
└── components/            DataTable, Cell (inline diffs), AgentCursor, ProposalBar,
                           ControlModal, ActivityLog, LiveToolPanel, RowInspector, …
```

**The closure rule.** A tool's `execute` is created once, when the tool is registered. It must never read React state or anything captured at registration time. Every tool here starts with `const s = useStore.getState()` and writes through store actions.

## Stack

Vite 8 · React 19 · TypeScript · Tailwind 4 · Zustand 5 · `webmcp-types` for the `document.modelContext` typings · Geist Sans and Geist Mono. Hosted on Netlify. No backend, no database, no API keys. Rows, proposals and the log persist in `localStorage`; **Reset workspace** clears them.

```bash
npm install
npm run dev        # http://localhost:5173, open in Chrome with the WebMCP flag
npm run build
node scripts/gen-feedback.mjs   # regenerate src/data/feedback.json
```

## Verification

**In the ChatGPT desktop app** (GPT-5.6 Terra, built-in browser), driving the live URL end to end:

- The page registers eight tools at boot; ChatGPT lists them from `getTools()`, and the Live tools panel shows the same list because the browser implements `getTools()` and `toolchange`.
- *"Show me everything about billing and put your cursor on it"* → `set_view`, `read_rows`, `focus_cells` with the reason "reviewing all Billing feedback". The table re-filters and the cursor lands on the rows.
- *"Propose an area and a severity for the duplicate-charge reports"* → `propose_edits` with four edits, rendered as diffs. One rejected, three accepted by hand.
- *"How did I do?"* → `get_proposal_status`. ChatGPT reported the one rejection and offered a reading of why ("an unverified social post; you prefer to leave the product area unset until it's corroborated").
- *"Ask me for direct control first"* → `request_control` opened the dialog; the tool call waited 17 seconds for the click, resolved with `control: agent`, and `hand_back` appeared in the panel.
- Clicking into a cell while ChatGPT held nothing withdrew `propose_edits`, `annotate` and `request_control` from the panel within a second, struck through, then restored them two seconds after the editor closed.

**In Chrome 152** (`--enable-experimental-web-platform-features`), the full scenario runs headless through `document.modelContext.executeTool()`: strict validation errors, per-edit rejection reaching `get_proposal_status`, tool withdrawal on edit, the elicitation timeout path, `hand_back` withdrawing itself, and state surviving a reload.

**Lighthouse** (agentic browsing audits, run against the live URL): "WebMCP tools registered" lists the eight boot-time tools with their schemas, "WebMCP schemas are valid" passes, accessibility 100.

![Lighthouse: Registered WebMCP tools](docs/lighthouse-webmcp-tools.png)

## License

MIT © 2026 Oren Chriqui
