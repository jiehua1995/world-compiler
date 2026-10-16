import { applyTextOperations, inspectText, type TextOperation } from './core';
import { downloadBlob, say } from '../workbench/browser';

export function mountTextStudio(root: HTMLElement): () => void {
  const get = <T extends HTMLElement>(name: string) => root.querySelector<T>(`[data-text-${name}]`)!;
  const input = get<HTMLTextAreaElement>('input');
  const output = get<HTMLTextAreaElement>('output');
  const before = get<HTMLElement>('before');
  const after = get<HTMLElement>('after');
  const stats = get<HTMLElement>('stats');
  const status = get<HTMLElement>('status');
  const run = get<HTMLButtonElement>('run');
  const undo = get<HTMLButtonElement>('undo');
  const redo = get<HTMLButtonElement>('redo');
  const copy = get<HTMLButtonElement>('copy');
  const download = get<HTMLButtonElement>('download');
  let history: string[] = [];
  let position = -1;
  const refresh = () => {
    const original = inspectText(input.value, document.documentElement.lang);
    const result = inspectText(output.value, document.documentElement.lang);
    stats.textContent = say(['原文', 'Source', 'Quelle']) + ` ${original.characters} ${say(['字素', 'chars', 'Zeichen'])} · ${original.bytes} B · ${original.words} ${say(['词', 'words', 'Wörter'])} · ${original.lines} ${say(['行', 'lines', 'Zeilen'])}` + (position >= 0 ? `  →  ${result.characters} · ${result.bytes} B · ${result.words} · ${result.lines}` : '');
    before.textContent = input.value;
    after.textContent = position >= 0 ? output.value : input.value;
    undo.disabled = position <= 0;
    redo.disabled = position < 0 || position >= history.length - 1;
    copy.disabled = position < 0;
    download.disabled = position < 0;
    run.disabled = !root.querySelector('[data-text-operation]:checked');
  };
  const invalidate = () => {
    history = [];
    position = -1;
    output.value = '';
    status.textContent = '';
    refresh();
  };
  const apply = () => {
    try {
      const operations = [...root.querySelectorAll<HTMLInputElement>('[data-text-operation]:checked')].map((control) => control.value as TextOperation);
      if (!operations.length) return;
      const source = position < 0 ? input.value : history[position];
      const result = applyTextOperations(source, operations);
      if (position < 0) history = [input.value];
      else history = history.slice(0, position + 1);
      history.push(result);
      position = history.length - 1;
      output.value = result;
      status.textContent = say(['处理完成。原文未修改，历史仅保留在当前页面。', 'Done. The source is unchanged; history stays on this page.', 'Fertig. Die Quelle bleibt unverändert; der Verlauf bleibt auf dieser Seite.']);
      refresh();
    } catch {
      status.textContent = say(['无法处理此输入，请检查格式后重试。', 'Cannot process this input. Check its format and try again.', 'Eingabe kann nicht verarbeitet werden. Format prüfen und erneut versuchen.']);
    }
  };
  const undoChange = () => { if (position > 0) { output.value = history[--position]; refresh(); } };
  const redoChange = () => { if (position >= 0 && position < history.length - 1) { output.value = history[++position]; refresh(); } };
  const copyResult = async () => {
    try { await navigator.clipboard.writeText(output.value); status.textContent = say(['已复制结果。', 'Result copied.', 'Ergebnis kopiert.']); }
    catch { status.textContent = say(['复制失败，请手动选择结果。', 'Copy failed; select the result manually.', 'Kopieren fehlgeschlagen; Ergebnis manuell markieren.']); }
  };
  const exportResult = () => downloadBlob(new Blob([output.value], { type: 'text/plain;charset=utf-8' }), 'world-compiler-text.txt');
  input.addEventListener('input', invalidate);
  run.addEventListener('click', apply);
  undo.addEventListener('click', undoChange);
  redo.addEventListener('click', redoChange);
  copy.addEventListener('click', copyResult);
  download.addEventListener('click', exportResult);
  root.addEventListener('change', refresh);
  refresh();
  return () => {
    input.removeEventListener('input', invalidate); run.removeEventListener('click', apply);
    undo.removeEventListener('click', undoChange); redo.removeEventListener('click', redoChange);
    copy.removeEventListener('click', copyResult); download.removeEventListener('click', exportResult);
    root.removeEventListener('change', refresh);
  };
}
