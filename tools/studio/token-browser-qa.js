// Playwright CLI run-code --filename; use a disposable browser profile.
async (page) => {
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const noise = [];
  const onConsole = message => { if (['error', 'warning'].includes(message.type())) noise.push(message.text()); };
  const onError = error => noise.push(error.message);
  page.on('console', onConsole); page.on('pageerror', onError);
  try {
    await page.setViewportSize({ width: 1600, height: 1000 });
    if (!await page.getByRole('dialog', { name: 'Token Studio' }).count()) {
      await page.getByRole('tab', { name: 'Styles', exact: true }).click();
      await page.getByRole('button', { name: 'Open Token Studio ↗', exact: true }).click();
    }
    const dialog = page.getByRole('dialog', { name: 'Token Studio' });
    const search = dialog.getByRole('textbox', { name: 'Search styles', exact: true });
    await search.fill('');
    await dialog.getByRole('combobox', { name: 'Style family' }).selectOption('All families');
    const options = dialog.getByRole('listbox', { name: 'Style presets' }).getByRole('option');
    const ids = await options.evaluateAll(nodes => nodes.map(node => node.dataset.presetOption));
    assert(ids.length === 75 && new Set(ids).size === 75, 'Expected 75 unique original styles');
    let views = 0;
    const failures = [];
    for (const width of [1600, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      for (const id of ids) {
        await dialog.locator(`[data-preset-option="${id}"]`).click();
        for (const mode of ['Light', 'Dark']) {
          await dialog.getByRole('radio', { name: mode, exact: true }).check();
          const result = await dialog.locator('.token-sheet').evaluate(sheet => {
            const css = getComputedStyle(sheet);
            const rgb = hex => `rgb(${[1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;
            const sample = sheet.querySelector('.token-sample-button');
            const button = getComputedStyle(sample);
            const heading = getComputedStyle(sheet.querySelector('h3'));
            const swatches = [...sheet.querySelectorAll('.token-color-item')];
            const errors = [];
            if (css.backgroundColor !== rgb(css.getPropertyValue('--nimbus-color-canvas').trim())) errors.push('canvas token not applied');
            if (css.color !== rgb(css.getPropertyValue('--nimbus-color-text').trim())) errors.push('text token not applied');
            if (heading.fontSize !== css.getPropertyValue('--nimbus-type-display').trim()) errors.push('display type token not applied');
            if (button.borderRadius !== css.getPropertyValue('--nimbus-shape-radius-small').trim()) errors.push('shape token not applied');
            if (parseFloat(button.minHeight) < 24) errors.push('control smaller than 24px');
            if (swatches.length !== 16 || swatches.some(item => getComputedStyle(item.querySelector('span')).backgroundColor !== rgb(item.querySelector('code').textContent))) errors.push('semantic swatches diverge');
            const detail = sheet.closest('.token-detail');
            if (detail.scrollWidth > detail.clientWidth + 1) errors.push(`horizontal overflow ${detail.scrollWidth}/${detail.clientWidth}`);
            const box = sheet.closest('dialog').getBoundingClientRect();
            if (box.left < 0 || box.right > innerWidth + 1 || box.top < 0 || box.bottom > innerHeight + 1) errors.push('dialog outside viewport');
            return { id: sheet.dataset.tokenPreset, theme: sheet.dataset.theme, errors };
          });
          if (result.errors.length) failures.push({ width, ...result });
          assert((await dialog.locator('.token-audit summary').innerText()).includes('46 semantic contrast checks pass'), `${id}/${mode}: contrast audit failed`);
          views++;
        }
      }
    }
    assert(failures.length === 0, JSON.stringify(failures));
    await page.setViewportSize({ width: 1600, height: 1000 });
    await search.fill('editorial warm');
    assert(await options.count() > 0 && await options.count() < 75, 'Search did not filter');
    await dialog.locator('[data-preset-option="editorial-warm"]').click();
    await dialog.getByRole('radio', { name: 'Light', exact: true }).check();
    await dialog.locator('.token-detail').evaluate(node => { node.scrollTop = 0; });
    await page.screenshot({ path: 'output/playwright/m1-editorial-warm.png' });
    await search.fill('');
    await options.first().focus();
    await page.keyboard.press('End');
    assert(await dialog.locator('[data-preset-option="high-contrast-max"]').getAttribute('aria-selected') === 'true', 'End failed');
    await page.keyboard.press('Home');
    assert(await dialog.locator('[data-preset-option="editorial-warm"]').getAttribute('aria-selected') === 'true', 'Home failed');
    await page.keyboard.press('ArrowDown');
    assert(await dialog.locator('[data-preset-option="void-terminal"]').getAttribute('aria-selected') === 'true', 'Arrow navigation failed');
    await dialog.getByRole('radio', { name: 'Dark', exact: true }).check();
    await dialog.locator('.token-detail').evaluate(node => { node.scrollTop = 0; });
    await page.screenshot({ path: 'output/playwright/m1-void-terminal.png' });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await dialog.getByRole('button', { name: 'Replay specimen' }).click();
    assert(await dialog.locator('.token-motion-mark').evaluate(node => getComputedStyle(node).animationName) === 'none', 'Reduced motion not honored');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await dialog.getByRole('button', { name: 'Replay specimen' }).click();
    assert(await dialog.locator('.token-motion-mark').evaluate(node => getComputedStyle(node).animationName) === 'token-specimen-enter', 'Replay animation missing');
    for (const [name, extension] of [['Download CSS', '.css'], ['Download tokens', '.tokens.json']]) {
      const download = page.waitForEvent('download');
      await dialog.getByRole('button', { name, exact: true }).click();
      assert((await download).suggestedFilename() === `void-terminal-dark${extension}`, `${name} wrong filename`);
    }
    await dialog.getByRole('button', { name: 'Copy CSS', exact: true }).click();
    await page.waitForFunction(() => /copied|unavailable/.test(document.querySelector('.token-studio [role=status]')?.textContent ?? ''));
    await dialog.getByRole('button', { name: 'Download tokens', exact: true }).focus();
    await page.keyboard.press('Tab');
    assert(await dialog.getByRole('button', { name: 'Close Token Studio', exact: true }).evaluate(node => node === document.activeElement), 'Focus did not wrap');
    await page.keyboard.press('Shift+Tab');
    assert(await dialog.getByRole('button', { name: 'Download tokens', exact: true }).evaluate(node => node === document.activeElement), 'Reverse focus did not wrap');
    await page.setViewportSize({ width: 390, height: 844 });
    await dialog.locator('.token-detail').evaluate(node => { node.scrollTop = 0; });
    await page.screenshot({ path: 'output/playwright/m1-mobile.png' });
    await page.keyboard.press('Escape');
    assert(!await dialog.count(), 'Escape did not close');
    assert(await page.getByRole('navigation', { name: 'Editor panels' }).getByRole('button', { pressed: true }).evaluate(node => node === document.activeElement), 'Resize fallback focus was not restored');
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.getByRole('button', { name: 'Open Token Studio ↗', exact: true }).click();
    await dialog.waitFor();
    await page.keyboard.press('Escape');
    assert(await page.getByRole('button', { name: 'Open Token Studio ↗', exact: true }).evaluate(node => node === document.activeElement), 'Opener focus was not restored');
    assert(noise.length === 0, JSON.stringify(noise));
    return { result: 'PASS', views, checks: ['75 styles / two themes / desktop and phone', 'computed semantic colors/type/shape', '46 contrast pairs per view', 'search', 'keyboard', 'focus containment/restore', 'motion replay/reduction', 'CSS and JSON downloads', 'clipboard or fallback', 'zero browser errors/warnings'] };
  } finally { page.off('console', onConsole); page.off('pageerror', onError); }
}
