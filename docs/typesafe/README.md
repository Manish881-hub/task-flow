# TypeSafe API — Compressed Handbook

Source: https://docs.typesafe.ai (index: `/llms.txt`). Read 2026-09-22. Full text lives
upstream; this file keeps everything needed to build against the API efficiently.
Status semantics: Jev = flagship System One model. Current: `jev-1.13.0`.

## 1. Mental model (read this first)

- LLMs generate text for humans. **Jev makes typed decisions for code**: send `state` +
  typed `questions`, get structured answers back. No text generation, no parsing.
- One request = one `state` evaluated against N questions **in parallel, in isolation**.
  Extra questions barely change latency; extra tokens only. Batch aggressively.
- Code owns control flow, side effects, deterministic rules. Jev only answers narrow,
  atomic judgments (gut-checks a knowledgeable person makes in seconds).
- Broad question → decompose into one question per factor, combine in code with weights
  you control. Change coefficients, not prompts, when priorities shift.
- Jev is NOT a chat/coding LLM. No replacement for the model behind a coding agent.
  Use the [agent skill](https://docs.typesafe.ai/agent-skill) so agents write correct
  integrations (`claude plugin marketplace add typesafe-ai/skills` +
  `claude plugin install typesafe@typesafe-ai`, or
  `npx skills add typesafe-ai/skills --skill typesafe-ai`).

## 2. Calling the API

```
POST https://api.typesafe.ai/v1/systemone
Authorization: Bearer $TYPESAFE_API_KEY
Content-Type: application/json
{ "state": <string|object|array>, "model": "jev-latest", "questions": { "<id>": <Question> } }
```

- `GET https://api.typesafe.ai/v1/models` lists usable model names (aliases).
- Playground for experiments: https://console.typesafe.ai/playground . API keys:
  https://console.typesafe.ai/keys
- Response: `{ "model": "jev-1.13.0", "answers": { "<id>": <Answer> },
  "usage": { "input_tokens": n, "output_tokens": n } }`.
  Output tokens are **free**; billing is per **input** token only.
- Question IDs are your keys (not sent to the model). Write the full question in
  `instructions` even if the ID looks self-explanatory.
- Errors: `401` bad key · `422` body validation (details name the field) ·
  `429` rate limit · `529` overloaded → exponential backoff. SDKs retry by default and
  honor `Retry-After`.

## 3. State

- `state`: string (single text), object (named fields/records — preferred), or array
  (sequence of messages). Values inside objects may be `null`; state itself not `None`.
- **Text only.** No image/audio/video. English is the primary training language; other
  languages incl. CJK work but with lower accuracy — watch confidence.
- Put related material together (message + record + policy) when the decision compares
  parts. Reference nested fields with backticked dot-and-index paths:
  `` `ticket.messages[0].text` ``, `` `commerce.orders[0].charges` ``.
- Keep state minimal: accuracy drops as irrelevant detail grows (context rot). Filter in
  code first; send only what the questions need. A relevance Noul can pre-filter.
- State is data, not instructions: Jev does not treat it as hostile by default —
  injected instructions in state can steer answers. Be explicit in criteria; test edges.

## 4. The three primitives

| Type | Asks | Returns |
|---|---|---|
| `choice` | Which of these options? (unordered set) | `choice`, `probabilities{}`, `confidence` |
| `score` | Which level on my ordered rubric? | `score` (float, may fall between levels), `legend`, `probabilities{}`, `confidence` |
| `noul` | Is this statement true? | `noul` 0–1 (P(yes)). **No separate confidence** |

Pick by the shape your code acts on: Choice → code paths; Score → thresholds/ranking;
Noul → `if`. Yes/no with unclear "strong" → prefer Score with defined levels.
`score = Σ level × P(level)`. Same score can come from different distributions — always
read `probabilities` + `confidence` alongside it.

### Choice

- `criteria`: map option-name → description (string/object/array/`null`). Max **255
  options**; reliable to ~240. Always add `other` / `none of the above` when coverage
  is uncertain. Option names + descriptions both go to the model.
- When two options blur: use objects `{what, not_for, examples}` with identical field
  names on every option. Examples must look like real inputs.
- Deep taxonomy: one Choice per level, walk the tree in code; option values can carry
  child subtrees so the model sees what lives under a branch. Beam search (top-K paths)
  beats greedy when probabilities are close.
- `null` descriptions are fine when names are self-evident (`{calm: null, ...}`).

### Score

- `criteria`: ordered array, low→high, 2–10 levels. Level number = array index from 0.
  The model never sees numbers/neighbors — "worse than previous" is meaningless to it.
- Describe **situations, not degrees** ("Broken feature, workaround exists" beats
  "Moderately severe"). Numbers-only levels fail (0.55/conf 0.33 vs 0.0/conf 1.0).
- One dimension per question. Different scale lengths → normalize
  (`score / (len(criteria)-1)`) before weighting.
- Structured levels: `{what/summary, signals/examples}` objects, same fields each level.
  Matching examples concentrate probability (conf 0.35 → 0.96 in docs example).
- Top-of-scale rare extremes needing distinct action deserve their own level.

### Noul

- `criteria` optional: `{true: <desc>, false: <desc>}` (string or structured
  `{what, examples}`). Try with/without; keep what tests better.
- One yes/no per question. Phrase so HIGH = yes ("contains personal data", not "free
  of…"). Statements work too ("The customer requests a refund").
- Threshold in code: 0.5 when both errors cost the same; raise when false-yes is
  expensive (refund, page someone); lower when missing true-yes is expensive (safety).
  Middle band → human review.
- `noul` is P(yes), NOT a degree scale. Don't interpolate "medium" from 0.5.
- Checklists = many Nouls in one request; code interprets the combination.

### Structured instructions/criteria (all three types)

`instructions` and criteria entries accept string | object | array | `null`. Use objects
when: question has multiple parts, part comes from code (DB row → own field, refer by
backticked name), or several questions share wording. Field names are yours (model sees
them): e.g. `{question, focus, inspect/compare, potential_duplicate, field,
extracted_value}`. Same-field-names-everywhere for comparable options/levels.

## 5. Confidence (Choice & Score only)

- `confidence` 0–1 is computed from the spread of `probabilities` (peaked = high, flat
  = low). You're never locked in — full distributions are returned, use your own
  statistic if it fits better.
- Meaning: honest "I don't know". Low conf ≈ options overlap / multi-dimensional
  question / state lacks evidence. High conf ≠ guaranteed correct (calibration is over
  groups, not single answers).
- Three-path pattern: high → act · medium → confirm/flag/gather · low → human/fallback.
  Thresholds scale with stakes (reads ~0.5–0.6 floor; destructive ops 0.85–0.9+). Tune
  on your own data starting conservative.
- Noul has no confidence (binary distribution is fully described by the value); use the
  value's distance from 0.5 / dual thresholds (`NO=0.2 / YES=0.8`) the same way.

## 6. Composition patterns

1. **Speculative fan-out** (cost+speed): ask everything the code might need, incl.
   branch-conditional questions; ignore irrelevant answers. 13-question batching ≈
   10–12× cheaper/faster than 13 calls, identical answers.
2. **Confidence-gated routing** (reliability): answer = what, confidence = whether to
   act. Per-action thresholds; global uncertainty floor.
3. **Composite scoring** (cost+reliability): atomic Scores → normalize → weighted sum
   in code. Tune weights when rankings disagree with the team.
4. **Intent routing** (cost+speed): Choice classifies → deterministic code / specialist
   LLM / human. Complexity Score decides LLM-vs-human on the complaint path.
- Second request only when code genuinely can't proceed without the first answer (fetch
  more state, build new options, classify newly-created units). Otherwise ask together.

## 7. Python SDK (`typesafe-sdk`, py ≥3.10, `pip install typesafe-sdk`)

```python
from typesafe_sdk import Choice, Noul, NoulCriteria, Score, TypeSafeClient
with TypeSafeClient() as client:                     # reads TYPESAFE_API_KEY, default jev-latest
    r = client.system_one(state={...}, questions={
        "refund": Noul(instructions="...", criteria=NoulCriteria(true="...", false="...")),
        "dept":  Choice(instructions="...", criteria={"a": "desc", "b": None}),
        "sev":   Score(instructions="...", criteria=["low0", "mid1", "high2"]),
    })
r.answers["dept"].choice / .confidence / .probabilities   # also r.choices["dept"], r.nouls[…], r.scores[…]
r.model, r.usage.input_tokens, r.request_id               # x-typesafe-request-id header
```

- `AsyncTypeSafeClient` mirrors everything with `await`. Both are context managers
  (`close()` releases HTTP resources; custom `transport`/`http_client` supported).
- Client opts (all kw-only, explicit > env): `api_key` (`TYPESAFE_API_KEY`),
  `model` (`TYPESAFE_DEFAULT_MODEL`, default `jev-latest`), `base_url`
  (`TYPESAFE_BASE_URL`, default `https://api.typesafe.ai`), `retry`, `timeout`
  (default 10s), `headers`. Key hygiene: stripped, rejects empty/internal-whitespace/
  control/non-ASCII; explicit empty never falls back to env.
- Per-call overrides on `system_one(...)`: `model, retry, timeout, extra_headers,
  extra_body` (shallow-merge, last-write-wins), `response_model` (Pydantic type for
  typed answers, e.g. `class R(SystemOneResponse): billing: NoulAnswer`).
- `client.models.list()` → `ListModelsResponse.models[]` (`name, description,
  release_date`).
- `RetryPolicy` defaults: `max_retries=2`, backoff 0.5s×2 cap 5s jitter 0.25, retries
  408/429/5xx + connection/timeout errors, honors `Retry-After`, total budget 30s.
  `RetryPolicy(max_retries=0)` disables. Invalid key raises `TypeSafeError` at
  construction (before any request).
- Exceptions: `TypeSafeError` ← `TypeSafeAPIError` (`.status/.body/.headers/.endpoint/
  .request_id`) with subclasses BadRequest(400), Authentication(401),
  PermissionDenied(403), NotFound(404), UnprocessableEntity(422), RateLimit(429,
  `.retry_after_ms`), InternalServer(5xx); `TypeSafeAPIConnectionError` (+
  `TypeSafeAPITimeoutError(.timeout)`); `TypeSafeAPIResponseValidationError(.field_path)`.
- Logging: `typesafe_sdk` logger or `TYPESAFE_LOG_LEVEL=debug|info|warning|error|off`
  (set before import). Secrets redacted from headers; **bodies are NOT redacted**.
- Forward-compat: raw dict questions (with `type` key), `extra_body` for new fields,
  unknown answer kinds warn+skip (inspect via `result.raw_http_response.json()`),
  unknown response fields ignored. Prefer upgrading the SDK over unknown fields.
- Gateways: OpenRouter (`base_url=https://openrouter.ai/api`, model `~typesafe/…`) and
  Vercel AI Gateway (`…/typesafe`, model `typesafe-ai/jev`) both work if they follow the
  OpenAPI spec (https://api.typesafe.ai/docs/).

## 8. JavaScript SDK (`@typesafe-ai/sdk`, Node ≥20, `npm install @typesafe-ai/sdk`)

```ts
import { TypeSafeClient, choice, noul, score } from "@typesafe-ai/sdk";
const client = new TypeSafeClient();              // TYPESAFE_API_KEY; ESM+CJS+types
const { answers } = await client.systemOne({ state: {...}, questions: {
  category: choice("What is this ticket about?", { billing: null, technical: null, other: null }),
}});
answers.category.choice;                          // fully inferred types
```

- `new TypeSafeClient(config?)`; `systemOne<Q>({state, questions, model?}, {timeout(ms),
  retry, headers, signal?}?)` → `APIPromise<SystemOneResult<Q>>` (cancellable via
  `AbortSignal` → `APIUserAbortError`). Helpers: `choice(instructions, criteria)`,
  `noul(…)`, `score(…)`. `client.models.list()`.
- Errors mirror Python: `TypeSafeError` ← `APIError` (+ `APIConnectionError`,
  `APITimeoutError`, `AuthenticationError`, `BadRequestError`, `PermissionDeniedError`,
  `NotFoundError`, `UnprocessableEntityError`, `RateLimitError`, `InternalServerError`).
  Config: `TYPESAFE_API_KEY/BASE_URL/DEFAULT_MODEL/LOG_LEVEL`, `defaultModel`,
  `baseURL`, `defaultHeaders`, custom `fetch`, `Logger`.

## 9. Model, limits, pricing

- `jev-1.13.0`; aliases `jev-latest` (stable default), `jev-preview` (may run ahead).
  Pin versioned IDs once thresholds are tuned — aliases move. Response `model` field
  tells you what actually answered; log it.
- **$0.042 / M input tokens** (output free). Limits (dynamic, can change without
  notice): 250k tokens/s, 1200 req/min. Context 64k/request; **state + longest single
  question ≤ 32k**. No fine-tuning/LoRA — shape behavior via state + instructions +
  criteria. Not trained on customer data (ZDR on enterprise; see Legal).
- Accuracy falls as state grows with irrelevant content — the 32k budget is a ceiling,
  not a target.

## 10. Jev-1.13 jagged edges (design around these)

1. **Literal**: answers what's written, not meant. State exact conditions; missing-half
   of an explanation belongs in the instruction; split ambiguity into two questions.
2. **No math/counting**: count/classify-per-item in code and aggregate; convert units
   (hex→names) before sending; never interpolate exact magnitudes from Score.
3. **Dates as text**: extract parts via Choice over closed sets (+ explicit "not
   stated"), assemble/compare in code.
4. **Indirection**: no double negatives, no property-of-property hops; name state parts.
5. **No structural invariants**: Noul(p) vs Choice-P(yes) vs 1−Noul(not-p) are NOT
   interchangeable — tune thresholds per phrasing; Choice is relative, Nouls absolute.
6. **No generation**: bounded answer spaces → Choice over candidates (pre-extract via
   regex/LLM, let Jev pick). Never chain choices to write text.
7. Keep `instructions`↔`criteria` aligned (true=yes); test adversarial inputs pre-deploy.

## 11. TaskFlow integration sketches (where Jev fits this repo)

Backend owns the calls (`typesafe-sdk` in `backend/requirements.txt`,
`TYPESAFE_API_KEY` via env + `.env.example`, one shared client, never from the
browser). Suggested first slices, each one request:

- **Triage on task create/update**: state `{title, description, comments, project}` →
  Choice `category` (bug/feature/chore/…), Score `priority` (rubric 0–3), Noul
  `needs_clarification`, Noul `is_duplicate_of_<id>` per candidate (structured
  instructions). Composite `0.6·severity + 0.3·frustration + 0.1·report_quality`
  → suggested priority; low confidence → leave unset for a human.
- **Comment moderation**: Noul battery (toxicity, spam, PII, credentials) + severity
  Score → pass/review/block, mirroring the guardrails cookbook's `guard()`.
- **NL → task** (function-calling cookbook): Choice over actions
  (create/assign/set-date/comment) + per-argument Choice/Noul with `stated` gates;
  call confidence = weakest judgment; below threshold → ask user.
- Store `choice/probabilities/confidence/score/noul + model version` on the activity
  log for auditability; gate destructive auto-actions (auto-assign, auto-close) behind
  high confidence; expose thresholds as constants in one module.

## 12. Page map (what was read; fetch on demand)

Concepts: introduction, quickstart, coding-agents, system-one, state, how-to-build,
use-case-map, ml-primer · Primitives: index, choice, score, noul, advanced ·
Confidence · Patterns: index, fan-out, confidence-routing, composite-scoring,
intent-routing · Python SDK: index, usage, sync-client, questions, responses, retries,
exceptions, constants (async client mirrors sync) · JS SDK: index, TypeSafeClient,
`choice()` · Models · HTTP API ref · Agent skill · Jaggedness jev-1.13 ·
Cookbooks: llm_guardrails, classification_using_confidence, function_calling (+ index
titles for: consistency_noul/choice, parallel_questions, rerank, semantic_find,
autoformat, skill_suggestion, entity_alignment, classifying_rag, citation_check,
sde_cascade, date_extraction, pre_parsed_extraction, hierarchical_classification,
autoresearch). Skipped as low-value: typedoc error-class stubs, changelogs, demos
index, legal (DPA/privacy/ZDR-enterprise), smart-home demo (same fan-out shape as §6).
