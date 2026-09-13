/**
 * Тема шапки (site-header) по фактическому фону секции под ней.
 *
 * Раньше шапка знала ровно два состояния и один сентинел (#hero-stats):
 * «поверх хиро» — прозрачная с белым текстом, «ниже» — непрозрачная белая.
 * Это работало, пока хиро было тёмным видео. С светлой панорамой белый
 * текст поверх неё не читался вовсе, а тёмных секций на странице две
 * (#cases и #contacts), и обе шли мимо этой логики.
 *
 * Теперь источник правды — сама разметка: каждая секция объявляет свой фон
 * атрибутом data-header="light|dark" (см. index.html). Здесь только
 * определяется, какая секция сейчас под шапкой, и её тема переносится в
 * header.dataset.theme; все цвета — в CSS, через --header-ink.
 *
 * ПОЧЕМУ rootMargin "0px 0px -95% 0px":
 * он сжимает область наблюдения до тонкой полосы у самого верха вьюпорта —
 * ровно там, где лежит шапка. Секция «пересекается» с этой полосой, пока
 * она физически проходит под шапкой, и наблюдатель будит колбэк только на
 * границах секций, а не на каждом кадре скролла.
 *
 * ПОЧЕМУ БЕРЁТСЯ ПЕРВАЯ ПЕРЕСЕКАЮЩАЯСЯ СЕКЦИЯ, А НЕ ПОСЛЕДНЯЯ:
 * в момент стыка двух секций полосу задевают обе — нижняя уже вошла в неё
 * снизу, верхняя ещё не вышла сверху. Шапка в этот момент физически лежит
 * на верхней из них, поэтому берётся первая по порядку в документе. Иначе
 * тема переключалась бы на высоту полосы раньше, чем граница секций дойдёт
 * до шапки, и на этом отрезке белый текст оказывался бы на светлом фоне.
 *
 * ПОЧЕМУ СТАРТ ОТЛОЖЕН ДО window.load (+2 кадра), А НЕ СРАЗУ:
 * самохостинг-шрифт (font-display: swap) может подменить метрики текста и
 * сдвинуть высоту документа уже после первой раскладки. Первая доставка
 * результата у observer'а асинхронная, и запущенный сразу он мог застать
 * ещё не стабилизировавшуюся раскладку и выбрать не ту секцию. До этого
 * момента шапка остаётся в CSS-дефолте (светлая тема, прозрачный фон) —
 * верное состояние на первом экране гарантировано самим CSS, а не удачным
 * первым срабатыванием observer'а.
 *
 * Без JS — см. css/styles.css, §4: непрозрачная белая шапка с тёмным
 * текстом, читаемая на любой секции.
 */
(function () {
  'use strict';

  var SCRIM_AT = 40; // px прокрутки, после которых под шапкой появляется подложка

  var header = document.querySelector('.site-header');
  if (!header) {
    return;
  }

  var sections = [].slice.call(document.querySelectorAll('[data-header]'));

  /* ==========================================================
     Подложка после 40px прокрутки. На самом первом экране её нет.
     Обработчик passive и без чтения раскладки сверх pageYOffset;
     класс переставляется только когда порог реально пересечён, а не
     на каждое событие скролла.
     ========================================================== */
  var scrimOn = null;

  function syncScrim() {
    var on = (window.pageYOffset || document.documentElement.scrollTop || 0) > SCRIM_AT;
    if (on === scrimOn) {
      return;
    }
    scrimOn = on;
    header.classList.toggle('site-header--scrim', on);
  }

  syncScrim();
  window.addEventListener('scroll', syncScrim, { passive: true });

  /* ==========================================================
     Тема по секции под шапкой.
     ========================================================== */
  if (!sections.length || typeof IntersectionObserver !== 'function') {
    return;
  }

  var intersecting = [];

  function applyTheme() {
    for (var i = 0; i < sections.length; i++) {
      if (!intersecting[i]) {
        continue;
      }
      var theme = sections[i].getAttribute('data-header');
      if (header.dataset.theme !== theme) {
        header.dataset.theme = theme;
      }
      return;
    }
    // Ни одна секция не попала в полосу (например, скролл выше <main>) —
    // оставляем последнюю известную тему, мигать шапкой незачем.
  }

  function startObserving() {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var i = sections.indexOf(entry.target);
          if (i !== -1) {
            intersecting[i] = entry.isIntersecting;
          }
        });
        applyTheme();
      },
      { rootMargin: '0px 0px -95% 0px' }
    );

    sections.forEach(function (section) {
      observer.observe(section);
    });
  }

  function onLayoutStable() {
    requestAnimationFrame(function () {
      requestAnimationFrame(startObserving);
    });
  }

  if (document.readyState === 'complete') {
    onLayoutStable();
  } else {
    window.addEventListener('load', onLayoutStable, { once: true });
  }
})();
