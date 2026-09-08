import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const before=process.argv.includes('--before'), stage=before?'before':'after';
const out=path.resolve(process.env.CHRYSALIS_USABILITY_OUTPUT ?? 'test-results/usability');await mkdir(out,{recursive:true});
const profile=await mkdtemp(path.join(tmpdir(),'chrysalis-usability-')), ext=path.resolve(process.env.CHRYSALIS_EXTENSION_PATH??'dist');
const checks=[], measurements={};let context;
try {
 context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,viewport:{width:1100,height:900},args:[`--disable-extensions-except=${ext}`,`--load-extension=${ext}`]});
 const worker=context.serviceWorkers()[0]??await context.waitForEvent('serviceworker'),base=`chrome-extension://${new URL(worker.url()).hostname}/`;
 const popup=await context.newPage();await popup.goto(`${base}popup.html`);await popup.setViewportSize({width:390,height:600});
 const capture=async(page,name,fullPage=true)=>page.screenshot({path:`${out}/${stage}-${name}.png`,fullPage});
 await expect(popup.locator('#intro-skip')).toBeVisible();await capture(popup,'welcome');
 measurements.nativePopup=await worker.evaluate(async()=>{try{await chrome.action.openPopup();return 'API opened';}catch(e){return String(e);}});
 const cdp=await context.newCDPSession(popup);measurements.nativeTargets=(await cdp.send('Target.getTargets')).targetInfos.filter(t=>t.type!=='service_worker').map(t=>({type:t.type,url:t.url}));
 await popup.bringToFront();await popup.locator('#intro-skip').click();await popup.evaluate(async()=>{const r=await chrome.runtime.sendMessage({channel:'chrysalis/v1',type:'GET_SETTINGS'});await chrome.runtime.sendMessage({channel:'chrysalis/v1',type:'UPDATE_SETTINGS',expectedRevision:r.revision,patch:{indicatorCollapsed:false}});});await capture(popup,'setup');measurements.startButton=await popup.locator('#submit-plan').boundingBox();
 await popup.locator('#intention').selectOption('custom');await popup.locator('#custom-intention').fill('Exploring the connections between art and everyday life without rushing anywhere');await popup.locator('#submit-plan').click();await expect(popup.locator('#session-phase')).toHaveText('Active');await popup.evaluate(()=>scrollTo(0,0));await capture(popup,'active');
 await context.route('https://www.youtube.com/**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><style>body{margin:0;font:16px system-ui}ytd-app,ytd-watch-flexy{display:block}header{height:60px}#player{height:300px;background:#222;color:white}#below{max-width:800px;margin:auto}</style><ytd-app><header><input placeholder="Search"><button>Account</button></header><ytd-watch-flexy><div id="player"><video controls></video><button>Captions</button></div><div id="below"><h1>Controlled watch-page fixture</h1></div></ytd-watch-flexy></ytd-app>'}));
 const yt=await context.newPage();await yt.goto('https://www.youtube.com/watch?v=review-fixture');const indicator=yt.locator('#chrysalis-extension-indicator');await expect(indicator).toBeVisible();
 await indicator.locator('[data-action="pause"]').click();await indicator.locator('#collapse').click();await capture(yt,'collapsed-paused',false);measurements.collapsedPaused=await indicator.locator('#compact').textContent();
 if(!before){await expect(popup.locator('#session-target')).toHaveText('No time target');await expect(indicator.locator('#phase')).toBeVisible();await expect(indicator.locator('#phase')).toHaveText('Paused by you');}
 await indicator.locator('#collapse').click();await indicator.locator('[data-choice="break"]').click();await indicator.locator('#collapse').click();await capture(yt,'collapsed-break',false);
 if(!before){await expect(indicator.locator('#compact')).toContainText('break');await expect(indicator.locator('#phase')).toHaveText('On a break');}
 await indicator.locator('#collapse').click();await indicator.locator('[data-action="end-break"]').click();await popup.bringToFront();await popup.locator('#edit-plan').click();await expect(popup.locator('#intention')).toBeFocused();await capture(popup,'edit');
 if(!before)await expect(popup.locator('#session-live')).toBeHidden();
 await popup.locator('#cancel-edit').click();await expect(popup.locator('#edit-plan')).toBeFocused();
 await popup.evaluate(()=>{const original=chrome.runtime.sendMessage.bind(chrome.runtime);globalThis.reviewFailReads=true;chrome.runtime.sendMessage=(...args)=>args[0]?.type==='GET_SNAPSHOT'&&globalThis.reviewFailReads?Promise.reject(new Error('Review: temporary read failure')):original(...args);});
 await expect(popup.locator('#session-error')).toContainText('temporary read failure');await popup.evaluate(()=>{globalThis.reviewFailReads=false;});
 if(!before){await expect(popup.locator('#session-error')).toBeHidden();await expect(popup.locator('#session-retry')).toBeHidden();}else await popup.waitForTimeout(1500);
 measurements.staleReadError=await popup.locator('#session-error').isVisible();await capture(popup,'read-recovered');
 if(!before){await popup.locator('#edit-plan').click();await popup.locator('#intention').selectOption('custom');await popup.locator('#custom-intention').fill('');await popup.locator('#submit-plan').click();await expect(popup.locator('#session-error')).toBeVisible();const validation=await popup.locator('#session-error').textContent();await popup.waitForTimeout(1500);await expect(popup.locator('#session-error')).toHaveText(validation);await expect(popup.locator('#session-retry')).toBeHidden();await popup.locator('#cancel-edit').click();await expect(popup.locator('#session-error')).toBeHidden();checks.push('Read recovery clears its error; validation survives polling and clears on cancel; edit focus restores.');}
 if(!before) {
  // A near-target fixture exercises the collapsed UI; crossing uses real observations.
  await popup.locator('#edit-plan').click();await popup.locator('#time-target').selectOption('custom');await popup.locator('#custom-minutes').fill('1');await popup.locator('#submit-plan').click();
  await indicator.locator('[data-action="resume"]').click();await indicator.locator('#collapse').click();
  await worker.evaluate(async()=>{const key='chrysalis.extension.v1',s=(await chrome.storage.session.get(key))[key];s.currentSession.elapsedMs=59999;s.timing.anchor=null;s.sequence++;await chrome.storage.session.set({[key]:s});});
  await yt.bringToFront();await expect(indicator.locator('#phase')).toContainText('Time target reached',{timeout:15000});await expect(indicator.locator('#details')).toBeHidden();await capture(yt,'collapsed-checkpoint',false);
  await expect(yt.locator('#chrysalis-session-dialog dialog')).toBeVisible();
  await yt.locator('#chrysalis-session-dialog #close').click();
  await indicator.locator('#collapse').focus();await yt.keyboard.press('Enter');await expect(indicator.locator('#checkpoint-controls')).toBeHidden();await expect(indicator.locator('#collapse')).toBeFocused();
  await indicator.locator('#collapse').press('Enter');await expect(indicator.locator('#phase')).toContainText('Target reached');await expect(indicator.locator('#details')).toBeHidden();
  await indicator.locator('#collapse').press('Enter');await expect(indicator.locator('#checkpoint-controls')).toBeHidden();await indicator.locator('[data-action="pause"]').click();
  checks.push('Centered checkpoint dismissal keeps the target; compact status and keyboard expand/collapse preserve focus.');
 }
 if(!before) {
  await yt.evaluate(()=>{document.querySelector('#below').style.cssText='width:1000px;margin-left:-70px;max-width:none';});
  await yt.setViewportSize({width:375,height:850});
  await indicator.locator('#restore').click();
  await expect.poll(async()=>{const r=await indicator.locator('.panel').boundingBox();return r.x>=0&&r.x+r.width<=375;}).toBe(true);
  await capture(yt,'offset-column-narrow',false);
  checks.push('A wide, left-offset host column at a narrow viewport keeps the indicator inside the viewport.');
 }
 const settings=await context.newPage();await settings.goto(`${base}options.html`);await settings.locator('#theme').selectOption('dark');await popup.bringToFront();await capture(popup,'active-dark');
 await settings.setViewportSize({width:375,height:800});const tabId=await settings.evaluate(async()=>(await chrome.tabs.getCurrent()).id);await worker.evaluate(id=>chrome.tabs.setZoom(id,2),tabId);assert.equal(await settings.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await capture(settings,'settings-zoom');
 if(!before){const opened=context.waitForEvent('page');await popup.locator('#viewing-preferences').click();const viewing=await opened;await expect(viewing).toHaveURL(`${base}options.html#viewing`);await expect(viewing.locator('#viewing-heading')).toBeFocused();checks.push('Viewing deep link focuses its section; settings at 375px and real 200% zoom has no horizontal overflow.');}
 await writeFile(`${out}/${stage}-fixture-report.json`,JSON.stringify({browser:context.browser().version(),category:'Real unpacked extension on controlled fixtures; popup document in tab',checks,measurements},null,2));console.log(stage,checks,measurements);
}finally{await context?.close();await rm(profile,{recursive:true,force:true});}
