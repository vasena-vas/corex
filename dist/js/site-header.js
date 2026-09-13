/**
 * Переключение состояния шапки (site-header) между прозрачной (поверх
 * панорамы Hero, docs/hero-panorama.md) и непрозрачной (над светлыми
 * секциями лендинга).
 *
 * Независимо от js/animations.js и GSAP/ScrollTrigger: работает даже если
 * CDN со скриптами GSAP не загрузился (см. no-anim в animations.js), в
 * любой раскладке Hero (десктопный sticky-сценарий панорамы и потоковая
 * мобильная/reduced-motion ветка, см. js/hero-panorama.js).
 *
 * Сентинел — секция `#hero-stats` (плашки под первым экраном). `.hero`
 * держит sticky-контейнер `.hero__pin` через обычный CSS `position: sticky`
 * внутри секции высотой `700vh` (без JS-вставки служебных элементов вроде
 * pin-spacer) — `#hero-stats` идёт в потоке сразу за `.hero` и никогда не
 * пинится и не трансформируется (initHeroStats в animations.js трогает
 * только элементы внутри неё), поэтому её появление во вьюпорте снизу
 * надёжно совпадает с моментом, когда Hero действительно пройден — в любой
 * раскладке.
 *
 * Безопасный дефолт без JS: см. css/styles.css, класс `.site-header` без
 * `.js` на <html> всегда рисуется непрозрачным. Этот скрипт только
 * добавляет/снимает класс `.site-header--solid`, которым обычное
 * непрозрачное состояние однозначно фиксируется даже когда `.js` уже есть.
 *
 * ПОЧЕМУ СТАРТ ОТЛОЖЕН ДО `window.load` (+2 кадра), А НЕ СРАЗУ:
 * Пространство под `.hero` (высота 700vh) доступно синхронно уже в
 * начальной раскладке CSS, JS его не вставляет — но самохостинг-шрифт
 * (font-display: swap, см. css/styles.css) может подменить метрики текста
 * и сдвинуть высоту документа уже после первой раскладки. Если запустить
 * IntersectionObserver сразу при разборе этого скрипта, его самая первая
 * доставка результата (асинхронная, на следующий кадр отрисовки) может
 * застать `#hero-stats` до того, как раскладка с финальным шрифтом
 * стабилизировалась, и ошибочно поставить `--solid` уже на первом кадре,
 * до какого-либо скролла пользователя. Как только пользователь скроллит,
 * браузер пересчитывает пересечение по актуальной раскладке — шапка
 * «самопочиняется» в прозрачную, что и создавало впечатление «белая
 * полоска пропадает только после скролла».
 *
 * Чтобы первая же проверка observer'а опиралась на стабилизированную
 * раскладку, старт откладывается до `window.load` плюс два кадра
 * отрисовки поверх него, чтобы синхронные эффекты загрузки шрифтов и
 * содержимого успели попасть в layout до первого чтения geometry. До
 * этого момента шапка остаётся в CSS-дефолте (прозрачная, см. правило
 * `.js .site-header:not(.site-header--solid)` ниже в этом файле — класс
 * `--solid` просто ещё не навешан) — то есть верное самое первое состояние
 * гарантировано самим CSS, а не удачным первым срабатыванием observer'а.
 */
(function () {
  var header = document.querySelector('.site-header');
  var sentinel = document.getElementById('hero-stats');

  if (!header || !sentinel || typeof IntersectionObserver !== 'function') {
    // Нет сентинела или браузер не поддерживает IntersectionObserver —
    // оставляем шапку в CSS-дефолте (непрозрачная), это безопасно.
    return;
  }

  function startObserving() {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        // #hero-stats виден во вьюпорте (Hero пройден) — либо уже полностью
        // скрылся выше вьюпорта при дальнейшем скролле вниз — шапка
        // непрозрачная. Иначе (#hero-stats всё ещё ниже вьюпорта, мы внутри Hero,
        // включая скролл назад в Hero) — прозрачная.
        var pastHero = entry.isIntersecting || entry.boundingClientRect.top < 0;
        header.classList.toggle('site-header--solid', pastHero);
      });
    });

    observer.observe(sentinel);
  }

  function onLayoutStable() {
    // requestAnimationFrame может быть недоступен в очень старых браузерах —
    // но раз мы уже внутри ветки с IntersectionObserver, современный
    // браузер, поддерживающий rAF, гарантирован.
    requestAnimationFrame(function () {
      requestAnimationFrame(startObserving);
    });
  }

  if (document.readyState === 'complete') {
    // Скрипт выполнился уже после window.load (например, порядок событий
    // на медленной сети) — раскладка и так стабилизирована, ждать
    // отдельное событие load не нужно.
    onLayoutStable();
  } else {
    window.addEventListener('load', onLayoutStable, { once: true });
  }
})();
