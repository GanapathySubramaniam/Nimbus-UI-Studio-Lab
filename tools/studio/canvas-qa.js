// Run against the Vite server in a dedicated playwright-cli session:
// playwright-cli --session nimbus-canvas-fixes open http://localhost:5173
// playwright-cli --session nimbus-canvas-fixes run-code --filename tools/studio/canvas-qa.js
async (page) => {
  const results = [];
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const settled = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const check = async (name, run) => {
    try { await run(); results.push({name, result:'PASS'}); }
    catch (error) { results.push({name, result:'FAIL', error:error.message}); }
    finally { await page.mouse.up(); }
  };
  await page.setViewportSize({width:1280, height:900});
  await page.goto('http://localhost:5173');
  await page.getByRole('region', {name:'Page canvas', exact:true}).waitFor();

  // Exercise the existing header markup at narrow widths, including an actual
  // failed save in this disposable browser context. No shared profile/storage.
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException('QA quota exceeded', 'QuotaExceededError'); };
  });
  await page.reload();
  await page.getByRole('button', {name:'Add Statistic', exact:true}).click();
  await page.locator('.studio-save-state.is-error').waitFor();
  for (const width of [320, 390, 600, 900, 1024]) {
    await check(`header controls and save errors remain reachable at ${width}px`, async () => {
      await page.setViewportSize({width, height:844});
      for (const selector of ['.studio-project-menu', '.studio-save-state.is-error', '.studio-header-actions [aria-label="Undo"]', '.studio-header-actions [aria-label="Redo"]', '.studio-header-actions .studio-secondary', '.studio-header-actions .studio-primary']) {
        const el = page.locator(selector);
        assert(await el.isVisible(), `${selector} is hidden`);
        const box = await el.boundingBox();
        assert(box && box.x >= 0 && box.x + box.width <= width + 1, `${selector} is clipped`);
      }
      await page.locator('.studio-project-button').click();
      assert(await page.getByRole('button', {name:'Download project', exact:true}).isVisible(), 'Project recovery/download menu unavailable');
      await page.locator('.studio-project-button').click();
    });
  }

  await page.setViewportSize({width:1280, height:900});
  // Mount the real Canvas with observable callback contracts. Resolve Vite's
  // actual React URLs to share its runtime, without adding production test hooks.
  await page.evaluate(async () => {
    const main = await (await fetch('/src/main.tsx')).text();
    const reactUrl = main.match(/from "([^"]*\/react\.js[^\"]*)"/)[1];
    const clientUrl = main.match(/from "([^"]*\/react-dom_client\.js[^\"]*)"/)[1];
    const shellUrl = main.match(/import "([^"]*\/application-shell\/src\/styles\.css)(?:\?[^"]*)?"/)[1];
    const {default:React} = await import(reactUrl);
    const {default:{createRoot}} = await import(clientUrl);
    const {Canvas} = await import(shellUrl.replace('/styles.css', '/studio/canvas.tsx'));
    const {DEFAULT_STYLE} = await import(shellUrl.replace('/styles.css', '/studio/model.ts'));
    document.getElementById('root').style.display = 'none';
    const mount = document.createElement('div');
    mount.id = 'canvas-qa-root'; mount.style.cssText = 'height:850px;display:flex;flex-direction:column';
    document.body.append(mount);
    const widget = {id:'back',kind:'card',name:'Back card',x:80,y:80,width:240,height:160,presetId:'nimbus',style:{...DEFAULT_STYLE},content:{title:'Back',subtitle:'',value:'',items:'',image:'',imageAlt:''},motion:{entrance:'none',hover:'none',click:'none',duration:240,delay:0},state:'default',locked:false,hidden:false};
    const initial = {version:1,name:'Canvas QA',width:900,height:650,background:'#ffffff',grid:8,widgets:[widget,{...widget,id:'front',name:'Front card',x:200,y:140,content:{...widget.content,title:'Front'}}]};
    window.canvasQA = {updates:[],pointerId:null};
    document.addEventListener('pointerdown', e => { window.canvasQA.pointerId=e.pointerId; }, true);
    function Harness() {
      const [generation,setGeneration] = React.useState(0);
      const [props,setProps] = React.useState({document:initial,selectedId:'back',preview:false,device:0,zoom:1,snap:false,showGrid:false,replayKey:0});
      window.canvasQA.props = props;
      window.canvasQA.set = patch => setProps(p => ({...p,...patch}));
      window.canvasQA.reset = () => { window.canvasQA.updates=[];setGeneration(n=>n+1);setProps({document:structuredClone(initial),selectedId:'back',preview:false,device:0,zoom:1,snap:false,showGrid:false,replayKey:0}); };
      const select = React.useCallback(id => setProps(p => ({...p,selectedId:id})), []);
      const zoom = React.useCallback(() => {}, []);
      return React.createElement(Canvas,{...props,key:generation,onSelect:select,onZoomChange:zoom,onAdd:()=>{},onUpdate:(id,patch)=>window.canvasQA.updates.push({id,patch})});
    }
    createRoot(mount).render(React.createElement(Harness));
  });
  const back = page.locator('#canvas-qa-root [data-widget-id="back"]');
  const handle = () => page.getByRole('button', {name:'Resize Back card', exact:true});
  const reset = async () => { await page.mouse.up(); await page.evaluate(() => window.canvasQA.reset()); await settled(); };
  const updates = () => page.evaluate(() => window.canvasQA.updates);
  const geometry = () => back.evaluate(el => ({x:parseFloat(el.style.left),y:parseFloat(el.style.top),width:parseFloat(el.style.width),height:parseFloat(el.style.height)}));
  const begin = async (resize=false) => {
    const box = await (resize ? handle() : back).boundingBox();
    const point = resize ? {x:box.x+box.width/2,y:box.y+box.height/2} : {x:box.x+20,y:box.y+20};
    await page.mouse.move(point.x,point.y); await page.mouse.down();
    await page.mouse.move(point.x+40,point.y+24,{steps:4});
    await settled(); return point;
  };
  await check('selection-only pointer click never calls onUpdate', async () => {
    await reset(); await page.evaluate(()=>window.canvasQA.set({selectedId:null})); await settled();
    await back.click({position:{x:20,y:20}});
    assert((await updates()).length===0, 'Selection-only click committed unchanged geometry');
    assert(await back.getAttribute('aria-pressed')==='true','Click did not select the widget');
  });
  await check('selecting a lower widget preserves document paint and hit order', async () => {
    await reset();
    const top = await back.evaluate(el => {
      const r=el.getBoundingClientRect();
      return document.elementFromPoint(r.x+160,r.y+100)?.closest('[data-widget-id]')?.getAttribute('data-widget-id');
    });
    assert(top==='front','Selected back widget paints above the front widget');
    assert(await handle().isVisible(), 'Named resize handle is unavailable');
    // The lower widget's handle lies inside the upper widget, so this also
    // verifies that only the interaction chrome is elevated and hittable.
    const hit = await handle().evaluate(el => { const r=el.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===el; });
    assert(hit, 'Resize handle is covered by widget content');
  });
  for (const resize of [false,true]) {
    await check(`${resize?'resize':'move'} commits exactly once on release`, async () => {
      await reset(); await begin(resize); assert((await updates()).length===0,'Draft committed early');
      await page.mouse.up(); const commits=await updates();
      assert(commits.length===1,'Gesture must commit once');
      assert(JSON.stringify(commits[0].patch)===JSON.stringify(resize?{x:80,y:80,width:280,height:184}:{x:120,y:104,width:240,height:160}), 'Incorrect committed geometry');
    });
  }
  await check('returning a drag to its start does not commit', async () => {
    await reset(); const point=await begin(); await page.mouse.move(point.x,point.y); await page.mouse.up();
    assert((await updates()).length===0,'Round-trip drag committed unchanged geometry');
  });
  const cancellations = [
    ['Escape without parent deselection', async () => page.keyboard.press('Escape')],
    ['Escape', async () => { await page.keyboard.press('Escape'); await page.evaluate(() => window.canvasQA.set({selectedId:null})); }],
    ['pointercancel', async () => { await handle().dispatchEvent('pointercancel',{pointerId:await page.evaluate(()=>window.canvasQA.pointerId),buttons:0}); }],
    ['lostpointercapture', async () => { await page.evaluate(() => {const id=window.canvasQA.pointerId;const target=[...document.querySelectorAll('#canvas-qa-root *')].find(el=>el.hasPointerCapture(id));target.releasePointerCapture(id);}); await page.mouse.move(650,550); }],
    ['no pressed button', async () => { await handle().dispatchEvent('pointermove',{pointerId:await page.evaluate(()=>window.canvasQA.pointerId),buttons:0,clientX:700,clientY:550}); }],
    ['deselection', async () => page.evaluate(() => window.canvasQA.set({selectedId:null}))],
    ['target removal', async () => page.evaluate(() => window.canvasQA.set({document:{...window.canvasQA.props.document,widgets:[]}}))],
    ['target hidden', async () => page.evaluate(() => window.canvasQA.set({document:{...window.canvasQA.props.document,widgets:window.canvasQA.props.document.widgets.map(w=>({...w,hidden:true}))}}))],
    ['target locked', async () => page.evaluate(() => window.canvasQA.set({document:{...window.canvasQA.props.document,widgets:window.canvasQA.props.document.widgets.map(w=>({...w,locked:true}))}}))],
    ['document replacement', async () => page.evaluate(() => window.canvasQA.set({document:structuredClone(window.canvasQA.props.document)}))],
    ['preview', async () => page.evaluate(() => window.canvasQA.set({preview:true}))],
    ['device', async () => page.evaluate(() => window.canvasQA.set({device:390}))],
    ['zoom', async () => page.evaluate(() => window.canvasQA.set({zoom:.75}))],
    ['window blur', async () => page.evaluate(() => window.dispatchEvent(new Event('blur')))],
    ['snap mode', async () => page.evaluate(() => window.canvasQA.set({snap:true}))],
  ];
  for (const [name,cancel] of cancellations) {
    await check(`resize cancellation: ${name}`, async () => {
      await reset(); await begin(true); assert((await geometry()).width===280, 'Resize draft never started');
      await cancel(); await settled();
      const captured=await page.evaluate(() => [...document.querySelectorAll('#canvas-qa-root *')].some(el=>el.hasPointerCapture(window.canvasQA.pointerId)));
      assert(!captured,'Cancelled gesture retained pointer capture');
      // Restore the original context without starting another gesture. A stale
      // captured gesture must not resurrect its draft on subsequent hover.
      await page.mouse.up();
      await page.evaluate(() => { const p=window.canvasQA.props; window.canvasQA.set({preview:false,device:0,zoom:1,selectedId:'back',document:{...p.document,widgets:p.document.widgets.map(w=>({...w,hidden:false,locked:false}))}}); });
      await settled();
      if (await back.count()) {
        await back.dispatchEvent('pointermove',{pointerId:await page.evaluate(()=>window.canvasQA.pointerId),buttons:0,clientX:500,clientY:400});
        await settled(); assert((await geometry()).width===240, 'Cancelled draft resurrected on hover');
      }
      assert((await updates()).length===0,'Cancelled gesture committed');
    });
  }
  await check('foreign pointer cannot move or finish the active gesture', async () => {
    await reset(); await begin();
    await back.dispatchEvent('pointermove',{pointerId:999,buttons:1,clientX:750,clientY:550});
    await back.dispatchEvent('pointerup',{pointerId:999,buttons:0});
    assert((await updates()).length===0,'Foreign pointer finished gesture');
    assert((await geometry()).x===120,'Foreign pointer moved draft');
    await page.mouse.up(); assert((await updates()).length===1,'Original pointer did not finish');
  });
  await check('named resize handle retains keyboard sizing', async () => {
    await reset(); await handle().focus(); await handle().press('Shift+ArrowRight');
    const commits=await updates(); assert(commits.length===1 && commits[0].patch.width===250,'Keyboard resize unavailable');
  });
  await check('first drag selects its target and commits at non-unit zoom', async () => {
    await reset(); await page.evaluate(()=>window.canvasQA.set({selectedId:null,zoom:.5})); await settled();
    await begin(); await page.mouse.up();
    const commits=await updates();
    assert(commits.length===1 && commits[0].patch.x===160 && commits[0].patch.y===128,'First-selection drag or zoom mapping failed');
  });
  await check('locked widget can be selected without starting a gesture', async () => {
    await reset(); await page.evaluate(()=>window.canvasQA.set({selectedId:null,document:{...window.canvasQA.props.document,widgets:window.canvasQA.props.document.widgets.map(w=>({...w,locked:true}))}})); await settled();
    await begin(); await page.mouse.up();
    assert((await updates()).length===0 && (await geometry()).x===80,'Locked widget moved');
    assert(await back.getAttribute('aria-pressed')==='true','Locked widget could not be selected');
    assert(await handle().count()===0,'Locked widget exposes resize handle');
  });
  console.log(JSON.stringify(results,null,2));
  assert(results.every(r=>r.result==='PASS'), JSON.stringify(results.filter(r=>r.result==='FAIL'),null,2));
  // Final screenshots: a fresh desktop page without quota injection, and the
  // narrow header with the actual error state from the simulated quota failure.
  const desktop=await page.context().newPage();
  try {
    await desktop.setViewportSize({width:1600,height:1000});
    await desktop.goto('http://localhost:5173');
    await desktop.locator('.studio-canvas-widget').nth(2).focus();
    await desktop.waitForFunction(()=>document.querySelector('.studio-save-state')?.textContent==='Saved locally');
    await desktop.evaluate(()=>document.fonts.ready);
    await desktop.screenshot({path:'output/playwright/nimbus-canvas-fixes-desktop.png',fullPage:true});
  } finally { await desktop.close(); }
  await page.goto('http://localhost:5173');
  await page.getByRole('button',{name:'Add Statistic',exact:true}).click();
  await page.locator('.studio-save-state.is-error').waitFor();
  await page.setViewportSize({width:320,height:844});
  const dismiss=page.getByRole('button',{name:'Dismiss notification',exact:true});
  if(await dismiss.isVisible())await dismiss.click();
  await settled();
  await page.screenshot({path:'output/playwright/nimbus-canvas-fixes-mobile-error.png',fullPage:true});
  return {result:'PASS',checks:results.length,results,screenshots:['output/playwright/nimbus-canvas-fixes-desktop.png','output/playwright/nimbus-canvas-fixes-mobile-error.png']};
}
