"use client";
// Requires packages/runtime from the React ZIP: npm install ./packages/runtime
// Keep its Apache-2.0 LICENSE and THIRD_PARTY_NOTICES.md when redistributing.
import { NimbusPrototype } from "@nimbus-ui/runtime";
import type { StudioProject } from "@nimbus-ui/runtime";
const project = {
  "version": 2,
  "name": "My Nimbus app",
  "startPageId": "page-home",
  "pages": [
    {
      "id": "page-home",
      "document": {
        "version": 1,
        "name": "Untitled page",
        "width": 1200,
        "height": 1000,
        "background": "#f8f9fb",
        "grid": 8,
        "widgets": [
          {
            "id": "26790e9f-663b-4d76-80be-41dd17b27a22",
            "kind": "agent",
            "name": "Agent status",
            "x": 40,
            "y": 40,
            "width": 360,
            "height": 200,
            "presetId": "muted-enterprise",
            "style": {
              "background": "#fdfdfe",
              "color": "#1e2024",
              "accent": "#496ba2",
              "borderColor": "#7e8795",
              "radius": 8,
              "borderWidth": 1,
              "padding": 27,
              "fontSize": 15,
              "fontFamily": "sans",
              "fontWeight": 400,
              "shadow": "small",
              "opacity": 100
            },
            "content": {
              "title": "Research agent",
              "subtitle": "12 tools connected",
              "value": "Ready",
              "items": "",
              "image": "",
              "imageAlt": ""
            },
            "motion": {
              "entrance": "none",
              "hover": "none",
              "click": "none",
              "duration": 240,
              "delay": 0
            },
            "state": "default",
            "locked": false,
            "hidden": false
          },
          {
            "id": "f81677a6-e644-4f69-813c-7de17c5d005c",
            "kind": "composer",
            "name": "Message composer",
            "x": 40,
            "y": 260,
            "width": 480,
            "height": 176,
            "presetId": "muted-enterprise",
            "style": {
              "background": "#fdfdfe",
              "color": "#1e2024",
              "accent": "#496ba2",
              "borderColor": "#7e8795",
              "radius": 8,
              "borderWidth": 1,
              "padding": 27,
              "fontSize": 15,
              "fontFamily": "sans",
              "fontWeight": 400,
              "shadow": "small",
              "opacity": 100
            },
            "content": {
              "title": "Message assistant",
              "subtitle": "Summarize this run",
              "value": "Send message",
              "items": "",
              "image": "",
              "imageAlt": ""
            },
            "motion": {
              "entrance": "none",
              "hover": "none",
              "click": "none",
              "duration": 240,
              "delay": 0
            },
            "state": "default",
            "locked": false,
            "hidden": false
          }
        ]
      }
    }
  ]
} satisfies StudioProject;
export default function NimbusApp() { return <NimbusPrototype project={project} />; }
