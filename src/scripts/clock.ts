export function clockAngles(date: Date) {
  return {
    hour: (date.getHours() % 12) * 30 + date.getMinutes() / 2 + date.getSeconds() / 120,
    minute: date.getMinutes() * 6 + date.getSeconds() / 10,
    second: date.getSeconds() * 6,
  };
}

export function mountClock(root: HTMLElement) {
  const time = root.querySelector<HTMLTimeElement>('[data-clock-time]')!;
  const zone = root.querySelector<HTMLElement>('[data-clock-zone]')!;
  zone.textContent = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const update = () => {
    const now = new Date();
    const angles = clockAngles(now);
    for (const [hand, angle] of Object.entries(angles)) root.style.setProperty(`--clock-${hand}`, `${angle}deg`);
    time.dateTime = now.toISOString();
    time.textContent = [now.getHours(), now.getMinutes(), now.getSeconds()].map(n => String(n).padStart(2, '0')).join(':');
  };
  update();
  const timer = window.setInterval(() => { if (!document.hidden) update(); }, 1000);
  document.addEventListener('visibilitychange', update);
  return () => { clearInterval(timer); document.removeEventListener('visibilitychange', update); };
}
