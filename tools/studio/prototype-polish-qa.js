async (page)=>{
  const check=(ok,message)=>{if(!ok)throw new Error(message);};
  const button=name=>page.getByRole('button',{name,exact:true});
  await button('17 templates').click();
  for(let i=0;i<3;i++)await page.frameLocator('.studio-template-preview iframe').nth(i).locator('.nw-page').waitFor();
  await page.screenshot({path:'output/playwright/nimbus-v2-template-gallery.png'});
  await page.setViewportSize({width:390,height:844});
  check(await page.locator('.studio-template-gallery').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Gallery overflows mobile');
  await button('Close template gallery').click();
  for(const name of ['Preview','Export code','Undo','Redo'])check(await button(name).isVisible(),`Mobile ${name} hidden`);
  await button('canvas').click();
  await button('Manage pages').click();
  check(await page.locator('.studio-pages-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Pages dialog overflows mobile');
  await button('Close pages').click();
  await button('Export code').click();
  check(await page.locator('.studio-export-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Export dialog overflows mobile');
  await page.screenshot({path:'output/playwright/nimbus-v2-mobile-export.png'});
  await button('Close export').click();
  await button('Preview').click();
  check(await page.locator('.studio-prototype-toolbar').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Preview toolbar overflows mobile');
  await button('Back to editor').click();
  await page.setViewportSize({width:1600,height:1000});
  console.log('PASS: loaded template miniatures; 390px gallery, pages, export and full-preview controls fit.');
}
