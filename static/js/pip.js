const pipButtons = Array.from(document.querySelectorAll('.pip-open-btn'));

function initDocumentPiP() {
  if (!pipButtons.length) return;

  const dPip = window.documentPictureInPicture;
  if (!dPip || typeof dPip.requestWindow !== 'function') {
    pipButtons.forEach((button) => {
      button.disabled = true;
      button.title = '현재 사용중인 브라우저는 Document PIP 기능을 지원하지 않습니다.';
    });
    return;
  }

  let pipWindow = null;
  window.getPipWindow = () => pipWindow;
  let activeWindowEl = null;
  let placeholderEl = null;

  const resetButtons = (activeId = '') => {
    pipButtons.forEach((button) => {
      const isActive = button.dataset.pipTarget === activeId;
      button.textContent = isActive ? '복귀' : '↗️';
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  };

  const restoreWindow = () => {
    if (!activeWindowEl || !placeholderEl || !placeholderEl.parentNode) return;
    placeholderEl.replaceWith(activeWindowEl);
    activeWindowEl.classList.remove('is-in-pip');
    activeWindowEl = null;
    placeholderEl = null;
    resetButtons();
  };

  const closePiP = () => {
    restoreWindow();
    if (pipWindow && !pipWindow.closed) pipWindow.close();
    pipWindow = null;
  };

  const openPiP = async (targetWindowEl) => {
    closePiP();

    const rect = targetWindowEl.getBoundingClientRect();
    const titlebar = targetWindowEl.querySelector('.window-titlebar');
    const left = window.screenLeft + rect.left;
    const top = window.screenTop + rect.top;
    
    const width = Math.round(rect.width) - 2;
    let height = Math.round(rect.height) - 2;
    if (titlebar) {
      height -= titlebar.offsetHeight;
    }

    pipWindow = await dPip.requestWindow({ width, height, left, top });

    [...document.styleSheets].forEach((styleSheet) => {
      try {
        if (styleSheet.href) {
          const link = pipWindow.document.createElement('link');
          link.rel = 'stylesheet';
          link.href = styleSheet.href;
          pipWindow.document.head.appendChild(link);
        } else {
          const style = pipWindow.document.createElement('style');
          for (const rule of styleSheet.cssRules) {
            style.textContent += rule.cssText;
          }
          pipWindow.document.head.appendChild(style);
        }
      } catch (e) {
        if (styleSheet.ownerNode && styleSheet.ownerNode.tagName === 'LINK') {
          const link = pipWindow.document.createElement('link');
          link.rel = 'stylesheet';
          link.href = styleSheet.ownerNode.href;
          pipWindow.document.head.appendChild(link);
        }
      }
    });

    pipWindow.document.body.className = document.body.className;
    [...document.body.attributes].forEach(attr => {
      if (attr.nodeName !== 'class') {
        pipWindow.document.body.setAttribute(attr.nodeName, attr.nodeValue);
      }
    });

    const styleEl = pipWindow.document.createElement('style');
    const computedBg = getComputedStyle(document.body).backgroundColor;
    styleEl.textContent = `
      html, body { margin: 0; height: 100vh; width: 100vw; overflow: hidden; background: ${computedBg}; padding: 0; display: flex; }
      .desktop-window { flex: 1; border: none !important; box-shadow: none !important; border-radius: 0 !important; height: 100vh !important; margin: 0 !important; position: static !important; }
    `;
    pipWindow.document.head.appendChild(styleEl);

    placeholderEl = document.createElement('div');
    placeholderEl.hidden = true;
    targetWindowEl.before(placeholderEl);
    targetWindowEl.classList.add('is-in-pip');
    pipWindow.document.body.appendChild(targetWindowEl);

    activeWindowEl = targetWindowEl;
    resetButtons(targetWindowEl.id);

    pipWindow.addEventListener('pagehide', () => {
      restoreWindow();
      pipWindow = null;
    }, { once: true });
  };

  pipButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      const targetId = button.dataset.pipTarget;
      if (!targetId) return;

      const targetWindowEl = document.getElementById(targetId);
      if (!targetWindowEl) return;

      if (activeWindowEl && activeWindowEl.id === targetId) {
        closePiP();
        return;
      }

      try {
        await openPiP(targetWindowEl);
      } catch (error) {
        console.error("Document PIP를 여는 데 실패했습니다.", error);
        closePiP();
      }
    });
  });
}

initDocumentPiP();
