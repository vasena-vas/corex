# Интерфейсы

## Проектные правила

- **Стек:** чистые HTML/CSS/JS, без сборки, без npm-зависимостей, без фреймворка. Единственная внешняя зависимость — GSAP 3 + ScrollTrigger плагин, подключаются через `<script>` с CDN (jsdelivr/cdnjs).
- **Запуск / проверка:** сайт статический — открыть `index.html` в браузере (или `python3 -m http.server` из корня и открыть `http://localhost:PORT/`). Автотестов нет; проверка — ручной прогон в браузере по критериям приёмки тикета (десктоп-ширина + мобильная ширина через devtools, `prefers-reduced-motion` включить/выключить).
- **Язык:** весь контент и разметка — на русском (кроме служебных атрибутов/классов).
- **Не трогать:** `PRODUCT.md`, `PROMPT.md`, `.autopilot/` (кроме собственных файлов тикета внутри своей папки), `references/*.jpg` (только читать как референс, не изменять).
- **Отсутствующая зависимость** (например, CDN недоступен в среде исполнителя) — тикет возвращается `BLOCKED` с объяснением, не имитируется заглушкой втихую.
- **Реальные данные, которых нет** (цены, контакты, кейсы, статистика) — никогда не выдумывать правдоподобные числа/факты. Только явно помеченные заглушки (см. таблицу «Открытые места» в `spec.md`).

## Границы, решённые в спецификации

| Модуль | Владеет | Выставляет | Прячет |
|---|---|---|---|
| `css/tokens.css` | палитра, типографическая шкала, отступы, радиусы, тени, тайминги | CSS custom properties (`--color-*`, `--space-*`, `--radius-*`, `--shadow-*`, `--ease-*`, `--font-*`) | конкретные значения (hex, px, cubic-bezier) — остальные файлы их не хардкодят |
| `css/styles.css` | вёрстка, компоненты, раскладка секций | классы разметки (`.hero`, `.route`, `.card--case`, …), читает только токены | внутреннюю сетку/брейкпоинты каждой секции |
| `js/animations.js` | весь ScrollTrigger/GSAP-слой | инициализацию по `data-animate="…"` атрибутам в разметке | таймлайны, scrub-логику, пины |
| `js/calculator.js` | состояние и формулу-плейсхолдер калькулятора | обработчик формы `#calculator-form`, пишет результат в `#calculator-result` | формулу расчёта |
| `js/contact-form.js` | валидацию и псевдо-отправку финальной формы | обработчик `#contact-form` | состояние отправки |

Шов для проверки — один: разметка через `data-*` атрибуты и `id` форм, объявленные выше. `animations.js`, `calculator.js`, `contact-form.js` не импортируют друг друга.

### Контракт `data-animate` (уточняется тикетом 02, реализуется тикетом 03)

Тикет 02 расставляет в разметке `data-animate="<имя-сцены>"` на секциях/элементах, которые должны анимироваться, по списку из `spec.md` (истории 4–4.2, 5, 6, 9, 14, 15). Тикет 03 не переименовывает и не удаляет эти атрибуты — только читает.

## Что построено (заполняется по мере сдачи тикетов)

### Тикет 01 — дизайн-система

`css/tokens.css` и `DESIGN_SYSTEM.md` — см. сами файлы, таблица токенов не дублируется здесь.

### Тикет 02 — структура, контент, калькулятор, форма

Собраны `index.html` (8 секций + `site-header`), `css/styles.css` (вёрстка и компоненты, читает только `css/tokens.css`), `js/calculator.js`, `js/contact-form.js`. Иконки — единый инлайн-SVG-спрайт (`<symbol>`) в начале `index.html`, не отдельные файлы в `assets/` (это дало анимационному слою прямой доступ к DOM-узлам иконок без кросс-документных ограничений `<use href="файл.svg#...">`).

**Важный технический крючок для тикета 03**: `<html>` по умолчанию без класса; инлайн-скрипт в `<head>` синхронно добавляет класс `js` до отрисовки. Только под `.js` подписи этапов Hero скрыты (`opacity:0`) — без JS (или если скрипт анимаций не выполнился) они остаются видимыми статично. Тикет 03 ничего менять в этом механизме не должен, только анимировать переход `opacity:0 → 1` (и `transform`) для этих же элементов при инициализации ScrollTrigger.

**Список `data-animate` и что каждый помечает:**

| `data-animate` | Где в разметке | Сколько элементов | Что имелось в виду |
|---|---|---|---|
| `hero-intro` | `.hero__intro` (заголовок, лид, CTA) | 1 | Вводный блок Hero, появляется до/независимо от pin-сцены |
| `hero-scrub-scene` | `.hero__stage-media` (обёртка видео + SVG-сцены) | 1 | Корневой узел, чей внутренний таймлайн привязывается к scrub; содержит фоновое видео (`hero-scrub-video`) и поверх него SVG-маршрут |
| `hero-scrub-video` | `<video class="hero__stage-video">` внутри `.hero__stage-media`, до SVG | 1 | Фоновое видео сцены (`assets/video/hero-scene.mp4`) — на десктопе `currentTime` жёстко привязан к прогрессу scrub-таймлайна Hero (не проигрывается в реальном времени), на мобильном — обычный autoplay-луп без привязки к скроллу; в `prefers-reduced-motion` и при недоступном GSAP остаётся статичным на poster-кадре |
| `hero-route-line` | `<path class="hero__route-line">` внутри SVG сцены | 1 | Линия маршрута сцены — кандидат на приём «дорисовки» (`stroke-dashoffset`) синхронно со scrub |
| `hero-transport` | `<g class="hero__transport">` (иконка грузовика) внутри SVG сцены | 1 | Транспорт, который должен двигаться вдоль `hero-route-line` (motion along path) по прогрессу scrub |
| `hero-veil` | `.hero__veil` (радиальная вуаль поверх `--gradient-hero`) | 1 | Параллакс-слой Hero — смещается медленнее переднего плана |
| `hero-badge` | `.hero__badge--a`, `.hero__badge--b` (плавающие glass-бейджи над сценой) | 2 (общее имя, группа) | Появление/лёгкий дрейф декоративных инфо-бейджей поверх сцены |
| `hero-stage-factory` | `.hero__stage-label` (1-я подпись в `.hero__stages`) | 1 | Этап 1/6 «фабрика» — скрыт по умолчанию под `.js`, показывается по прогрессу scrub |
| `hero-stage-production` | `.hero__stage-label` (2-я подпись) | 1 | Этап 2/6 «производство» |
| `hero-stage-documents` | `.hero__stage-label` (3-я подпись) | 1 | Этап 3/6 «документы» |
| `hero-stage-certification` | `.hero__stage-label` (4-я подпись) | 1 | Этап 4/6 «сертификация» |
| `hero-stage-logistics` | `.hero__stage-label` (5-я подпись) | 1 | Этап 5/6 «логистика» |
| `hero-stage-russia` | `.hero__stage-label` (6-я подпись) | 1 | Этап 6/6 «Россия» — последний, за ним pin отпускает секцию |
| `transition-hero-out` | `.section-seam--hero-out` (низ `.hero`) | 1 | Переход тёмного фона Hero в светлый фон секции 2 — кандидат на анимацию непрозрачности/масштаба при выходе из pin |
| `route-line` | `<path class="route__connector-line">` (только ≥1024px, `.route__connector` скрыт ниже) | 1 | Соединительная линия маршрута секции 2 — может «дорисовываться» по мере появления узлов |
| `route-transport` | `<g class="route__transport">` внутри `.route__connector` | 1 | Иконка транспорта вдоль маршрута секции 2 (motion along path, отдельная от Hero) |
| `route-node` | `.route__node` × 7 | 7 (общее имя, группа) | Узлы маршрута (Фабрика…Россия) — stagger-появление по порядку DOM при входе секции во вьюпорт |
| `handoff-item` | `.handoff__item` × 8 | 8 (общее имя, группа) | 8 пунктов ответственности — stagger в порядке передачи процесса, с эффектом «схлопывания»/движения к `handoff-target` |
| `handoff-target` | `.handoff__target` (кружок «Corex-Trade») | 1 | Точка назначения, к которой визуально «стекаются» `handoff-item` |
| `calculator-panel` | `.calculator__object` | 1 | Единственный объект калькулятора — reveal/лёгкий scale при входе в вьюпорт |
| `calculator-result` | `#calculator-result` | 1 | Блок результата — scale-in при появлении содержимого (наполняется `js/calculator.js`, animations.js не импортирует его, а просто анимирует изменение этого DOM-узла, например через `MutationObserver` или повторный scroll-триггер) |
| `case-card` | `.card--case` × 4 | 4 (общее имя, группа) | Карточки кейсов — reveal + лёгкий scale («раскрытие карточек») |
| `category-lane` | `.categories__lane` (флекс-лента) | 1 | Контейнер горизонтальной ленты — кандидат на horizontal-move синхронно со скроллом секции |
| `category-item` | `.card--category` × 8 | 8 (общее имя, группа) | Отдельные карточки категорий внутри ленты |
| `reason-item` | `.reason-item` × 4 | 4 (общее имя, группа) | Тезисы «Почему с нами» — простой reveal, самая лёгкая анимация страницы |
| `final-veil` | `.final-cta__veil` | 1 | Параллакс-вуаль финального CTA (зеркальная версия `hero-veil`, `transform: scaleX(-1)` уже в CSS) |
| `transition-final-in` | `.section-seam--final-in` (верх `.final-cta`) | 1 | Переход светлого фона секции 7 в тёмный фон финального CTA |
| `final-panel` | `.final-cta__panel` (glass-форма) | 1 | Панель формы заявки — reveal при входе секции |
| `final-contacts` | `.final-cta__contacts` | 1 | Блок контактов — reveal (можно с лёгким stagger по трём строкам контактов) |

Итого 8 разных типов поведения из брифа покрываются подсказками разметки: pin+scrub (Hero), motion along path (`hero-transport`, `route-transport`), stagger (`hero-stage-*`, `route-node`, `handoff-item`, `category-item`, `reason-item`), parallax (`hero-veil`, `final-veil`), reveal (`calculator-panel`, `case-card`, `final-panel`, `final-contacts`), scale (`calculator-result`, `case-card`), horizontal move (`category-lane`), переходы между секциями (`transition-hero-out`, `transition-final-in`). Тикет 03 не обязан использовать каждый крючок, но все они размечены и готовы к использованию.

### Тикет 03 — слой анимации (GSAP 3 + ScrollTrigger)

`js/animations.js` — весь ScrollTrigger/GSAP-слой. `index.html` получил только 3 добавленных `<script>` перед закрывающим `</body>` (GSAP + ScrollTrigger с jsdelivr CDN, затем `js/animations.js`, перед уже существующими `calculator.js`/`contact-form.js`) — разметка и `data-animate` не менялись.

Архитектура: `gsap.matchMedia()` с условиями `{ all: '', reduceMotion: '(prefers-reduced-motion: reduce)', isMobile: '(max-width: 767px)' }` — колбэк пересоздаёт все ScrollTrigger-инстансы при пересечении брейкпоинта/переключении reduced-motion (GSAP сам ревертит предыдущий набор). **Важный gotcha для будущих тикетов**: ключ `all: ''` обязателен — без него `mm.add()` не вызывает колбэк вообще, если ни одно из именованных условий не совпадает одновременно (например обычный десктоп без reduced-motion: `isMobile=false` и `reduceMotion=false` — оба ложны, и без `all` GSAP решает, что «ничего не совпало», и не запускает анимации в принципе, без единой ошибки в консоли). Отловлено вживую через Puppeteer/CDP-прогон (см. ниже) — без этого фикса ScrollTrigger.getAll() возвращал 0 инстансов при обычной десктопной загрузке.

Hero (`initHero`): десктоп/планшет — `pin:true` на `.hero`, дистанция `+= innerHeight*3`, `scrub:1`; один мастер-таймлайн (условные «единицы» 0..6) двигает: scale сцены, параллакс `hero-veil`, дорисовку `hero-route-line` (`getTotalLength()`/`strokeDashoffset`, без DrawSVGPlugin — он платный, не совместим с ограничением «единственная зависимость — GSAP+ScrollTrigger»), движение `hero-transport` вдоль пути через ручной расчёт `getPointAtLength()` + `setAttribute('transform', ...)` на каждом `onUpdate` (тоже без MotionPathPlugin по той же причине — эта надстройка бесплатна, но не упомянута как разрешённая зависимость, поэтому не подключена лишним `<script>`), и ровно 6 `hero-stage-*` подряд (появляется/держится/уходит, кроме последней — она остаётся до конца). `transition-hero-out` появляется в последней единице синхронно с исчезновением pin. Мобильная ветка (`isMobile`) — без pin, короткий `ScrollTrigger`-reveal (не scrub).

Остальные секции (по одной функции `init*` на секцию) — используют исключительно уже расставленные `data-animate` из тикета 02, ничего не добавляли и не переименовывали. `#calculator-result` анимируется через `MutationObserver` на `childList` (не импортирует `calculator.js`), с проверкой `prefers-reduced-motion` внутри колбэка.

Reduced-motion: при `reduceMotion` вообще не создаётся ни один `ScrollTrigger`/pin — только `gsap.set('.hero__stage-label', {opacity:1, y:0, clearProps:'transform'})`, снимающий единственное CSS-скрытое состояние (`.js .hero__stage-label`). Прогрессивное улучшение: если `window.gsap`/`window.ScrollTrigger` не определены (CDN недоступен/заблокирован), тот же revealHeroStagesStatically() отрабатывает без GSAP, чистым DOM.

**Проверено вживую** (Puppeteer + локальный установленный Chrome через `puppeteer-core`, `python3 -m http.server` из корня репозитория, скрипты собраны и выполнены во временном scratchpad-проекте, не сохранены в репозитории): 1440×900 — `ScrollTrigger.getAll()` даёт 13 инстансов, ровно один с `pin:true` (Hero, `start:62 end:2762` ≈ 3 высоты вьюпорта); пошаговый скролл по пин-диапазону подтвердил строго последовательное появление 6 подписей (никогда две одновременно в состоянии `opacity:1`, кроме короткого кроссфейда), `transition-hero-out` доходит до `opacity:1` только к моменту отпускания pin; сабмит калькулятора триггерит `MutationObserver`-анимацию результата (`opacity:1` после отправки); консоль браузера пуста на всех трёх прогонах (0 `console.error`/`pageerror`/`requestfailed`/HTTP≥400). 375×812 — `pin-spacer` отсутствует, `document.documentElement.scrollWidth === innerWidth` (нет горизонтального оверфлоу), полный скролл до низа без залипания, все 6 подписей Hero видны после прокрутки без scrub. Эмуляция `prefers-reduced-motion: reduce` (`page.emulateMediaFeatures`) — `pin-spacer` отсутствует, все 6 подписей и остальные `data-animate`-элементы имеют `opacity:1` сразу, без скролла. Скриншоты по всем секциям (Hero start/mid, route, handoff, calculator, cases, categories, final CTA, mobile-варианты) визуально подтвердили отсутствие поломок вёрстки.
