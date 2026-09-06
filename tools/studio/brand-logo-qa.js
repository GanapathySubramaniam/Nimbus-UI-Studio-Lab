// Browser regression for the user-provided Nimbus Studio brand asset.
async (page) => {
  const assert = (value, message) => { if (!value) throw new Error(message); };
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto('http://127.0.0.1:5173/');
  const logo = page.getByRole('img', { name: 'Nimbus UI Studio leopard and mountain logo', exact: true });
  await logo.waitFor();
  const desktop = await logo.evaluate(image => ({
    complete: image.complete,
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
    width: image.getBoundingClientRect().width,
    height: image.getBoundingClientRect().height,
    src: image.getAttribute('src'),
  }));
  assert(desktop.complete && desktop.naturalWidth > 0 && desktop.naturalHeight > 0, 'Header logo did not load.');
  assert(desktop.width >= 32 && desktop.height >= 32, `Desktop logo is too small: ${JSON.stringify(desktop)}`);
  assert(desktop.width <= 56 && desktop.height <= 56, `Desktop logo overwhelms header: ${JSON.stringify(desktop)}`);
  assert(desktop.src === '/nimbus-studio-logo.jpg', `Unexpected brand asset: ${desktop.src}`);
  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await logo.evaluate(image => ({ width: image.getBoundingClientRect().width, height: image.getBoundingClientRect().height }));
  assert(mobile.width >= 24 && mobile.height >= 24, `Compact logo is not usable: ${JSON.stringify(mobile)}`);
  assert(mobile.width <= 40 && mobile.height <= 40, `Compact logo causes header overflow: ${JSON.stringify(mobile)}`);
  return { result: 'PASS', desktop, mobile, checks: ['semantic accessible alternative', 'asset decoded', 'desktop scale', 'compact responsive scale'] };
}
