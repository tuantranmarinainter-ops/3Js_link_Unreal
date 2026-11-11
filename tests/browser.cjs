// Developer test: npm install playwright; npx playwright install chromium
// Run: node tests/browser.cjs (server is started/stopped automatically).
// Optional: BROWSER_BIN, PYTHON_BIN, BL_TEST_OUTPUT environment variables.
const { chromium }=require('playwright');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base='http://127.0.0.1:8765';
const root=path.resolve(__dirname,'..');
const output=process.env.BL_TEST_OUTPUT||path.join(root,'test-output');
fs.mkdirSync(output,{recursive:true});
const server=spawn(process.env.PYTHON_BIN||(process.platform==='win32'?'python':'python3'),['server.py','--no-browser'],{cwd:root,stdio:'pipe'});
let log='';server.stdout.on('data',d=>log+=d);server.stderr.on('data',d=>log+=d);
const delay=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  let browser;
  try{
    let ready=false;
    for(let i=0;i<60;i++){try{if((await fetch(base+'/api/status')).ok){ready=true;break;}}catch{}await delay(100);}
    assert.ok(ready,'Local server starts: '+log);
    browser=await chromium.launch({...(process.env.BROWSER_BIN?{executablePath:process.env.BROWSER_BIN}:{}),args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
    const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
    const errors=[];const external=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(base))external.push(r.url());});
    await page.goto(base);await page.waitForFunction(()=>window.__ready);
    const count=await page.evaluate(()=>blocklink.partCount);assert.equal(count,23);
    const samples=[];
    for(const animation of ['idle','walk','run','jump','wave','point','dance','sit']){
      await page.locator('[data-anim='+animation+']').click();
      const result=await page.evaluate(()=>{
        blocklink.seek(.37);const a=blocklink.frame();
        blocklink.seek(5.65);blocklink.seek(.37);const b=blocklink.frame();
        blocklink.seek(.78);const c=blocklink.frame();
        return {a,b,c};
      });
      assert.deepEqual(result.a,result.b,animation+' seek is deterministic');
      if(!['point','sit'].includes(animation))assert.notDeepEqual(result.a.parts,result.c.parts,animation+' moves');
      assert.equal(result.a.parts.length,count);
      for(const part of result.a.parts){assert.ok(part.p.concat(part.q,part.s).every(Number.isFinite));assert.ok(Math.abs(part.q.reduce((a,x)=>a+x*x,0)-1)<1e-8);}
      samples.push(result.a);
    }
    console.log('PASS: 8 animations, repeatable seek, finite transforms, normalized quaternions, 23 parts');
    await page.getByRole('button',{name:'Áo đỏ',exact:true}).click();
    const colors=await page.evaluate(()=>blocklink.frame().parts.filter(p=>['torso','right_sleeve','left_sleeve'].includes(p.id)).map(p=>p.color));
    assert.deepEqual(colors,['#d85e64','#d85e64','#d85e64']);
    await page.selectOption('#hat','none');
    assert.ok((await page.evaluate(()=>blocklink.frame().parts.filter(p=>p.id.startsWith('hat_')).map(p=>p.visible))).every(v=>!v));
    let lastFace;
    for(const face of ['smile','sad','surprised','angry']){
      await page.selectOption('#face',face);const data=await page.evaluate(()=>blocklink.frame().parts.filter(p=>/mouth|eye|brow/.test(p.id)));
      if(lastFace)assert.notDeepEqual(lastFace,data);lastFace=data;
    }
    console.log('PASS: shirt + sleeves, hat visibility, 4 facial expressions');
    await page.locator('#travel').check();
    const travel=await page.evaluate(()=>{blocklink.seek(2);return blocklink.frame().parts[0].p;});
    assert.ok(travel[2]>2);
    await page.locator('#travel').uncheck();
    await page.locator('#help').click();assert.equal(await page.locator('#guide').isVisible(),true);
    assert.match(await page.locator('#setupCommand').inputValue(),/blocklink_unreal\.py/);
    await page.locator('#closeHelp').click();
    await page.locator('#link').click();
    let packet;
    for(let i=0;i<50;i++){packet=await(await fetch(base+'/api/frame')).json();if(packet.frame)break;await delay(100);}
    assert.equal(packet.frame.parts.length,23);
    await page.waitForFunction(()=>document.querySelector('#statusTitle').textContent==='Đang chờ Unreal');
    // Explicitly a simulated ACK, not an Unreal Engine test.
    await fetch(base+'/api/ue-status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({applied_seq:packet.seq,parts:23,error:''})});
    await page.waitForFunction(()=>document.querySelector('#linkState').classList.contains('live'));
    await page.waitForFunction(()=>!document.querySelector('#linkState').classList.contains('live'),{},{timeout:6000});
    await fetch(base+'/api/ue-status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({applied_seq:packet.seq,parts:23,error:'Simulated receiver failure'})});
    await page.waitForFunction(()=>document.querySelector('#linkState').classList.contains('error'));
    await page.locator('#link').click();
    console.log('PASS: real HTML → HTTP relay; simulated receiver ACK, stale ACK and error status');
    await page.selectOption('#face','smile');await page.selectOption('#hat','cap');
    await page.getByRole('button',{name:'Áo xanh ngọc',exact:true}).click();
    await page.locator('[data-anim=wave]').click();await page.evaluate(()=>blocklink.seek(.38));
    await page.screenshot({path:path.join(output,'desktop.png'),fullPage:true});
    await page.setViewportSize({width:390,height:844});
    await page.waitForTimeout(230);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:path.join(output,'mobile.png'),fullPage:true});
    assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
    fs.writeFileSync(path.join(output,'frames.json'),JSON.stringify(samples,null,2));
    console.log('PASS: desktop + mobile layout, no JS errors, no external network requests');
  }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
