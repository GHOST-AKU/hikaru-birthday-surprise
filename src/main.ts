import './navigation.css';

const experiences = [
  { path: '/instrument', name: '仪器', en: 'PRESS' },
  { path: '/cover', name: '封面', en: 'COVER' },
  { path: '/stamps', name: '邮票', en: 'POST' },
  { path: '/sound', name: '声音', en: 'PLAY' }
];

const path = location.pathname.replace(/\/+$/, '') || '/instrument';
const current = experiences.find(item => item.path === path);
const root = document.querySelector<HTMLElement>('#app')!;

if (!current) {
  location.replace('/instrument');
} else {
  document.title = `HIKARU — ${current.en}`;
  document.body.dataset.experience = current.path.slice(1);
  root.setAttribute('aria-label', `Hikaru ${current.en.toLowerCase()}`);
  const navigation = document.createElement('nav');
  navigation.className = 'experience-nav';
  navigation.setAttribute('aria-label', 'Experiences');
  navigation.innerHTML = `<button type="button" class="experience-nav-toggle" aria-label="切换作品" aria-expanded="false" aria-controls="experience-links"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="4" width="5" height="5" rx=".7"/><rect x="15" y="4" width="5" height="5" rx=".7"/><rect x="4" y="15" width="5" height="5" rx=".7"/><rect x="15" y="15" width="5" height="5" rx=".7"/></svg></button><div id="experience-links" class="experience-links" hidden>${experiences.map(item => `<a href="${item.path}"${item === current ? ' aria-current="page"' : ''}><span>${item.name}</span><span>${item.en}</span></a>`).join('')}</div>`;
  document.body.append(navigation);
  const toggle = navigation.querySelector<HTMLButtonElement>('button')!;
  const links = navigation.querySelector<HTMLElement>('.experience-links')!;
  const close = () => {
    toggle.setAttribute('aria-expanded', 'false');
    links.hidden = true;
  };
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    links.hidden = !open;
  });
  document.addEventListener('pointerdown', event => {
    if (!navigation.contains(event.target as Node)) close();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !links.hidden) {
      close();
      toggle.focus();
    }
  });
  if (path === '/instrument') {
    await import('./instrument');
  } else {
    const modules = import.meta.glob('./experiences/*.ts');
    const load = modules[`./experiences${path}.ts`];
    if (load) {
      const module = await load() as Record<string, (element: HTMLElement) => unknown>;
      const name = `mount${path[1].toUpperCase()}${path.slice(2)}`;
      module[name](root);
    }
  }
}
