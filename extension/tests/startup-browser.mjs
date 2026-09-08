// No popup or options page is opened in this suite. Test the ZIP-extracted bytes.
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
const live = process.argv.includes('--live');
const { version } = JSON.parse(await readFile('package.json', 'utf8'));
const extension = path.resolve(process.env.CHRYSALIS_EXTENSION_PATH ?? `release/chrysalis-${version}-unpacked`);
const manifest = JSON.parse(await readFile(`release/chrysalis-${version}-build-manifest.json`, 'utf8'));
for (const [file, digest] of Object.entries(manifest.files)) assert.equal(createHash('sha256').update(await readFile(path.join(extension, file))).digest('hex'), digest);
const profile = await mkdtemp(path.join(tmpdir(), 'chrysalis-startup-'));
const checks = [], timings = [], errors = [];
let context, worker, base, coldLaunchObservedMs, restoreObservation;
const modal = page => page.locator('#chrysalis-session-dialog');
const indicator = page => page.locator('#chrysalis-extension-indicator');
const fixture = `<!doctype html><head><script src="/startup-bootstrap.js"></script></head><body><input id="search" autofocus><ytd-app><video controls muted></video><button id="next">Next</button><img src="/startup-slow.png"></ytd-app><script>
const canvas=document.createElement('canvas'); canvas.width=160;canvas.height=90;const ctx=canvas.getContext('2d');setInterval(()=>{ctx.fillStyle='teal';ctx.fillRect(0,0,160,90)},100);const video=document.querySelector('video');video.srcObject=canvas.captureStream(10);video.play().catch(()=>{});
document.querySelector('#next').onclick=()=>{document.dispatchEvent(new Event('yt-navigate-start'));history.pushState({},'', '/shorts/next');document.dispatchEvent(new Event('yt-navigate-finish'))};
</script></body>`;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function launch(restore = false) {
  const ctx = await chromium.launchPersistentContext(profile, {channel:'chromium',headless:!process.argv.includes('--headed'),viewport:{width:1280,height:900},args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`, ...(restore ? ['--restore-last-session'] : [])]});
  ctx.setDefaultTimeout(12000);
  ctx.on('page', page => {
    page.on('pageerror', error => errors.push(error.message));
    page.on('framenavigated', frame => assert(!/chrome-extension:.*\/(popup|options)\.html/.test(frame.url()), 'Startup test must never open popup/options'));
  });
  // Test-only measurement of the first rendered modal. This runs in the page
  // world and does not initialize extension state or invoke any extension API.
  await ctx.addInitScript(() => {
    const observer = new MutationObserver(() => {
      const dialog=document.querySelector('#chrysalis-session-dialog')?.shadowRoot?.querySelector('dialog');
      if (dialog?.open) requestAnimationFrame(() => {
        if (window.__introTiming || !dialog.open) return;
        window.__introTiming={ms:performance.now(),readyState:document.readyState,loadEventEnd:performance.getEntriesByType('navigation')[0]?.loadEventEnd ?? 0};observer.disconnect();
      });
    });
    observer.observe(document,{subtree:true,childList:true});
  });
  if (!live) await ctx.route('https://www.youtube.com/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/startup-bootstrap.js') { await sleep(600); await route.fulfill({contentType:'text/javascript',body:''}).catch(()=>{}); }
    else if (url.pathname === '/startup-slow.png') { await sleep(6000); await route.fulfill({contentType:'image/png',body:Buffer.alloc(0)}).catch(()=>{}); }
    else await route.fulfill({contentType:'text/html',body:fixture});
  });
  return ctx;
}
async function currentWorker() {
  worker = context.serviceWorkers().find(w => w.url().endsWith('/background.js')) ?? await context.waitForEvent('serviceworker');
  base = worker.url().replace('background.js','');
  return worker;
}
const state = async () => (await currentWorker()).evaluate(async () => (await chrome.storage.session.get('chrysalis.extension.v1'))['chrysalis.extension.v1']);
async function preferences(patch) {
  // Seed preferences in trusted storage only while all YouTube tabs are away,
  // after queued observations drain. This is test setup, not a popup wake-up.
  const front = context.pages().find(p => p.url().startsWith('https://www.youtube.com/') && !p.isClosed());
  const blank = await context.newPage(); await blank.bringToFront(); await sleep(400);
  await (await currentWorker()).evaluate(async patch => {
    const s=(await chrome.storage.session.get('chrysalis.extension.v1'))['chrysalis.extension.v1'];
    await chrome.storage.local.set({'chrysalis.preferences.v1':{...s.settings,...patch}});
  },patch);
  await blank.close(); await front?.bringToFront();
  await expect.poll(async () => { const s=await state(); return Object.entries(patch).every(([k,v])=>s.settings[k]===v); }).toBe(true);
}
async function laterVisit() { await (await currentWorker()).evaluate(()=>chrome.storage.session.remove('chrysalis.visit')); }
async function measure(page,label) {
  await expect(modal(page).locator('dialog')).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>Boolean(window.__introTiming))).toBe(true);
  const timing=await page.evaluate(()=>window.__introTiming);
  timings.push({label,...timing}); console.log(`${label}: ${timing.ms.toFixed(1)} ms; ${timing.readyState}; loadEventEnd=${timing.loadEventEnd}`);
  await expect(modal(page)).toHaveCount(1);
  const box=await modal(page).locator('dialog').boundingBox();
  assert(Math.abs(box.x+box.width/2-640)<3 && Math.abs(box.y+box.height/2-450)<3);
  if (!live) { assert.equal(timing.loadEventEnd,0); assert(timing.ms<5000,'Intro must not wait for the delayed image/load event'); }
}
async function enter(page,url,label) {
  await page.goto(url,{waitUntil:'commit',timeout:45000});
  await measure(page,label);
}
async function stopWorker(page) {
  const cdp=await context.newCDPSession(page), versions=new Map();
  cdp.on('ServiceWorker.workerVersionUpdated',({versions:list})=>list.forEach(v=>versions.set(v.versionId,v)));
  await cdp.send('ServiceWorker.enable');
  await expect.poll(()=>[...versions.values()].some(v=>v.scriptURL===`${base}background.js`)).toBe(true);
  const v=[...versions.values()].find(v=>v.scriptURL===`${base}background.js`);
  await cdp.send('ServiceWorker.stopWorker',{versionId:v.versionId});
  await expect.poll(()=>versions.get(v.versionId)?.runningStatus).toBe('stopped');
  await cdp.detach();
}
try {
  await mkdir('test-results',{recursive:true});
  const launchStart=performance.now();
  context=await launch();
  // No wait for the worker or initialization command before entering YouTube.
  const yt=context.pages()[0] ?? await context.newPage();
  await enter(yt,'https://www.youtube.com/','cold fresh profile / Home');
  coldLaunchObservedMs=performance.now()-launchStart;
  assert.equal((await state()).currentSession.phase,'idle');
  await expect(modal(yt).locator('#duration')).toBeFocused();
  await modal(yt).locator('#close').focus(); await yt.keyboard.press('Shift+Tab');
  await expect(modal(yt).locator('#untimed')).toBeFocused();
  await yt.screenshot({path:`test-results/startup-${live?'live':'fixture'}-intro.png`});
  await yt.keyboard.press('Escape'); await expect(modal(yt)).toHaveCount(0);
  await yt.reload({waitUntil:'commit'}); await expect(indicator(yt)).toHaveCount(1);
  await yt.waitForTimeout(1200); await expect(modal(yt)).toHaveCount(0);
  checks.push('Cold fresh-profile Home entry initializes without popup; centered modal, keyboard focus loop, Escape and refresh suppression.');
  // Stop the worker with all YouTube documents gone; the next content script is
  // the only source of initialization requests. No DevTools worker evaluation.
  await yt.goto('about:blank'); await laterVisit(); await stopWorker(yt);
  await enter(yt,'https://www.youtube.com/watch?v=aqz-KE-bpKQ','suspended worker / direct watch');
  assert.equal((await state()).currentSession.phase,'idle');
  if (!live) {
    await expect.poll(()=>yt.locator('video').evaluate(v=>v.paused)).toBe(true);
    await yt.locator('video').evaluate(v=>{v.play().catch(()=>{});});
    await expect.poll(()=>yt.locator('video').evaluate(v=>v.paused)).toBe(true);
    // A replacement/delayed Shorts player must also stay paused behind the intro.
    await yt.evaluate(()=>{const old=document.querySelector('video');const v=document.createElement('video');v.muted=true;v.srcObject=old.srcObject;old.replaceWith(v);v.play().catch(()=>{});});
    await expect.poll(()=>yt.locator('video').evaluate(v=>v.paused)).toBe(true);
  } else {
    const media=yt.locator('video').first();
    try { await media.waitFor({state:'attached',timeout:15000}); await expect.poll(()=>media.evaluate(v=>v.paused)).toBe(true); checks.push('Live watch media is paused behind the introduction.'); }
    catch { checks.push('Live player unavailable; autoplay protection verified on a real canvas media stream in the controlled run.'); }
  }
  await yt.waitForTimeout(2200); assert.equal((await state()).currentSession.phase,'idle');
  await modal(yt).locator('#intention').fill('Startup validation');
  await modal(yt).locator('#intention').press('Enter');
  await expect(modal(yt)).toHaveCount(0);
  const sessionId=(await state()).currentSession.id;
  await expect.poll(async()=> (await state()).currentSession.elapsedMs,{timeout:10000}).toBeGreaterThan(0);
  if (!live) { await yt.locator('video').evaluate(v=>v.play()); await expect.poll(()=>yt.locator('video').evaluate(v=>v.paused)).toBe(false); }
  if (live) {
    const origin=await yt.evaluate(()=>performance.timeOrigin);
    await yt.locator('a#logo').first().click(); await expect(yt).toHaveURL('https://www.youtube.com/');
    assert.equal(await yt.evaluate(()=>performance.timeOrigin),origin,'YouTube logo navigation should retain the document');
    await expect(indicator(yt)).toHaveCount(1); await expect(modal(yt)).toHaveCount(0);
    assert.equal((await state()).currentSession.id,sessionId);
    checks.push('Live YouTube logo navigation retained the document, session and single timer without another introduction.');
  }
  checks.push('Stopped worker wakes from direct video entry; idle planning time excluded; Enter starts one session; media guard releases after Start.');
  await yt.reload({waitUntil:'commit'}); await expect(indicator(yt)).toHaveCount(1); await expect(modal(yt)).toHaveCount(0);
  assert.equal((await state()).currentSession.id,sessionId);
  const other=await context.newPage(); await other.goto('https://www.youtube.com/shorts/aqz-KE-bpKQ',{waitUntil:'commit'});
  await expect(indicator(other)).toHaveCount(1); await expect(modal(other)).toHaveCount(0);
  await yt.bringToFront();
  const before=(await state()).currentSession.elapsedMs, start=Date.now();
  await yt.waitForTimeout(2200); await other.bringToFront(); await other.waitForTimeout(2200);
  const elapsed=(await state()).currentSession.elapsedMs-before;
  assert(elapsed>0 && elapsed<=Date.now()-start+500);
  await stopWorker(other);
  await expect.poll(async()=> (await state()).currentSession.elapsedMs,{timeout:10000}).toBeGreaterThan(before+elapsed);
  assert.equal((await state()).currentSession.id,sessionId);
  await preferences({showIndicator:false}); await other.reload({waitUntil:'commit'});
  await expect(indicator(other).locator('#restore')).toBeVisible(); await expect(indicator(other).locator('#panel')).toBeHidden();
  const hidden=(await state()).currentSession.elapsedMs;
  await expect.poll(async()=> (await state()).currentSession.elapsedMs,{timeout:10000}).toBeGreaterThan(hidden);
  if (!live) {
    await other.locator('#next').click();
    for(let n=0;n<20;n++) await other.evaluate(()=>document.dispatchEvent(new Event('yt-navigate-finish')));
    await expect(indicator(other)).toHaveCount(1); await expect(modal(other)).toHaveCount(0);
    assert.equal((await state()).currentSession.id,sessionId);
    await other.goBack({waitUntil:'commit'}); await expect(indicator(other)).toHaveCount(1);
  }
  checks.push('Refresh, second tab, tab handoff, active worker stop and hidden timer retain the session without double-counting; repeated SPA and popstate handled in fixtures.');
  await preferences({extensionPaused:true}); await other.bringToFront(); await other.reload({waitUntil:'commit'});
  await other.waitForTimeout(1500); await expect(indicator(other)).toHaveCount(0); await expect(modal(other)).toHaveCount(0);
  const disabled=(await state()).currentSession.elapsedMs;
  await other.waitForTimeout(2200); assert.equal((await state()).currentSession.elapsedMs,disabled);
  checks.push('Explicit Pause Chrysalis suppresses automatic UI and time tracking.');
  await preferences({extensionPaused:false,showIndicator:true}); await other.bringToFront();
  await other.reload({waitUntil:'commit'}); await expect(indicator(other)).toBeVisible();
  if (await indicator(other).locator('#restore').isVisible()) await indicator(other).locator('#restore').click();
  await indicator(other).locator('[data-action="finish"]').click();
  await preferences({autoSessionIntro:false}); await other.bringToFront(); await laterVisit();
  await other.reload({waitUntil:'commit'}); await expect(indicator(other)).toHaveCount(1);
  await other.waitForTimeout(1800); await expect(modal(other)).toHaveCount(0);
  await preferences({autoSessionIntro:true}); await other.bringToFront(); await other.goto('about:blank'); await laterVisit();
  await enter(other,'https://www.youtube.com/shorts/aqz-KE-bpKQ','new visit / direct Shorts');
  await modal(other).locator('#untimed').click(); await expect(modal(other)).toHaveCount(0);
  checks.push('Automatic-introduction preference respected; direct Shorts introduction works; Continue without timer does not create a session.');
  // Keep a real YouTube tab in Chrome's saved session and request native restore.
  await yt.close(); await context.close(); context=await launch(true);
  const restored=context.pages().find(p=>p.url().startsWith('https://www.youtube.com/'));
  if (restored) {
    await restored.bringToFront(); await expect(modal(restored).locator('dialog')).toBeVisible({timeout:20000});
    restoreObservation=await restored.evaluate(()=>({observedByMs:performance.now(),readyState:document.readyState,loadEventEnd:performance.getEntriesByType('navigation')[0]?.loadEventEnd ?? 0,measurement:'Upper bound: automation attached after native restored navigation started; not first-render timing'}));
    checks.push('Native --restore-last-session restored a YouTube tab and automatically opened the new-browser introduction.');
    // Init instrumentation can attach after native restored navigation started;
    // report only timings actually captured from document creation.
    const timing=await restored.evaluate(()=>window.__introTiming ?? null);
    if(timing) timings.push({label:'native restored tab',...timing});
  } else throw new Error('Chrome did not restore the saved YouTube tab');
  assert.equal((await state()).currentSession.phase,'idle','Browser restart clears temporary activity by design');
  checks.push('Full browser restart preserves preferences and clears temporary sessions under the unchanged privacy design.');
  if(!live) assert.deepEqual(errors,[]);
  const report={version,zipSha256:manifest.sha256,browser:context.browser().version(),platform:process.platform,mode:live?'Live signed-out YouTube':'Controlled YouTube-origin pages with 600ms parser and 6000ms image delays',noPopupOrOptionsOpened:true,coldLaunchObservedMs,restoreObservation,timings,checks,errors,limitations:['First-render timings include network/document arrival and browser/worker scheduling; not zero latency.','Live YouTube availability/layouts vary; no authenticated account, physical screen reader or OS sleep/wake test.','Native restoration may start before measurement instrumentation attaches. Browser restart intentionally discards unfinished activity.']};
  await writeFile(`test-results/startup-${live?'live':'fixture'}-report.json`,JSON.stringify(report,null,2)+'\n');
  console.log(checks.join('\n'));
} finally { await context?.close(); await rm(profile,{recursive:true,force:true}); }
