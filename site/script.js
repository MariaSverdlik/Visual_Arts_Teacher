// Загрузка контента из JSON
let contentData = null;

async function loadContent() {
  const response = await fetch('data/content.json');
  contentData = await response.json();
  renderContent();
}

function getValueByPath(path) {
  return path.split('.').reduce((obj, key) => obj && obj[key], contentData);
}

// Экранирование HTML, чтобы текст из JSON нельзя было случайно
// или специально интерпретировать как произвольную разметку.
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Поддержка простой markdown-разметки в тексте: **жирный**.
// Перенос строк (\n) обрабатывается отдельно через CSS white-space: pre-line.
function parseMarkup(value) {
  if (typeof value !== 'string') return value;
  return escapeHtml(value).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function renderContent() {
  // Простые текстовые значения
  document.querySelectorAll('[data-content]').forEach(el => {
    const path = el.dataset.content;
    const value = getValueByPath(path);
    if (value !== undefined) {
      el.innerHTML = parseMarkup(value);
    }
  });

  // Meta description
  const metaDesc = document.querySelector('[data-content-meta]');
  if (metaDesc) {
    const path = `meta.${metaDesc.dataset.contentMeta}`;
    const value = getValueByPath(path);
    if (value !== undefined) {
      metaDesc.setAttribute('content', value);
    }
  }

  // Ссылки с href
  document.querySelectorAll('[data-content-href]').forEach(el => {
    const path = el.dataset.contentHref;
    const value = getValueByPath(path);
    if (value !== undefined) {
      if (path.includes('email')) {
        el.href = `mailto:${value}`;
      } else if (path.includes('phone')) {
        el.href = `tel:${value.replace(/\s/g, '')}`;
      } else {
        el.href = value;
      }
    }
  });

  // Изображения
  document.querySelectorAll('[data-content-src]').forEach(el => {
    const srcPath = el.dataset.contentSrc;
    const altPath = el.dataset.contentAlt;
    const src = getValueByPath(srcPath);
    const alt = altPath ? getValueByPath(altPath) : '';
    if (src !== undefined) {
      el.src = src;
    }
    if (alt !== undefined) {
      el.alt = alt;
    }
  });

  // Placeholder для input/textarea
  document.querySelectorAll('[data-content-placeholder]').forEach(el => {
    const path = el.dataset.contentPlaceholder;
    const value = getValueByPath(path);
    if (value !== undefined) {
      el.placeholder = value;
    }
  });

  // Навигация
  const navContainer = document.querySelector('[data-content-list="header.nav"]');
  if (navContainer && contentData?.header?.nav) {
    navContainer.innerHTML = contentData.header.nav
      .map(item => `<a href="${item.href}">${item.text}</a>`)
      .join('');
  }

  // Факты (about.facts)
  const factsContainer = document.querySelector('[data-content-list-facts="about.facts"]');
  if (factsContainer && contentData?.about?.facts) {
    factsContainer.innerHTML = contentData.about.facts
      .map(fact => `<div><strong>${parseMarkup(fact.value)}</strong><span>${parseMarkup(fact.label)}</span></div>`)
      .join('');
  }

  // Принципы (philosophy.principles)
  const principlesContainer = document.querySelector('[data-content-list-principles="philosophy.principles"]');
  if (principlesContainer && contentData?.philosophy?.principles) {
    principlesContainer.innerHTML = contentData.philosophy.principles
      .map(p => `<article><span>${parseMarkup(p.number)}</span><h3>${parseMarkup(p.title)}</h3><p>${parseMarkup(p.text)}</p></article>`)
      .join('');
  }

  // Timeline (cv.timeline)
  const timelineContainer = document.querySelector('[data-content-list-timeline="cv.timeline"]');
  if (timelineContainer && contentData?.cv?.timeline) {
    timelineContainer.innerHTML = contentData.cv.timeline
      .map(item => `<article><time>${parseMarkup(item.period)}</time><h3>${parseMarkup(item.title)}</h3><p>${parseMarkup(item.text)}</p></article>`)
      .join('');
  }
}

const galleries = {
  works: {
    dataUrl: "data/works.json",
    gallery: document.querySelector('[data-gallery="works"]'),
    filters: document.querySelector('[data-filters="works"]'),
    items: [],
    activeCategory: "All"
  },
  students: {
    dataUrl: "data/students.json",
    gallery: document.querySelector('[data-gallery="students"]'),
    filters: document.querySelector('[data-filters="students"]'),
    items: [],
    activeCategory: "All"
  }
};

const navToggle = document.querySelector("[data-nav-toggle]");
const nav = document.querySelector("[data-nav]");
const dialog = document.querySelector("[data-dialog]");
const dialogImage = document.querySelector("[data-dialog-image]");
const dialogTitle = document.querySelector("[data-dialog-title]");
const dialogMeta = document.querySelector("[data-dialog-meta]");
const dialogDescription = document.querySelector("[data-dialog-description]");

navToggle.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("open");
  document.body.classList.toggle("nav-open", isOpen);
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

nav.addEventListener("click", (event) => {
  if (event.target.matches("a")) {
    nav.classList.remove("open");
    document.body.classList.remove("nav-open");
    navToggle.setAttribute("aria-expanded", "false");
  }
});

document.querySelector("[data-dialog-close]").addEventListener("click", () => {
  dialog.close();
});

dialog.addEventListener("click", (event) => {
  if (event.target === dialog) {
    dialog.close();
  }
});

const videoDialog = document.querySelector("[data-video-dialog]");
const videoDialogVideo = videoDialog?.querySelector("[data-video-dialog-video]");

document.querySelectorAll("[data-video-trigger]").forEach((trigger) => {
  trigger.addEventListener("click", () => {
    videoDialogVideo.src = trigger.dataset.videoSrc;
    videoDialog.showModal();
    videoDialogVideo.play();
  });
});

document.querySelector("[data-video-dialog-close]")?.addEventListener("click", () => {
  videoDialog.close();
});

videoDialog?.addEventListener("click", (event) => {
  if (event.target === videoDialog) {
    videoDialog.close();
  }
});

videoDialog?.addEventListener("close", () => {
  videoDialogVideo.pause();
  videoDialogVideo.removeAttribute("src");
});

async function loadGallery(key) {
  const state = galleries[key];
  const response = await fetch(state.dataUrl);
  const rawData = await response.json();

  let categories;
  let flatItems;

  if (Array.isArray(rawData)) {
    // Плоский список (students.json): категории формируем из поля item.category
    flatItems = rawData.map((item) => ({
      ...item,
      category: item.category,
      categoryId: item.category
    }));

    const seen = new Map();
    rawData.forEach((item) => {
      if (!seen.has(item.category)) {
        seen.set(item.category, { id: item.category, name: item.category, order: item.order ?? 0 });
      }
    });
    categories = [...seen.values()].sort((a, b) => a.order - b.order);
  } else {
    // Вложенная структура по категориям (works.json)
    categories = Object.values(rawData).sort((a, b) => a.order - b.order);
    flatItems = [];

    categories.forEach((category) => {
      if (category.works && Array.isArray(category.works)) {
        category.works.forEach((work) => {
          flatItems.push({
            ...work,
            category: category.name,
            categoryId: category.id
          });
        });
      }
    });
  }

  state.items = flatItems;
  state.categories = categories; // Сохраняем категории для меню

  renderFilters(key);
  renderGallery(key);
}

function renderFilters(key) {
  const state = galleries[key];
  // Формируем список категорий из структуры данных + "All"
  const categories = ["All", ...state.categories.map(cat => cat.name)];

  state.filters.innerHTML = categories
    .map((category) => {
      const activeClass = category === state.activeCategory ? " active" : "";
      return `<button class="filter-button${activeClass}" type="button" data-category="${category}">${category}</button>`;
    })
    .join("");

  state.filters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;

    state.activeCategory = button.dataset.category;
    renderFilters(key);
    renderGallery(key);
  }, { once: true });
}

function renderGallery(key) {
  const state = galleries[key];
  const items = state.activeCategory === "All"
    ? state.items
    : state.items.filter((item) => item.category === state.activeCategory);

  state.gallery.scrollTop = 0;
  state.gallery.innerHTML = `
    <div class="gallery-grid">
      ${items.map(renderCard).join("")}
    </div>
  `;

  state.gallery.querySelectorAll("[data-art-id]").forEach((card) => {
    card.addEventListener("click", () => {
      const item = items.find((entry) => entry.id === card.dataset.artId);
      openArtwork(item);
    });

    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      const item = items.find((entry) => entry.id === card.dataset.artId);
      openArtwork(item);
    });
  });
}

function renderCard(item) {
  return `
    <article class="art-card" data-art-id="${item.id}" tabindex="0" role="button" aria-label="Открыть работу ${item.title}">
      <img src="${item.image}" alt="${item.title}" loading="lazy">
      <div class="art-card-body">
        <h3>${item.title}</h3>
        <p>${item.year} / ${item.category} / ${item.technique}</p>
      </div>
    </article>
  `;
}

function openArtwork(item) {
  dialogImage.src = item.image;
  dialogImage.alt = item.title;
  dialogTitle.textContent = item.title;
  dialogMeta.textContent = `${item.year} / ${item.category} / ${item.technique}`;
  dialogDescription.textContent = item.description;
  dialog.showModal();
}

function updateActiveNav() {
  const sections = [...document.querySelectorAll(".screen")];
  const links = [...document.querySelectorAll(".site-nav a")];
  const active = sections
    .map((section) => ({
      id: section.id,
      distance: Math.abs(section.getBoundingClientRect().top - Number.parseInt(getComputedStyle(document.documentElement).getPropertyValue("--header-height"), 10))
    }))
    .sort((a, b) => a.distance - b.distance)[0];

  links.forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === `#${active.id}`);
  });
}

Object.keys(galleries).forEach(loadGallery);
loadContent();
document.addEventListener("scroll", updateActiveNav, { passive: true });
window.addEventListener("resize", updateActiveNav);
updateActiveNav();
