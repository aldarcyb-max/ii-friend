// ==========================================================
// Личный сайт врача-стоматолога — интерактив
// ==========================================================

document.addEventListener('DOMContentLoaded', () => {
  initBurgerMenu();
  initNavAutoClose();
  document.querySelectorAll('.slider').forEach(initSlider);
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});

function initBurgerMenu() {
  const burger = document.getElementById('burger');
  const nav = document.getElementById('main-nav');
  if (!burger || !nav) return;

  burger.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    burger.classList.toggle('open', isOpen);
    burger.setAttribute('aria-expanded', String(isOpen));
  });
}

function initNavAutoClose() {
  const nav = document.getElementById('main-nav');
  const burger = document.getElementById('burger');
  if (!nav || !burger) return;

  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      burger.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
    });
  });
}

// Простая карусель: работает и для отзывов, и для галерей портфолио.
// Разметка: .slider > .slider-arrow.slider-prev / .slider-track > .slide / .slider-arrow.slider-next / .slider-dots
//
// Показываем только активный слайд (display:none у остальных), без transform
// и анимации сдвига. Раньше все слайды лежали в ряд и двигались через
// translateX — из-за этого высота блока считалась по САМОМУ ДЛИННОМУ отзыву
// (под короткими оставалась пустота), а на некоторых устройствах/браузерах
// анимация transform вместе с overflow:hidden ломала перерисовку — контент
// то пропадал, то "двоился". Показ только одного слайда за раз проще и
// надёжнее: высота блока всегда естественная, лишнего рендера нет.
// Плавный переход между слайдами делаем только через opacity (см. CSS) —
// это безопасная анимация, не влияющая на раскладку и не ломающая рендер.
// ownDescendant(s) — как querySelector(All), но игнорирует элементы, которые
// на самом деле принадлежат ВЛОЖЕННОЙ карусели (например, у кейса внутри
// "Хирургическое лечение" своя мини-карусель фото прямо внутри одного слайда
// внешней). Простой querySelectorAll('.slide') нашёл бы слайды ОБЕИХ каруселей
// сразу и всё сломал бы — а так каждая карусель видит только свои элементы,
// при этом внутри разметки можно свободно оборачивать элементы в div'ы.
function ownDescendant(root, selector) {
  for (const el of root.querySelectorAll(selector)) {
    if (el.closest('.slider') === root) return el;
  }
  return null;
}
function ownDescendants(root, selector) {
  return Array.from(root.querySelectorAll(selector)).filter(el => el.closest('.slider') === root);
}

function initSlider(root) {
  const track = ownDescendant(root, '.slider-track');
  const slides = track ? ownDescendants(root, '.slide') : [];
  const prevBtn = ownDescendant(root, '.slider-prev');
  const nextBtn = ownDescendant(root, '.slider-next');
  const dotsWrap = ownDescendant(root, '.slider-dots');
  if (!track || slides.length === 0) return;

  let index = 0;

  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.setAttribute('aria-label', `Слайд ${i + 1}`);
    dot.addEventListener('click', () => goTo(i));
    // Наведение мышкой тоже переключает — удобно для точек-кейса сбоку от
    // фото (не нужно тыкать курсором, просто провёл мышкой сверху вниз)
    dot.addEventListener('mouseenter', () => goTo(i));
    dotsWrap.appendChild(dot);
  });
  const dots = Array.from(dotsWrap.children);

  function update() {
    // Раньше тут был трюк с принудительным реflow (void s.offsetWidth) или
    // двойной requestAnimationFrame, чтобы каждый раз ЗАНОВО запускать
    // CSS-переход opacity:0 → opacity:1. Оба варианта оказались ненадёжными
    // при быстром наведении подряд на несколько точек (например, вниз по
    // столбику точек кейса): если новый вызов update() приходил раньше, чем
    // браузер успевал отрисовать нужный кадр между remove и add класса,
    // is-visible мог остаться не добавленным — фото пропадало насовсем
    // (opacity: 0), пока не переключишь слайд ещё раз.
    // Правильно и надёжно: НЕ трогаем is-visible у слайда, который и так
    // становится активным (add — идемпотентен, если класс уже стоит, ничего
    // не будет мигать), а снимаем его только у слайдов, которые скрываем.
    // Так на каждый слайд класс либо только добавляется, либо только
    // убирается — гонки между этими двумя действиями для одного и того же
    // элемента не возникает, а значит и «зависнуть» с opacity: 0 нельзя.
    slides.forEach((s, i) => {
      if (i === index) {
        s.hidden = false;
        s.classList.add('is-visible');
        // Вложенная мини-карусель кейса (data-fixed-height) внутри ЭТОГО
        // слайда, пока сам слайд был скрыт (display:none у предка), не могла
        // измерить свою стабильную высоту — offsetHeight под display:none
        // всегда 0. Как только слайд показался — считаем заново.
        s.querySelectorAll('.slider[data-fixed-height]').forEach(nested => {
          if (typeof nested.__applyFixedHeight === 'function') nested.__applyFixedHeight();
        });
      } else {
        s.classList.remove('is-visible');
        s.hidden = true;
      }
    });
    dots.forEach((d, i) => d.classList.toggle('active', i === index));
  }

  function goTo(i) {
    index = (i + slides.length) % slides.length;
    update();
  }

  prevBtn && prevBtn.addEventListener('click', () => goTo(index - 1));
  nextBtn && nextBtn.addEventListener('click', () => goTo(index + 1));

  // Для отзывов (data-fixed-height на .slider) высота трека фиксируется по
  // самому длинному слайду — иначе при переключении на короткий отзыв блок
  // "сжимается" и точки/всё, что ниже на странице, прыгают вверх. Короткие
  // отзывы просто оставляют пустое место снизу, зато ничего не бегает.
  if (root.hasAttribute('data-fixed-height')) {
    const applyFixedHeight = () => {
      track.style.minHeight = '';
      let max = 0;
      slides.forEach(s => {
        const wasHidden = s.hidden;
        s.hidden = false;
        max = Math.max(max, s.offsetHeight);
        s.hidden = wasHidden;
      });
      track.style.minHeight = max + 'px';
    };
    root.__applyFixedHeight = applyFixedHeight; // доступ снаружи — см. update() внешней карусели выше
    applyFixedHeight();
    // Фото грузятся асинхронно — в момент первого applyFixedHeight() они почти
    // наверняка ещё не успели загрузиться, и offsetHeight по ним занижен (может
    // быть и вовсе 0). Пересчитываем высоту ещё раз, когда каждое фото реально
    // догрузится, — иначе столбик точек у кейса мог "прыгнуть" уже после того,
    // как страница отрисовалась (или вовсе не зафиксироваться как надо).
    ownDescendants(root, 'img').forEach(img => {
      if (!img.complete) img.addEventListener('load', applyFixedHeight, { once: true });
    });
    // Шрифты (Comfortaa/Nunito) грузятся с Google Fonts асинхронно и подключены
    // с display=swap — значит первый applyFixedHeight() почти наверняка меряет
    // текст ещё на подстановочном системном шрифте. У него другие пропорции
    // букв, поэтому после реальной загрузки шрифта текст мог бы перенестись
    // на другое количество строк — и высота, зафиксированная "не тем" шрифтом,
    // разъезжалась бы со страницей уже после её отрисовки (у отзывов это
    // выглядело как "убегающая" карусель). Пересчитываем ещё раз, когда шрифты
    // точно готовы.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(applyFixedHeight);
    }
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(applyFixedHeight, 150);
    });
  }

  // Свайп на мобильных. stopPropagation — чтобы свайп по вложенной карусели
  // кейса не долистывал заодно и внешнюю карусель "Хирургическое лечение".
  let startX = 0;
  track.addEventListener('touchstart', e => { startX = e.touches[0].clientX; e.stopPropagation(); }, { passive: true });
  track.addEventListener('touchend', e => {
    e.stopPropagation();
    const diff = e.changedTouches[0].clientX - startX;
    if (Math.abs(diff) > 40) goTo(diff > 0 ? index - 1 : index + 1);
  }, { passive: true });

  update();
}
