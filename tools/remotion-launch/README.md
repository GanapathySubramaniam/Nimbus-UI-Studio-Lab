# Nimbus UI Studio Lab launch film

This is the maintainable Remotion source for the product-launch version of the Nimbus Studio demo. It combines the authentic 57-second screen recording with a 68-second editorial launch sequence, branded transitions, and the Nimbus product narrative.

## Render locally

```powershell
npm install
npm run test
npm run lint
npm run render:launch
```

The final H.264 render is written to [`../../docs/media/nimbus-studio-launch-demo.mp4`](../../docs/media/nimbus-studio-launch-demo.mp4). Open `npm run dev` to inspect the composition in Remotion Studio.

## Inputs and design choices

- `public/studio-workflow.mp4` is a checked-in copy of the authentic Studio walkthrough, not a mock interface.
- `public/nimbus-studio-logo.jpg` is the supplied Nimbus brand mark.
- The composition is 1600 × 900 at 30 fps and 68 seconds long. It uses no external font or media download at render time.
- The launch story states the proven product result: **20× fewer UI-code tokens for Claude Code and Cursor**, so agents can focus on the important product work.

## Remotion

The video is rendered with [Remotion](https://www.remotion.dev/). Review Remotion's current [license terms](https://www.remotion.dev/license) before commercial distribution or deployment. Nimbus source in this folder is Apache-2.0 under the repository license; Remotion and its dependencies remain subject to their own licenses.
