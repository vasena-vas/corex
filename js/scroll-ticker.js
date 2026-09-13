/**
 * Corex-Trade — общий rAF-тикер для scroll-driven сцен (Hero, «Кейсы»).
 *
 * Раньше каждая сцена сама вешала listener на 'scroll' (чтобы прочитать
 * getBoundingClientRect и обновить target) и сама держала бесконечный
 * requestAnimationFrame(loop). Два независимых scroll-listener'а на
 * длинных страницах означают два вызова getBoundingClientRect на каждое
 * scroll-событие — а scroll-событий на трекпаде/колесе может быть больше,
 * чем кадров, и forced-reflow-чтение может попасть между кадром рендера
 * и следующим тиком, вызывая подёргивание.
 *
 * Здесь ровно один requestAnimationFrame-цикл на всю страницу. Каждая
 * сцена регистрирует свой колбэк через onFrame — внутри него она и
 * читает геометрию, и обновляет p, и пишет стили: чтение и запись
 * привязаны к одному и тому же кадру, а не к частоте scroll-событий.
 */
(function () {
  'use strict';

  var callbacks = [];
  var started = false;

  function tick() {
    for (var i = 0; i < callbacks.length; i++) {
      callbacks[i]();
    }
    requestAnimationFrame(tick);
  }

  function onFrame(fn) {
    callbacks.push(fn);
    if (!started) {
      started = true;
      requestAnimationFrame(tick);
    }
  }

  window.corexScrollTicker = { onFrame: onFrame };
})();
