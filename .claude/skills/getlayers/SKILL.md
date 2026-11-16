---
name: getlayers
description: Use this WHENEVER the user wants to build or design something with GetLayers — a website or landing page, a custom 3D scene, a video background, or adding motion/3D to an existing project — or to rebuild something they favourited or saved on getlayers.ai — or to build the site from a GetLayers template they edited in Figma — or to make an effect with the getlayers.ai AI design tools (animated text, a logo in 3D, an orb, ASCII video, …) — or whenever they mention GetLayers, "getlayers", or the getlayers MCP. It drives the GetLayers MCP through its correct end-to-end flow so the result actually uses the library (real templates, scenes, compositions) instead of generic output. Load it BEFORE calling any getlayers_* tool.
---

# Driving the GetLayers MCP

GetLayers is an MCP server for building immersive, design-led web experiences. It
only produces great results if you follow its flow. The failure mode this skill
prevents: jumping straight to writing generic code, skipping the library.

## Step 0 — ALWAYS call `getlayers_start` first

Before you discuss layouts, pick assets, or write a line of UI, call
`getlayers_start`. It returns the eight things GetLayers can do plus the guide,
vocabulary, and environment info. Do this even if the user's request seems obvious.

Then present those eight capabilities to the user **in your own words**, as "here's
what I can build for you" — NOT as a list of tool names. Read their request, pick
the matching mode, and follow that mode's `flow`. Ask which mode only if genuinely
ambiguous.

## The eight modes (route to one)

1. **Build a website from scratch** — offer THREE ways in: (a) search & pick a
   template, (b) name a template to extend, (c) build unique. Extending a template:
   re-skin it AND offer to swap any section's composition (`recomposeOptions`).
   Building unique: compose section by section from `getlayers_compositions`. Every
   page is compositions + a Style + assets.
2. **Design a unique 3D scene** — use `getlayers_scene_lab`; synthesise a new scene
   from references, don't just pull one.
3. **Browse & pull an asset** — `getlayers_search` / `getlayers_browse` → materialize.
4. **Add a video background to their project** — search backgrounds, wire the closest in.
5. **Add motion & 3D to an existing project** — READ their code first, then propose.
6. **Rebuild something they saved on getlayers.ai** — `getlayers_my_favourites` →
   confirm the item → `getlayers_reproduce({ ref })`. Reproduce 1:1, don't redesign.
7. **Build the site from a template they edited in Figma** — read the frame with the
   Figma MCP → `getlayers_figma_match` → materialize that template → port only their edits.
8. **Make an effect with the AI design tools** — `getlayers_tools` → pick a preset →
   `getlayers_tool_look` (with `changes`) → follow the returned prompt verbatim.

## Non-negotiables (this is where agents go wrong)

- **Never strict-filter.** Selection is not tag-matching. Use `getlayers_search`
  with the user's own language, or `getlayers_explore` for the whole library, and
  JUDGE fit by reading descriptions and vibes. A "wrong tag" never rules an asset out.
- **Compositions are the layout layer under everything — use them.** A page is
  compositions (skeletons) + a Style + assets. Building a section unique? Call
  `getlayers_compositions` (by role), pick a skeleton, pour the Style + assets in —
  NEVER a generic centered stack (the single most common failure). Extending a
  template? Its sections come with a `composition` and `recomposeOptions` — offer to
  swap a section's layout for another of the same role while keeping Style + content.
- **Establish the environment before materializing.** Recommend the starter, set up
  as a FRESH project: clone `https://github.com/textura-agency/next16-claude-starter`,
  remove its git connection and init a new one (`git clone <repo> my-site && rm -rf
  my-site/.git && git -C my-site init`). Read its obsidian/ vault first (single source
  of truth — README is the map; hard rules in obsidian/workflows/ai-agent-guide.md).
  Default install: `yarn install` (Node 22.13+), copy `.env.example` to `.env`, then
  `yarn dev`. If they're in their own project instead, read its conventions and adapt
  our source (it's portable single-HTML) to their stack.
- **Commit ONE Style, early.** Pass its `styleId` to every `getlayers_materialize`
  call so scenes come back pre-tinted. Everything inherits it — that shared Style
  is what makes a page cohere.
- **Tint scenes through CONFIG, never the shader.** `materialize` hands you a `tint`
  map; apply it to the scene's CONFIG. Editing shader colour produces garbage.
- **Re-dress to match, don't clash.** Colour and type are portable, first-class
  supplies. To make a pulled scene/section fit the site — or shift a part to a new
  mood — call `getlayers_palettes` (colour ramps that resolve the four palette
  roles) and `getlayers_fonts` (typefaces with the exact CSS stack + Google/
  Fontshare load URL). Re-tint by passing `paletteId` to `getlayers_materialize`
  (it overrides the Style's colour but keeps its tokens/type); re-type by passing
  `fontId`. Hold the line: ONE palette per surface, ONE type system per site;
  high-contrast serif displays are headline-only. Never hand-pick raw hexes or
  guess a Google Fonts URL when a palette/font entry already carries it.
- **Show previews via the site.** Every card carries a `preview` link
  (`getlayers.ai/?layer=<id>`) — share it so the user watches the asset ON the site.
  Do NOT hand out or embed the watermarked public media; the site link is the preview.
- **Backgrounds ship at full quality.** `getlayers_materialize` on a background returns
  `download.video` (4K) + `download.poster` (2K) as short-lived signed links — DOWNLOAD
  them and save into the project (e.g. `public/`), then wire a full-bleed muted looping
  autoplay `<video>` with the poster. Never hotlink `storage.getlayers.ai` (watermarked).
- **Gather the brief before building.** For a website, a browse, and ESPECIALLY a
  3D scene, first ask for as much detail as you can — purpose, audience, mood,
  references. For a scene, explicitly ask for **picture/video references**; they beat
  adjectives. If the user gives little or skips, don't guess — drive a short interview
  off the five axes (dimensionality, mood, tone, motionEnergy, density) until you can
  choose real assets deliberately.
- **Anything can be a reference.** If the user names a GetLayers asset — "use
  <template/section/scene> like X" — pull it with `getlayers_source` (or its card),
  study its composition / technique / CONFIG, and apply that to what you build. This
  works across types: a template as a reference for a section, a scene for a mood, etc.
- **Keep state.** Read `getlayers.json` before each section, write it after, so a
  long build doesn't drift from what was chosen.

## Mode-specific reminders

- **Scene Lab (mode 2):** call `getlayers_scene_lab` with the user's description
  (and any of our scene ids they like / images they attach). It returns reference
  scenes + the authoring guide. Build an ORIGINAL scene — inspired by, never copied.
- **Existing project (modes 4 & 5):** READ their actual code, styles, and content
  FIRST. Propose specific decisions, then pull from the library. Do not build blind.
- **Saved on getlayers.ai (mode 6):** when the user says "my favourite / the one I
  hearted / my saved gradient / the orb I made", call `getlayers_my_favourites`
  (filter with `type` asset|look|tool, `kind`, or `query`), show the matches by name and
  let them CONFIRM which — never guess between two similar looks. Then
  `getlayers_reproduce` with that item's `ref` exactly as returned. It dispatches by what
  the item is:
  - `asset` (a heart) → the same payload as `getlayers_materialize` (a hearted roll adds
    `reproduce.rollConfig` to merge over CONFIG). A Next template still needs `target`.
  - `look` (their tuned gradient/scene) → the asset's source plus `savedLook.config`:
    MERGE it over the CONFIG block (after `savedLook.rollConfig` when present). Never edit
    the shader; do NOT tint or apply a Style palette over it — its colours ARE the look.
  - `tool` (a look saved in an /ai-design tool) → `prompt`: follow it EXACTLY, it rebuilds
    the look 1:1; adapt only the integration to their stack. Files they uploaded into
    the tool come back in `media` (signed URLs, ~1 h) — download them into the project's
    static assets, never hot-link. Only uploaded media `notes` names that is NOT in
    `media` is theirs to supply — ask for the file.
  An item with `unavailable`, or an error naming an unknown kind, cannot be reproduced —
  tell the user plainly. Asset and look reproduces spend one materialize from the quota;
  listing and tool looks are free. These tools need the hosted MCP (a signed-in account);
  the local stdio server can only reproduce `asset:` refs.
- **From Figma (mode 7):** needs the official Figma MCP connected too. Read the frame:
  its top-level name (the GetLayers plugin names it `"<Template> · design"`), its direct
  child frames top to bottom with width + height, and a screenshot. Pass the name and
  blocks to `getlayers_figma_match`. `match.confident: false` → show the preview link and
  confirm; `match.figmaData: false` → it IS that template, but there are no blocks to
  pair: materialize it and diff the frame against the preview by eye; `match: null` →
  ask which template it began as, or build it fresh. Then
  `getlayers_materialize` the template — that is the base, never the screenshot. Pair
  blocks with code sections via `blockMap` (by order, or partial — confirm each pair by
  reading the content against the section `label`), DIFF against the original, and
  port ONLY what changed: copy, colours and fonts through the token file, swapped images
  exported from Figma into the project (never hotlinked), added / removed / reordered
  blocks. Keep motion and 3D — Figma cannot show them, so their absence in the frame is
  not an edit. End with a per-section list of what you changed.
- **AI design tools (mode 8):** for an EFFECT, not a page. `getlayers_tools` with no
  args lists the twelve and what each `makes`; with `kind` + `query` it ranks that
  tool's presets. `getlayers_tool_look({ kind, preset })` returns the preset's `config`
  and its build `prompt`; call it again with `changes` that set only keys from that
  `config` (objects merge, values replace). Keys in `ignored` were NOT applied. Follow
  `prompt` VERBATIM — it is the tool's own build spec. Their own media (images, video,
  artwork) named in `notes` is theirs to supply — ask; for SVG to 3D pass their SVG as
  `changes.customMarkup`. Free. A look they already SAVED is mode 6, not this.
- **Templates: what `materialize` returns depends on the TARGET you pass.**
  - `target: 'starter' | 'next'` on a Next template → **the real Next tree**, not HTML.
    `build.manifest` explains the page, `build.editPoints` are the files to edit, and
    `getlayers_source(id, file)` pulls them. Pull only what you edit, never the whole
    tree. Handing a Next user the portable HTML makes them translate React back into
    React — so we don't.
    **Taking the WHOLE template? Use `downloadProject`.** The tree payload carries a
    signed link to the entire project as one `.zip` — every source file plus `public/`
    media already inside, so `mediaAssets` needs no separate download. It extracts to
    ONE top-level folder named for the template, so unzip it NEXT TO the project, not
    over it, then move what you want; don't copy its `.claude/settings.json`,
    `.cursorrules` or `.gitignore` over an existing project's. It also ships an
    `obsidian/` vault documenting that project's architecture and design system —
    read it before re-skinning. Then install (node_modules isn't shipped).
    **The zip is capped at 10 different templates per day** — it's the fast lane, not
    the browsing lane. Re-taking one you already took today is free. If you see
    `downloadProjectUnavailable` instead, the cap is spent: nothing is lost, take the
    template the per-file way below (same code, just fetched as you go). So spend the
    zip on templates the user has actually committed to, and use the per-file route to
    look around. Prefer per-file anyway when they want a *piece* of the template.
    **`build.mediaAssets` is separate and mandatory when you did NOT take the zip:** the
    `.glb`/`.mp4`/point-cloud files the page loads at runtime. They are binary, so
    they are never in context — run `build.mediaDownload` (ready-to-run curl lines)
    or fetch each `download` link yourself, saving to the same tree-relative `file`
    path. Then verify each file is `bytes` long: an expired link (they last ~1 h)
    writes a short error page under a `.mp4` name, and the only symptom is a blank
    canvas at the end. Re-materialize for fresh links rather than substituting your
    own asset. If you can't write files in this environment, say so and list what the
    user must download — never report the build done with the media missing.
  - `target: 'react' | 'other'`, or ANY target on a non-Next template (vite/static) →
    the **portable single-HTML master**, to translate into their stack.
  So establish the target BEFORE you materialize; it changes the deliverable.
  - **If you don't know their stack, OMIT `target`.** On a Next-stack template
    materialize returns `needs: 'target'` — the two options phrased for a human —
    rather than guessing. It costs no quota. Put the choice to the user, then call
    again with `target` set. Better still: if there's a project on disk, read it
    first (`next.config.*` or a `next` dep ⇒ `target: 'next'`) and don't ask at all.
  Re-skin by editing the token file + scene tint; preserve motion and composition.
- **Every build gets the reveal choreography by default.** `getlayers_start` returns
  `revealChoreography` — the house rules for loader → gate → staggered content →
  scene reveal, harvested from the real templates. Follow it unless the user asks to
  simplify. The short version: an immersive loader; content gated until it completes;
  text/images/scroll revealing in sequence, not just appearing; a 3D scene entering
  with a real entrance. Loader Sections (`role: "loader"`) are browsable and swappable
  like any other Section.
- **A template's heavy media is referenced, not embedded.** Video, 3D models and
  large textures live at `https://storage.getlayers.ai/templates/<id>/…` and appear
  in the portable as ordinary URLs (small assets are still inlined). **DOWNLOAD those
  files into the user's project** — e.g. `public/` — and repoint the markup at the
  local copies. Do not ship a production site that hotlinks our bucket. If the user
  wants the maximum-quality master of a video that is also a catalog Background,
  `materialize` that Background: the public copy is a downscaled template-grade
  encode, and the un-watermarked 4K master only comes through the signed download.

## The shape of a good session

Call start → present the 8 modes → route → (for a build) soft interview → establish
environment → search/explore/plan for options with preview links → user picks a
Style + Template → consult compositions for any hand-built section → materialize with
styleId → adapt to their stack → write getlayers.json. Never skip start; never skip
compositions; never fall back to generic.
