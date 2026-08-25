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

  Прогрессивное улучшение: единственный элемент, скрытый чистым CSS до
  инициализации анимаций, — `.hero__stage-label` (правило `.js .hero__stage-label`
  в css/styles.css). Если GSAP/ScrollTrigger не загрузились с CDN, этот файл
  принудительно возвращает эти подписи в видимое состояние ниже. Все остальные
  анимируемые элементы и так видимы по умолчанию в CSS — GSAP лишь анимирует
  переход из «видимого» состояния, которое сам же и выставляет через
  gsap.set/gsap.from непосредственно перед созданием анимации.
*/

(function () {
  'use strict';

  var HERO_STAGE_SELECTOR = '.hero__stage-label';

  function revealHeroStagesStatically() {
    var stages = document.querySelectorAll(HERO_STAGE_SELECTOR);
    for (var i = 0; i < stages.length; i += 1) {
      stages[i].style.opacity = '1';
      stages[i].style.transform = 'none';
    }
  }

  // Нет GSAP/ScrollTrigger (CDN недоступен, скрипт заблокирован и т.п.) —
  // контент не должен зависеть от анимации: снимаем единственное состояние,
  // спрятанное чистым CSS, и на этом останавливаемся.
  if (typeof window.gsap === 'undefined' || typeof window.ScrollTrigger === 'undefined') {
    revealHeroStagesStatically();
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
     HERO — пин + scrub-сцена, самая насыщенная анимация страницы.
     ========================================================== */
  function initHero(isMobile) {
    var hero = document.querySelector('.hero');
    var stageWrap = document.querySelector('.hero__stage');
    var scene = document.querySelector('[data-animate="hero-scrub-scene"]');
    var video = document.querySelector('[data-animate="hero-scrub-video"]');
    var routeLine = document.querySelector('[data-animate="hero-route-line"]');
    var transport = document.querySelector('[data-animate="hero-transport"]');
    var veil = document.querySelector('[data-animate="hero-veil"]');
    var badges = gsap.utils.toArray('[data-animate="hero-badge"]');
    var intro = document.querySelector('[data-animate="hero-intro"]');
    var seam = document.querySelector('[data-animate="transition-hero-out"]');
    var stageEls = [
      document.querySelector('[data-animate="hero-stage-factory"]'),
      document.querySelector('[data-animate="hero-stage-production"]'),
      document.querySelector('[data-animate="hero-stage-documents"]'),
      document.querySelector('[data-animate="hero-stage-certification"]'),
      document.querySelector('[data-animate="hero-stage-logistics"]'),
      document.querySelector('[data-animate="hero-stage-russia"]')
    ].filter(Boolean);

    if (!hero || !scene) {
      return;
    }

    // Если видео не смогло загрузиться (сеть/формат/битый файл) — прячем
    // элемент целиком: под ним остаётся собственный тёмный фон
    // `.hero__stage-media` (тот же градиент, что и до добавления видео),
    // сцена не ломается и не показывает «битую» иконку плеера.
    if (video) {
      video.addEventListener('error', function () {
        video.style.display = 'none';
      });
    }

    // Вводный блок — появляется независимо от pin-сцены, сразу при загрузке.
    if (intro) {
      gsap.from(intro, { opacity: 0, y: 24, duration: 0.9, ease: 'power2.out' });
    }

    // Glass-бейджи — появление + лёгкий бесконечный дрейф (декоративный слой).
    if (badges.length) {
      gsap.from(badges, {
        opacity: 0,
        y: 14,
        duration: 0.8,
        ease: 'power2.out',
        stagger: 0.15,
        delay: 0.35
      });
      badges.forEach(function (badge, i) {
        gsap.to(badge, {
          y: '+=8',
          duration: 2.6 + i * 0.4,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
          delay: 1.2 + i * 0.3
        });
      });
    }

    if (isMobile) {
      // Мобильная ветка: без pin, короткий обычный reveal вместо scrub-сцены —
      // длинная запиненная дистанция на узком экране ломает восприятие скролла.
      // Видео туда же не скраббится (per-frame currentTime на слабом мобильном
      // GPU/CPU даёт рывки) — вместо этого играет как обычный автоплей-луп,
      // независимо от прогресса скролла.
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
      if (stageEls.length) {
        gsap.set(stageEls, { opacity: 0, y: 10 });
        gsap.to(stageEls, {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: 'power2.out',
          stagger: 0.12,
          scrollTrigger: { trigger: stageWrap || scene, start: 'top 78%' }
        });
      }
      if (routeLine) {
        var mobileLen = routeLine.getTotalLength();
        gsap.set(routeLine, { strokeDasharray: mobileLen, strokeDashoffset: mobileLen });
        gsap.to(routeLine, {
          strokeDashoffset: 0,
          duration: 1.1,
          ease: 'power2.out',
          scrollTrigger: { trigger: stageWrap || scene, start: 'top 78%' }
        });
      }
      gsap.from(scene, {
        opacity: 0,
        y: 24,
        duration: 0.8,
        ease: 'power2.out',
        scrollTrigger: { trigger: stageWrap || scene, start: 'top 82%' }
      });
      return;
    }

    // Десктоп/планшет: полноценная запиненная scrub-сцена.
    var stagesTotal = stageEls.length || 6;
    var routeLen = routeLine ? routeLine.getTotalLength() : 0;

    if (routeLine) {
      gsap.set(routeLine, { strokeDasharray: routeLen, strokeDashoffset: routeLen });
    }
    if (stageEls.length) {
      gsap.set(stageEls, { opacity: 0, y: 14 });
    }
    if (seam) {
      gsap.set(seam, { opacity: 0 });
    }

    var pathProgress = { t: 0 };

    var tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: function () {
          return '+=' + Math.round(window.innerHeight * 3);
        },
        pin: true,
        scrub: 1,
        anticipatePin: 1
      }
    });

    // Видео сцены — не проигрывается "в реальном времени": currentTime жёстко
    // привязан к прогрессу scrub-таймлайна (та же логика, что у дорисовки
    // маршрута/движения транспорта выше, только источником служит video.duration
    // вместо длины SVG-пути). video.duration доступен только после
    // loadedmetadata — если к моменту создания ScrollTrigger метаданные ещё
    // не подгрузились, синхронизация подключается отложенно, а до этого сцена
    // просто показывает poster/первый кадр видео.
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
        // HAVE_METADATA уже есть (например, видео из кэша) — подключаем сразу.
        tl.eventCallback('onUpdate', syncVideoToTimeline);
      } else {
        video.addEventListener('loadedmetadata', function onHeroVideoMeta() {
          video.removeEventListener('loadedmetadata', onHeroVideoMeta);
          tl.eventCallback('onUpdate', syncVideoToTimeline);
          syncVideoToTimeline(); // сразу подхватить уже накопленный прогресс скролла
        });
      }
    }

    // Лёгкий "наезд" камеры на сцену — ощущение глубины на протяжении всего pin.
    tl.to(scene, { scale: 1.045, duration: stagesTotal }, 0);

    // Параллакс-вуаль — декоративный слой, двигается медленнее переднего плана.
    if (veil) {
      tl.fromTo(veil, { yPercent: 0, xPercent: 0 }, { yPercent: -6, xPercent: 3, duration: stagesTotal }, 0);
    }

    // Маршрут "дорисовывается" синхронно со scrub.
    if (routeLine) {
      tl.to(routeLine, { strokeDashoffset: 0, duration: stagesTotal }, 0);
    }

    // Транспорт двигается вдоль маршрута (motion along path), жёстко по прогрессу.
    if (transport && routeLine && routeLen) {
      tl.to(
        pathProgress,
        {
          t: 1,
          duration: stagesTotal,
          onUpdate: function () {
            var dist = pathProgress.t * routeLen;
            var point = routeLine.getPointAtLength(dist);
            var aheadDist = Math.min(dist + 1, routeLen);
            var ahead = routeLine.getPointAtLength(aheadDist);
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

    // Ровно 6 подписей этапов — последовательно, каждая в своём отрезке
    // прогресса: появляется, держится, уходит (кроме последней — она остаётся
    // видимой до конца, после неё pin отпускает секцию).
    stageEls.forEach(function (el, i) {
      var segStart = i;
      tl.fromTo(el, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.3 }, segStart);
      if (i < stageEls.length - 1) {
        tl.to(el, { opacity: 0, y: -14, duration: 0.3 }, segStart + 0.7);
      }
    });

    // Переход тёмного фона Hero в светлый фон следующей секции — плавно,
    // синхронно с финалом сцены, а не резким обрезом при отпускании pin.
    if (seam) {
      tl.to(seam, { opacity: 1, duration: 1 }, Math.max(stagesTotal - 1, 0));
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
     контент виден в конечном состоянии сразу. Функциональный порядок
     (6 этапов Hero, порядок пунктов в "что мы берём на себя" и т.д.)
     уже задан порядком в DOM/CSS — здесь только снимается единственное
     JS-скрытое состояние (подписи этапов Hero).
     ========================================================== */
  function applyReducedMotionState() {
    gsap.set(HERO_STAGE_SELECTOR, { opacity: 1, y: 0, clearProps: 'transform' });
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
