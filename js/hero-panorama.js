/**
 * COREX — хиро, тёмная сцена с шестью шагами процесса.
 *
 * Принцип: одна секция высотой 350vh (было 700vh), внутри неё
 * .hero__pin sticky на 100svh. Внутри пина семь панелей —
 * вступление и шесть шагов. Каждая панель это единый <article>:
 * слева текст (номер, заголовок, абзац), справа иллюстрация, и
 * появляются/уходят они вместе, потому что анимируются как одно
 * целое — именно этого не хватало прежней панораме, где сначала
 * подъезжала станция, и только потом проявлялся текст.
 *
 * Скролл двигает «камеру» вперёд: активная панель уходит вверх и
 * гаснет, следующая входит снизу. Прогресс 0..1 приходит из
 * js/scroll-engine.js, где живёт кэш геометрии, лерп и сон цикла.
 * Здесь — только чистая запись стилей из готового прогресса, без
 * единого чтения раскладки в кадре.
 *
 * Не зависит от GSAP. При prefers-reduced-motion (или ширине меньше
 * 340px) сцена не стартует вовсе: CSS сам выводит панели обычным
 * вертикальным списком (styles.css §5.2) — этот файл только
 * проверяет условие и молча выходит.
 */
(function () {
  'use strict';

  var track = document.getElementById('hero');
  var pin = document.getElementById('hero-pin');
  if (!track || !pin) {
    return;
  }

  var panels = [].slice.call(document.querySelectorAll('.hero__panel'));
  if (panels.length < 2) {
    return;
  }

  /* Фоллбэк-список (styles.css §5.2) — сцена не стартует, панели
     остаются в конечном читаемом состоянии. */
  var FALLBACK = window.matchMedia(
    '(prefers-reduced-motion: reduce), (max-width: 339.98px)'
  );
  if (FALLBACK.matches) {
    return;
  }

  /* Число панелей и «подъём» — на сколько пикселей панель смещается
     вверх на одну позицию прогресса. */
  var N = panels.length;
  var RISE = 60;
  var LERP = 0.09;

  /* Сглаживание — стандартный smoothstep. На входе в полосу
     видимости панель едва заметна, к центру выходит в полную
     непрозрачность, на выходе так же мягко гаснет. Без сглаживания
     на стыках читалась бы «половинчатость»: 0.5 на обе панели. */
  function smoothstep(x) {
    return x * x * (3 - 2 * x);
  }

  /* Единственная функция, которая что-то пишет в DOM. Прогресс `p`
     уже сглажен лерпом в scroll-engine. */
  function render(p) {
    var pos = p * (N - 1);

    for (var i = 0; i < N; i++) {
      var dist = pos - i;
      var abs = dist < 0 ? -dist : dist;

      var opacity = abs >= 1 ? 0 : smoothstep(1 - abs);
      var y = -dist * RISE;

      var panel = panels[i];
      panel.style.opacity = opacity.toFixed(3);
      panel.style.transform = 'translate3d(0, ' + y.toFixed(2) + 'px, 0)';
      /* Клики ловит только активная панель. У неактивных панелей
         pointer-events: none — иначе невидимая панель перехватывала
         бы клик по видимой. */
      panel.style.pointerEvents = abs < 0.2 ? 'auto' : 'none';
    }
  }

  /* Первый рендер — сразу, ещё до старта движка: на первом кадре
     страница не должна мелькнуть пустым тёмным фоном. При загрузке
     с уже проскролленной страницей scroll-engine всё равно
     перерисует сцену на правильном прогрессе — при регистрации он
     вызывает render(progressOf(track)), и это перекроет начальный
     рендер. */
  render(0);

  function start() {
    window.corexScrollEngine.register({
      track: track,
      render: render,
      smooth: LERP
    });
  }

  /* Декодирование WebP 1200x857 — работа, которую браузер
     откладывает до первой отрисовки. Если она случится на первом
     проезде, это кадр в 20–40ms ровно там, где панель трогается.
     Поэтому сцена стартует после декодирования всех шести картинок —
     но не дольше DECODE_CAP: мёртвый хиро хуже одного лишнего кадра
     декодирования. */
  var DECODE_CAP = 2500;
  var imgs = [].slice.call(document.querySelectorAll('.hero__panel-media img'));

  if (!imgs.length || !imgs[0].decode || typeof Promise !== 'function') {
    start();
    return;
  }

  Promise.race([
    Promise.all(imgs.map(function (img) {
      return img.decode().catch(function () {});
    })),
    new Promise(function (resolve) { setTimeout(resolve, DECODE_CAP); })
  ]).then(start);
})();