import { chromium } from 'playwright';
const B='http://localhost:3157', D='/tmp/stack/audit/bugs/round2/ui/'; const log=[];
const b=await chromium.launch();
for (const [vn,vp] of [['desktop',{width:1280,height:800}],['mobile',{width:390,height:844}]]) {
  const ctx=await b.newContext({viewport:vp}); const p=await ctx.newPage(); const errs=[];
  p.on('pageerror',e=>errs.push('pageerror '+e.message)); p.on('console',m=>{if(m.type()==='error')errs.push('console '+m.text())});
  const shot=async n=>{await p.screenshot({path:D+`${vn}-${n}.png`,fullPage:true}); const ov=await p.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth); console.log(`${vn} ${n}: horizontal overflow ${ov}px; errors so far ${errs.length}`);};
  await p.goto(B+'/'); await shot('01-landing');
  await p.goto(B+'/app?election=upload'); await p.getByTestId('sample-stv').click(); await p.getByTestId('seats-input').fill('2');
  await p.getByTestId('run-count').click(); await p.getByTestId('stv-winners').waitFor(); await shot('02-stv-sample');
  console.log(`${vn} stv winners: ${(await p.getByTestId('stv-winners').innerText()).replace(/\s+/g,' ')}`);
  await p.getByTestId('seats-input').fill('1'); await p.getByTestId('ballots-input').fill('3,Alice\r2,Bob\r1,Cara\r'); await p.getByTestId('run-count').click();
  await p.getByTestId('kpi-winner').waitFor(); console.log(`${vn} CR-only upload winner: ${await p.getByTestId('kpi-winner').innerText()} ballots ${await p.getByTestId('kpi-ballots').innerText()}`); await shot('03-cr-upload');
  await p.getByTestId('ballots-input').fill('4,Zoe\u0301\n3,Zoé\n2,Bob\n'); await p.getByTestId('run-count').click(); await p.waitForTimeout(800);
  console.log(`${vn} NFD/NFC names: ${(await p.locator('[data-testid=candidate-name]').allInnerTexts()).join(' | ')}`); await shot('04-nfc');
  for (const [n,u] of [['05-nyc-r3','/app?election=nyc-2021-dem-mayor&round=3'],['06-nyc-r99','/app?election=nyc-2021-dem-mayor&round=99'],['07-maine','/app?election=maine-2018-cd2'],['08-bad-election','/app?election=nope'],['09-round-0','/app?election=alaska-2022-special&round=0']]) {
    await p.goto(B+u); await p.waitForTimeout(1200); const t=await p.getByTestId('round-title').first().innerText({timeout:3000}).catch(()=>'(no round-title)');
    const e=await p.getByTestId('error-state').first().innerText({timeout:3000}).catch(()=>''); console.log(`${vn} ${u}: url-after=${new URL(p.url()).search} title="${t}" error="${e.slice(0,80)}"`); await shot(n);
  }
  console.log(`${vn} errors: ${JSON.stringify(errs)}`); await ctx.close();
}
await b.close()
