import { convertUnit,editUrl,palette,wav,randomPassword,units } from './core';
import { say,downloadBlob,errorCopy } from '../workbench/browser';
export function mount(root:HTMLElement):()=>void {
 const get=<T extends HTMLElement=HTMLInputElement>(name:string)=>root.querySelector<T>(`[data-${name}]`)!;
 const value=(name:string)=>(get<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>(name)).value;
 const output=get<HTMLTextAreaElement>('output');const status=get('status');
 let worker:Worker|undefined;let timer:ReturnType<typeof setTimeout>|undefined;let previewUrl='';let audio:AudioBuffer|undefined;let colors:string[]=[];let context:AudioContext|undefined;let disposed=false;let fileRevision=0;
 const fail=()=>{status.textContent=say(errorCopy);};
 const done=()=>{status.textContent=say(['处理完成。','Done.','Fertig.']);};
 const write=(text:string)=>{output.value=text;done();};
 const stopWorker=()=>{worker?.terminate();worker=undefined;if(timer)clearTimeout(timer);};
 const drawColors=()=>{const count=Number(value('count'));if(!Number.isInteger(count)||count<2||count>12)throw Error('count');const canvas=get<HTMLCanvasElement>('image');colors=palette(canvas.getContext('2d')!.getImageData(0,0,canvas.width,canvas.height).data,count);get('swatches').replaceChildren(...colors.map(color=>{const chip=document.createElement('div');chip.style.cssText=`background:${color};width:5rem;height:5rem;border:1px solid var(--line);display:grid;align-items:end`;const label=document.createElement('span');label.textContent=color;label.style.cssText='background:#fff;color:#111;font:12px monospace;text-align:center';chip.append(label);return chip;}));write(colors.map((c,i)=>`--color-${i+1}: ${c};`).join('\n'));};
 const handlers:Record<string,()=>void|Promise<void>>={
  'unit-lab':()=>{const from=value('from'),to=value('to');if(value('value').trim()==='')throw Error('value');write(`${convertUnit(Number(value('value')),from,to).toLocaleString(document.documentElement.lang,{maximumSignificantDigits:14})} ${to}`);},
  'token-lab':()=>{const length=Number(value('length'));if(!Number.isInteger(length)||length<4||length>256)throw Error('length');write(value('kind')==='uuid'?crypto.randomUUID():randomPassword(length,'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'+(get<HTMLInputElement>('symbols').checked?'!@#$%^&*()-_=+[]{};:,.?':'')));},
  'url-lab':()=>{const result=editUrl(value('url'),get<HTMLInputElement>('strip').checked,value('query'));const u=new URL(result);write(result+'\n\n'+JSON.stringify({protocol:u.protocol,hostname:u.hostname,port:u.port,pathname:u.pathname,hash:u.hash,query:[...u.searchParams]},null,2));},
  'palette-lab':()=>{if(!get<HTMLCanvasElement>('image').dataset.loaded)throw Error('image');drawColors();},
  'regex-lab':()=>{stopWorker();output.value='';const input=value('input');if(input.length>1000000||value('pattern').length>10000)throw Error('size');worker=new Worker(new URL('./regex.worker.ts',import.meta.url),{type:'module'});timer=setTimeout(()=>{stopWorker();status.textContent=say(['匹配超时（1 秒）；请简化表达式。','Timed out (1 second). Simplify the expression.','Zeitlimit (1 Sekunde). Ausdruck vereinfachen.']);},1000);worker.onmessage=event=>{stopWorker();if(event.data.error){fail();return;}write(JSON.stringify(event.data,null,2));};worker.onerror=()=>{stopWorker();fail();};worker.postMessage({pattern:value('pattern'),flags:value('flags'),input,replacement:value('replace')});},
  'audio-lab':()=>{if(!audio)throw Error('audio');const start=Number(value('start')),end=Number(value('end')),gain=Number(value('gain'));if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||end>audio.duration+.001||gain<0||gain>2)throw Error('range');const first=Math.floor(start*audio.sampleRate),last=Math.min(audio.length,Math.floor(end*audio.sampleRate));if(last<=first)throw Error('frames');let channels=Array.from({length:audio.numberOfChannels},(_,c)=>audio!.getChannelData(c).slice(first,last));if(get<HTMLInputElement>('mono').checked){const mixed=new Float32Array(last-first);for(const ch of channels)for(let i=0;i<mixed.length;i++)mixed[i]+=ch[i]/channels.length;channels=[mixed];}for(const ch of channels)for(let i=0;i<ch.length;i++)ch[i]*=gain;const blob=new Blob([wav(channels,audio.sampleRate)],{type:'audio/wav'});downloadBlob(blob,'audio-trim.wav');if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=URL.createObjectURL(blob);const player=get<HTMLAudioElement>('audio');player.src=previewUrl;player.hidden=false;write(`${(last-first)/audio.sampleRate} s · ${audio.sampleRate} Hz · ${channels.length} ch · PCM 16-bit`);},
 };
 const run=async()=>{status.textContent='';try{await handlers[root.dataset.nativeLab!]();}catch{fail();}};
 get('run').addEventListener('click',run);
 get('copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(output.value);status.textContent=say(['已复制。','Copied.','Kopiert.']);}catch{fail();}});
 const slug=root.dataset.nativeLab;
 if(slug==='unit-lab'){get('group').addEventListener('change',()=>{const options=Object.keys(units[value('group')]);for(const name of ['from','to'])get<HTMLSelectElement>(name).replaceChildren(...options.map(u=>new Option(u,u)));get<HTMLSelectElement>('to').selectedIndex=1;void run();});get<HTMLSelectElement>('to').selectedIndex=1;}
 if(slug==='url-lab'){get('url').addEventListener('input',()=>{try{get<HTMLTextAreaElement>('query').value=new URL(editUrl(value('url'),false)).search.slice(1);}catch{get<HTMLTextAreaElement>('query').value='';}});for(const [name,operation] of [['encode',encodeURIComponent],['decode',decodeURIComponent]] as const)get(name).addEventListener('click',()=>{try{write(operation(value('code')));}catch{fail();}});}
 if(slug==='palette-lab'){get('css').addEventListener('click',()=>{if(colors.length)downloadBlob(new Blob([`:root {\n${colors.map((c,i)=>`  --color-${i+1}: ${c};`).join('\n')}\n}`],{type:'text/css'}),'palette.css');});get('json').addEventListener('click',()=>{if(colors.length)downloadBlob(new Blob([JSON.stringify(colors,null,2)],{type:'application/json'}),'palette.json');});}
 if(slug==='audio-lab'||slug==='palette-lab'){
  const runButton=get<HTMLButtonElement>('run');
  const resetFile=()=>{
   audio=undefined;colors=[];output.value='';status.textContent='';runButton.disabled=true;
   if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl='';}
   const player=get<HTMLAudioElement>('audio');player.pause();player.removeAttribute('src');player.load();player.hidden=true;
   const canvas=get<HTMLCanvasElement>(slug==='audio-lab'?'wave':'image');canvas.getContext('2d')!.clearRect(0,0,canvas.width,canvas.height);delete canvas.dataset.loaded;
   get('swatches').replaceChildren();
   if(slug==='audio-lab'){get<HTMLInputElement>('start').value='0';get<HTMLInputElement>('end').value='';}
   else for(const name of ['css','json'])get<HTMLButtonElement>(name).disabled=true;
  };
  resetFile();
  get('file').addEventListener('change',async()=>{
   const revision=++fileRevision;resetFile();
   const file=get<HTMLInputElement>('file').files?.[0];if(!file)return;
   try{
    if(file.size>(slug==='audio-lab'?40:20)*1024*1024)throw Error('size');
    if(slug==='audio-lab'){
     context??=new AudioContext();const decoded=await context.decodeAudioData(await file.arrayBuffer());
     if(disposed||revision!==fileRevision)return;
     if(decoded.duration>600||decoded.numberOfChannels>8)throw Error('size');
     audio=decoded;get<HTMLInputElement>('end').value=String(decoded.duration);
     const canvas=get<HTMLCanvasElement>('wave'),ctx=canvas.getContext('2d')!;ctx.strokeStyle='#216b9b';ctx.beginPath();const data=decoded.getChannelData(0);
     for(let x=0;x<canvas.width;x++){let min=0,max=0;const a=Math.floor(x*data.length/canvas.width),b=Math.floor((x+1)*data.length/canvas.width);for(let i=a;i<b;i++){min=Math.min(min,data[i]);max=Math.max(max,data[i]);}ctx.moveTo(x,80+min*75);ctx.lineTo(x,80+max*75);}ctx.stroke();
     write(`${file.name}\n${decoded.duration.toFixed(3)} s · ${decoded.sampleRate} Hz · ${decoded.numberOfChannels} ch`);
    }else{
     const canvas=get<HTMLCanvasElement>('image');const bitmap=await createImageBitmap(file);
     try{
      if(disposed||revision!==fileRevision)return;
      if(bitmap.width*bitmap.height>50000000)throw Error('size');
      const scale=Math.min(1,400/Math.max(bitmap.width,bitmap.height));canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d')!.drawImage(bitmap,0,0,canvas.width,canvas.height);canvas.dataset.loaded='true';drawColors();
      for(const name of ['css','json'])get<HTMLButtonElement>(name).disabled=false;
     }finally{bitmap.close();}
    }
    runButton.disabled=false;done();
   }catch{if(!disposed&&revision===fileRevision){resetFile();fail();}}
  });
 }
 return ()=>{disposed=true;stopWorker();if(previewUrl)URL.revokeObjectURL(previewUrl);void context?.close();};
}
