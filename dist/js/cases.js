/**
 * Corex-Trade — секция 5, кейсы (папка с документами).
 *
 * Перенесено из docs/corex-cases-folder_1.html (CLAUDE.md, «Перенос
 * блоков из docs/ref-*.html») почти без изменений в самой механике —
 * только классы/id под разметку index.html (префикс cs-, см. css/styles.css
 * §10). Данные пяти закрытых поставок временно берутся из демо-референса
 * как реалистичный контент — по согласованию: реальные названия, суммы
 * экономии и фото подставляются позже без переверстки, правкой только
 * массива CASES ниже (фото — через assets/cases/0N.jpg, поле img).
 *
 * Движок прогресса — тот же приём, что у Hero (js/hero-panorama.js):
 * `target` читается из getBoundingClientRect секции в scroll (passive),
 * `p` детерминированно едет к target каждый кадр (без событийных
 * переключений — иначе сцена не отматывается назад при скролле вверх).
 * Не зависит от GSAP — свой scroll+rAF цикл, полностью в своей области
 * видимости (CLAUDE.md, п.4 правил переноса).
 *
 * При prefers-reduced-motion или ширине меньше 900px — статичная раскладка
 * (класс .is-static): sticky отключается, документы идут потоком, фото
 * над данными, рельс залит полностью, папка скрыта (см. CSS, тот же блок).
 */
(function () {
  'use strict';

  var CASES = [
    {
      title: 'Алмазная пила по бетону',
      meta: 'Строительство · Москва · 2025',
      stamp: 'КЕЙС 01',
      img: '',
      fields: [
        ['Задача', 'Покупали у российского дилера по 480 000 ₽ за машину. Нужно было пять штук и годовой запас дисков.'],
        ['Что сделали', 'Вышли на завод-производитель в Гуандуне, согласовали комплектацию под сеть 380 В, оформили декларацию соответствия.'],
        ['Сложность', 'Фабрика не хотела менять штатный двигатель ради партии из пяти штук. Договорились, добавив в заказ расходники на год.']
      ],
      spec: [['Партия', '5 шт'], ['Доставка', 'Авто'], ['Документы', 'Декларация ТР ТС'], ['Заявка → склад', '34 дня']],
      basis: 'Против цены дилера в России',
      value: 412000,
      pct: 31
    },
    {
      title: 'Гидравлический пресс 100 тс',
      meta: 'Метизное производство · Екатеринбург · 2025',
      stamp: 'КЕЙС 02',
      img: '',
      fields: [
        ['Задача', 'Фабрику клиент нашёл сам, но три месяца не мог понять, как ввезти пресс официально и во сколько это встанет.'],
        ['Что сделали', 'Забрали всё, что начинается после фабрики: расчёт, сертификация, контракт, таможня, доставка до цеха.'],
        ['Сложность', 'Код ТН ВЭД, подобранный клиентом, давал пошлину вдвое выше. Пересобрали классификацию по фактическим характеристикам.']
      ],
      spec: [['Партия', '1 шт'], ['Доставка', 'Железная дорога'], ['Документы', 'Сертификат ТР ТС'], ['Заявка → склад', '41 день']],
      basis: 'Против собственного расчёта клиента',
      value: 1240000,
      pct: 27
    },
    {
      title: 'Роторный шлюзовой питатель',
      meta: 'Комбикормовый завод · Краснодар · 2025',
      stamp: 'КЕЙС 03',
      img: '',
      fields: [
        ['Задача', 'Питатель вышел из строя, линия встала. Поставка от европейского производителя занимала пять месяцев.'],
        ['Что сделали', 'Нашли фабрику под чертёж за три дня, согласовали образец, повезли авиа.'],
        ['Сложность', 'Фланцы должны были совпасть с существующей линией до миллиметра. Организовали замеры и утвердили чертёж до запуска производства.']
      ],
      spec: [['Партия', '2 шт'], ['Доставка', 'Авиа'], ['Документы', 'Отказное письмо'], ['Заявка → склад', '19 дней']],
      basis: 'Против европейского аналога',
      value: 358000,
      pct: 24
    },
    {
      title: 'Мотор-редукторы, 40 штук',
      meta: 'Сервисная компания · Новосибирск · 2026',
      stamp: 'КЕЙС 04',
      img: '',
      fields: [
        ['Задача', 'Закупали через посредника. Цена росла от партии к партии, состав затрат клиенту не раскрывали.'],
        ['Что сделали', 'Вышли на производителя напрямую, показали заводскую цену и разложили расчёт по строкам.'],
        ['Сложность', 'У посредника был эксклюзив на регион с этой фабрикой. Нашли второго производителя с той же спецификацией.']
      ],
      spec: [['Партия', '40 шт'], ['Доставка', 'Авто'], ['Документы', 'Не требуются'], ['Заявка → склад', '28 дней']],
      basis: 'Против закупки через посредника',
      value: 690000,
      pct: 29
    },
    {
      title: 'Упаковочная линия, б/у',
      meta: 'Пищевое производство · Казань · 2026',
      stamp: 'КЕЙС 05',
      img: '',
      fields: [
        ['Задача', 'Подходящая линия нашлась только бывшая в употреблении, а такое оборудование возить берутся немногие.'],
        ['Что сделали', 'Осмотрели линию на месте, зафиксировали состояние, оформили ввоз бывшего в употреблении оборудования.'],
        ['Сложность', 'Б/у технике нужно подтверждать состав и год выпуска. Документы собирали у прежнего владельца через нашего человека в Китае.']
      ],
      spec: [['Партия', '1 линия'], ['Доставка', 'Море'], ['Документы', 'Декларация ТР ТС'], ['Заявка → склад', '52 дня']],
      basis: 'Против новой линии в наличии в РФ',
      value: 1850000,
      pct: 38
    }
  ];

  var section = document.querySelector('.cs-cases');
  var track = section ? section.querySelector('.cs-track') : null;
  var stage = document.getElementById('csStage');
  var tabsEl = document.getElementById('csTabs');
  var curEl = document.getElementById('csCur');
  var restEl = document.getElementById('csRest');

  if (!section || !track || !stage || !tabsEl || !curEl || !restEl) {
    return;
  }

  var N = CASES.length;

  CASES.forEach(function (c, i) {
    var el = document.createElement('div');
    el.className = 'cs-doc';
    el.style.zIndex = String(20 - i);
    el.innerHTML =
      '<div class="cs-doc__inner">' +
        '<div class="cs-doc__body">' +
          '<div class="cs-doc__photo' + (c.img ? ' has-img' : '') + '">' +
            '<div class="cs-doc__stamp">' + c.stamp + '</div>' +
            '<div class="cs-doc__photo-img" data-slot="ФОТО ТОВАРА" style="' + (c.img ? '--img:url(\'' + c.img + '\')' : '') + '"></div>' +
          '</div>' +
          '<div class="cs-doc__data">' +
            '<div class="cs-doc__meta">' + c.meta + '</div>' +
            '<h3 class="cs-doc__title" data-line="0">' + c.title + '</h3>' +
            '<div class="cs-doc__fields">' +
              c.fields.map(function (f, j) {
                return '<div class="cs-field" data-line="' + (j + 1) + '">' +
                  '<div class="cs-field__l">' + f[0] + '</div>' +
                  '<div class="cs-field__t">' + f[1] + '</div>' +
                '</div>';
              }).join('') +
            '</div>' +
            '<div class="cs-spec" data-line="4">' +
              c.spec.map(function (s) {
                return '<div><span>' + s[0] + '</span><b>' + s[1] + '</b></div>';
              }).join('') +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="cs-perf"></div>' +
        '<div class="cs-rail">' +
          '<div class="cs-rail__bg"></div>' +
          '<div class="cs-rail__fill"></div>' +
          '<div class="cs-rail__basis">' + c.basis + '</div>' +
          '<div class="cs-rail__num">0 ₽</div>' +
          '<div class="cs-rail__pct">экономия <b>0 %</b></div>' +
        '</div>' +
      '</div>';
    stage.appendChild(el);

    var t = document.createElement('button');
    t.className = 'cs-tab';
    t.type = 'button';
    t.innerHTML = '0' + (i + 1) + '<span class="cs-tab__fill"></span>';
    t.addEventListener('click', function () {
      jumpTo(i);
    });
    tabsEl.appendChild(t);
  });

  var docs = [].slice.call(stage.querySelectorAll('.cs-doc')).map(function (root, i) {
    return {
      root: root,
      inner: root.querySelector('.cs-doc__inner'),
      photo: root.querySelector('.cs-doc__photo-img'),
      fill: root.querySelector('.cs-rail__fill'),
      num: root.querySelector('.cs-rail__num'),
      pct: root.querySelector('.cs-rail__pct b'),
      lines: [].slice.call(root.querySelectorAll('[data-line]')),
      data: CASES[i]
    };
  });
  var tabs = [].slice.call(tabsEl.querySelectorAll('.cs-tab'));

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var narrow = window.matchMedia('(max-width: 900px)').matches;

  if (reduced || narrow) {
    // Конечное состояние, а не отключение анимации (docs/motion-spec.md,
    // восемь запретов, п.8): рельс залит полностью через CSS, но счётчики
    // экономии — обычный текст, их нужно выставить в финальное значение
    // явно, иначе они молча остаются нулевыми навсегда.
    section.classList.add('is-static');
    docs.forEach(function (d) {
      d.num.textContent = fmt(d.data.value) + ' ₽';
      d.pct.textContent = d.data.pct + ' %';
    });
    return;
  }

  function clamp(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }

  function easeOutExpo(t) {
    return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  function fmt(n) {
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  var LEAD = 0.05;
  var target = 0;
  var p = 0;
  var lastIdx = -1;

  function measure() {
    var r = track.getBoundingClientRect();
    var total = track.offsetHeight - window.innerHeight;
    target = total > 0 ? clamp(-r.top / total) : 0;
  }

  function jumpTo(i) {
    var total = track.offsetHeight - window.innerHeight;
    var q = (i + 0.45) / N;
    var pp = LEAD + q * (1 - LEAD);
    window.scrollTo({ top: track.offsetTop + pp * total, behavior: 'smooth' });
  }

  function render() {
    var q = clamp((p - LEAD) / (1 - LEAD));
    var f = q * N;
    var idx = Math.min(N - 1, Math.floor(f));
    var local = Math.min(1, f - idx);
    var last = idx === N - 1;

    docs.forEach(function (d, i) {
      if (i < idx) {
        d.inner.style.opacity = 0;
        d.inner.style.transform = 'translate(-50%,-50%) translateY(-190px) scale(1.03)';
        d.inner.style.filter = 'blur(12px)';
        return;
      }
      if (i > idx) {
        var k = i - idx;
        d.inner.style.opacity = (0.34 * Math.pow(0.55, k - 1)).toFixed(3);
        d.inner.style.transform = 'translate(-50%,-50%) translateY(' + (38 + (k - 1) * 13) + 'px) scale(' + (0.965 - (k - 1) * 0.018).toFixed(3) + ')';
        d.inner.style.filter = 'blur(' + (1.5 + (k - 1)) + 'px)';
        d.photo.style.transform = 'scale(1.09)';
        return;
      }

      // активный документ
      var tin = easeOutExpo(clamp(local / 0.22));
      var tout = last ? 0 : easeOutExpo(clamp((local - 0.84) / 0.16));

      var ty = (38 * (1 - tin)) + (-190 * tout);
      var sc = (0.965 + 0.035 * tin) + (0.03 * tout);
      var op = (0.34 + 0.66 * tin) * (1 - tout);
      var bl = (1.5 * (1 - tin)) + (12 * tout);

      d.inner.style.opacity = op.toFixed(3);
      d.inner.style.transform = 'translate(-50%,-50%) translateY(' + ty.toFixed(1) + 'px) scale(' + sc.toFixed(4) + ')';
      d.inner.style.filter = bl > 0.05 ? 'blur(' + bl.toFixed(2) + 'px)' : 'none';
      d.photo.style.transform = 'scale(' + (1.09 - 0.09 * local).toFixed(4) + ')';

      var tr = easeOutExpo(clamp((local - 0.12) / 0.3));
      d.fill.style.transform = 'scaleX(' + tr.toFixed(4) + ')';

      var tn = easeOutExpo(clamp((local - 0.14) / 0.32));
      d.num.textContent = fmt(d.data.value * tn) + ' ₽';
      d.pct.textContent = Math.round(d.data.pct * tn) + ' %';

      d.lines.forEach(function (ln, j) {
        var tl = easeOutExpo(clamp((local - 0.1 - j * 0.045) / 0.28));
        ln.style.opacity = tl.toFixed(3);
        ln.style.transform = 'translateY(' + ((1 - tl) * 16).toFixed(1) + 'px)';
      });
    });

    tabs.forEach(function (t, i) {
      t.classList.toggle('is-active', i === idx);
      t.querySelector('.cs-tab__fill').style.width = i === idx ? (local * 100).toFixed(1) + '%' : (i < idx ? '100%' : '0%');
    });

    if (idx !== lastIdx) {
      lastIdx = idx;
      curEl.textContent = '0' + (idx + 1);
      restEl.textContent = '0' + (N - idx - 1);
    }
  }

  function frame() {
    p += (target - p) * 0.09;
    render();
    requestAnimationFrame(frame);
  }

  window.addEventListener('scroll', measure, { passive: true });
  window.addEventListener('resize', measure);
  measure();
  p = target;
  render();
  requestAnimationFrame(frame);
})();
