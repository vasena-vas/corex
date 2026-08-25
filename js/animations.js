/*
  Corex-Trade — слой анимации (GSAP 3 + ScrollTrigger).
  Владеет: всеми таймлайнами, ScrollTrigger-инстансами, scrub- и pin-логикой.
  Выставляет: инициализацию, читающую разметку через атрибуты `data-animate`
  (расставлены тикетом 02, см. interfaces.md → «Что построено» → «Тикет 02»).
  Прячет: сами таймлайны/scrub-логику/пины — наружу ничего не отдаёт.

  Ничего не импортирует и не знает про js/calculator.js и js/contact-form.js.
  Единственная точка соприкосновения с калькулятором — MutationObserver на
  DOM-узле #calculator-result (наблюдение за изменением содержимого, а не
  обращение к формуле/состоянию калькулятора).

  Прогрессивное улучшение: единственное место, где CSS прячет контент до
  инициализации анимаций, — кинематографическая раскладка Hero (блок
  «5.1 HERO» в css/styles.css: `.hero__act-inner` и `.hero__glyph` там стоят
  в `opacity: 0`). Весь этот блок включён условием
  `.js:not(.no-anim)` + `(min-width: 768px)` + `(prefers-reduced-motion: no-preference)`,
  то есть ровно там, где отработает scrub-таймлайн ниже. Если GSAP/ScrollTrigger
  не загрузились с CDN, этот файл вешает на <html> класс `no-anim` — блок 5.1
  выключается, и Hero падает обратно в обычную потоковую раскладку, где все
  6 этапов видны списком. Все остальные анимируемые элементы страницы и так
  видимы по умолчанию в CSS.
*/

(function () {
  'use strict';

  // Нет GSAP/ScrollTrigger (CDN недоступен, скрипт заблокирован и т.п.) —
  // контент не должен зависеть от анимации: возвращаем Hero в потоковую
  // раскладку и на этом останавливаемся.
  if (typeof window.gsap === 'undefined' || typeof window.ScrollTrigger === 'undefined') {
    document.documentElement.classList.add('no-anim');
    return;
  }

  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);

  /* ==========================================================
     Калькулятор — результат анимируется по факту изменения DOM,
     не привязан к скроллу и не зависит от брейкпоинта/reduced-motion
     веток ниже (сам факт появления результата всегда мгновенно виден,
     анимация — только косметика поверх уже видимого содержимого).
     ========================================================== */
  function initCalculatorResultObserver() {
    var resultBox = document.getElementById('calculator-result');
    if (!resultBox || typeof window.MutationObserver === 'undefined') {
      return;
    }

    var observer = new MutationObserver(function () {
      var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce) {
        return; // содержимое уже видимо — innerHTML заменён синхронно в calculator.js
      }
      gsap.fromTo(
        resultBox,
        { opacity: 0, scale: 0.94, y: 10 },
        { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: 'back.out(1.7)' }
      );
    });

    observer.observe(resultBox, { childList: true });
  }

  /* ==========================================================
     HERO — полноэкранная scroll-driven сцена.

     Один непрерывный scrub-таймлайн на весь пин. Условная единица
     таймлайна = один этап; всего 6.6 единиц (0.6 — уход титульной
     карточки, дальше 6 этапов по единице), и они растянуты на 6 высот
     вьюпорта пина. Ощущение «одной живой сцены» держат три вещи:

     1. Сквозные слои, которые идут через ВЕСЬ прогресс без перезапуска:
        currentTime видео, наезд камеры (scale видео), панорама слоя сцены
        (`hero-field`), параллакс вуали, дорисовка маршрута и движение
        транспорта по нему. Они не знают про границы этапов — именно они
        превращают шесть сегментов в одно движение.
     2. Этапы не гаснут «на месте»: текст и глифы въезжают в кадр с одной
        стороны (`data-from`) и уезжают за противоположный край
        (`data-to`) — камера будто проезжает мимо объекта, а не
        перелистывает слайд.
     3. Глубина: `data-depth` умножает и дистанцию входа/выхода, и
        стартовый масштаб, и яркость глифа — дальние объекты движутся
        меньше и тусклее ближних (параллакс внутри одного этапа).
     ========================================================== */

  var HERO_ACT_COUNT = 6;
  var HERO_OVERTURE_SPAN = 0.6; // единиц таймлайна на уход титульной карточки
  var HERO_ACT_SPAN = 1;        // единиц таймлайна на один этап
  var HERO_TOTAL = HERO_OVERTURE_SPAN + HERO_ACT_COUNT * HERO_ACT_SPAN;
  var HERO_PIN_SCREENS = 6;     // высот вьюпорта на весь пин

  // Пара "x,y" из data-атрибута разметки — смещения задаются в разметке,
  // потому что они часть композиции конкретного этапа, а не логики движка.
  function heroPair(el, attr) {
    var raw = el.getAttribute(attr);
    if (!raw) {
      return null;
    }
    var parts = raw.split(',');
    return {
      x: parseFloat(parts[0]) || 0,
      y: parseFloat(parts[1]) || 0
    };
  }

  function initHero(isMobile) {
    var hero = document.querySelector('.hero');
    var video = document.querySelector('[data-animate="hero-scrub-video"]');
    var veil = document.querySelector('[data-animate="hero-veil"]');
    var field = document.querySelector('[data-animate="hero-field"]');
    var routeLine = document.querySelector('[data-animate="hero-route-line"]');
    var transport = document.querySelector('[data-animate="hero-transport"]');
    var overture = document.querySelector('[data-animate="hero-overture"]');
    var actions = document.querySelector('[data-animate="hero-actions"]');
    var hint = document.querySelector('[data-animate="hero-hint"]');
    var seam = document.querySelector('[data-animate="transition-hero-out"]');
    var acts = gsap.utils.toArray('[data-animate="hero-act-inner"]');
    var glyphs = gsap.utils.toArray('[data-animate="hero-glyph"]');
    var railFills = gsap.utils.toArray('[data-animate="hero-rail-fill"]');

    if (!hero) {
      return;
    }

    // Если видео не смогло загрузиться (сеть/формат/битый файл) — прячем
    // элемент целиком: под ним остаётся собственный градиент `.hero`
    // (`--gradient-hero`) плюс scrim, сцена не ломается и не показывает
    // «битую» иконку плеера.
    if (video) {
      video.addEventListener('error', function () {
        video.style.display = 'none';
      });
    }

    if (isMobile) {
      // Мобильная ветка: pin'а нет вообще — CSS держит Hero в потоковой
      // раскладке (блок 5.1 не применяется ниже 768px), поэтому здесь
      // только обычный reveal шести этапов по мере их входа во вьюпорт.
      // Видео не скраббится (per-frame currentTime на слабом мобильном
      // GPU/CPU даёт рывки) — играет как обычный автоплей-луп.
      if (video) {
        video.loop = true;
        var mobilePlay = video.play();
        if (mobilePlay && typeof mobilePlay.catch === 'function') {
          mobilePlay.catch(function () {
            // Автоплей заблокирован браузером — не критично, сцена просто
            // остаётся на poster-кадре, вёрстка не страдает.
          });
        }
      }

      if (overture) {
        gsap.from(overture, { opacity: 0, y: 24, duration: 0.9, ease: 'power2.out' });
      }
      if (actions) {
        gsap.from(actions, { opacity: 0, y: 16, duration: 0.7, ease: 'power2.out', delay: 0.2 });
      }

      acts.forEach(function (inner) {
        gsap.from(inner, {
          opacity: 0,
          y: 18,
          duration: 0.55,
          ease: 'power2.out',
          scrollTrigger: { trigger: inner.parentNode || inner, start: 'top 88%' }
        });
      });
      return;
    }

    /* -- Десктоп/планшет: полноэкранная запиненная сцена ------------------ */

    var routeLen = routeLine ? routeLine.getTotalLength() : 0;
    var pathProgress = { t: 0 };

    if (routeLine) {
      gsap.set(routeLine, { strokeDasharray: routeLen, strokeDashoffset: routeLen });
    }
    if (acts.length) {
      gsap.set(acts, { opacity: 0 });
    }
    if (glyphs.length) {
      gsap.set(glyphs, { opacity: 0 });
    }
    if (railFills.length) {
      gsap.set(railFills, { scaleX: 0, transformOrigin: 'left center' });
    }
    if (actions) {
      gsap.set(actions, { transformOrigin: 'left bottom' });
    }
    if (seam) {
      gsap.set(seam, { opacity: 0 });
    }

    var tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: function () {
          return '+=' + Math.round(window.innerHeight * HERO_PIN_SCREENS);
        },
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true
      }
    });

    // Видео — не проигрывается «в реальном времени»: currentTime жёстко
    // привязан к прогрессу всего scrub-таймлайна, то есть ролик растянут
    // ровно на все шесть этапов. video.duration доступен только после
    // loadedmetadata — если к моменту создания ScrollTrigger метаданные ещё
    // не подгрузились, синхронизация подключается отложенно, а до этого
    // сцена показывает poster/первый кадр.
    if (video) {
      var syncVideoToTimeline = function () {
        var duration = video.duration;
        if (!isFinite(duration) || duration <= 0) {
          return;
        }
        var target = tl.progress() * duration;
        try {
          video.currentTime = Math.min(Math.max(target, 0), duration);
        } catch (e) {
          // Некоторые браузеры бросают исключение при seek на ещё не готовый
          // буфер — не критично, следующий кадр скролла попробует снова.
        }
      };

      if (video.readyState >= 1) {
        tl.eventCallback('onUpdate', syncVideoToTimeline);
      } else {
        video.addEventListener('loadedmetadata', function onHeroVideoMeta() {
          video.removeEventListener('loadedmetadata', onHeroVideoMeta);
          tl.eventCallback('onUpdate', syncVideoToTimeline);
          syncVideoToTimeline(); // подхватить уже накопленный прогресс скролла
        });
      }

      // Медленный наезд камеры на кадр — идёт через весь пин, ни разу не
      // сбрасываясь: это главный «непрерывный» слой сцены.
      tl.fromTo(video, { scale: 1.04 }, { scale: 1.18, duration: HERO_TOTAL }, 0);
    }

    // Панорама слоя сцены: глифы едут не только сами по себе, но и вместе
    // с «камерой» — отсюда ощущение, что кадр движется, а не объекты в нём.
    if (field) {
      tl.fromTo(
        field,
        { xPercent: 2.5, yPercent: 1.5, scale: 1.02 },
        { xPercent: -2.5, yPercent: -1.5, scale: 1.1, duration: HERO_TOTAL },
        0
      );
    }

    // Параллакс-вуаль — самый дальний слой, движется медленнее всех.
    if (veil) {
      tl.fromTo(veil, { xPercent: 0, yPercent: 0 }, { xPercent: 6, yPercent: -8, duration: HERO_TOTAL }, 0);
    }

    // Маршрут дорисовывается через всю сцену — визуальная «нить», которая
    // связывает шесть этапов в один путь груза.
    if (routeLine) {
      tl.to(routeLine, { strokeDashoffset: 0, duration: HERO_TOTAL }, 0);
    }

    // Транспорт идёт по этому маршруту (motion along path) от первого кадра
    // сцены до последнего.
    if (transport && routeLine && routeLen) {
      tl.to(
        pathProgress,
        {
          t: 1,
          duration: HERO_TOTAL,
          onUpdate: function () {
            var dist = pathProgress.t * routeLen;
            var point = routeLine.getPointAtLength(dist);
            var ahead = routeLine.getPointAtLength(Math.min(dist + 1, routeLen));
            var angle = Math.atan2(ahead.y - point.y, ahead.x - point.x) * (180 / Math.PI);
            transport.setAttribute(
              'transform',
              'translate(' + point.x.toFixed(2) + ',' + point.y.toFixed(2) + ') rotate(' + angle.toFixed(1) + ')'
            );
          }
        },
        0
      );
    }

    // Титульная карточка уходит «сквозь камеру» — увеличивается и растворяется,
    // как будто зритель проезжает её насквозь, а не как fade между слайдами.
    if (overture) {
      tl.to(
        overture,
        { yPercent: -30, scale: 1.22, opacity: 0, duration: HERO_OVERTURE_SPAN, ease: 'power2.in' },
        0
      );
    }
    if (hint) {
      tl.to(hint, { opacity: 0, duration: HERO_OVERTURE_SPAN * 0.6, ease: 'power1.in' }, 0);
    }

    // Шесть этапов: вход с одной стороны — выход за противоположный край.
    acts.forEach(function (inner, i) {
      var start = HERO_OVERTURE_SPAN + i * HERO_ACT_SPAN;
      var from = heroPair(inner, 'data-from') || { x: 0, y: 26 };
      var to = heroPair(inner, 'data-to');

      tl.fromTo(
        inner,
        { xPercent: from.x, yPercent: from.y, opacity: 0, scale: 0.9 },
        {
          xPercent: 0,
          yPercent: 0,
          opacity: 1,
          scale: 1,
          duration: HERO_ACT_SPAN * 0.34,
          ease: 'power2.out'
        },
        start
      );

      // У последнего этапа выхода нет (`data-to` в разметке не задан) — он
      // остаётся в кадре до конца пина, чтобы сцена закрывалась результатом,
      // а не пустым экраном.
      if (to) {
        tl.to(
          inner,
          {
            xPercent: to.x,
            yPercent: to.y,
            opacity: 0,
            scale: 1.12,
            duration: HERO_ACT_SPAN * 0.3,
            ease: 'power2.in'
          },
          start + HERO_ACT_SPAN * 0.7
        );
      }
    });

    // Глифы этапа приходят чуть раньше текста (объект въезжает в кадр —
    // потом появляется подпись) и уходят раньше него же.
    glyphs.forEach(function (el) {
      var act = parseInt(el.getAttribute('data-act'), 10) || 1;
      var depth = parseFloat(el.getAttribute('data-depth'));
      if (!isFinite(depth) || depth <= 0) {
        depth = 1;
      }
      var from = heroPair(el, 'data-from') || { x: 0, y: 0 };
      var to = heroPair(el, 'data-to');
      var start = HERO_OVERTURE_SPAN + (act - 1) * HERO_ACT_SPAN;
      var enterAt = Math.max(start - HERO_ACT_SPAN * 0.22, 0);
      var peakOpacity = 0.12 + depth * 0.1; // ближний план ярче дальнего

      tl.fromTo(
        el,
        {
          xPercent: from.x * depth,
          yPercent: from.y * depth,
          opacity: 0,
          scale: 0.72 + depth * 0.22
        },
        {
          xPercent: 0,
          yPercent: 0,
          opacity: peakOpacity,
          scale: 1,
          duration: HERO_ACT_SPAN * 0.5,
          ease: 'power1.out'
        },
        enterAt
      );

      if (to) {
        tl.to(
          el,
          {
            xPercent: to.x * depth,
            yPercent: to.y * depth,
            opacity: 0,
            scale: 1 + depth * 0.3,
            duration: HERO_ACT_SPAN * 0.46,
            ease: 'power1.in'
          },
          start + HERO_ACT_SPAN * 0.66
        );
      }

      // Шестерёнка второго этапа ещё и проворачивается, пока пересекает кадр.
      if (el.getAttribute('data-spin')) {
        tl.fromTo(el, { rotation: -26 }, { rotation: 58, duration: HERO_ACT_SPAN * 1.3 }, enterAt);
      }
    });

    // Полоса прогресса: шесть сегментов, каждый заполняется ровно за свой этап.
    railFills.forEach(function (fill, i) {
      tl.fromTo(
        fill,
        { scaleX: 0 },
        { scaleX: 1, duration: HERO_ACT_SPAN },
        HERO_OVERTURE_SPAN + i * HERO_ACT_SPAN
      );
    });

    // CTA видны весь пин; на финальном этапе получают лёгкий акцент.
    if (actions) {
      gsap.from(actions, { opacity: 0, y: 18, duration: 0.8, ease: 'power2.out', delay: 0.3 });
      tl.to(
        actions,
        { scale: 1.06, duration: HERO_ACT_SPAN * 0.4, ease: 'power2.out' },
        HERO_OVERTURE_SPAN + (HERO_ACT_COUNT - 1) * HERO_ACT_SPAN
      );
    }

    // Переход тёмной сцены в светлый фон следующей секции — плавно,
    // синхронно с финалом сцены, а не резким обрезом при отпускании pin.
    if (seam) {
      tl.to(
        seam,
        { opacity: 1, duration: HERO_ACT_SPAN * 0.8, ease: 'power1.in' },
        HERO_TOTAL - HERO_ACT_SPAN * 0.8
      );
    }
  }

  /* ==========================================================
     СЕКЦИЯ 2 — маршрут (7 узлов): stagger + дорисовка линии + motion along path.
     ========================================================== */
  function initRoute() {
    var path = document.querySelector('.route__path');
    var nodes = gsap.utils.toArray('[data-animate="route-node"]');
    var line = document.querySelector('[data-animate="route-line"]');
    var transport = document.querySelector('[data-animate="route-transport"]');

    if (nodes.length) {
      gsap.from(nodes, {
        opacity: 0,
        y: 24,
        duration: 0.6,
        ease: 'power2.out',
        stagger: 0.12,
        scrollTrigger: { trigger: path || '.route', start: 'top 75%' }
      });
    }

    if (line) {
      var len = line.getTotalLength();
      gsap.set(line, { strokeDasharray: len, strokeDashoffset: len });
      var proxy = { t: 0 };
      gsap.to(proxy, {
        t: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: path || '.route',
          start: 'top 70%',
          end: 'bottom 60%',
          scrub: 0.6
        },
        onUpdate: function () {
          line.style.strokeDashoffset = String(len * (1 - proxy.t));
          if (transport) {
            var pt = line.getPointAtLength(proxy.t * len);
            transport.setAttribute('transform', 'translate(' + pt.x.toFixed(2) + ',' + pt.y.toFixed(2) + ')');
          }
        }
      });
    }
  }

  /* ==========================================================
     СЕКЦИЯ 3 — что мы берём на себя: stagger "схлопывание" к цели.
     ========================================================== */
  function initHandoff() {
    var items = gsap.utils.toArray('[data-animate="handoff-item"]');
    var target = document.querySelector('[data-animate="handoff-target"]');
    var scheme = document.querySelector('.handoff__scheme');

    if (!items.length) {
      return;
    }

    var tl = gsap.timeline({
      scrollTrigger: { trigger: scheme || '.handoff', start: 'top 72%' }
    });

    tl.from(items, {
      opacity: 0,
      y: 26,
      scale: 0.86,
      duration: 0.5,
      ease: 'power2.out',
      stagger: 0.08
    });

    if (target) {
      tl.from(target, { opacity: 0, scale: 0.6, duration: 0.45, ease: 'back.out(1.8)' }, '-=0.35').to(
        target,
        { scale: 1.08, duration: 0.16, ease: 'power1.out', yoyo: true, repeat: 1 },
        '-=0.05'
      );
    }
  }

  /* ==========================================================
     СЕКЦИЯ 4 — калькулятор: reveal панели (результат — отдельный observer).
     ========================================================== */
  function initCalculatorPanel() {
    var panel = document.querySelector('[data-animate="calculator-panel"]');
    if (!panel) {
      return;
    }
    gsap.from(panel, {
      opacity: 0,
      y: 30,
      scale: 0.97,
      duration: 0.7,
      ease: 'power2.out',
      scrollTrigger: { trigger: panel, start: 'top 78%' }
    });
  }

  /* ==========================================================
     СЕКЦИЯ 5 — кейсы: "раскрытие карточек" (reveal + scale).
     ========================================================== */
  function initCases() {
    var cards = gsap.utils.toArray('[data-animate="case-card"]');
    if (!cards.length) {
      return;
    }
    gsap.from(cards, {
      opacity: 0,
      y: 36,
      scale: 0.94,
      duration: 0.7,
      ease: 'power2.out',
      stagger: 0.12,
      scrollTrigger: { trigger: '.cases__grid', start: 'top 80%' }
    });
  }

  /* ==========================================================
     СЕКЦИЯ 6 — категории: горизонтальное движение ленты + stagger карточек.
     ========================================================== */
  function initCategories() {
    var section = document.querySelector('.categories');
    var lane = document.querySelector('[data-animate="category-lane"]');
    var items = gsap.utils.toArray('[data-animate="category-item"]');

    if (!lane) {
      return;
    }

    if (items.length) {
      gsap.from(items, {
        opacity: 0,
        y: 20,
        duration: 0.5,
        ease: 'power2.out',
        stagger: 0.06,
        scrollTrigger: { trigger: lane, start: 'top 85%' }
      });
    }

    gsap.fromTo(
      lane,
      { xPercent: 5 },
      {
        xPercent: -5,
        ease: 'none',
        scrollTrigger: {
          trigger: section || lane,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.6
        }
      }
    );
  }

  /* ==========================================================
     СЕКЦИЯ 7 — почему с нами: самый лёгкий reveal страницы.
     ========================================================== */
  function initReasons() {
    var items = gsap.utils.toArray('[data-animate="reason-item"]');
    if (!items.length) {
      return;
    }
    gsap.from(items, {
      opacity: 0,
      y: 18,
      duration: 0.5,
      ease: 'power2.out',
      stagger: 0.1,
      scrollTrigger: { trigger: '.reasons__list', start: 'top 84%' }
    });
  }

  /* ==========================================================
     СЕКЦИЯ 8 — финальный CTA: параллакс вуали, переход, reveal формы/контактов.
     ========================================================== */
  function initFinalCta() {
    var section = document.querySelector('.final-cta');
    var veil = document.querySelector('[data-animate="final-veil"]');
    var seam = document.querySelector('[data-animate="transition-final-in"]');
    var panel = document.querySelector('[data-animate="final-panel"]');
    var contacts = document.querySelector('[data-animate="final-contacts"]');
    var contactRows = contacts ? gsap.utils.toArray('.final-cta__contact', contacts) : [];

    if (veil) {
      gsap.fromTo(
        veil,
        { yPercent: -6 },
        {
          yPercent: 6,
          ease: 'none',
          scrollTrigger: { trigger: section || veil, start: 'top bottom', end: 'bottom top', scrub: 0.8 }
        }
      );
    }

    if (seam) {
      gsap.set(seam, { opacity: 0 });
      gsap.to(seam, {
        opacity: 1,
        ease: 'none',
        scrollTrigger: { trigger: section || seam, start: 'top bottom', end: 'top 45%', scrub: 0.6 }
      });
    }

    if (panel) {
      gsap.from(panel, {
        opacity: 0,
        y: 36,
        scale: 0.97,
        duration: 0.7,
        ease: 'power2.out',
        scrollTrigger: { trigger: panel, start: 'top 82%' }
      });
    }

    if (contactRows.length) {
      gsap.from(contactRows, {
        opacity: 0,
        x: -16,
        duration: 0.5,
        ease: 'power2.out',
        stagger: 0.1,
        scrollTrigger: { trigger: contacts, start: 'top 85%' }
      });
    } else if (contacts) {
      gsap.from(contacts, {
        opacity: 0,
        y: 20,
        duration: 0.6,
        ease: 'power2.out',
        scrollTrigger: { trigger: contacts, start: 'top 85%' }
      });
    }
  }

  /* ==========================================================
     Reduced motion — весь scrub/pin и декоративное движение отключены,
     контент виден в конечном состоянии сразу. Кинематографическая
     раскладка Hero выключается самим CSS (блок 5.1 стоит под
     `@media (prefers-reduced-motion: no-preference)`), поэтому все 6
     этапов уже лежат обычным списком и видны без скролла. Здесь только
     снимаются инлайновые стили, которые мог оставить предыдущий контекст
     gsap.matchMedia при переключении режима на лету (devtools, системная
     настройка) — сам GSAP ревертит только то, что создал в этом контексте.
     ========================================================== */
  var HERO_ANIMATED_SELECTOR = [
    '[data-animate="hero-act-inner"]',
    '[data-animate="hero-glyph"]',
    '[data-animate="hero-overture"]',
    '[data-animate="hero-actions"]',
    '[data-animate="hero-field"]',
    '[data-animate="hero-veil"]',
    '[data-animate="hero-scrub-video"]'
  ].join(', ');

  function applyReducedMotionState() {
    gsap.set(HERO_ANIMATED_SELECTOR, { clearProps: 'all' });
  }

  function init() {
    initCalculatorResultObserver();

    var mm = gsap.matchMedia();

    mm.add(
      {
        // Ключ "all" — служебный для gsap.matchMedia: без него колбэк не
        // срабатывает при первой загрузке, если ни `reduceMotion`, ни
        // `isMobile` не совпадают (обычный десктоп без reduced-motion) —
        // matchMedia считает "нечего совпало" и не вызывает функцию вообще.
        all: '',
        reduceMotion: '(prefers-reduced-motion: reduce)',
        isMobile: '(max-width: 767px)'
      },
      function (context) {
        var conditions = context.conditions || {};

        if (conditions.reduceMotion) {
          applyReducedMotionState();
          return;
        }

        initHero(Boolean(conditions.isMobile));
        initRoute();
        initHandoff();
        initCalculatorPanel();
        initCases();
        initCategories();
        initReasons();
        initFinalCta();
      }
    );

    window.addEventListener('load', function () {
      ScrollTrigger.refresh();
    });
  }

  init();
})();
