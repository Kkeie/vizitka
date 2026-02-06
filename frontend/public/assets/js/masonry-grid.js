// Masonry grid layout script for Bento-like cards
function resizeAllGridItems(containerSelectorOrElement = '.grid') {
  // Support both selector string and HTMLElement
  const grid = typeof containerSelectorOrElement === 'string' 
    ? document.querySelector(containerSelectorOrElement)
    : containerSelectorOrElement;
  if (!grid) return;
  const rowHeight = parseFloat(getComputedStyle(grid).getPropertyValue('grid-auto-rows'));
  const rowGap = parseFloat(getComputedStyle(grid).getPropertyValue('gap')) || parseFloat(getComputedStyle(grid).getPropertyValue('grid-row-gap')) || 0;

  const items = grid.children;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    // content element (prefer .card__content inside the item)
    const content = item.querySelector('.card__content') || item;
    const contentHeight = content.getBoundingClientRect().height;
    // compute how many rows the item should span
    const rowSpan = Math.ceil((contentHeight + rowGap) / (rowHeight + rowGap));
    item.style.gridRowEnd = 'span ' + rowSpan;
  }
}

function imagesLoadedPromise(container) {
  const imgs = Array.from(container.querySelectorAll('img'));
  if (!imgs.length) return Promise.resolve();
  return new Promise(resolve => {
    let counter = 0;
    imgs.forEach(img => {
      if (img.complete) {
        counter++;
        if (counter === imgs.length) resolve();
      } else {
        img.addEventListener('load', () => {
          counter++;
          if (counter === imgs.length) resolve();
        });
        img.addEventListener('error', () => {
          counter++;
          if (counter === imgs.length) resolve();
        });
      }
    });
  });
}

function updateMasonry(containerSelector = '.grid') {
  const grid = document.querySelector(containerSelector);
  if (!grid) return;
  // wait for images inside this grid
  imagesLoadedPromise(grid).then(() => {
    resizeAllGridItems(containerSelector);
  });
}

function debounce(fn, ms = 120) {
  let t;
  return function () {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, arguments), ms);
  };
}

/* init */
document.addEventListener('DOMContentLoaded', () => {
  updateMasonry('.grid');
  // run on resize (debounced)
  window.addEventListener('resize', debounce(() => updateMasonry('.grid'), 150));
  // optional: observe DOM changes (if cards are loaded dynamically)
  const grid = document.querySelector('.grid');
  if (grid && 'MutationObserver' in window) {
    const mo = new MutationObserver(debounce(() => updateMasonry('.grid'), 100));
    mo.observe(grid, { childList: true, subtree: true });
  }
});

// Export for use in React components
if (typeof window !== 'undefined') {
  window.masonryGrid = {
    resizeAllGridItems,
    updateMasonry,
    imagesLoadedPromise
  };
}

