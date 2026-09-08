// Keep navigation and failure recovery available if the application graph fails.
const status = document.getElementById('load-status');
if (status) status.hidden = false;

document.querySelector('.skip-link')?.addEventListener('click', event => {
  event.preventDefault();
  const main = document.getElementById('main-content');
  const target = main && !main.hidden ? main : status;
  if (target) {
    target.tabIndex = -1;
    target.focus({ preventScroll: true });
  }
});

try {
  const { startApp } = await import('./main.js');
  await startApp();
} catch (error) {
  console.error('M³GIM startup error:', error);
  if (status) {
    status.hidden = false;
    status.setAttribute('aria-busy', 'false');
    const box = document.createElement('div');
    box.className = 'load-error';
    box.setAttribute('role', 'alert');
    const title = document.createElement('p');
    title.className = 'load-error__title';
    title.textContent = 'Anwendung konnte nicht geladen werden';
    const detail = document.createElement('p');
    detail.className = 'load-error__detail';
    detail.textContent = 'Bitte laden Sie die Seite erneut. Projektinformationen und Archivdaten bleiben direkt erreichbar.';
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'load-error__retry';
    retry.textContent = 'Neu laden';
    retry.addEventListener('click', () => window.location.reload());
    const links = document.createElement('p');
    for (const [href, label] of [['projekt.html', 'Projektinformationen'], ['data/m3gim.jsonld', 'Archivdaten (JSON-LD)']]) {
      const link = document.createElement('a');
      link.href = href;
      link.textContent = label;
      if (links.childNodes.length) links.append(' · ');
      links.append(link);
    }
    box.append(title, detail, retry, links);
    status.replaceChildren(box);
  }
}
