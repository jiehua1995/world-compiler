import { dictionary } from '../../i18n/dictionaries';
import { resolveLocale } from '../../i18n/locale';
import { cleanRows, DelimitedTextError, MAX_FILE_BYTES, parseDelimitedText, serializeCsv } from './csv';

export function mountDataShaper(root: HTMLElement, doc: Document = document, win: Window = window): { destroy: () => void } {
  const input = root.querySelector<HTMLInputElement>('[data-data-file]');
  const delimiter = root.querySelector<HTMLSelectElement>('[data-delimiter]');
  const status = root.querySelector<HTMLElement>('[data-data-status]');
  const error = root.querySelector<HTMLElement>('[data-data-error]');
  const clean = root.querySelector<HTMLButtonElement>('[data-clean]');
  const download = root.querySelector<HTMLButtonElement>('[data-download]');
  const preview = root.querySelector<HTMLElement>('[data-data-preview]');
  const table = root.querySelector<HTMLTableSectionElement>('[data-data-table]');
  if (!input || !delimiter || !status || !error || !clean || !download || !preview || !table) return { destroy() {} };

  let source = '';
  let hasSource = false;
  let rows: string[][] = [];
  let cleaned: string[][] | null = null;
  const copy = () => dictionary(resolveLocale(doc.documentElement.lang, []));
  const render = (value: string[][]) => {
    table.replaceChildren(...value.slice(0, 8).map((row, rowIndex) => {
      const tr = doc.createElement('tr');
      tr.append(...row.map((cell) => {
        const element = doc.createElement(rowIndex === 0 ? 'th' : 'td');
        if (rowIndex === 0) element.setAttribute('scope', 'col');
        element.textContent = cell;
        return element;
      }));
      return tr;
    }));
  };
  const clear = () => { rows = []; cleaned = null; clean.disabled = true; download.disabled = true; preview.hidden = true; table.replaceChildren(); };
  const showError = (key: 'data.error.tooLarge' | 'data.error.unsupported' | 'data.error.invalid') => {
    clear(); source = ''; hasSource = false; status.textContent = ''; error.hidden = false; error.dataset.messageKey = key; error.textContent = copy()[key];
  };
  const parse = () => {
    if (!hasSource) return;
    try {
      rows = parseDelimitedText(source, delimiter.value as ',' | '\t');
      cleaned = null;
      render(rows);
      preview.hidden = false;
      clean.disabled = false;
      download.disabled = true;
      error.hidden = true;
      status.textContent = copy()['data.status.ready'];
    } catch (problem) {
      showError(problem instanceof DelimitedTextError ? 'data.error.invalid' : 'data.error.invalid');
    }
  };
  const onFile = async () => {
    const file = input.files?.[0];
    if (!file) return;
    error.hidden = true;
    source = ''; hasSource = false;
    if (file.size > MAX_FILE_BYTES) { showError('data.error.tooLarge'); return; }
    if (!/\.(csv|tsv)$/iu.test(file.name)) { showError('data.error.unsupported'); return; }
    delimiter.value = /\.tsv$/iu.test(file.name) ? '\t' : ',';
    try { source = await file.text(); hasSource = true; parse(); }
    catch { showError('data.error.invalid'); }
  };
  const onDelimiter = () => parse();
  const onClean = () => { cleaned = cleanRows(rows); render(cleaned); download.disabled = false; };
  const onDownload = () => {
    if (!cleaned) return;
    const url = URL.createObjectURL(new Blob([serializeCsv(cleaned)], { type: 'text/csv;charset=utf-8' }));
    const link = doc.createElement('a');
    link.href = url; link.download = 'world-compiler-cleaned.csv'; link.click();
    win.setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  const onLocale = () => { if (!error.hidden && error.dataset.messageKey) error.textContent = copy()[error.dataset.messageKey as 'data.error.invalid' | 'data.error.unsupported' | 'data.error.tooLarge']; if (hasSource) parse(); else status.textContent = copy()['data.status.empty']; };
  input.addEventListener('change', onFile);
  delimiter.addEventListener('change', onDelimiter);
  clean.addEventListener('click', onClean);
  download.addEventListener('click', onDownload);
  doc.addEventListener('worldcompiler:localechange', onLocale);
  return { destroy() { input.removeEventListener('change', onFile); delimiter.removeEventListener('change', onDelimiter); clean.removeEventListener('click', onClean); download.removeEventListener('click', onDownload); doc.removeEventListener('worldcompiler:localechange', onLocale); } };
}
