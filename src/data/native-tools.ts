import type { ToolDefinition, ToolCategory } from './tools';
const definitions: [string,ToolCategory,number,[string,string,string],[string,string,string]][] = [
 ['audio-lab','media',1,['声音实验室','Audio Lab','Audiolabor'],['裁剪音频、调整增益并导出 WAV。','Trim audio, adjust gain and export WAV.','Audio zuschneiden, Lautstärke anpassen und WAV exportieren.']],
 ['palette-lab','vision',2,['配色提取台','Palette Lab','Palettenlabor'],['从本地图片提取主色并导出 CSS。','Extract dominant image colors and export CSS.','Dominante Bildfarben extrahieren und als CSS exportieren.']],
 ['regex-lab','text',3,['正则实验室','Regex Lab','Regex-Labor'],['安全测试匹配与替换，自动终止超时任务。','Test matches and replacements with a worker timeout.','Treffer und Ersetzungen mit Zeitlimit testen.']],
 ['url-lab','data',4,['网址工作台','URL Lab','URL-Labor'],['检查网址、编辑查询参数并移除追踪参数。','Inspect URLs, edit queries and remove tracking parameters.','URLs prüfen, Abfragen bearbeiten und Tracking entfernen.']],
 ['unit-lab','data',5,['单位换算台','Unit Lab','Einheitenlabor'],['换算温度、长度、质量、速度和数据单位。','Convert temperature, length, mass, speed and data units.','Temperatur, Länge, Masse, Geschwindigkeit und Daten umrechnen.']],
 ['token-lab','data',6,['随机生成器','Token Lab','Token-Labor'],['使用安全随机数生成密码和 UUID。','Generate passwords and UUIDs using secure randomness.','Passwörter und UUIDs mit sicherem Zufall erzeugen.']],
 ['text-workshop','text',7,['文字工作室','Text Studio','Textwerkstatt'],['串联文本清理、大小写、Unicode 规范化与行尾转换；查看对照并撤销。','Chain text cleanup, case, Unicode normalization and line-ending changes with comparison and undo.','Textbereinigung, Groß-/Kleinschreibung, Unicode-Normalisierung und Zeilenenden verketten, vergleichen und rückgängig machen.']],
];
export const nativeTools: readonly ToolDefinition[] = definitions.map(([slug,category,glyph,title,summary],i)=>({slug,category,glyph,status:'available',sequence:String(11+i).padStart(3,'0'),title:{'zh-CN':title[0],en:title[1],de:title[2]},summary:{'zh-CN':summary[0],en:summary[1],de:summary[2]},tags:{'zh-CN':[title[0],'本地'],en:[title[1],'local'],de:[title[2],'lokal']}}));
