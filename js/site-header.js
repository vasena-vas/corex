/**
 * Переключение состояния шапки (site-header) между прозрачной (поверх видео
 * Hero) и непрозрачной (над светлыми секциями лендинга).
 *
 * Независимо от js/animations.js и GSAP/ScrollTrigger: работает даже если
 * CDN со скриптами GSAP не загрузился (см. no-anim в animations.js), в
 * любой раскладке Hero (десктопный pin-сценарий и потоковая мобильная/
 * reduced-motion ветка).
 *
 * Сентинел — секция `#route`, а не `.section-seam--hero-out` (хотя тот и
 * лежит в разметке прямо в конце Hero, как декоративный элемент шва). На
 * десктопе `.hero` весь пин держится через `position: fixed` с
 * зафиксированной высотой в 100vh (initHero, GSAP ScrollTrigger `pin: true`)
 * — из-за этого `.section-seam--hero-out`, абсолютно позиционированный
 * `bottom: 0` внутри `.hero`, физически лежит на нижней кромке вьюпорта
 * (пересекает её) на протяжении всего пина, с самого первого акта, а не
 * только в конце — как сентинел для IntersectionObserver он бесполезен на
 * этой раскладке. `#route` — первая секция после Hero, никогда не пинится
 * и не трансформируется (initHandoff/initRoute трогают только элементы
 * внутри неё), поэтому её появление во вьюпорте снизу надёжно совпадает с
 * моментом, когда пин снят и Hero действительно пройден — в любой раскладке.
 *
 * Безопасный дефолт без JS: см. css/styles.css, класс `.site-header` без
 * `.js` на <html> всегда рисуется непрозрачным. Этот скрипт только
 * добавляет/снимает класс `.site-header--solid`, которым обычное
 * непрозрачное состояние однозначно фиксируется даже когда `.js` уже есть.
 */
(function () {
  var header = document.querySelector('.site-header');
  var sentinel = document.getElementById('route');

  if (!header || !sentinel || typeof IntersectionObserver !== 'function') {
    // Нет сентинела или браузер не поддерживает IntersectionObserver —
    // оставляем шапку в CSS-дефолте (непрозрачная), это безопасно.
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      // #route виден во вьюпорте (Hero пройден) — либо уже полностью
      // скрылся выше вьюпорта при дальнейшем скролле вниз — шапка
      // непрозрачная. Иначе (#route всё ещё ниже вьюпорта, мы внутри Hero,
      // включая скролл назад в Hero) — прозрачная.
      var pastHero = entry.isIntersecting || entry.boundingClientRect.top < 0;
      header.classList.toggle('site-header--solid', pastHero);
    });
  });

  observer.observe(sentinel);
})();
