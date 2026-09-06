async(page)=>{
  await page.waitForFunction(()=>document.querySelector('.studio-save-state')?.textContent==='Saved locally');
  const backup=await page.evaluate(()=>new Promise((resolve,reject)=>{
    const open=indexedDB.open('nimbus-studio',1);open.onerror=()=>reject(open.error);open.onsuccess=()=>{
      const db=open.result,tx=db.transaction('projects','readwrite'),store=tx.objectStore('projects'),get=store.get('current');
      let value;get.onsuccess=()=>{value=get.result;store.put({corrupted:true},'current');};tx.oncomplete=()=>{db.close();resolve(value);};tx.onerror=()=>reject(tx.error);
    };
  }));
  try{
    await page.reload();
    await page.waitForFunction(()=>document.querySelector('.studio-save-state')?.textContent==='Recovery needed');
    await page.locator('.studio-canvas-widget').first().click();
    await page.waitForTimeout(800);
    const preserved=await page.evaluate(()=>new Promise(resolve=>{
      const open=indexedDB.open('nimbus-studio',1);open.onsuccess=()=>{const db=open.result,get=db.transaction('projects').objectStore('projects').get('current');get.onsuccess=()=>{resolve(get.result?.corrupted===true);db.close();};};
    }));
    if(!preserved)throw new Error('Selecting a fallback widget overwrote corrupt recovery data');
  }finally{
    await page.evaluate(backup=>new Promise((resolve,reject)=>{
      const open=indexedDB.open('nimbus-studio',1);open.onsuccess=()=>{const db=open.result,tx=db.transaction('projects','readwrite');tx.objectStore('projects').put(backup,'current');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};
    }),backup);
    await page.reload();
    await page.waitForFunction(()=>document.querySelector('.studio-save-state')?.textContent==='Saved locally');
  }
  console.log('PASS: malformed IndexedDB value enters recovery and survives selection; original test project restored.');
}
