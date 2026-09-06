async (page) => {
  const assert = (value, message) => { if (!value) throw new Error(message); };
  const button = name => page.getByRole('button', { name, exact: true });
  const inspect = async (reason, disabled) => {
    await page.getByRole('tab', { name: 'Styles', exact: true }).click();
    await button('Open Token Studio ↗').click();
    const dialog = page.getByRole('dialog', { name: 'Token Studio' });
    await dialog.locator('.token-apply-guidance').waitFor();
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 844 });
      const guidance = dialog.locator('.token-apply-guidance');
      assert(await guidance.isVisible() && (await guidance.innerText()).includes(reason), `Missing ${reason} guidance at ${width}`);
      const apply = dialog.locator('.token-export-actions button').last();
      assert(await apply.isDisabled() === disabled, `Wrong apply state at ${width}`);
      assert(await apply.getAttribute('aria-describedby') === await guidance.getAttribute('id'), 'Description association missing');
    }
    await button('Close Token Studio').click();
    await page.setViewportSize({ width: 1280, height: 844 });
  };
  await page.setViewportSize({ width: 1280, height: 844 });
  if (await button('Close Token Studio').count()) await button('Close Token Studio').click();
  await button('Edit page settings').click();
  await inspect('No widget is selected', true);
  await page.locator('.studio-canvas-widget').first().click();
  await inspect('Replaces base styling', false);
  await page.getByRole('tab', { name: 'Layers', exact: true }).click();
  const lock = page.locator('.studio-layer-list > div.is-selected').getByRole('button', { name: /^Lock / });
  const unlockName = (await lock.getAttribute('aria-label')).replace(/^Lock /, 'Unlock ');
  await lock.click();
  try { await inspect('This widget is locked', true); }
  finally {
    await page.setViewportSize({ width: 1280, height: 844 });
    if (await button('Close Token Studio').count()) await button('Close Token Studio').click();
    await page.getByRole('tab', { name: 'Layers', exact: true }).click();
    await button(unlockName).click();
  }
  return { result: 'PASS', checks: ['no selection / locked / unlocked', 'desktop / phone', 'visible recovery guidance', 'Apply accessible description'] };
}
