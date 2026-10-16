interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const copy = {
  'zh-CN': { install: '安装应用', installed: '已安装', fallback: '在浏览器菜单中选择“安装应用”或“添加到主屏幕”。首次在线打开后可离线使用；PDF/OCR 资源需先下载。', ready: '可以安装应用。首次打开的页面和已下载资源可离线使用。', failed: '离线准备失败。请联网刷新后重试。', offline: '离线应用已就绪。PDF/OCR 资源需先下载；更新将在关闭所有应用窗口后生效。' },
  en: { install: 'Install app', installed: 'Installed', fallback: 'Use your browser menu: Install app or Add to Home Screen. Open online first for offline use; PDF/OCR assets must be downloaded first.', ready: 'Ready to install. Previously opened pages and downloaded assets work offline.', failed: 'Offline setup failed. Reconnect and refresh to retry.', offline: 'Offline app ready. Download PDF/OCR assets first. Updates apply after all app windows close.' },
  de: { install: 'App installieren', installed: 'Installiert', fallback: 'Im Browsermenü „App installieren“ oder „Zum Home-Bildschirm“ wählen. Zuerst online öffnen; PDF/OCR-Dateien müssen zuvor geladen werden.', ready: 'Installation verfügbar. Bereits geöffnete Seiten und geladene Ressourcen sind offline nutzbar.', failed: 'Offline-Einrichtung fehlgeschlagen. Mit Internetverbindung neu laden.', offline: 'Offline-App bereit. PDF/OCR-Ressourcen zuerst laden. Updates werden nach dem Schließen aller App-Fenster aktiv.' },
};

export function initializePwa() {
  const button = document.querySelector<HTMLButtonElement>('[data-install-app]');
  const label = button?.querySelector<HTMLElement>('[data-install-label]');
  const status = document.querySelector<HTMLElement>('[data-install-status]');
  if (!button || !status) return;
  let prompt: InstallPrompt | null = null;
  let state: 'fallback' | 'ready' | 'failed' | 'offline' = 'fallback';
  let installed = matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  const render = () => {
    const lang = document.documentElement.lang;
    const text = copy[lang === 'en' || lang === 'de' ? lang : 'zh-CN'];
    if (label) label.textContent = installed ? text.installed : text.install;
    button.disabled = installed;
    status.textContent = installed ? text[state === 'failed' ? 'failed' : 'offline'] : text[state];
  };
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    prompt = event as InstallPrompt;
    state = 'ready';
    render();
  });
  window.addEventListener('appinstalled', () => { installed = true; prompt = null; render(); });
  document.addEventListener('worldcompiler:localechange', render);
  button.addEventListener('click', async () => {
    if (!prompt) { state = 'fallback'; render(); return; }
    const current = prompt;
    prompt = null;
    try { await current.prompt(); await current.userChoice; state = 'fallback'; }
    catch { state = 'fallback'; }
    render();
  });
  render();
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    const base = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/`;
    navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).then(() => navigator.serviceWorker.ready).then(() => { state = prompt ? 'ready' : 'offline'; render(); }).catch(() => { state = 'failed'; render(); });
  }
}
