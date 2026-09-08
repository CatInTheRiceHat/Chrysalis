import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';import path from 'node:path';
const profile=await mkdtemp(path.join(tmpdir(),'chrysalis-experience-live-'));const ext=path.resolve(process.env.CHRYSALIS_EXTENSION_PATH ?? 'dist');let context;const checks=[];
await mkdir('test-results',{recursive:true});
try {
 context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,viewport:{width:1440,height:1000},args:[`--disable-extensions-except=${ext}`,`--load-extension=${ext}`]});
 const worker=context.serviceWorkers()[0]??await context.waitForEvent('serviceworker');const id=new URL(worker.url()).hostname;
 const popup=await context.newPage();await popup.goto(`chrome-extension://${id}/popup.html`);await popup.locator('#intro-skip').click();await popup.locator('#intention').selectOption('Exploring');await popup.locator('#submit-plan').click();
 const page=await context.newPage();await page.goto('https://www.youtube.com/watch?v=aqz-KE-bpKQ',{waitUntil:'domcontentloaded',timeout:45000});
 const indicator=page.locator('#chrysalis-extension-indicator');await expect(indicator).toBeVisible({timeout:25000});
 await expect(indicator.locator('#intention')).toHaveText('Exploring');
 const i=await indicator.boundingBox(),p=await page.locator('#movie_player').boundingBox();assert(p&&i&&i.y>=p.y+p.height-1);
 assert.equal(await indicator.evaluate(e=>Boolean(e.closest('#below'))),true);
 await expect.poll(()=>popup.evaluate(async()=> (await chrome.runtime.sendMessage({channel:'chrysalis/v1',type:'GET_SNAPSHOT'})).snapshot.currentSession.elapsedMs),{timeout:15000}).toBeGreaterThan(0);
 await indicator.getByRole('button',{name:'Pause',exact:true}).click();await expect(indicator.getByRole('button',{name:'Resume',exact:true})).toBeVisible();
 await indicator.scrollIntoViewIfNeeded();await page.screenshot({path:'test-results/experience-live-watch.png'});
 await indicator.getByRole('button',{name:'Collapse',exact:true}).click();await expect(indicator.locator('#details')).toBeHidden();
 checks.push('Live watch indicator reserves normal page flow inside #below, geometrically below the player; current intention/foreground time, Pause and collapse work.');
 await page.goto('https://www.youtube.com/',{waitUntil:'domcontentloaded',timeout:45000});await expect(indicator).toBeVisible({timeout:20000});
 const home=await indicator.boundingBox(),masthead=await page.locator('ytd-masthead').boundingBox();assert(home&&masthead&&home.y>=masthead.y+masthead.height-1);
 await page.evaluate(()=>window.scrollTo(0,0));
 await indicator.scrollIntoViewIfNeeded();
 await expect(indicator.getByRole('button',{name:'Collapse',exact:true})).toBeVisible();
 await page.screenshot({path:'test-results/experience-live-home.png'});
 checks.push('Live Home indicator reserves flow space below the masthead without covering search/navigation; YouTube page content retained.');
 const grid=page.locator('ytd-browse[page-subtype="home"] ytd-rich-grid-renderer > #contents');
 const organic=grid.locator(':scope > ytd-rich-item-renderer').filter({has:page.locator('ytd-rich-grid-media a[href^="/watch?"]')});
 if(await organic.count()) {
   const opening=context.waitForEvent('page');await popup.locator('#open-settings').click();const settings=await opening;
   await settings.locator('#hide-home').check();await expect(organic.first()).toBeHidden();
   const ad=grid.locator('ytd-ad-slot-renderer').first();if(await ad.count()) await expect(ad).toBeVisible();
   await settings.locator('#hide-home').uncheck();await expect(organic.first()).toBeVisible();
   checks.push('A populated signed-out Home appeared after watching: recognized organic cards hide/restore; a present ad slot stays visible. This verifies this observed variant only.');
 }
 await writeFile('test-results/experience-live-report.json',JSON.stringify({browser:context.browser().version(),checks,limitations:['Signed-out desktop layouts only. Native toolbar popover and physical screen-reader behavior not exercised. Fullscreen and 200% zoom covered by the separate real-browser fixture suite.']},null,2));console.log(checks.join('\n'));
}finally{await context?.close();await rm(profile,{recursive:true,force:true});}
