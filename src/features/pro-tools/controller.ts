import { parseDelimitedText, serializeCsv } from '../data-shape/csv';
import { prepareSvg } from '../color-vision/vector-io';
import { boundedRandomInt, convertColor, decodeHtmlEntities, explainCron, formatHtmlEntities, generateRandomFrom, inferJsonSchema, inspectUnicode, ipv4Subnet, nextCronRuns, normalizeText, parseJsonPath, parseYamlJson, passwordAudit, profileCsv, stringifyJsonYaml, toBase, validateRobots, validUuid } from './core';
import { downloadBlob } from '../workbench/browser';
import { mountMarkdownStudio } from '../markdown-studio/controller';

const copy = (zh: string, en: string, de: string) => ({ 'zh-CN': zh, en, de }[document.documentElement.lang] ?? zh);
const secureInteger = (min:number,max:number) => {
 for(let attempt=0;attempt<128;attempt++){const n=new Uint32Array(2);crypto.getRandomValues(n);const value=boundedRandomInt((n[0]*0x200000)+(n[1]>>>11),min,max);if(value!==null)return value;}
 throw new Error('secure random rejection limit');
};
const names = ['amber','atlas','birch','comet','delta','ember','fern','harbor','iris','jade','kite','lumen','maple','nova','orbit','pixel','quartz','river','solar','tulip','umbra','velvet','willow','xenon','yonder','zephyr'];
const greetings = {
 'zh-CN':['愿你心有星光，步履从容。','愿每一次努力，都遇见温柔回响。','祝你新程顺遂，所愿皆有回应。','愿平安喜乐常伴，热爱始终闪亮。'],
 en:['May your next chapter be bright and kind.','Wishing you steady steps and joyful discoveries.','May good things find their way to you.','Here is to new beginnings and quiet courage.'],
 de:['Möge dein nächstes Kapitel hell und freundlich sein.','Ich wünsche dir Zuversicht und viele schöne Entdeckungen.','Mögen gute Dinge ihren Weg zu dir finden.','Auf neue Anfänge und leisen Mut.'],
};
const pick = <T,>(items: readonly T[]) => items[secureInteger(0,items.length-1)];
const securePassword = (length: number) => {
 const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*+-_';
 if (!Number.isInteger(length) || length < 8 || length > 128) throw new Error('Password length must be 8–128');
 const ceiling = Math.floor(0x100000000 / chars.length) * chars.length;
 let result = '';
 while (result.length < length) { const values = new Uint32Array(length - result.length); crypto.getRandomValues(values); for (const value of values) if (value < ceiling) result += chars[value % chars.length]; }
 return result;
};
const blobFromCanvas = (canvas: HTMLCanvasElement, type: string, quality: number) => new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('format unavailable')), type, quality));
const fileSize = (size: number) => `${(size / 1024).toFixed(1)} KiB (${size.toLocaleString()} bytes)`;

export function mount(root: HTMLElement): () => void {
 if(root.dataset.proLab==='markdown-studio'||root.dataset.proLab==='markdown-table') return mountMarkdownStudio(root);
 const get = <T extends HTMLElement = HTMLInputElement>(key: string) => root.querySelector<T>(`[data-${key}]`)!;
 const slug = root.dataset.proLab!; const input = root.querySelector<HTMLTextAreaElement>('[data-input]');
 const output = get<HTMLTextAreaElement>('output'), status = get('status'), runButton = get<HTMLButtonElement>('run');
 const preview=root.querySelector<HTMLElement>('[data-preview]');
 let result = '', resultBlob: Blob | undefined, filename = `${slug}-result.txt`, revision = 0;
 const setResult = (text: string, blob?: Blob, name = filename) => { result = text; resultBlob = blob; filename = name; output.value = text; get<HTMLButtonElement>('copy').disabled = false; get<HTMLButtonElement>('download').disabled = false; status.textContent = copy('处理完成。结果仅保留在当前页面。','Done. The result stays on this page.','Fertig. Das Ergebnis bleibt auf dieser Seite.'); };
 const run = async () => {
  const request = ++revision; result = ''; resultBlob = undefined; output.value = ''; get<HTMLButtonElement>('copy').disabled = true; get<HTMLButtonElement>('download').disabled = true; status.textContent = '';
  try {
   const text = input?.value ?? '';
   if (text.length > (slug==='svg-optimizer'?5_000_000:1_000_000)) throw new Error('input too large');
   switch (slug) {
    case 'random-forge': {
     const mode = get<HTMLSelectElement>('mode').value, count = Number(get<HTMLInputElement>('count').value);
     if (!Number.isInteger(count) || count < 1 || count > 100) throw new Error('count');
     let lines: string[];
     if (mode === 'lottery' || mode === 'dice') lines = generateRandomFrom(mode, count, Number(get<HTMLInputElement>('min').value), Number(get<HTMLInputElement>('max').value), secureInteger).map(String);
     else if (mode === 'passphrase' || mode === 'phrase') lines = Array.from({length:count}, () => Array.from({length:8}, () => pick(names)).join('-'));
     else if (mode === 'greeting') { const locale = document.documentElement.lang === 'de' ? 'de' : document.documentElement.lang === 'en' ? 'en' : 'zh-CN'; lines = Array.from({length:count}, () => pick(greetings[locale])); }
     else if (mode === 'lorem') lines = Array.from({length:count}, () => Array.from({length:24}, () => pick(names)).join(' ') + '.');
     else lines = Array.from({length:count}, () => securePassword(20));
     setResult(lines.join('\n')); break;
    }
    case 'markdown-studio': {
     const headings = [...text.matchAll(/^(#{1,6})\s+(.+)$/gmu)].map((m) => ({level:m[1].length,title:m[2].trim()}));
     const warnings = headings.some((h,i)=>i>0&&h.level>headings[i-1].level+1) ? [copy('标题层级存在跳级。','Heading levels skip a level.','Überschriften überspringen eine Ebene.')] : [];
     if (!headings.some(h=>h.level===1)) warnings.push(copy('未找到一级标题。','No H1 heading found.','Keine H1-Überschrift gefunden.'));
     const brokenLinks = [...text.matchAll(/\[[^\]]*\]\(([^)]+)\)/gu)].filter((m)=>!/^https?:\/\/|^mailto:|^#|^\//iu.test(m[1]));
     if (brokenLinks.length) warnings.push(`${copy('相对链接需检查','Review relative links','Relative Links prüfen')}: ${brokenLinks.length}`);
     const toc = headings.map((h)=>`${'  '.repeat(h.level-1)}- [${h.title}](#${normalizeText(h.title,'slug')})`).join('\n') || copy('（未发现标题）','(no headings found)','(keine Überschriften gefunden)');
     setResult(`${copy('文档结构报告','Document structure report','Bericht zur Dokumentstruktur')}\n\n${copy('标题','Headings','Überschriften')}: ${headings.length}\n${copy('段落','Paragraphs','Absätze')}: ${(text.match(/\n\s*\n/gu)||[]).length}\n${copy('估算阅读时间','Estimated reading time','Geschätzte Lesezeit')}: ${Math.max(1,Math.ceil((text.match(/\S+/gu)||[]).length/200))} min\n${copy('检查提示','Review notes','Prüfhinweise')}: ${warnings.length?warnings.join('; '):copy('未发现结构问题','No structural issues found','Keine Strukturprobleme gefunden')}\n\n${copy('目录建议','Suggested table of contents','Vorgeschlagenes Inhaltsverzeichnis')}\n${toc}`); break;
    }
    case 'json-schema': { const schema=inferJsonSchema(text); setResult(JSON.stringify({$schema:'https://json-schema.org/draft/2020-12/schema',...schema},null,2),new Blob([JSON.stringify({$schema:'https://json-schema.org/draft/2020-12/schema',...schema},null,2)],{type:'application/schema+json'}),'schema.json'); break; }
    case 'jsonpath-query': { const selected=parseJsonPath(text,get<HTMLInputElement>('path').value); setResult(JSON.stringify(selected,null,2)); break; }
    case 'base-converter': { const radix=Number(get<HTMLSelectElement>('radix').value), converted=toBase(text,radix); setResult(`Binary: ${converted.binary}\nOctal: ${converted.octal}\nDecimal: ${converted.decimal}\nHexadecimal: ${converted.hexadecimal}`); break; }
    case 'unicode-inspector': setResult(JSON.stringify(inspectUnicode(text),null,2)); break;
    case 'csv-profiler': setResult(JSON.stringify(profileCsv(text),null,2)); break;
    case 'robots-checker': setResult(JSON.stringify(validateRobots(text),null,2)); break;
    case 'yaml-json': setResult(get<HTMLSelectElement>('mode').value==='yaml-json'?parseYamlJson(text):stringifyJsonYaml(text)); break;
    case 'xml-studio': {
     if (/<!\s*(?:DOCTYPE|ENTITY)/iu.test(text)) throw new Error('DTD/entities are blocked');
     const doc = new DOMParser().parseFromString(text,'application/xml'); if (doc.querySelector('parsererror')) throw new Error('invalid XML');
     const serialized = new XMLSerializer().serializeToString(doc).replace(/></gu,'>\n<'); setResult(serialized, new Blob([serialized],{type:'application/xml'}),'document.xml'); break;
    }
    case 'css-studio': {
     const style=document.createElement('style'); style.textContent=text; document.head.append(style);
     try { const rules=style.sheet?.cssRules; if(!rules) throw new Error('stylesheet parse failed'); const resultCss=[...rules].map((rule)=>rule.cssText).join(get<HTMLSelectElement>('mode').value==='minify'?'':'\n'); setResult(resultCss,new Blob([resultCss],{type:'text/css'}),'styles.css'); }
     finally { style.remove(); } break;
    }
    case 'csv-json': {
     const mode=get<HTMLSelectElement>('mode').value;
     if(mode==='csv-json') { const rows=parseDelimitedText(text,','); if(!rows.length) throw new Error('empty CSV'); const [header,...data]=rows; if(new Set(header).size!==header.length||!header.length||data.some(row=>row.length!==header.length)) throw new Error('CSV header or row width mismatch'); setResult(JSON.stringify(data.map((row)=>Object.fromEntries(header.map((key,i)=>[key,row[i]]))),null,2)); }
     else {
      const data=JSON.parse(text); if(!Array.isArray(data)||data.some((row)=>!row||typeof row!=='object'||Array.isArray(row))) throw new Error('expected array of objects');
      const headers=[...new Set(data.flatMap((row)=>Object.keys(row)))]; if(!headers.length) throw new Error('no object fields');
      const protect=get<HTMLInputElement>('formula-safe').checked;
      const safeCell=(value:string)=>protect&&/^[\s]*[=+@-]/u.test(value)?`'${value}`:value;
      const rows=[headers.map(safeCell),...data.map((row)=>headers.map((key)=>safeCell(row[key]===undefined?'':typeof row[key]==='object'?JSON.stringify(row[key]):String(row[key]))))];
      const csv=serializeCsv(rows); setResult(csv,new Blob([csv],{type:'text/csv'}),'data.csv');
     }
     break;
    }
    case 'color-converter': { const converted=convertColor(text); if(preview){preview.hidden=false;preview.style.background=converted.hex;} setResult(JSON.stringify(converted,null,2)); break; }
    case 'gradient-studio': {
     const a=get<HTMLInputElement>('color-a').value.toUpperCase(), b=get<HTMLInputElement>('color-b').value.toUpperCase(), angle=Number(get<HTMLInputElement>('angle').value);
     if(!Number.isFinite(angle)||angle<0||angle>360) throw new Error('angle'); const css=`linear-gradient(${angle}deg, ${a} 0%, ${b} 100%)`; if(preview){preview.hidden=false;preview.style.background=css;} setResult(css,new Blob([`background: ${css};\n`],{type:'text/css'}),'gradient.css'); break;
    }
    case 'cron-planner': { const explanation=explainCron(text); setResult(`${explanation}\n\n${copy('未来五次运行时间（UTC）','Next five run times (UTC)','Nächste fünf Läufe (UTC)')}\n${nextCronRuns(text,new Date(),5).join('\n')}`); break; }
    case 'subnet-calculator': setResult(JSON.stringify(ipv4Subnet(text),null,2)); break;
    case 'date-math': {
     if(!/^\d{4}-\d{2}-\d{2}$/u.test(text.trim())) throw new Error('use ISO date'); const date=new Date(`${text.trim()}T00:00:00.000Z`); if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==text.trim()) throw new Error('invalid date');
     const days=Number(get<HTMLInputElement>('days').value); if(!Number.isInteger(days)||Math.abs(days)>100000) throw new Error('day range'); const shifted=new Date(date); shifted.setUTCDate(shifted.getUTCDate()+days);
     const start=new Date(Date.UTC(date.getUTCFullYear(),0,1)); const dayOfYear=Math.floor((date.getTime()-start.getTime())/86400000)+1;
     const locale=document.documentElement.lang==='de'?'de-DE':document.documentElement.lang==='en'?'en-US':'zh-CN';
     setResult(`${copy('输入日期','Input date','Eingabedatum')}: ${text.trim()}\n${copy('偏移后','After offset','Nach Verschiebung')}: ${shifted.toISOString().slice(0,10)}\n${copy('年内第几天','Day of year','Tag des Jahres')}: ${dayOfYear}\n${copy('UTC 星期','UTC weekday','Wochentag (UTC)')}: ${date.toLocaleDateString(locale,{weekday:'long',timeZone:'UTC'})}`); break;
    }
    case 'hash-studio': {
     const file=get<HTMLInputElement>('file').files?.[0]; if(file&&file.size>64_000_000) throw new Error('file too large'); const bytes=file?await file.arrayBuffer():new TextEncoder().encode(text).buffer;
     const digest=await crypto.subtle.digest(get<HTMLSelectElement>('algorithm').value,bytes); if(request!==revision)return;
     const hex=[...new Uint8Array(digest)].map((n)=>n.toString(16).padStart(2,'0')).join(''); setResult(`${get<HTMLSelectElement>('algorithm').value}\n${hex}\n${file?`${file.name} · ${fileSize(file.size)}`:copy('UTF-8 文本','UTF-8 text','UTF-8-Text')}`); break;
    }
    case 'uuid-studio': { if(!text.trim()) { const value=crypto.randomUUID(); setResult(`${value}\nUUID ${copy('版本','version','Version')} 4`); } else { if(!validUuid(text)) throw new Error('invalid UUID'); setResult(`${text.trim()}\n${copy('版本','Version','Version')}: ${text.trim()[14]}\n${copy('变体','Variant','Variante')}: ${text.trim()[19]}`); } break; }
    case 'html-entities': setResult(get<HTMLSelectElement>('mode').value==='encode'?formatHtmlEntities(text):decodeHtmlEntities(text)); break;
    case 'svg-optimizer': { const safe=prepareSvg(text); setResult(safe.svg,new Blob([safe.svg],{type:'image/svg+xml'}),'optimized.svg'); break; }
    case 'image-converter':
    case 'image-metadata': {
     const file=get<HTMLInputElement>('file').files?.[0]; if(!file) throw new Error('choose an image'); if(file.size>30_000_000)throw new Error('file too large');
     const bitmap=await createImageBitmap(file); try { if(request!==revision)return; if(bitmap.width*bitmap.height>16_000_000)throw new Error('too many pixels');
      if(slug==='image-metadata') setResult(`${file.name}\n${file.type||copy('未知类型','unknown type','unbekannter Typ')}\n${bitmap.width} × ${bitmap.height} px\n${(bitmap.width/bitmap.height).toFixed(4)} : 1\n${fileSize(file.size)}\n${copy('浏览器未提供完整 EXIF 元数据。','The browser does not expose full EXIF metadata.','Der Browser stellt keine vollständigen EXIF-Daten bereit.')}`);
      else { const canvas=document.createElement('canvas'); canvas.width=bitmap.width; canvas.height=bitmap.height; const ctx=canvas.getContext('2d'); if(!ctx)throw new Error('canvas unavailable'); ctx.fillStyle='#fff'; if(get<HTMLSelectElement>('format').value==='image/jpeg')ctx.fillRect(0,0,canvas.width,canvas.height); ctx.drawImage(bitmap,0,0); const type=get<HTMLSelectElement>('format').value, blob=await blobFromCanvas(canvas,type,Number(get<HTMLInputElement>('quality').value)); if(request!==revision)return; if(blob.type!==type)throw new Error('format unavailable'); const ext=type.split('/')[1].replace('jpeg','jpg'); setResult(`${file.name}\n${bitmap.width} × ${bitmap.height} px\n${file.type||'unknown'} · ${fileSize(file.size)}\n↓\n${type} · ${fileSize(blob.size)}`,blob,`converted.${ext}`); }
     } finally { bitmap.close(); } break;
    }
    case 'favicon-studio': { const mark=get<HTMLInputElement>('mark').value.trim().slice(0,3)||'WC'; const escape=(s:string)=>s.replace(/[&<>"']/gu,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!)); const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="${get<HTMLInputElement>('color-a').value}"/><text x="64" y="72" text-anchor="middle" dominant-baseline="middle" fill="${get<HTMLInputElement>('color-b').value}" font-family="system-ui,sans-serif" font-size="48" font-weight="700">${escape(mark)}</text></svg>`; const blob=new Blob([svg],{type:'image/svg+xml'}); if(preview){const url=URL.createObjectURL(blob),img=document.createElement('img');img.alt=copy('生成的 SVG 图标','Generated SVG icon','Erzeugtes SVG-Symbol');img.src=url;preview.replaceChildren(img);preview.hidden=false;preview.dataset.objectUrl=url;} setResult(`${svg}\n\n<link rel="icon" type="image/svg+xml" href="/favicon.svg">`,blob,'favicon.svg'); break; }
    case 'password-audit': { if(!text)throw new Error('enter password'); const audit=passwordAudit(text); setResult(`${copy('字符数','Length','Länge')}: ${audit.length}\n${copy('大写字母','Uppercase letters','Großbuchstaben')}: ${audit.hasUpper}\n${copy('小写字母','Lowercase letters','Kleinbuchstaben')}: ${audit.hasLower}\n${copy('数字','Digits','Ziffern')}: ${audit.hasDigit}\n${copy('符号','Symbols','Sonderzeichen')}: ${audit.hasSymbol}\n${copy('粗略熵估算','Rough entropy estimate','Grobe Entropieschätzung')}: ${audit.estimatedBits} bits\n\n${copy('这是字符池模型估算，不等同于实际抗破解时间；常见词、重复模式和泄露密码会显著降低安全性。','This character-pool estimate is not crack-time prediction; common words, patterns and breached passwords reduce security.','Diese Zeichensatz-Schätzung ist keine Aussage zur Knackzeit; Wörter, Muster und kompromittierte Passwörter senken die Sicherheit.')}`); break; }
    case 'markdown-table': {
     const delimiter=get<HTMLSelectElement>('mode').value==='tab'?'\t':','; const rows=parseDelimitedText(text,delimiter); if(rows.length<2||!rows[0].length||rows.some((row)=>row.length!==rows[0].length))throw new Error('rows must have equal columns and header'); const escape=(value:string)=>value.replace(/\|/gu,'\\|').replace(/\r?\n/gu,'<br>'); setResult(`| ${rows[0].map(escape).join(' | ')} |\n| ${rows[0].map(()=> '---').join(' | ')} |\n${rows.slice(1).map((row)=>`| ${row.map(escape).join(' | ')} |`).join('\n')}`,new Blob([output.value],{type:'text/markdown'}),'table.md'); break;
    }
    default: throw new Error('unknown tool');
   }
  } catch { if(request===revision) status.textContent=copy('无法处理输入。请检查格式、范围与文件大小限制。','Unable to process input. Check its format, range and file-size limits.','Eingabe kann nicht verarbeitet werden. Format, Wertebereich und Dateigröße prüfen.'); }
 };
 const invalidate=()=>{revision++;result='';resultBlob=undefined;output.value='';status.textContent='';get<HTMLButtonElement>('copy').disabled=true;get<HTMLButtonElement>('download').disabled=true;if(preview){preview.hidden=true;preview.style.background='';preview.replaceChildren();if(preview.dataset.objectUrl){URL.revokeObjectURL(preview.dataset.objectUrl);delete preview.dataset.objectUrl;}}};
 runButton.addEventListener('click',run);
 root.addEventListener('input',invalidate);root.addEventListener('change',invalidate);
 get<HTMLButtonElement>('copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(result);status.textContent=copy('已复制。','Copied.','Kopiert.');}catch{status.textContent=copy('复制失败，请手动选择结果。','Copy failed; select the result manually.','Kopieren fehlgeschlagen; Ergebnis manuell markieren.');}});
 get<HTMLButtonElement>('download').addEventListener('click',()=>{if(resultBlob)downloadBlob(resultBlob,filename);else downloadBlob(new Blob([result],{type:'text/plain;charset=utf-8'}),`${slug}-result.txt`);});
 get<HTMLButtonElement>('copy').disabled=true; get<HTMLButtonElement>('download').disabled=true;
 return ()=>{revision++;root.removeEventListener('input',invalidate);root.removeEventListener('change',invalidate);if(preview?.dataset.objectUrl)URL.revokeObjectURL(preview.dataset.objectUrl);};
}
