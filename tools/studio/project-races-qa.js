async (page) => {
  const check=(condition,message)=>{if(!condition)throw new Error(message);};
  await page.getByRole('button',{name:'Preview',exact:true}).waitFor();
  await page.getByRole('button',{name:'Edit page settings',exact:true}).click();
  const name=page.getByRole('textbox',{name:'Page name',exact:true});
  await name.fill('Saved A');
  await page.waitForFunction(()=>document.querySelector('.studio-save-state')?.textContent==='Saved locally');
  // Delay completion notification for a real IndexedDB transaction. The real
  // B write commits, but the application still observes it as in flight.
  await page.evaluate(()=>{
    window.__nimbusDelayedCompletions=0;
    const descriptor=Object.getOwnPropertyDescriptor(IDBTransaction.prototype,'oncomplete');
    window.__nimbusCompleteDescriptor=descriptor;
    Object.defineProperty(IDBTransaction.prototype,'oncomplete',{...descriptor,set(handler){
      descriptor.set.call(this,typeof handler==='function'?function(event){
        window.__nimbusDelayedCompletions++;
        setTimeout(()=>handler.call(this,event),1200);
      }:handler);
    }});
  });
  await name.fill('Pending B');
  await page.waitForFunction(()=>window.__nimbusDelayedCompletions>0);
  await page.getByRole('button',{name:'Undo',exact:true}).click();
  check(await name.inputValue()==='Saved A','Undo did not restore A');
  await page.waitForFunction(()=>document.querySelector('.studio-save-state')?.textContent==='Saved locally');
  const stored=await page.evaluate(()=>new Promise((resolve,reject)=>{
    const req=indexedDB.open('nimbus-studio',1);req.onerror=()=>reject(req.error);req.onsuccess=()=>{
      const db=req.result,r=db.transaction('projects','readonly').objectStore('projects').get('current');
      r.onsuccess=()=>{resolve(JSON.parse(r.result));db.close();};r.onerror=()=>reject(r.error);
    };
  }));
  check(stored.pages.some(p=>p.document.name==='Saved A')&&!stored.pages.some(p=>p.document.name==='Pending B'),'Undo save race persisted B instead of A');
  await page.evaluate(()=>Object.defineProperty(IDBTransaction.prototype,'oncomplete',window.__nimbusCompleteDescriptor));
  const fixture=stored;
  // Imports use the real input/change handler and real File.text, with only the
  // first read delayed. Completion order must not override request order.
  await page.evaluate((fixture)=>{
    const original=File.prototype.text;window.__nimbusOriginalText=original;
    File.prototype.text=function(){const result=original.call(this);return this.name==='slow.json'?result.then(text=>new Promise(resolve=>setTimeout(()=>resolve(text),900))):result;};
    const send=(name,title)=>{
      const p=structuredClone(fixture);p.name=title;
      const dt=new DataTransfer();dt.items.add(new File([JSON.stringify(p)],name,{type:'application/json'}));
      const input=document.querySelector('input[aria-label="Import Nimbus project"]');
      input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
    };
    send('slow.json','Stale import A');send('fast.json','Latest import B');
  },fixture);
  await page.waitForFunction(()=>document.querySelector('.studio-project-button')?.textContent==='Latest import B');
  // Here time is the test input: wait beyond the deliberately delayed read.
  await page.waitForTimeout(1100);
  check(await page.locator('.studio-project-button').innerText()==='Latest import B','Older import overwrote the newer one');
  await page.evaluate((fixture)=>{
    const p=structuredClone(fixture);p.name='Stale after edit';
    const dt=new DataTransfer();dt.items.add(new File([JSON.stringify(p)],'slow.json',{type:'application/json'}));
    const input=document.querySelector('input[aria-label="Import Nimbus project"]');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
  },fixture);
  await page.getByRole('textbox',{name:'Page name',exact:true}).fill('Intervening edit retained');
  await page.waitForTimeout(1100);
  check(await page.getByRole('textbox',{name:'Page name',exact:true}).inputValue()==='Intervening edit retained','Delayed import overwrote intervening edit');
  await page.evaluate(()=>{File.prototype.text=window.__nimbusOriginalText;});
  await page.waitForFunction(()=>document.querySelector('.studio-save-state')?.textContent==='Saved locally');
  console.log('PASS: real IndexedDB undo/in-flight-save ordering; latest import wins; intervening edit cancels an older import.');
}
