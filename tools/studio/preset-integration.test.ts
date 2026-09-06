import test from 'node:test';
import assert from 'node:assert/strict';
import * as presets from '../../packages/application-shell/src/studio/presets.ts';
import { createWidget, createDocument } from '../../packages/application-shell/src/studio/model.ts';
import { widgetCatalog } from '../../packages/application-shell/src/studio/catalog.ts';
import { createProject, parseProject } from '../../packages/application-shell/src/studio/project.ts';
import { createHistory, commitHistory, undoHistory, redoHistory } from '../../packages/application-shell/src/studio/history.ts';
import { renderPage } from '../../packages/application-shell/src/studio/render.ts';

test('all 75 descriptive presets supply independently applicable light and dark styles', () => {
  assert.equal(typeof presets.themedPreset, 'function', 'Theme adapter must exist');
  assert.equal(presets.designPresets.length, 75);
  const definition = widgetCatalog.find(item => item.kind === 'button')!;
  for (const preset of presets.designPresets) {
    const light = presets.themedPreset(preset.id, 'light');
    const dark = presets.themedPreset(preset.id, 'dark');
    assert.notEqual(light.style.background, dark.style.background, preset.id);
    for (const themed of [light, dark]) {
      const doc = createDocument(); doc.widgets = [createWidget(definition, themed)];
      const project = createProject(doc);
      assert.deepEqual(parseProject(JSON.stringify(project)), project);
    }
  }
  assert.throws(() => presets.themedPreset('missing', 'light'), /Unknown/);
});

test('applying a base theme preserves content, placement, images, logo and text overrides', () => {
  assert.equal(typeof presets.applyPresetStyle, 'function', 'Non-destructive style application must exist');
  const original = createWidget(widgetCatalog.find(item => item.kind === 'sidebar')!);
  original.presetId = 'legacy-project-style';
  original.content.title = 'My workspace';
  original.content.image = 'data:image/png;base64,aGVsbG8=';
  original.style.logo = { width: 72, height: 40, fit: 'contain' };
  original.style.text = { title: { fontWeight: 700 } };
  original.style.backdrop = { type: 'solid', color: '#ffffff' };
  const before = structuredClone(original);
  const selected = presets.themedPreset('editorial-warm', 'dark');
  const changed = presets.applyPresetStyle(original, selected);
  assert.equal(changed.presetId, 'editorial-warm');
  assert.equal(changed.style.background, selected.style.background);
  assert.equal(changed.style.backdrop, undefined, 'Old solid background must not hide new theme');
  assert.deepEqual(changed.content, original.content);
  assert.deepEqual(changed.style.logo, original.style.logo);
  assert.deepEqual(changed.style.text, original.style.text);
  assert.equal(changed.x, original.x);
  assert.deepEqual(original, before, 'Source snapshot is not mutated');
  assert.equal(presets.applyPresetStyle({ ...original, locked: true }, selected).presetId, original.presetId);
  original.style.backdrop = { type: 'image', src: original.content.image, size: 'cover', positionX: 50, positionY: 50, repeat: 'no-repeat' };
  assert.deepEqual(presets.applyPresetStyle(original, selected).style.backdrop, original.style.backdrop);
});

test('loading legacy IDs preserves stored visual snapshots without silently restyling them', () => {
  const doc = createDocument(); doc.widgets = [createWidget(widgetCatalog[0]!)];
  doc.widgets[0]!.presetId = 'airbnb';
  doc.widgets[0]!.style.accent = '#ff385c';
  const project = createProject(doc);
  assert.deepEqual(parseProject(JSON.stringify(project)), project);
});

test('theme application is one undoable snapshot and every rendered base remains portable', () => {
  const doc = createDocument(); doc.widgets = [createWidget(widgetCatalog.find(item => item.kind === 'stat')!)];
  for (const preset of presets.designPresets) for (const theme of ['light', 'dark'] as const) {
    const themed = presets.themedPreset(preset.id, theme);
    const changed = { ...doc, widgets: [presets.applyPresetStyle(doc.widgets[0]!, themed)] };
    const history = commitHistory(createHistory(doc), changed);
    assert.equal(history.past.length, 1);
    assert.deepEqual(undoHistory(history).present, doc);
    assert.deepEqual(redoHistory(undoHistory(history)).present, changed);
    assert.deepEqual(parseProject(JSON.stringify(createProject(changed))), createProject(changed));
    assert.ok(renderPage(changed).includes(themed.style.background), `${preset.id}/${theme} lost its surface`);
  }
});
