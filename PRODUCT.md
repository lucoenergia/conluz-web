# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two co-primary audiences, neither subordinate to the other:

- **Community member (socio).** A household member of a renewable energy community who checks their own consumption, the share of community production assigned to their supply points, and the state of those supply points. Reached **primarily on a phone**. Frequently non-technical, sometimes older, and a low-frequency user — the interface must never assume energy-sector or software fluency, and must stay usable for someone who has not opened it in weeks.
- **Community admin.** The person who runs one energy community day to day: members, supply points, production plants, sharing agreements and their coefficients, the file for the distributor, and the data integrations. Task-heavy, recurring work.

A third, non-primary audience:

- **Platform admin.** Operates the platform itself — creating communities, managing users, assigning community admins. Administrative and infrequent. Platform-admin privilege **never** grants access to a community's operational data; that is a product rule, not an implementation detail.

## Product Purpose

Conluz Web is the web interface to Conluz, an energy management system for renewable energy communities. It lets a community operate collectively: register members and their supply points, register production plants, collect and visualize real consumption and production telemetry, and define and apply the sharing agreements (coefficients) that assign generated energy to each supply point — including producing the file the electricity distributor requires.

Status as of 2026-09-11: **pre-production**. It is in active development and is not yet serving real members. Success means real energy communities running their actual operations on it — members understanding what they consumed and what the community produced for them, and admins completing the sharing-agreement cycle without leaving the product.

## Positioning

Confirmed by the maintainer as the claims a neighboring product could not truthfully copy:

- **Open source and self-hostable** (AGPL-3.0). A community owns its instance and its data instead of renting a SaaS. The code is auditable; there is no vendor lock-in.
- **Built by and for a real cooperative.** Conluz grew out of the operational reality of an actual energy community (Lucoenergia), not from a speculative read of a market.

Explicitly *not* claimed as positioning, though both exist as capabilities: the sharing-agreement lifecycle, and the telemetry integrations. Future work must not promote these into differentiator claims without the maintainer's say-so.

## Operating Context

- Spanish energy communities. The work has a regulatory spine: coefficients are agreed, applied, and then delivered to the distributor as a generated file. That sequence is a real external obligation, not an internal convenience.
- Energy data arrives from third-party systems rather than manual entry: **Datadis** (consumption), **Huawei FusionSolar** (production), **Shelly** (meters). These are configured per community as integrations with credentials.
- The app is **multi-community**: one deployment can host several communities, and a user's role is per community, not global. An active community is selected and persisted; operational data is scoped to it.
- Members arrive on mobile; admins do their heavier work on larger screens. Both are first-class, not a desktop design later squeezed.

## Capabilities and Constraints

Confirmed functionality:

- Authentication with password recovery; profile and password management.
- Supply points: list, create, edit, detail, with consumption data and per-supply energy statistics.
- Production: plants (list, create, edit, detail) and sharing agreements with coefficient sets, lifecycle states, generated distributor files, and file import.
- Members (per active community), communities, users, and platform-level administration.
- Integrations configuration per community.

Technical constraints future work must respect:

- The API client under `src/api/` is **auto-generated** from `api-docs.json` via Orval and is never hand-edited.
- Community-scoped data endpoints carry `communityId` in the path; a screen with no active community makes no call.
- Two independent authorization axes — `isPlatformAdmin` and the role within the active community — with no global user role.
- Two viewports are treated as real device classes in visual regression: mobile (390×844) and desktop (1440×900), split at 768px.

Explicitly undecided product facts — record, do not invent:

- **Deployment topology.** Whether communities will be served by one self-hosted instance each or by a central multi-tenant deployment is not settled. The code supports several communities inside one instance; that is a capability, not a decision.
- **Languages.** All interface copy is currently Spanish; code and documentation are English. **Multi-language support is a committed goal**, so future work must not make translation expensive: no text baked into images, no layouts that assume Spanish string lengths, no copy hard-wired where it cannot be extracted.

## Brand Commitments

**Nothing is visually binding yet.** The maintainer states the current identity is a working scaffold, not a commitment:

- The purple brand color and the existing token palette in `src/theme/tokens.ts` are a starting point, open to replacement.
- `public/favicon.png` is not a protected identity asset.
- A future rebrand is fair game.

Factual, not stylistic: the product is named **Conluz** and originates from **Lucoenergia**; the backend is the sibling `conluz` project. Those are product facts a redesign keeps, not a visual world it must preserve.

## Evidence on Hand

Real material available to future work:

- This repository: working interface, `src/theme/` token system, `references/styling-conventions.md`, `references/theme-tokens.md`.
- `api-docs.json` — the real backend contract, and the authority on what data exists.
- The sibling backend repo at `../conluz`, including `conluz.wiki/` (glossary, production and price docs, scheduled jobs, telemetry infrastructure).
- Playwright visual baselines under `tests/visual/__screenshots__/{mobile,desktop}/` — captured with hard-coded fixtures, no live backend.

Absences future work must not fabricate:

- No real member data anywhere; every fixture is invented and deterministic by design.
- No customers, testimonials, case studies, press, adoption numbers, or benchmarks — the product is pre-production.
- No pricing or commercial model. The license is AGPL-3.0; nothing beyond that is established.

## Product Principles

1. **Two audiences, one product.** Every surface answers whether it serves the member or the admin, and is designed for that job — not averaged into something that serves neither.
2. **Regulated figures are exact.** Coefficients, energy values, and distributor files are regulatory artifacts. Precision, traceability, and honest state beat visual simplification or rounding that reads nicer.
3. **Assume no fluency.** A member who is older, non-technical, and infrequent must still succeed unaided. Jargon, density, and insider shorthand are failures, not efficiencies.
4. **Scope is never implied.** Whose data this is, and which community it belongs to, is always visible. Authorization is a product-visible rule, not a silent filter.
5. **Own your instance.** Nothing in the design may assume a hosted service, phone-home behavior, or capabilities a self-hosting community would not have.

## Accessibility & Inclusion

No formal standard is committed. The real, confirmed requirement is that **older and non-technical members must succeed**: legible type sizes, generous touch targets, strong contrast, and unambiguous labels — on a phone, without help. Treat this as a product requirement, not an aspiration, and do not record a WCAG conformance claim that nobody has made.
