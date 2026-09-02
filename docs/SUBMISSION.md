# Devpost submission text

**Project name:** Handoff
**Tagline:** A shared workspace where your agent is a visible collaborator, not a black box.
**Live URL:** https://handoff-webmcp.netlify.app
**Repo:** https://github.com/chessoren/handoff (MIT)
**Video:** _(YouTube link)_

## Why this use case is a strong fit for WebMCP

Collaboration requires co-presence, and co-presence requires the agent and the human to share the same live state. An external MCP server cannot move a cursor inside my viewport, re-sort the table I am looking at, or highlight the row I am about to edit. WebMCP can, because the tools live in the page I am already looking at, in the session I am already authenticated in, with zero backend. Triage is the sharpest version of this: the work is judgement-heavy, high-volume, and nobody wants to delegate it blindly. That is exactly the shape of task that needs a visible collaborator rather than an autonomous one.

## How it creates a better user experience

The agent becomes observable and interruptible instead of a black box that returns a wall of text. You stop reading what the AI claims it did and start watching what it does, while you keep working alongside it. Destructive writes arrive as reviewable diffs in the cells themselves, so accepting is one click and rejecting costs nothing. Because rejections feed back to the agent through `get_proposal_status`, correcting it once changes its next batch. And when you take the wheel, you do not have to tell it to stop: its write tools are gone until you are done.

## What people and agents can do together that was difficult before

Genuine simultaneous editing: the human edits row 12 while the agent inspects rows 40 to 60 in the same document, without conflict, each seeing the other's selection. And the inverse of the usual guardrail: the application withdraws authority from the agent at the protocol level rather than the prompt level. When the human edits, the write tools are unregistered via `AbortController`, and the agent can observe that its own capability set shrank. We know of no other pattern on the web where a site revokes an agent's abilities mid-session as a first-class product behaviour.

## How we implemented WebMCP

Ten tools registered on `document.modelContext`. Five are always available (state, schema, paginated read, cursor, view). Five are gated on application state: `propose_edits`, `annotate` and `request_control` disappear while the human holds edit control, `get_proposal_status` appears once a proposal exists, `hand_back` only while the agent holds control. A single reconciler, `syncTools()`, diffs the desired toolset against the registered one and aborts or registers accordingly, subscribing to the shape of the state rather than its data so tools register once and read fresh state inside `execute`. In-flight executions are never aborted, so a tool can withdraw itself after returning. `request_control` implements elicitation by returning a promise that resolves only on a human click, with a 60-second timeout. `read_rows` carries `untrustedContentHint: true` because it returns third-party text, and is capped at 50 rows with pagination. Every result is a JSON object with `ok`, a one-line `summary`, and structured data; invalid enum values come back as descriptive errors the model can self-correct from. The live tool panel is driven by `getTools()` and the `toolchange` event, so what you see on screen is the browser's view of our registrations, not our own state. Every call, result, refusal, registration and withdrawal is logged on screen. No backend, no API keys, no OAuth.

---

# Video script (2 min 45, recorded in the ChatGPT desktop browser)

**0:00–0:12** — the table scrolls
> This is 187 pieces of raw customer feedback. Somebody has to tag every one of them. Today you either do it by hand, or you paste it into a chatbot and get back a wall of text you can't trust and can't edit.

**0:12–0:22**
> Handoff does neither. Your agent works inside the table, next to you, with a cursor you can see. Watch.

**0:22–1:00** — the cursor moves
> I ask it to find everything about billing. It calls focus_cells, and it moves. It isn't describing rows to me, it's pointing at them. And while it works, I'm still editing over here.

**1:00–1:40** — proposals
> Now I ask for severities. It doesn't write to my data. It calls propose_edits: proposals rendered as diffs in the cells themselves. I accept most. I reject three.
> And it notices. It calls get_proposal_status, sees what I turned down, and adjusts the next batch. That's a collaborator, not a script.

**1:40–2:05** — the refusal
> Here's the part I care about most. I click into a cell and start typing.
> *(the Live tools panel shrinks)*
> The write tools unregister. That list is coming from getTools, live from the browser. The agent tries anyway, and the page refuses. Not because I prompted it not to. Because the tool surface closed.

**2:05–2:35** — implementation
> Ten tools on document.modelContext. Five always on, five gated on application state through AbortController signals. The schema tool teaches the agent our exact vocabulary, so it never invents a severity. Rows carry untrustedContentHint, because customer feedback is third-party text and the agent should treat it that way. Every call is logged, right here. No backend, no API keys, no OAuth. It runs in the user's own session.

**2:35–2:45**
> Every collaborative tool we ever built assumed the other seat was a human. Handoff is what a workspace looks like when it isn't.
