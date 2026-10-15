export const units: Record<string, Record<string, number>> = {
  length: {m:1,km:1000,cm:.01,mm:.001,in:.0254,ft:.3048,yd:.9144,mi:1609.344},
  mass: {kg:1,g:.001,mg:.000001,lb:.45359237,oz:.028349523125},
  speed: {'m/s':1,'km/h':1/3.6,mph:.44704,kn:.514444444444},
  data: {B:1,kB:1000,MB:1e6,GB:1e9,KiB:1024,MiB:1048576,GiB:1073741824},
  temperature: {C:1,F:1,K:1},
};
export function convertUnit(value:number,from:string,to:string):number {
  if(!Number.isFinite(value)) throw Error('value');
  const group=Object.values(units).find(g=>from in g && to in g);
  if(!group) throw Error('units');
  if(group===units.temperature){const c=from==='F'?(value-32)*5/9:from==='K'?value-273.15:value; if(c < -273.15) throw Error('temperature'); const result=to==='F'?c*9/5+32:to==='K'?c+273.15:c; if(!Number.isFinite(result))throw Error('overflow');return result;}
  const result=value*group[from]/group[to];
  if(!Number.isFinite(result)) throw Error('overflow');
  return result;
}
export function editUrl(input:string,strip:boolean,query?:string):string {
  const url=new URL(input);
  if(!['http:','https:'].includes(url.protocol)) throw Error('protocol');
  if(query!==undefined) url.search=query;
  if(strip) for(const key of [...url.searchParams.keys()]) if(/^utm_/i.test(key)||/^(fbclid|gclid|msclkid|dclid|mc_cid|mc_eid)$/i.test(key)) url.searchParams.delete(key);
  return url.href;
}
export function transformText(input:string,mode:string):string {
  if(mode==='upper') return input.toLocaleUpperCase();
  if(mode==='lower') return input.toLocaleLowerCase();
  const lines=input.split(/\r?\n/);
  if(mode==='dedupe') return [...new Set(lines)].join('\n');
  if(mode==='sort') return lines.sort((a,b)=>a.localeCompare(b)).join('\n');
  if(mode==='trim') return lines.map(l=>l.trim()).filter(Boolean).join('\n');
  return input;
}
export function palette(pixels:Uint8ClampedArray,count:number):string[] {
  const buckets=new Map<number,{n:number;r:number;g:number;b:number}>();
  for(let i=0;i<pixels.length;i+=4){if(pixels[i+3]<128)continue; const [r,g,b]=[pixels[i],pixels[i+1],pixels[i+2]];const key=(r>>4)*256+(g>>4)*16+(b>>4);const p=buckets.get(key)??{n:0,r:0,g:0,b:0};p.n++;p.r+=r;p.g+=g;p.b+=b;buckets.set(key,p);}
  return [...buckets.values()].sort((a,b)=>b.n-a.n).slice(0,count).map(p=>'#'+[p.r,p.g,p.b].map(v=>Math.round(v/p.n).toString(16).padStart(2,'0')).join(''));
}
export function wav(channels:Float32Array[],sampleRate:number):ArrayBuffer {
  const frames=channels[0].length; const buffer=new ArrayBuffer(44+frames*channels.length*2);const view=new DataView(buffer);
  const text=(at:number,value:string)=>[...value].forEach((c,i)=>view.setUint8(at+i,c.charCodeAt(0)));
  text(0,'RIFF');view.setUint32(4,buffer.byteLength-8,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,channels.length,true);view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*channels.length*2,true);view.setUint16(32,channels.length*2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,buffer.byteLength-44,true);
  for(let i=0;i<frames;i++) for(let c=0;c<channels.length;c++){const v=Math.max(-1,Math.min(1,channels[c][i]));view.setInt16(44+(i*channels.length+c)*2,v<0?v*32768:v*32767,true);}
  return buffer;
}
export function randomPassword(length:number,alphabet:string):string {
  if(!Number.isInteger(length)||length<1||length>4096||alphabet.length<2||alphabet.length>256)throw Error('bounds');
  const limit=256-256%alphabet.length;let result='';
  while(result.length<length){const bytes=crypto.getRandomValues(new Uint8Array(Math.max(32,length-result.length)));for(const byte of bytes)if(byte<limit&&result.length<length)result+=alphabet[byte%alphabet.length];}
  return result;
}
