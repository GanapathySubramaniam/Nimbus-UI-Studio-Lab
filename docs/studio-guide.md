# Nimbus prototype studio guide

## Build an app, one page at a time

A project contains up to 50 named pages and one start page. Each page is an independent editable canvas with up to 200 widgets. Use the page selector above the canvas to switch pages, **Manage pages** to rename, duplicate, delete or choose a start page, and **17 templates** to add a designed page without replacing the existing ones. A blank page is available from Manage pages or the project menu.

The four small legacy starters in Components replace only the active page and remain undoable. The template gallery adds a new page. Deleting a page clears incoming links; undo restores both the page and its links. Duplicating a page creates new widget identities and redirects self-links to the duplicate.

The 17 templates are Analytics overview; Revenue & sales; CRM pipeline; Commerce operations; Finance & expenses; Project delivery; Team directory; Support inbox; Marketing performance; Product analytics; Agent workspace; Workflow operations; Knowledge library; Security & audit; Organization settings; Sign-in & onboarding; and SaaS plans & billing. They are starting compositions, not backend-connected applications.

## Arrange and customize

Click or drag a component from the library onto the canvas. Drag a selected widget to move it; use the bottom-right handle to resize. Width, height and X/Y properties offer precise alternatives. Arrow keys move a focused widget by 1px, or 10px with Shift. The resize handle also accepts arrow keys.

Use the **+ Text** shortcut above the canvas to create an independent text component. Headings and text are also in the component library. Content properties edit title, subtitle, value/button label and list/table/chart content. Tables use pipe-separated columns; chart data uses `Label | number` rows.

All 75 visual style presets remain available. A style applies only to the selected widget. Override its colors, typography, radius, border, padding, elevation and opacity afterwards. The studio interface stays neutral white/off-white. Source-company names identify independent interpretations, not endorsed official design systems or included proprietary fonts.

Layers controls stacking, visibility and locking. Hidden widgets remain in project data but do not render in a page. Ctrl/Command D duplicates; Delete removes; Ctrl/Command Z undoes and Shift Z redoes. History keeps 60 prior project states. Escape deselects; / focuses component search.

## Backgrounds, images and fine text controls

Pages and widget surfaces support solid colors, linear and radial gradients, and image backgrounds. Gradient controls include editable stops and position/angle. Image backgrounds include cover/contain/auto sizing, repeat and X/Y placement.

Upload PNG, JPEG, WebP or GIF files up to 2 MB each and 40 million decoded pixels. Background uploads work on any widget or page. Image, avatar, card and sidebar widgets additionally support content images; sidebar logo dimensions and fit can be changed independently. Add meaningful alt text to content images. Background images are decorative and must not be the only way essential information is conveyed.

Title, subtitle and value can receive separate typography overrides, including size, weight, family, color, line-height, letter spacing, alignment and decoration. Compound widgets remain catalog-defined structures: this is not an arbitrary DOM editor, and the canvas does not import or execute user HTML or CSS.

HTTPS image URLs remain external resources. Upload the image itself for an asset-complete offline export; remote URLs are not automatically fetched or bundled. SVG/HTML and executable URLs are rejected.

## Motion and component states

Motion properties separate entrance, hover, press and loading behavior. Choose fade/slide/scale entrance, lift/scale/glow hover, press/pulse click, loading shimmer/pulse/spinner/static, easing, duration, delay and bounded entrance repetition. Replay restarts entrance animation. Loading motion is visible when the widget state is Loading.

Default, loading, disabled, error and success are supported component states. Reduced-motion preferences suppress decorative animations. Business widget states are authored samples, not live network or backend state.

## Connect and preview

Under Content properties, set a widget's page target. Sidebar/navigation items can have individual targets. Targets are project page IDs, not executable expressions or arbitrary script URLs. Create destination pages first; then choose them in the link selectors.

**Preview** opens a full-window interactive prototype without editor panels. Select desktop/full width, tablet or mobile; navigate using your authored links; use Restart to return to the start page. **Fullscreen** requests the browser's native fullscreen mode where allowed. If unsupported, full-window preview remains available. Back to editor or Escape closes preview and restores editor focus.

Native inputs, checkbox/switch controls, details/accordion and tab interactions work. Forms do not submit to a backend, and sample authentication, billing, approvals and agent operations do not execute services.

Desktop preserves authored geometry. Mobile stacks widgets in document/layer order below the renderer's mobile breakpoint. Freeform desktop positioning does not infer a custom responsive grid. Wider tablet previews may scroll horizontally. Judge parity at equal viewport sizes and with the same installed fonts.

## Export and use the code

Export supports the whole app, the current page or one selected widget:

- **React package ZIP:** a runnable Vite/React project, its local Nimbus runtime package with source, project data, styles, and deduplicated uploaded image files. Extract, follow its README, install dependencies, and run its development/build commands. The local package does not require an unpublished Nimbus npm registry release.
- **React component code:** the component entry uses the local runtime included in the ZIP. Copy the accompanying runtime/data when integrating into an existing app; copying only an import statement cannot install a package.
- **Standalone HTML:** one file with styles, uploaded images embedded and fixed prototype navigation. Whole-app HTML includes all pages. Page/widget scope omits other pages and cannot navigate to destinations that were not exported.
- **Nimbus project JSON:** a portable editable backup. Import it through the project menu to resume designing.

The renderer is shared across canvas, preview and generated output. React exports are data-driven Nimbus components, not a code round-trip editor for arbitrary application source. Connect backend data/actions in the consuming app. Assets, runtime, dependencies and licenses are listed in the downloaded package.

## Local database, migration and recovery

Autosave uses IndexedDB on this browser origin, with ordered writes and visible saving/error status. Legacy version-1 single-page localStorage projects migrate to version-2 project data; the legacy backup is retained. Import accepts both versions after validation. Unsupported versions or malformed data are rejected before state replacement.

The local database is not a server, cloud account or multi-user collaboration service. Download JSON backups regularly. Clearing browser data, changing origin or switching devices does not carry the project along. Browser quotas vary. On **Not saved — download project**, download JSON before closing.

Limits: 50 pages, 200 widgets per page, 12 MB serialized per page, 48 MB project JSON, 2 MB per uploaded image; page widths 320–2560 and heights 320–6000. Image-heavy history and exports consume memory; avoid repeatedly duplicating large images/pages beyond practical device capacity. A corrupted save is retained until a genuine edit permits replacement; selecting a widget does not overwrite recovery data.

## Accessibility and scope

The editor includes keyboard geometry controls, labels, native modal dialogs, focus restoration, reduced-motion and responsive panels. Arbitrary user-selected colors, font sizes or dense layouts can still produce inaccessible designs. WCAG conformance and a full assistive-technology matrix are not certified.

The catalog contains 40 widget types across navigation, content, data, forms, feedback, commerce and agentic interfaces. Production OAuth/SSO/MFA, live agent execution, AG-UI transport, A2UI interpretation, tenant isolation, cloud database synchronization and collaborative editing are not provided by this visual prototype builder.
