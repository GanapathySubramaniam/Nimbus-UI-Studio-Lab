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
            "id": "7fa6f7d1-f254-4263-887e-f6b3bb5d3015",
            "kind": "badge",
            "name": "Badge",
            "x": 40,
            "y": 40,
            "width": 170,
            "height": 34,
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
              "title": "Operational",
              "subtitle": "",
              "value": "",
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
            "id": "45a50242-df26-4f30-9811-6c4bb38680a5",
            "kind": "table",
            "name": "Data table",
            "x": 40,
            "y": 100,
            "width": 480,
            "height": 120,
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
              "title": "",
              "subtitle": "",
              "value": "View all",
              "items": "Customer | Status | Amount\nCustomer feedback synthesis | Complete | $2.17",
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
