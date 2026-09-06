// Chromium Playwright CLI; emulates pinch zoom without altering a user's profile.
async (page) => {
  const assert = (value, message) => { if (!value) throw new Error(message); };
  const cdp = await page.context().newCDPSession(page);
  const cases = [
    [1920, 1000, 1.5], [1920, 1000, 2], [1920, 1000, 3],
    [1440, 900, 1], [1280, 665, 1], [1024, 650, 1], [960, 540, 1],
    [768, 600, 1], [390, 844, 1], [640, 360, 1], [320, 568, 1],
  ];
  const measurements = [];
  const bounds = async selectors => page.evaluate(selectors => {
    const viewport = window.visualViewport;
    const left = viewport?.offsetLeft ?? 0, top = viewport?.offsetTop ?? 0;
    const width = viewport?.width ?? innerWidth, height = viewport?.height ?? innerHeight;
    return { width, height, problems: selectors.flatMap(selector => [...document.querySelectorAll(selector)].flatMap(node => {
      if (!node.getClientRects().length) return [];
      const box = node.getBoundingClientRect();
      return box.left < left - 1 || box.right > left + width + 1 || box.top < top - 1 || box.bottom > top + height + 1 ? [{ selector, left: box.left, right: box.right, top: box.top, bottom: box.bottom }] : [];
    })) };
  }, selectors);
  try {
    if (await page.getByRole('dialog').count()) await page.keyboard.press('Escape');
    for (const [width, height, scale] of cases) {
      await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
      await page.setViewportSize({ width, height });
      await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: scale });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const result = await bounds(['.studio-app', '.studio-topbar', '.studio-header-actions', '.studio-inspector', '.studio-library', '.studio-mobile-tabs']);
      assert(!result.problems.length, JSON.stringify({ width, height, scale, ...result }));
      const panels = page.getByRole('navigation', { name: 'Editor panels' });
      if (await panels.isVisible()) {
        await panels.getByRole('button', { name: 'components', exact: true }).click();
        assert(await page.getByRole('tab', { name: 'Styles', exact: true }).isVisible(), 'Style panel is unreachable');
        await panels.getByRole('button', { name: 'properties', exact: true }).click();
        assert(await page.locator('.studio-inspector').isVisible(), 'Properties panel is unreachable');
        await panels.getByRole('button', { name: 'canvas', exact: true }).click();
      }
      const toolbar = await bounds(['.studio-pagebar button', '.studio-pagebar select', '.studio-canvas-toolbar']);
      assert(!toolbar.problems.length, JSON.stringify({ width, height, scale, toolbar }));
      await page.getByRole('button', { name: 'Export code', exact: true }).click();
      await page.getByRole('button', { name: 'Close export', exact: true }).waitFor();
      const exported = await bounds(['.studio-export-dialog', '.studio-dialog-footer']);
      assert(!exported.problems.length, JSON.stringify({ width, height, scale, exported }));
      await page.getByRole('button', { name: 'Close export', exact: true }).click();
      await page.getByRole('button', { name: 'Preview', exact: true }).click();
      await page.getByRole('button', { name: 'Back to editor', exact: true }).waitFor();
      const preview = await bounds(['.studio-prototype', '.studio-prototype-toolbar']);
      assert(!preview.problems.length, JSON.stringify({ width, height, scale, preview }));
      await page.getByRole('button', { name: 'Back to editor', exact: true }).click();
      measurements.push({ width, height, scale, visibleWidth: result.width, visibleHeight: result.height });
    }
    return { result: 'PASS', measurements, checks: ['visual-zoom and resize containment', 'header actions', 'reachable library and inspector', 'page toolbar', 'export dialog', 'full-window preview'] };
  } finally {
    await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
    await cdp.detach();
    await page.setViewportSize({ width: 1280, height: 665 });
  }
}
