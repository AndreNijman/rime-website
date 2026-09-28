# Rime / rimeos.com

**Rime — Website Experience & Release System**

Master specification for rimeos.com — visual language, motion, information architecture, product storytelling, release pages, OS deep-link integration, implementation architecture and launch quality gates.

> **Palette note**
> The DOCX cover contains four example swatches from current Matugen-derived palettes. Markdown cannot preserve Word cell fills, so the swatches are omitted here. They are examples only, not Rime brand colours; Rime has no fixed accent.

**Product** Rime
**Primary domain** rimeos.com
**Document** v1.0 — 28 September 2026
**Target** post-rebrand Rime; current APEX source is the implementation reference

## 1. Executive direction

rimeos.com should feel like Rime itself has escaped the desktop and become a website.

It must not look like a generic Linux distribution page with a hero screenshot, feature-card grid, download button and GitHub badge. It also must not become an over-produced WebGL demo that is beautiful but slow, inaccessible or disconnected from the real product. The site is a product surface: it should use the same visual logic, semantic motion, colour derivation and interaction discipline as Rime Shell.

> **CORE IDEA**
>
> Rime Shell is the design system. The website is its web-native expression. Source geometry, motion roles, material hierarchy and Matugen-derived colour remain recognisable; layout, typography scale and storytelling adapt to the web.

### The website has five jobs

- Make someone understand what Rime feels like within seconds, before they read a feature list.

- Show the real product truthfully: actual Shell behaviour, real system architecture, real performance claims and real limitations.

- Convert interest into installation with a confident download and installation path.

- Become the permanent human-readable record of every Rime release, with deep links from the operating system itself.

- Make the project feel coherent: the product, docs, updates, source, social films and website all belong to one visual and motion language.

### The non-negotiables

| **Rule**                               | **Meaning**                                                                                                     |
|----------------------------------------|-----------------------------------------------------------------------------------------------------------------|
| Rime, not “Rime OS” everywhere         | The brand is Rime. “Rime OS” is used only when technical disambiguation is useful. The domain is rimeos.com.    |
| No fixed brand accent                  | Wallpaper → Matugen → semantic colour roles. Curated site scenes use real generated palettes.                   |
| Motion has an origin                   | Surfaces emerge from where they logically belong; they do not just fade or scale in the middle of the viewport. |
| No fake product                        | Every screenshot, interaction, benchmark and release note maps to a pinned build or commit.                     |
| No update-server dependency            | rimeos.com explains releases. It never becomes part of the trust or rollout decision path.                      |
| Fast at 60–144 Hz                      | Animation must be wall-clock and frame-driven, with no fixed 16 ms stepping assumption.                         |
| Reduced Motion is first-class          | Spatial motion disappears; short state/effect transitions remain, matching Shell policy.                        |
| The site still works without animation | Core content, navigation, downloads and release notes remain complete with JS disabled where practical.         |

### Current implementation facts this specification deliberately preserves

The present APEX codebase already contains several architectural decisions that should survive the Rime rename rather than being reinvented for the website:

- The Shell uses one semantic motion system (src/theme/Motion.qml + motion.js) instead of per-component timing literals.

- Connected surfaces use spring-driven fluid geometry such as CENTER_BLOOM, RIGHT_POUR, LEFT_SPILL, EDGE_SPILL, CORNER_RISE, BOTTOM_RISE and NOTCH_DROP.

- The Shell colour system is role-based and updates from Matugen output when the wallpaper changes.

- The operating system is image-based with bootc; the Shell is vendored into the signed image so OS and UI can update and roll back together.

- The update-channel design already separates edge, beta, candidate and stable and has a signed rollout-document design with no Rime-operated telemetry endpoint.

## 2. Rime web identity

### 2.1 Brand hierarchy

| **Layer**        | **Name**             | **Use**                                                                    |
|------------------|----------------------|----------------------------------------------------------------------------|
| Product          | Rime                 | The name people see in headlines, navigation, social media and films.      |
| Desktop          | Rime Shell           | The shell/desktop environment when a technical distinction matters.        |
| Operating system | Rime Linux / Rime OS | Technical docs, package/update architecture, support and metadata.         |
| Primary web      | rimeos.com           | Marketing, updates, downloads, product stories and canonical public pages. |
| Developer web    | docs.rimeos.com      | Long-form documentation when split from the main site.                     |

### 2.2 Logo state

The website must not hard-code the current APEX Spark as though the Rime mark is finished. Build a RimeMark component with a replaceable SVG path and separate motion choreography. This lets the site architecture proceed while the evolved Rime mark and new Convergence animation are still being designed.

> **LOGO RULE**
>
> The mark may inherit a Matugen role in product contexts and use pure monochrome in neutral contexts. It must never require a specific blue, chartreuse or “ice” colour to remain recognisable.

### 2.3 Colour: environmental, not corporate

The website should use exactly the philosophy the Shell now uses: colour belongs to the environment. A featured wallpaper is the input. Matugen produces the palette. The page applies semantic roles. No designer manually picks a “close enough” accent for a scene.

| **Shell concept**                  | **Web token**           | **Purpose**                             |
|------------------------------------|-------------------------|-----------------------------------------|
| surfaceBase                        | --rime-surface-base     | Primary page/surface background         |
| surfaceRaised                      | --rime-surface-raised   | Cards and raised content areas          |
| surfaceOverlay                     | --rime-surface-overlay  | Floating/overlay surfaces               |
| surfaceHigh                        | --rime-surface-high     | Inputs and emphasized local surfaces    |
| surfaceSelected                    | --rime-surface-selected | Selected states                         |
| accentContainer                    | --rime-accent-container | Large selected/active fills             |
| accentText                         | --rime-accent-text      | Readable accent ink on neutral surfaces |
| textPrimary / Secondary / Tertiary | --rime-text-\*          | Content hierarchy                       |
| outlineSoft / Strong / hairline    | --rime-outline-\*       | Edges, focus and depth cues             |

The first public site can ship with one launch wallpaper as its default scene, but the code must already support multiple palette packs. Every major product demo should be able to switch wallpaper and palette together.

### 2.4 Light Fields

Behind product demonstrations, use a restrained “Light Field”: a blurred, low-frequency atmospheric field derived from the same wallpaper/palette as the Shell. It is not a generic gradient preset. The field should feel like the wallpaper’s light has escaped beyond the desktop frame.

- Generate from the featured wallpaper or palette at build time; do not run expensive image analysis on every visit.

- Keep movement subtle: a few pixels of drift or slow field interpolation, never screensaver motion.

- The product UI remains higher contrast than the field.

- When the user switches demo wallpapers, the UI palette changes first, then the surrounding Light Field follows in the same direction as the product-film language.

### 2.5 Typography

| **Role**             | **Family**                       | **Web use**                                                                                              |
|----------------------|----------------------------------|----------------------------------------------------------------------------------------------------------|
| UI / editorial       | Noto Sans / system sans fallback | Navigation, headings, body copy and buttons. Mirrors the Shell’s sans-serif UI face.                     |
| Telemetry / commands | JetBrains Mono                   | Versions, digests, commands, benchmark numbers, code and small technical labels.                         |
| Icons                | Purpose-built SVG                | Do not ship Nerd Font as the web icon system. Preserve the Shell glyph language through SVG equivalents. |

Website typography can scale much larger than the Shell, but the hierarchy should remain quiet: a few very large editorial statements, concise body copy, tiny mono evidence, and generous negative space. Avoid endless all-caps micro-labels or huge gradients inside text.

### 2.6 Material and depth

- Surfaces are mostly opaque or lightly translucent. Do not turn Rime into a generic glassmorphism site.

- A surface edge is communicated through role-based contrast, a soft rim and a single hairline where useful.

- Shadows are late: a connected liquid surface should not cast a finished floating-card shadow while it is still attached to its source.

- Large product stages can be edge-to-edge; cards are used to group information, not to decorate every paragraph.

## 3. Continuum Web — the motion language

The website should use the same physical assumptions as Rime Shell: motion is continuous, source-aware and interruption-safe. The web adaptation is called Continuum Web.

### 3.1 Five-beat grammar

| **Beat** | **Question**                    | **Web behaviour**                                                             |
|----------|---------------------------------|-------------------------------------------------------------------------------|
| Origin   | Where did this come from?       | The trigger and destination share geometry or position.                       |
| Flow     | How does it move?               | Spring-driven size/position/path motion with retained velocity.               |
| Settle   | When is it physically finished? | Long tail; no snap-to-final-frame; shadow/rim can arrive late.                |
| Proof    | What should I notice?           | The real feature becomes readable and usable only after its container exists. |
| Return   | Where does it go?               | Reverse into the same source rather than fading to nowhere.                   |

### 3.2 Starting token parity

The first implementation should import or mirror the current Shell roles rather than invent a second timing system. The copied numbers below are a starting snapshot, not a license to drift: the long-term goal is a shared JS source or generated token file.

| **Role**            | **Current balanced value** | **Meaning**                    |
|---------------------|----------------------------|--------------------------------|
| micro               | 140 ms                     | Tiny feedback/icon state       |
| hover               | 130 ms                     | Hover effect                   |
| press in            | 90 ms                      | Immediate compression          |
| press out           | 280 ms                     | Return from press              |
| state               | 220 ms                     | Colour/on-off state            |
| selection           | 400 ms                     | Travelling selection           |
| page                | 380 ms                     | Directional page change        |
| surface enter small | 360 ms                     | Small transient surface        |
| surface exit small  | 240 ms                     | Small transient exit           |
| morph enter         | 520 ms                     | Connected fluid surface open   |
| morph exit          | 380 ms                     | Connected fluid surface close  |
| notification shift  | 420 ms                     | Stack reflow                   |
| hero                | 640 ms                     | Signature transition / ceiling |
| fade in             | 280 ms                     | Content reveal                 |
| fade out            | 140 ms                     | Content leaves before surface  |
| content delay       | 90 ms                      | Choreography offset            |
| value follow        | 200 ms                     | Meter catching a changed value |
| settle              | 520 ms                     | Feedback returning to rest     |

### 3.3 Spring rules

- Surface open/close uses a critically damped or nearly critically damped spring: fluid does not mean bouncy.

- Selection and tiny mechanical controls may have a whisper of overshoot; large surfaces do not.

- A reversal keeps current velocity. Clicking a closing surface open again must not restart from rest.

- Use requestAnimationFrame with wall-clock delta. Never assume 16 ms frames; the Shell already changed architecture because 144 Hz exposed that problem.

- Clamp pathological delta after background-tab stalls and land safely without exploding geometry.

### 3.4 Web mapping of Rime motion families

| **Rime family** | **Website use**                                                                                                        |
|-----------------|------------------------------------------------------------------------------------------------------------------------|
| CENTER_BLOOM    | Global navigation / feature index expanding from the centre top notch; selected homepage product stage.                |
| RIGHT_POUR      | Download/installation utility surface; release filters; accountless utility menus.                                     |
| LEFT_SPILL      | Project/source/docs quick navigation where a left-origin surface is useful.                                            |
| EDGE_SPILL      | Small theme/demo controls attached to an edge.                                                                         |
| CORNER_RISE     | Contextual media controls or small inspector panels.                                                                   |
| BOTTOM_RISE     | Wallpaper/palette gallery on personalization stories, especially mobile.                                               |
| LENS_REVEAL     | Search, docs search and command-style navigation.                                                                      |
| NOTCH_DROP      | Rare hero/modal moment: an update story, Convergence explanation or deep product detail falling out of the top source. |
| STACK_REFLOW    | Update change cards, known-issue lists, filtered results.                                                              |
| CAPSULE         | Status, copied-to-clipboard, download started and tiny transient feedback.                                             |
| PIVOT_POP       | Context menus and small anchored overflow controls.                                                                    |

### 3.5 Scroll

- Never hijack the wheel or touch scroll. Native scroll position remains authoritative.

- Pinned storytelling sections are allowed only when the user still advances one normal viewport at a time.

- Use scroll progress to reveal product evidence, not to make the page wobble continuously.

- Parallax travel should be small (roughly 8–24 CSS px on desktop) and zero under Reduce Motion.

- The first frame of a section should already be coherent. Media should not be invisible while waiting for JS.

### 3.6 Reduced Motion parity

Match Rime Shell’s accessibility philosophy: spatial motion goes to zero; essential state changes remain as short effects. Decorative loops stop. Busy progress can continue because it carries information.

## 4. The global website shell

### 4.1 Desktop frame

On wide screens, rimeos.com should have a persistent top frame inspired by Rime Shell rather than a conventional floating navbar. It should feel familiar to a Rime user without pretending the browser is literally the desktop.

- A thin top band spans the viewport with subtle wallpaper-facing hairline.

- Left zone: Rime mark + wordmark. Clicking returns home. The mark may subtly react to the active palette.

- Centre zone: current section and primary navigation trigger. Opening it uses CENTER_BLOOM into a compact site map/search surface.

- Right zone: Updates and Download. Download/installation options use RIGHT_POUR from the right zone.

- When scrolling, the bar does not disappear. It can reduce visual weight, but navigation remains stable.

### 4.2 Navigation contents

| **Primary** | **Secondary / inside surface**                                    |
|-------------|-------------------------------------------------------------------|
| Rime        | Overview, philosophy                                              |
| Shell       | Motion, launcher, notifications, settings, lock/login, workspaces |
| System      | Updates, rollback, packages, recovery, channels, security         |
| Personalise | Wallpaper, Matugen, themes, accessibility                         |
| Agents      | Only when shipping and polished                                   |
| Updates     | Release index, latest, channels                                   |
| Docs        | Install, usage, reference, troubleshooting                        |
| Download    | Installer/ISO, requirements, verification                         |

### 4.3 Search

Pressing “/” or selecting Search opens a LENS_REVEAL field from the centre surface. Search indexes docs, feature pages and update notes. Results appear as a grouped reveal; individual rows do not bounce in. Keyboard navigation mirrors Rime launcher logic.

### 4.4 Mobile

- Use a compact top capsule/header rather than shrinking the desktop three-notch bar until it is unusable.

- Keep origin-based motion: menu expands from its trigger, download rises/pours from its trigger, and search reveals from its field.

- Recompose product demos vertically. Never make users inspect a tiny 16:9 desktop screenshot inside a phone.

- Touch targets are at least 44 CSS px; hover-only evidence must have a touch equivalent.

## 5. Homepage — rimeos.com/

The homepage should communicate the product in a sequence of experiences, not a stack of feature cards.

### 5.1 Opening sequence

> 1\. Page paints immediately with the current launch Light Field / wallpaper-derived base. No black loading screen.
>
> 2\. On a first visit with motion enabled, the redesigned Convergence forms the Rime mark from fluid material. It is short, precise and never blocks input.
>
> 3\. The top Rime frame settles into place. The product desktop becomes visible beneath it.
>
> 4\. Headline and two actions arrive only after the product stage is visually stable.

Recommended initial copy direction:

> **HERO COPY**
>
> Rime
>
> A Linux desktop that moves as one.
>
> Fluid by design. Image-based underneath. Coloured by your world.

Primary action: Download Rime. Secondary action: Explore the Shell. Do not place five buttons in the hero.

### 5.2 Hero product stage

- Full-bleed Rime desktop, not a stock laptop mockup.

- Default scene is a pinned real Rime build and real wallpaper.

- Mouse movement may add extremely small depth response to the stage, never a “3D card tilt”.

- A short guided interaction demonstrates Dashboard CENTER_BLOOM and RightPanel RIGHT_POUR. The visitor can take control at any point.

- On mobile, use a purpose-built vertical sequence or video crop rather than simulating a full desktop.

### 5.3 Story sequence

| **Section**                           | **What happens**                                                                                                               | **Proof**                                                                 |
|---------------------------------------|--------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------|
| The Shell moves as one                | Dashboard grows from centre notch; right pane pours from right notch; Nexus drips into a real settings window.                 | Actual capture or geometry-driven web reconstruction pinned to a release. |
| Rime takes colour from your world     | Visitor switches among 3–5 wallpapers. Shell colours update from pre-generated Matugen palettes; the surrounding site follows. | Palette values generated with the same Matugen configuration as Rime.     |
| Your system can go forward — and back | Update stages a new image; a simple diagram shows current deployment + staged deployment + rollback.                           | Bootc/image architecture and actual Rime CLI.                             |
| Built for work and play               | Show real compositor/shell responsiveness, package model, profiles and gaming features that actually ship.                     | Measured data only; link methodology.                                     |
| Agents, without owning the desktop    | Only if shipped: Agent Center, permissions, workspaces and remote control.                                                     | Real current UI and permission model.                                     |
| What changed lately                   | Latest Rime update appears as a living release card with video/stills.                                                         | Direct link to /updates/\<release\>.                                      |

### 5.4 Footer

Keep it useful and sparse: Download, Docs, Updates, Source, Security, Privacy, Brand assets, Status, social links and legal. Do not repeat the entire navbar in five columns just to fill space.

## 6. Product pages

### 6.1 /shell — Rime Shell

This is the definitive visual product page. It should feel like a long-form interactive film assembled from real interactions.

- Top bar and frame anatomy: explain the source points rather than listing “custom top bar”.

- Dashboard / CENTER_BLOOM: show how the centre notch becomes the surface.

- Launcher / LENS_REVEAL: search field present immediately, grouped results revealing beneath it.

- Right side / RIGHT_POUR: network, notification and audio panes sharing one physical surface and retargeting rather than closing/reopening.

- Nexus / NOTCH_DROP: the settings window forms from the notch via the redesigned liquid drop sequence.

- Notifications / STACK_REFLOW: arrival, removal, drag and clear behaviour.

- Lock and unlock: wallpaper blur/dim, password shapes, and the unlock curtain handing back to the desktop.

- High-refresh motion: explain wall-clock SpringFollower and why motion remains smooth on 60/120/144 Hz displays.

- Reduce Motion: side-by-side demonstration that preserves state clarity without spatial travel.

### 6.2 /system — the operating system

- Image-based architecture: bootc deployment, signed image, current + previous deployment.

- Rime Shell is part of the image, so a normal Rime OS update advances the system and Shell together and rollback reverses them together.

- System-extension package model: installing supported packages does not layer the bootc deployment.

- Flatpak/application story.

- Update channels: edge, beta, candidate, stable.

- Rollout holds and health gates, clearly explained without implying telemetry.

- Recovery and rollback flows.

- Secure Boot/signing/trust path, with technical links.

### 6.3 /personalise — wallpaper becomes the system

This page should be one of the most memorable parts of the site. Give the visitor an interactive wallpaper rail. Selecting a wallpaper changes the demo wallpaper, Matugen-derived Shell roles, website Light Field, selection colours and example mark treatment as one coordinated transition.

> **TRUTH RULE**
>
> The palette must be pre-generated with the same Matugen flags/configuration Rime uses. Never hand-pick “nicer” website colours that the real system would not generate.

### 6.4 /agents — only when ready

Do not publish an Agents marketing page merely because the code exists. Publish it when the Agent Center, permission model, remote workflow and supporting docs are coherent. The page should show real sessions, permissions, needs-you prioritisation, workspaces and remote control rather than generic “AI built in” copy.

### 6.5 /security

- Signed images and provenance.

- Secure Boot chain and what is actually verified.

- Atomic/staged update model and rollback.

- Agent permission model and security boundaries when applicable.

- No Rime-operated telemetry service by default; be explicit about any third-party network services the user chooses.

- Security reporting/contact and disclosure policy.

### 6.6 /download

Download is a product page, not a file dump. It must only show artifacts CI has actually published and validated.

| **Block**            | **Required content**                                                                               |
|----------------------|----------------------------------------------------------------------------------------------------|
| Hero                 | Current recommended release, architecture, size, release date, primary download/install action.    |
| Choose method        | ISO/live media, Windows-assisted installer or other real methods that ship; hide nonexistent ones. |
| Requirements         | CPU architecture, RAM/storage, UEFI/Secure Boot requirements, GPU notes.                           |
| Verify               | SHA256/digest/signature information and exact verification commands.                               |
| Install              | Short path plus full docs link.                                                                    |
| Known hardware notes | Specific current limitations, not vague “works on most PCs”.                                       |
| Previous release     | Visible but de-emphasized recovery path.                                                           |

### 6.7 /docs

Docs may begin under rimeos.com/docs and later move to docs.rimeos.com without changing the content model. Keep visual DNA but reduce animation density dramatically: docs are for retrieval, not spectacle. Search should use the same LENS_REVEAL language.

### 6.8 /journal

Optional engineering journal for deep technical posts: update-cost measurements, high-refresh motion work, boot architecture, security design and major UI/UX case studies. This is where Rime earns technical credibility. It is not a weekly content-marketing obligation.

## 7. Updates — the website becomes part of the product

This is the signature system integration: after Rime successfully boots into a newly installed release, it opens the exact rimeos.com page that explains what changed.

### 7.1 Human URL design

- `https://rimeos.com/updates/2026.10.02`
- `https://rimeos.com/updates/2026.10.02?from=2026.09.15`
- `https://rimeos.com/updates/latest`

The canonical release page is immutable by release ID. The optional from= value is a public release ID, not a machine identifier. It lets the page show the cumulative changes a user actually crossed when they skipped one or more releases.

### 7.2 What happens on update

> 1\. The current system checks and stages a signed image through the existing Rime update path. Website availability is not consulted and cannot block the update.
>
> 2\. The new image contains /usr/share/rime/release.json with its release ID, version, source revision, Shell revision, canonical notes URL and channel metadata.
>
> 3\. On the first graphical session after booting that new deployment, a singleton Rime Shell ReleaseService compares the booted release ID with the per-user last-seen release ID.
>
> 4\. If this is a normal forward update, the Shell launches the default browser once to the canonical notes URL with ?from=\<previous-release\>. It then records that this user has seen the release.
>
> 5\. If browser launch is unavailable, the Shell shows a persistent “Rime updated” notification with a “See what changed” action rather than repeatedly retrying.
>
> 6\. If the machine rolled back to an older deployment, do not pretend it was an upgrade. Show a small local rollback notice and provide a link to that release if the user wants it.

### 7.3 First install, channel switch and edge behaviour

| **Situation**               | **Behaviour**                                                                                                                                                                                                                   |
|-----------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| First installation          | Do not open update notes. First-run/welcome owns that session.                                                                                                                                                                  |
| Normal forward update       | Open exact notes once after the new deployment reaches the desktop.                                                                                                                                                             |
| Skipped releases            | Open the newest page with ?from=old; page can merge changes between the two public IDs.                                                                                                                                         |
| Rollback                    | No automatic “what’s new” page. Local notice identifies the older booted release.                                                                                                                                               |
| Channel move to older build | Treat as channel change/downgrade, not a new release celebration.                                                                                                                                                               |
| edge channel                | Still open once by default to satisfy the product rule, but allow a user setting to switch automatic browser opening to a Shell notification only. Edge pages can be compact build notes rather than cinematic editorial pages. |

### 7.4 User control

Settings → System → Updates should contain “Open what’s new after an update” (default on) with a concise explanation. The command-line update flow can expose --no-open-notes for that transaction. This preserves the integrated default without trapping people who update frequently.

### 7.5 Local state

`~/.local/state/rime/releases.json`

```json
{
"lastBooted": "2026.10.02",
"lastOpenedNotes": "2026.10.02",
"autoOpenNotes": true
}
```

Per-user state is preferable to a machine-global “seen” bit: on a shared machine, each user gets the notes once. No state is uploaded.

### 7.6 Release metadata baked into the image

`/usr/share/rime/release.json`

```json
{
"schema": 1,
"id": "2026.10.02",
"version": "2026.10.02",
"channel": "stable",
"revision": "<rime-os git sha>",
"shellRevision": "<rime-shell git sha>",
"imageDigest": "sha256:...",
"notes": "https://rimeos.com/updates/2026.10.02"
}
```

Also stamp the stable fields into OCI labels so rime changelog and external provenance tools can report them without trusting the website. The existing org.opencontainers.image.version and revision labels are natural anchors.

### 7.7 Trust boundary

> **CRITICAL ARCHITECTURE RULE**
>
> rimeos.com is informational. Update trust, channel eligibility, staged rollout, halt decisions and image signatures continue to live in the registry/cosign path. A website outage must never prevent a machine from checking, staging, booting or rolling back an update.

## 8. Release pages — /updates/\<release\>

### 8.1 Page anatomy

> 1\. Hero: “Rime 2026.10.02” + short release title + date + channel + installed-state treatment if opened from Rime.
>
> 2\. Three to five highlights, each with one strong visual or short capture. No 30-card grid.
>
> 3\. Shell: visual changes and interaction changes, with real before/after only when that comparison is meaningful.
>
> 4\. System: update architecture, packages, performance, boot, drivers, recovery and other under-the-hood changes.
>
> 5\. Security: fixes and trust-chain changes, with links to advisories where appropriate.
>
> 6\. Smaller improvements: dense but readable grouped list.
>
> 7\. Fixed: grouped bug fixes; do not bury significant fixes in “misc”.
>
> 8\. Known issues: visible, honest and specific.
>
> 9\. Developer changes: CLI/API/config/schema changes and migration notes.
>
> 10\. Provenance: OS revision, Shell revision, image digest, CI/build link and source links.
>
> 11\. Rollback/help: exact command and docs path if the release causes trouble.

### 8.2 Installed-state variant

If the URL includes a valid from= release ID, add a small local-only banner: “You updated from 2026.09.15.” The page computes which release entries fall between from and current using a static release index. No request to a Rime analytics API is needed.

### 8.3 Change schema

```typescript
type Change = {
id: string
area: "shell" | "system" | "security" | "gaming" | "agents" | "developer"
kind: "new" | "improved" | "fixed" | "security" | "removed"
title: string
summary: string
detail?: string
media?: Media[]
docs?: string
source?: string[]
breaking?: boolean
}
```

### 8.4 Release visual style

- Every release may use a featured wallpaper/palette, but the content stays recognisably Rime through geometry and typography.

- Feature films can use the Continuum product-film assets; short loops should not autoplay with sound.

- Do not show a fake “snow/ice” aesthetic just because the product is named Rime.

- Technical fixes use quieter layouts than hero features. Importance controls visual weight.

### 8.5 Release index — /updates

- Latest stable release hero.

- Filter by stable / candidate / beta / edge where public notes exist.

- Filter by Shell / System / Security / Gaming / Agents.

- Search release notes.

- RSS/Atom and JSON feeds.

- Current rollout or halt status may be displayed from published signed metadata, but it is informational and timestamped.

## 9. Release publishing pipeline

### 9.1 One source of truth

Create a release-content directory in the web repository or a small dedicated release-metadata repository. The important rule is that the human page and machine-readable manifest are generated from the same structured source.

```text
content/updates/2026.10.02/
release.yaml
index.mdx
media/
shell-fluid.webm
shell-fluid.avif
update-rollback.avif
```

### 9.2 Publish order

> 1\. Merge and test Rime OS / Rime Shell changes.
>
> 2\. Build a candidate image pinned to exact OS + Shell revisions.
>
> 3\. Create release metadata and capture media from that exact candidate.
>
> 4\. Deploy rimeos.com release page and machine-readable release JSON.
>
> 5\. CI verifies the canonical release URL returns 200, metadata matches the candidate revisions, all referenced media exists and accessibility metadata is present.
>
> 6\. Only then promote the image/channel tag that normal users can receive.
>
> 7\. After promotion, a smoke test resolves the promoted digest and asserts that its baked release.json points at the already-live page.

### 9.3 Why this ordering matters

> **NO DEAD “WHAT’S NEW” LINKS**
>
> A release is never promoted before its page exists. The page can be corrected later, but its URL and release identity are permanent.

### 9.4 Edge automation

Edge cannot require hand-produced hero media for every build. Generate compact edge notes automatically from structured change fragments or merged pull requests. Curated visuals are reserved for candidate/stable promotions and major beta drops.

### 9.5 Change fragments

```yaml
changes/1234-fluid-nexus.yaml
area: shell
kind: improved
title: Nexus now forms from the top notch
summary: Settings drips from the centre notch and resolves into the existing window.
public: true
```

A release job collects fragments since the previous promoted digest. Humans can edit the stable narrative without rewriting the factual list from memory.

## 10. Website technical architecture

### 10.1 Recommended stack

| **Layer**              | **Recommendation**                          | **Reason**                                                                                                                     |
|------------------------|---------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------|
| Site generator         | Astro + TypeScript                          | Excellent static output for product/release/docs content; interactive islands only where the experience needs them.            |
| Interactive components | React islands or framework-light TypeScript | Keep the majority of the page static; reserve hydration for Shell demos, search, palette switching and complex fluid surfaces. |
| Motion core            | Shared TypeScript/JS package                | Wall-clock spring solver, motion roles, Reduce Motion policy and web geometry adapters.                                        |
| Fluid geometry         | SVG paths / CSS clip-path where possible    | The current Shell geometry.js is already plain JS. Reuse/port the mathematics instead of faking the motion in video only.      |
| Content                | MDX + typed YAML/JSON collections           | Release notes and product stories live in version control and are reviewable.                                                  |
| Media                  | AVIF/WebP stills; WebM/MP4 video            | Modern formats with fallbacks. No autoplay audio.                                                                              |
| Hosting                | Static CDN / Cloudflare Pages preferred     | Fast global delivery and low operational burden. Rime updates must not depend on it.                                           |
| Large media            | Object storage/CDN when needed              | Keep repository/deploy size sane; immutable hashed assets.                                                                     |

### 10.2 Repository shape

```text
rime-web/
src/
components/
layouts/
motion/
geometry/
palettes/
pages/
content/
updates/
journal/
docs/
public/
scripts/
build-release-index.ts
verify-release-links.ts
generate-og.ts
tests/
visual/
motion/
release-integration/
```

### 10.3 Shared motion package

Long-term, avoid copying motion.js into two repositories by hand. Extract the pure arithmetic into a small source package that can generate both a JS/TS web module and the QML-consumed JS form, or generate one from the other in CI. The same applies to palette role names and selected fluid-family mathematics where licensing/architecture permits.

### 10.4 Progressive enhancement

- Navigation and content links are real anchors.

- Download buttons work without client-side routing.

- Release pages render full text server/static-side.

- Interactive demos hydrate after the essential page is readable.

- If WebGL/SVG animation fails, show the real final-state capture rather than an empty stage.

### 10.5 Routing

```text
/
/shell
/system
/personalise
/agents
/security
/download
/install
/docs/...
/updates
/updates/[release]
/journal/[slug]
/source
/privacy
/brand
```

## 11. Web component system

| **Component** | **Purpose**                                       | **Motion / behaviour**                                         |
|---------------|---------------------------------------------------|----------------------------------------------------------------|
| RimeFrame     | Persistent desktop-inspired top frame             | Static base; connected surfaces originate from its zones.      |
| RimeMark      | Replaceable final mark asset                      | Optional Convergence on first entry; palette/mono treatments.  |
| FluidSurface  | Shared source-aware overlay container             | Spring-driven geometry; reversal-safe.                         |
| SelectionPill | Tabs/nav/current filter                           | Selection spring; slight controlled overshoot.                 |
| OpenPill      | Shows a trigger owns an open surface              | State/effect transition, not decorative bounce.                |
| LightField    | Wallpaper-derived atmospheric background          | Very slow effect motion; disabled under Reduce Motion.         |
| ProductStage  | Hosts real captures or interactive reconstruction | Responsive crop, play/pause, reduced-motion fallback.          |
| PaletteRail   | Wallpaper/Matugen demo selector                   | BOTTOM_RISE on mobile, side rail on desktop.                   |
| ReleaseHero   | Version + release identity                        | May use NOTCH_DROP only for major releases.                    |
| ChangeStack   | Grouped release changes                           | STACK_REFLOW when filtering.                                   |
| StatusCapsule | Transient copy/download/status feedback           | CAPSULE.                                                       |
| CommandChip   | Commands and digests                              | Selectable mono text; copy action.                             |
| EvidenceBlock | Benchmarks/provenance                             | Quiet technical presentation; always links methodology/source. |
| DownloadPanel | Artifact selection and verification               | RIGHT_POUR on desktop; bottom rise on mobile.                  |
| SearchLens    | Site/docs/update search                           | LENS_REVEAL.                                                   |

### 11.1 Buttons

Rime web buttons should follow the Shell action grammar: clear filled surface, soft state change, fast press compression and deliberate release. Primary buttons may use accentContainer/onAccent semantics, but the site should not turn every action into a saturated accent pill.

### 11.2 Focus

Keyboard focus should be a distinct two-layer ring with a small gap, echoing the Shell focus language. Pointer interaction must not leave the keyboard focus ring stuck on every clicked control.

### 11.3 Cards

Cards are semantic containers. A page with thirty identical rounded rectangles is a failure. Full-bleed stages, inline editorial sections and restrained grouped surfaces should dominate.

## 12. Homepage wireframe, section by section

| **Viewport sequence** | **Layout**                                                        | **Animation / interaction**                                              |
|-----------------------|-------------------------------------------------------------------|--------------------------------------------------------------------------|
| 0 — Entry             | Full viewport wallpaper Light Field; Rime mark; minimal copy.     | Convergence once/session; frame settles.                                 |
| 1 — Shell             | Desktop fills most of viewport; one sentence at edge.             | CENTER_BLOOM then RIGHT_POUR; visitor can interact.                      |
| 2 — Personalise       | Wallpaper gallery + product stage.                                | Select wallpaper → product Matugen roles change → Light Field follows.   |
| 3 — Motion            | Close crops of notch/surface geometry and high-refresh behaviour. | Slow explanatory replay with scrub control; not forced scroll animation. |
| 4 — System            | Two-deployment visual: current → staged → reboot → rollback.      | Connected horizontal flow; short labels.                                 |
| 5 — Work / Play       | Real desktop montage, profiles, package/application story.        | Film clips; restrained transitions.                                      |
| 6 — Agents            | Conditional on product readiness.                                 | Real Agent Center/workspace flow.                                        |
| 7 — Latest update     | Large latest-release editorial card.                              | Preview clip + “See what changed”.                                       |
| 8 — Get Rime          | Requirements + one clear download action.                         | Download surface can pour from persistent top-right trigger.             |

### 12.1 What not to put on the homepage

- A massive distro-comparison table.

- A wall of GitHub statistics.

- Generic “Fast / Secure / Beautiful” cards with no proof.

- A terminal screenshot as the main identity.

- Neofetch/fastfetch as marketing.

- Distro-war copy or claims that Rime is “the best Linux distro”.

- Ten auto-playing videos at once.

- Every Settings page. Link to deeper product pages instead.

## 13. Content and writing language

### 13.1 Voice

- Short, specific and calm.

- Confident without claiming perfection.

- Technical when the evidence is technical; plain when the user only needs the consequence.

- No “revolutionary”, “next-generation”, “AI-powered everything”, “blazing fast” or “built different” filler.

- No attacks on GNOME, KDE, Windows, macOS, Arch, Fedora or other distros. Explain Rime on its own terms.

### 13.2 Evidence pattern

Every meaningful product claim should have an evidence path. A user should be able to move from a one-line product statement to a deeper explanation, then to source/methodology if they care.

> **EXAMPLE**
>
> Product line: “Updates are staged, not painted over the running system.”
>
> Detail: show current and staged bootc deployments.
>
> Evidence: link Rime update docs, source, signed-image provenance and rollback instructions.

### 13.3 Suggested homepage copy skeleton

These are directional, not a locked tagline:

- Rime — A Linux desktop that moves as one.

- Your wallpaper does more than decorate the desktop. It becomes the palette.

- A new system is staged beside the one you are using. If it is wrong, go back.

- The Shell and the system move together.

- See what changed in the update you just installed.

## 14. Performance, accessibility and input quality

### 14.1 Performance budgets

| **Budget**       | **Target**                                                                                                      |
|------------------|-----------------------------------------------------------------------------------------------------------------|
| Initial HTML/CSS | Useful page shell and copy should arrive without waiting for the interactive demo bundle.                       |
| JavaScript       | Hydrate only interactive islands. Avoid shipping the entire marketing site as one SPA bundle.                   |
| Animation        | At 120 Hz the whole frame is ~8.3 ms. Main-thread animation work should consume only a minority of that budget. |
| Media            | Poster first; lazy-load below fold; no full-resolution 4K video on mobile by default.                           |
| Layout           | No large shifts when media loads. Reserve aspect ratios and dimensions.                                         |
| Hero             | Prioritise one hero asset; everything else defers.                                                              |

### 14.2 High-refresh correctness

The website should inherit the lesson from Rime Shell’s SpringFollower work: a fixed 16 ms integrator visibly steps on a 144 Hz panel. Web springs therefore step once per requestAnimationFrame using actual elapsed wall-clock time, and motion QA includes 60, 120 and 144 Hz hardware where available.

### 14.3 Accessibility

- Respect prefers-reduced-motion and provide an in-site Reduce Motion test toggle for demos.

- Meet WCAG contrast for all generated palettes; reject a palette role mapping at build time if contrast fails.

- All interactive demos have keyboard operation or an equivalent non-interactive explanation.

- Videos have captions when spoken content exists and text summaries when the motion itself carries information.

- Focus states remain visible on every palette.

- Do not encode status by colour alone.

- Search, release filters and update accordions use semantic HTML first.

### 14.4 Power/data modes

If Save-Data is enabled, if the device is clearly constrained, or if the visitor disables motion, prefer stills and final-state captures over background video/WebGL. The website should feel premium because it responds appropriately, not because it forces maximum effects.

## 15. Responsive product storytelling

| **Class**           | **Behaviour**                                                                                                         |
|---------------------|-----------------------------------------------------------------------------------------------------------------------|
| Phone               | Single-column editorial flow; product demos are recomposed vertical cuts; compact top capsule; bottom-rise selectors. |
| Tablet              | Two-column editorial opportunities; full-width demo stages; simplified frame.                                         |
| Laptop 13–16″       | Primary design target for desktop site; full Rime frame and interactive Shell stages.                                 |
| Desktop / ultrawide | Limit readable text width; let product stages grow, not paragraphs. Keep interactions centred on real source points.  |
| 4K / high DPI       | Scale media and SVG cleanly; do not simply enlarge every radius and spacing value.                                    |

### 15.1 Demo capture variants

Every flagship product scene should have purpose-built 16:9, 9:16 and 4:5 compositions where the layout materially changes. Do not rely on CSS cropping a single desktop master for social, mobile site and desktop site.

## 16. Download and installation experience

### 16.1 Download intent

A visitor who clicks Download should immediately know which artifact they need, whether their hardware is compatible, how big it is, and how to verify it. The page should not assume they already understand bootc, ostree or Linux installation vocabulary.

### 16.2 Data-driven artifact manifest

`downloads.json`

```json
{
"release": "2026.10.02",
"artifacts": [
{
"kind": "iso",
"arch": "x86_64",
"url": "...",
"bytes": 0,
"sha256": "...",
"signature": "..."
}
]
}
```

The page renders only what is in the published manifest. This prevents a stale design from advertising installers or architectures that CI did not produce.

### 16.3 Installation hand-off

- Give the simplest recommended path first.

- Show destructive-disk warnings at the correct step, not as a generic red wall.

- Link firmware/UEFI and Secure Boot guidance before rebooting from current OS.

- After installation, route users into Rime first-run rather than back to the website unless they ask for docs.

## 17. Discoverability, social and update sharing

### 17.1 Search engine structure

- Each product page has one clear canonical URL and specific title/description.

- Release pages remain permanently accessible and indexable.

- Update query variants such as ?from= use the canonical release URL to avoid duplicate indexing.

- Docs pages use stable slugs and explicit redirects on moves.

- Generate sitemap, RSS/Atom and JSON feed automatically.

### 17.2 Social cards

Generate Open Graph images from the same release metadata and palette pack used by the page. The card should be minimal: Rime mark, release/title, one product crop or Light Field. No generic “NEW UPDATE!” thumbnail style.

### 17.3 Product film integration

The Continuum film system and website should share assets, but each medium gets its own composition. A 9:16 social film can link directly to the matching /updates or /shell anchor. The website uses shorter silent loops or interaction captures rather than embedding an entire social edit into every section.

## 18. Privacy and web security

### 18.1 Default privacy stance

- No machine ID, rollout slot, hostname, hardware inventory or installed-package list is included in update-note URLs.

- The from= parameter contains only a public release identifier.

- Do not require an account to download Rime, read docs or read updates.

- Avoid invasive analytics. If aggregate web analytics are enabled, document exactly what is collected.

- Do not use third-party advertising trackers.

### 18.2 Web security

- Strict Content Security Policy; minimise third-party scripts.

- Subresource integrity or self-host critical static assets where practical.

- Immutable hashed media URLs and long cache lifetimes.

- Release/download manifests generated by CI and validated against source artifacts.

- Security.txt under /.well-known/security.txt.

- The site never serves executable update policy to Rime. Registry/cosign trust remains separate.

## 19. QA and release gates for the website

### 19.1 Visual matrix

| **Axis** | **Required coverage**                                                   |
|----------|-------------------------------------------------------------------------|
| Viewport | Phone, tablet, laptop, desktop, ultrawide, 4K.                          |
| Palette  | At least six representative Matugen palettes in dark and light schemes. |
| Motion   | Normal, Reduced Motion, motion disabled.                                |
| Refresh  | 60 Hz + high-refresh hardware validation.                               |
| Input    | Mouse, trackpad, keyboard, touch where applicable.                      |
| Browser  | Current Chromium, Firefox and WebKit/Safari equivalents.                |

### 19.2 Automated tests

- Playwright visual snapshots for each page/palette/viewport baseline.

- Geometry tests for every fluid family used on web, including open/close/reversal trajectories.

- Release-link test: every promoted release ID returns a page and matching JSON.

- Contrast tests for generated palettes.

- Keyboard/focus traversal tests.

- No-JS smoke test for core navigation/content/download links.

- Performance budget test in CI for bundle size and largest media.

- Broken-link and alt-text checks.

### 19.3 Human sign-off

- Does the homepage still feel good after ten visits, not only in a demo recording?

- Does every animation explain structure or state?

- Does it feel like Rime Shell rather than an Apple/Nothing imitation?

- Can a user reach the download and update notes immediately?

- Is any visual claiming a feature that has not shipped?

- Does the site remain calm on a low-power laptop and readable on a phone?

## 20. Implementation roadmap

| **Phase**                   | **Deliverable**                                                                       | **Exit gate**                                                                   |
|-----------------------------|---------------------------------------------------------------------------------------|---------------------------------------------------------------------------------|
| 0 — Identity freeze         | Rime naming rules, provisional/final mark interface, domain/DNS, type/palette tokens. | No hard-coded APEX branding in new site code.                                   |
| 1 — Foundation              | Astro/TS repo, routing, global frame, content collections, CI/deploy.                 | Static pages fast and accessible without motion.                                |
| 2 — Continuum Web           | Shared motion roles, spring engine, fluid surface primitives, Reduce Motion.          | Geometry and reversal tests green; 60/144 Hz visual check.                      |
| 3 — Homepage                | Opening sequence, Shell stage, Matugen personalization, system story, download CTA.   | Complete responsive hero-to-download journey.                                   |
| 4 — Product pages           | Shell, System, Personalise, Security; Agents only if ready.                           | Every claim tied to current product evidence.                                   |
| 5 — Updates                 | /updates index, release schema, release pages, cumulative from= view.                 | Published release can be read by humans and machines.                           |
| 6 — OS integration          | release.json in image, ReleaseService in Shell, once-per-user browser deep link.      | Real upgrade in test VM boots new image and opens the exact matching page once. |
| 7 — Downloads/docs          | Artifact manifest, install flow, docs/search.                                         | Fresh installer can be found, verified and used from the site.                  |
| 8 — Film/social integration | Web-specific loops, OG cards, launch films linked to site stories.                    | One coherent campaign across web and social.                                    |
| 9 — Release hardening       | Cross-browser, performance, accessibility, security headers, link checks.             | All release gates met.                                                          |

### 20.1 Build order inside the homepage

> 1\. Static layout and copy hierarchy.
>
> 2\. Global frame and navigation.
>
> 3\. Motion primitives and Reduce Motion.
>
> 4\. Hero product stage.
>
> 5\. Personalisation scene.
>
> 6\. System/update scene.
>
> 7\. Latest-release integration.
>
> 8\. Media optimisation and responsive recomposition.
>
> 9\. Visual/performance polish last — do not mask an unstable structure with effects.

## 21. Acceptance criteria

The website is ready to become the public face of Rime only when all of the following are true:

- A first-time visitor can identify Rime as a Linux operating system/desktop and find Download without hunting.

- The site has no fixed corporate accent; curated scenes use real Matugen-derived roles.

- At least the core Shell interactions use the same source-aware motion logic as the product, not generic fade-up animation presets.

- All major product footage/captures identify the exact Rime build or revisions used.

- Reduced Motion is complete, not an afterthought.

- The primary pages are fast and complete on mobile.

- Every release promoted to users has a live canonical update page before promotion.

- A real Rime update can boot, detect the new release, and open the matching notes once per user.

- The release deep link contains no device identifier or hidden telemetry token.

- The website can be offline without blocking update checks, update trust, boot or rollback.

- The download page is generated from actual published artifacts and gives verification data.

- Rime Shell, the social product films and rimeos.com feel like one system.

> **DEFINITION OF SUCCESS**
>
> Someone should be able to see ten seconds of rimeos.com with the logo hidden and still say: “that looks like the same thing as Rime Shell.”

## Appendix A — Current APEX → future Rime implementation anchors

These paths are the current source reference as of 28 September 2026. Rename paths and identifiers during the Rime migration, but preserve the architectural intent unless the product itself changes.

| **Current source**                           | **What the website should inherit**                                                                     |
|----------------------------------------------|---------------------------------------------------------------------------------------------------------|
| apex-shell/src/theme/Motion.qml              | Semantic motion roles, speed/reduced-motion policy.                                                     |
| apex-shell/src/theme/motion.js               | Durations, curves, spring roles and wall-clock-friendly arithmetic.                                     |
| apex-shell/src/shapes/fluid/geometry.js      | Source-aware fluid-family geometry and trajectory concepts.                                             |
| apex-shell/src/theme/Theme.qml               | Semantic surface/text roles and font-family choices.                                                    |
| apex-shell/src/theme/Colors.qml              | Matugen-fed live role mapping.                                                                          |
| apex-shell/src/services/WallpaperService.qml | Wallpaper → Matugen output behaviour.                                                                   |
| apex-shell/src/services/UpdateService.qml    | Current standalone Shell update UX; do not make this the future Rime OS release-note trust path.        |
| apex-shell/src/windows/UpdatePopup.qml       | Existing update status UI patterns; future Rime update surface should be integrated with image updates. |
| apex-os/AGENTS.md                            | Image-based architecture; Shell vendored into image so OS/UI update and rollback together.              |
| apex-os/docs/update-channels.md              | edge/beta/candidate/stable, signed rollout document, no telemetry-service dependency.                   |
| apex-os/apexd/apex/src/ops.rs                | Current update/rollback/changelog plumbing and OCI provenance access.                                   |
| apex-os/Containerfile.base                   | OCI revision/version labels and vendored Shell provenance.                                              |

### A.1 Rebrand-specific cleanup

- Rename user-visible APEX strings and public commands/components to Rime on one coordinated rebrand branch; avoid a long half-APEX/half-Rime period.

- Do not blindly rename compatibility paths or update origins that must remain valid for installed APEX machines; migration needs explicit aliases and transition logic.

- Replace old fixed chartreuse branding documentation with Matugen/environmental colour rules.

- Make the website release feed understand the first Rime release can have an APEX predecessor for upgrade-history purposes without exposing confusing legacy naming to new installs.

- Treat the final Rime mark and redesigned Convergence as swappable assets until sign-off.

### A.2 Rebrand and upgrade invariants

| **Invariant**                      | **Rule**                                                                                                                                                                         |
|------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Existing machines keep updating    | Do not rename or remove an update origin, registry tag, compatibility alias or migration entry point until every supported APEX installation has a tested path onto Rime.        |
| Identity changes atomically        | The public product may become Rime in one release, but compatibility identifiers can remain behind the scenes where changing them would strand users or break rollback.          |
| Rollback stays intelligible        | A Rime deployment must be able to roll back to an APEX-labelled predecessor without the Shell, boot menu or release-history UI pretending that predecessor was Rime.             |
| State is migrated, not reset       | User settings, Matugen outputs, update-channel state and per-user release-note state receive explicit schema/path migrations. A rebrand is never a reason to discard user state. |
| Trust continuity is preserved      | Image signing, verification identities and rollout policy change only through an explicit trust migration. The website does not bridge or weaken that trust boundary.            |
| Release history crosses the rename | The first Rime release can name its APEX predecessor internally so ?from= produces a complete cumulative change view, while public navigation defaults to Rime naming.           |
| Old links fail gracefully          | Published APEX documentation or release links that remain useful should redirect to the matching Rime page or a migration explainer instead of becoming silent 404s.             |

## Appendix B — Recommended release-page example

Example only; the final title/copy is written from the real release.

> **RIME 2026.10.02**
>
> This update makes the Shell feel physically connected from lock screen to settings, brings the new release-notes hand-off, and improves update/recovery behaviour.

### Highlights

- Settings forms from the centre notch and settles into Nexus.

- Wallpaper changes retune the whole desktop through Matugen roles.

- Update notes now open once after the new deployment boots.

### System

A concise explanation of what changed in the image, update path, package model or boot stack — with source links and exact caveats.

### Fixed

Grouped factual fixes with enough detail to recognise the problem, not raw commit messages.

### Known issues

Visible section even when short. If there are none known, say “No known release-blocking issues” rather than omitting the heading and implying perfection.

### Provenance

```text
OS revision <sha>
Shell revision <sha>
Image digest sha256:...
Channel stable
Released 2026-10-02
```

## Appendix C — Final design checklist

- [ ] Rime mark asset is final or cleanly swappable.

- [ ] No fixed blue/chartreuse brand colour remains in web tokens.

- [ ] Default scene palette is generated from the selected launch wallpaper.

- [ ] Global frame works at keyboard, mouse and touch breakpoints.

- [ ] CENTER_BLOOM and RIGHT_POUR web surfaces reverse without kinks.

- [ ] Hero does not block interaction while Convergence plays.

- [ ] Full hero Convergence does not replay on every internal navigation.

- [ ] No scroll hijacking.

- [ ] Reduced Motion removes spatial motion and decorative loops.

- [ ] Shell page shows real source-origin interactions.

- [ ] Personalise page changes wallpaper, Shell palette and Light Field together.

- [ ] System page accurately explains image update/rollback architecture.

- [ ] Updates index and release pages are generated from typed metadata.

- [ ] from= cumulative release view works without telemetry.

- [ ] New image ships release.json with canonical notes URL.

- [ ] First boot into new release opens notes once per user.

- [ ] Rollback does not masquerade as an update.

- [ ] Website outage cannot block Rime update/rollback.

- [ ] Download page only lists published artifacts.

- [ ] Every download shows digest/signature verification.

- [ ] All flagship media has mobile compositions.

- [ ] All videos have posters; spoken videos have captions.

- [ ] Generated palettes pass contrast tests.

- [ ] No APEX user-facing naming remains after public Rime launch except explicit migration/help context.

- [ ] Social films deep-link to the relevant product/update page.

- [ ] Visual regression, release-link, accessibility and performance tests are green.
