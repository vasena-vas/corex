/**
 * Corex-Trade — хиро, горизонтальная панорама.
 *
 * Принцип, обоснование и правила доработки — docs/hero-panorama.md.
 * Логика ниже перенесена из docs/hero-panorama-reference.html почти без
 * изменений (только id/классы под разметку index.html) — код панорамы
 * менять здесь не проектируя заново, а только синхронно с этим файлом
 * и docs/hero-panorama-reference.html.
 *
 * Две независимые части:
 * 1. Генератор реквизита вдоль дороги — ставится только в промежутках
 *    между станциями (центры станций 60/160/260/360/460/560vw, рисунок
 *    занимает ±22vw вокруг центра, см. docs/hero-panorama.md).
 * 2. Движок прогресса вынесен целиком в js/scroll-engine.js: там и кэш
 *    геометрии секции, и лерп, и сон цикла. Здесь остаётся только
 *    render(p) — чистая запись стилей из готового прогресса, без единого
 *    чтения раскладки в кадре. Детерминированный p (а не событийные
 *    переключения) обязателен: иначе сцена не отматывается назад при
 *    скролле вверх. Из `p` выводятся позиция камеры (--hero-cam) и
 *    видимость вступления/этапов. Не зависит от GSAP.
 *
 *    В кадре пишутся только transform/opacity и переменная --hero-cam.
 *    Расфокус вступления (filter: blur) убран сознательно: blur каждый
 *    кадр перерисовывает весь слой текста, а уход вступления и без него
 *    полностью читается по opacity + подъёму + масштабу.
 */
(function () {
  var SVG_ATTRS = 'fill="none" stroke="#141414" stroke-width="2.2" stroke-linejoin="round"';
  var PROP_TEMPLATES = {
    pallet: {
      w: 7,
      vb: '0 0 170 140',
      d: '<path d="M8 138v-16h154v16M8 122h154" stroke-opacity=".8"/><path d="M22 138v-16M84 138v-16M148 138v-16"/><path d="M30 122V64h50v58M88 122V64h50v58" stroke-opacity=".85"/><path d="M56 64V16h56v48" stroke-opacity=".85"/><path d="M30 92h50M88 92h50M56 40h56" stroke-width="1.4" stroke-opacity=".3"/>',
    },
    crates: {
      w: 5.8,
      vb: '0 0 130 110',
      d: '<path d="M6 106V54h58v52z"/><path d="M6 54l18-14h58L64 54" stroke-opacity=".8"/><path d="M64 54l18-14v52l-18 14" stroke-opacity=".8"/><path d="M6 80h58" stroke-width="1.4" stroke-opacity=".3"/><path d="M78 106V72h44v34z"/><path d="M78 72l14-10h44l-14 10" stroke-opacity=".8"/><path d="M122 72l14-10v34l-14 10" stroke-opacity=".8"/>',
    },
    barrels: {
      w: 4.6,
      vb: '0 0 110 116',
      d: '<path d="M8 112V40h42v72z"/><path d="M8 40a21 6 0 0142 0" stroke-opacity=".7"/><path d="M8 62h42M8 90h42" stroke-width="1.4" stroke-opacity=".35"/><path d="M62 112V56h36v56z"/><path d="M62 56a18 5 0 0136 0" stroke-opacity=".7"/><path d="M62 78h36" stroke-width="1.4" stroke-opacity=".35"/>',
    },
    rail: {
      w: 12,
      vb: '0 0 250 76',
      d: '<path d="M6 18h238"/><path d="M6 32h238" stroke-opacity=".35"/><path d="M34 18v54M126 18v54M218 18v54"/><path d="M34 44l92-26M126 44l92-26" stroke-width="1.3" stroke-opacity=".2"/>',
    },
    cone: {
      w: 2,
      vb: '0 0 50 68',
      d: '<path d="M25 6l16 50H9z"/><path d="M14 40h22" stroke-opacity=".4"/><path d="M2 56h46l-4 8H6z" stroke-opacity=".8"/>',
    },
    worker: {
      w: 2.5,
      vb: '0 0 62 156',
      d: '<g stroke-opacity=".6"><circle cx="31" cy="17" r="11"/><path d="M31 28v54M31 44l-19 15M31 44l19 13M31 82l-13 70M31 82l15 70"/><path d="M20 34h22" stroke-width="1.6"/></g>',
    },
    container: {
      w: 13.5,
      vb: '0 0 270 128',
      d: '<path d="M6 10h258v108H6z"/><g stroke-width="1.5" stroke-opacity=".22"><path d="M34 10v108M62 10v108M90 10v108M118 10v108M146 10v108M174 10v108M202 10v108M230 10v108"/></g><path d="M6 30h258M6 100h258" stroke-width="1.5" stroke-opacity=".3"/><path d="M240 40v58M252 40v58" stroke-width="1.6" stroke-opacity=".5"/>',
    },
  };

  var PROP_LIST = [
    { x: 12, t: 'rail', o: 0.45 }, { x: 26, t: 'crates', o: 0.5 },
    { x: 88, t: 'rail', o: 0.45 }, { x: 99, t: 'pallet', o: 0.75 }, { x: 110, t: 'worker', o: 0.6 }, { x: 121, t: 'sign', s: 'далее — цены с фабрики' },
    { x: 186, t: 'crates', o: 0.7 }, { x: 197, t: 'cone', o: 0.5 }, { x: 209, t: 'rail', o: 0.42 }, { x: 222, t: 'sign', s: 'далее — расчёт' },
    { x: 286, t: 'pallet', o: 0.7 }, { x: 298, t: 'barrels', o: 0.6 }, { x: 310, t: 'worker', o: 0.55 }, { x: 322, t: 'sign', s: 'далее — проработка' },
    { x: 386, t: 'rail', o: 0.42 }, { x: 398, t: 'crates', o: 0.7 }, { x: 409, t: 'pallet', o: 0.6 }, { x: 421, t: 'sign', s: 'далее — договор' },
    { x: 492, t: 'container', o: 0.6 }, { x: 506, t: 'pallet', o: 0.75 }, { x: 515, t: 'worker', o: 0.6 }, { x: 524, t: 'sign', s: 'далее — склад' },
    { x: 584, t: 'crates', o: 0.6 }, { x: 595, t: 'rail', o: 0.42 },
  ];

  function signTemplate(text) {
    var vw = 44 + text.length * 9.2 + 40;
    var h = 196;
    return {
      w: vw / 23,
      vb: '0 0 ' + vw + ' ' + h,
      d:
        '<path d="M22 46v150"/><path d="M14 196h16" stroke-opacity=".5"/>' +
        '<path d="M22 20h' + (vw - 82) + 'l20 19-20 19H22z" fill="#F5F5F3"/>' +
        '<text x="42" y="46" font-family="IBM Plex Mono, monospace" font-size="15" fill="#141414" fill-opacity=".55" stroke="none">' + text + '</text>',
    };
  }

  function renderProps() {
    var container = document.getElementById('hero-props');
    if (!container) return;

    var html = '';
    PROP_LIST.forEach(function (p) {
      var tpl = p.t === 'sign' ? signTemplate(p.s) : PROP_TEMPLATES[p.t];
      html +=
        '<div class="hero__prop" style="left:' + p.x + 'vw;width:' + tpl.w.toFixed(2) + 'vw;opacity:' + (p.o || 0.7) + '">' +
        '<svg viewBox="' + tpl.vb + '" ' + SVG_ATTRS + '>' + tpl.d + '</svg></div>';
    });
    container.innerHTML = html;
  }

  renderProps();

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var track = document.getElementById('hero');
  var pin = document.getElementById('hero-pin');
  var intro = document.getElementById('hero-intro');
  var wash = document.getElementById('hero-wash');
  var hint = document.getElementById('hero-hint');
  var counter = document.getElementById('hero-counter');
  if (!track || !pin || !intro || !wash || !hint || !counter) return;

  var acts = [].slice.call(document.querySelectorAll('.hero__act'));
  var nodes = [].slice.call(document.querySelectorAll('.hero__node'));
  if (acts.length !== 6 || nodes.length !== 6) return;

  var LABELS = ['заявка', 'цены с фабрики', 'предварительный расчёт', 'проработка', 'договор', 'склад'];
  var N = 6;
  var lastIdx = -1;
  var lastClickable = null;

  function clamp(v, a, b) {
    a = a || 0;
    b = b === undefined ? 1 : b;
    return v < a ? a : v > b ? b : v;
  }

  function easeOutExpo(t) {
    return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  function easeInOut(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function render(p) {
    var out = easeOutExpo(clamp((p - 0.06) / 0.07));
    intro.style.opacity = 1 - out;
    intro.style.transform = 'translateY(var(--hero-base-y)) translateY(' + -60 * out + 'px) scale(' + (1 - 0.03 * out) + ')';
    var clickable = out <= 0.5;
    if (clickable !== lastClickable) {
      lastClickable = clickable;
      intro.style.pointerEvents = clickable ? 'auto' : 'none';
    }
    wash.style.opacity = (0.5 * (1 - out)).toFixed(3);
    hint.style.opacity = (1 - clamp(p / 0.05)).toFixed(3);

    var q = clamp((p - 0.13) / 0.87);
    var idx = Math.min(N - 1, Math.floor(q * N));
    var local = clamp(q * N - idx);
    var cam = Math.min(N - 1, idx + easeInOut(clamp((local - 0.34) / 0.66)));
    pin.style.setProperty('--hero-cam', cam.toFixed(4));

    for (var i = 0; i < N; i++) {
      var o = 0;
      var y = 24;
      if (i === idx) {
        var a = easeOutExpo(clamp((local - 0.02) / 0.16));
        var b = i === N - 1 ? 0 : easeOutExpo(clamp((local - 0.46) / 0.16));
        o = a * (1 - b);
        y = 24 * (1 - a) - 22 * b;
      }
      acts[i].style.opacity = o.toFixed(3);
      acts[i].style.transform = 'translateY(var(--hero-base-y)) translateY(' + y.toFixed(1) + 'px)';
      nodes[i].classList.toggle('is-active', cam >= i - 0.02);
    }

    if (idx !== lastIdx) {
      lastIdx = idx;
      counter.innerHTML = '<b>' + ('0' + (idx + 1)) + '</b> / 06<br>' + LABELS[idx];
    }
    counter.style.opacity = clamp((p - 0.1) / 0.06).toFixed(3);
  }

  window.corexScrollEngine.register({ track: track, render: render });
})();
