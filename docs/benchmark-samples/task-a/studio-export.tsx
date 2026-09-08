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
            "id": "d195c8e4-d9fb-4641-bc36-05d78a70a993",
            "kind": "heading",
            "name": "Heading",
            "x": 40,
            "y": 40,
            "width": 420,
            "height": 64,
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
              "title": "Portfolio overview",
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
            "id": "dd0d431b-448c-4aca-aa79-ed4812bdf2ce",
            "kind": "button",
            "name": "Button",
            "x": 900,
            "y": 40,
            "width": 220,
            "height": 52,
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
              "title": "New agent run",
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
            "id": "1ed9d3b6-ea86-4443-b105-d21a0bf522fc",
            "kind": "stat",
            "name": "Statistic",
            "x": 40,
            "y": 140,
            "width": 350,
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
              "title": "Active agents",
              "subtitle": "↗ 12%",
              "value": "24",
              "items": "+12.8%",
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
            "id": "06ff4641-21ac-4f4e-a067-89422ee9352e",
            "kind": "stat",
            "name": "Statistic",
            "x": 410,
            "y": 140,
            "width": 350,
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
              "title": "Tasks completed",
              "subtitle": "↗ 8.4%",
              "value": "1,284",
              "items": "+12.8%",
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
            "id": "870f1c49-44a2-409e-a3af-3d2cf754e7b1",
            "kind": "stat",
            "name": "Statistic",
            "x": 780,
            "y": 140,
            "width": 350,
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
              "title": "Success rate",
              "subtitle": "",
              "value": "98.6%",
              "items": "+12.8%",
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
