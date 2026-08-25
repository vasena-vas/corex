/*
  Corex-Trade — калькулятор предварительного расчёта доставки.
  Владеет: состоянием формы #calculator-form и формулой-плейсхолдером.
  Выставляет: обработчик сабмита, результат в #calculator-result.
  Прячет: саму формулу расчёта (см. TODO ниже) — остальной код о ней не знает.

  Ничего не импортирует и не знает про js/animations.js или js/contact-form.js —
  единственная точка соприкосновения с формой раздела 8 это прямое
  проставление значений в её DOM-поля (id="contact-name" и т.д.), как
  описано в тикете 02.
*/

(function () {
  'use strict';

  var form = document.getElementById('calculator-form');
  var resultBox = document.getElementById('calculator-result');

  if (!form || !resultBox) {
    return;
  }

  var fields = {
    category: document.getElementById('calc-category'),
    weight: document.getElementById('calc-weight'),
    volume: document.getElementById('calc-volume'),
    method: document.getElementById('calc-method'),
    city: document.getElementById('calc-city')
  };

  var CATEGORY_LABELS = {
    electronics: 'Электроника / платы',
    robotics: 'Робототехника',
    industrial: 'Промышленное оборудование',
    components: 'Комплектующие / компоненты',
    other: 'Другое'
  };

  var METHOD_LABELS = {
    auto: 'автотранспортом',
    rail: 'по железной дороге',
    sea: 'морем',
    air: 'авиа'
  };

  // TODO: реальные тарифы. Ставки за кг/м³ и множители по категориям —
  // условные значения для демонстрации механики калькулятора, а не
  // фактические тарифы Corex-Trade. Показывать посетителю как факт о
  // ценах компании нельзя — только как «ориентировочный расчёт».
  var RATES = {
    auto: { perKg: 350, perM3: 9200, days: [12, 18] },
    rail: { perKg: 260, perM3: 7000, days: [20, 30] },
    sea: { perKg: 140, perM3: 4200, days: [35, 50] },
    air: { perKg: 780, perM3: 21000, days: [5, 9] }
  };

  var CATEGORY_MULTIPLIER = {
    electronics: 1.15,
    robotics: 1.2,
    industrial: 1.05,
    components: 1.1,
    other: 1.0
  };

  function setError(key, message) {
    var input = fields[key];
    var errorEl = document.getElementById('calc-' + key + '-error');
    var wrap = input ? input.closest('.form-field') : null;

    if (errorEl) {
      errorEl.textContent = message || '';
    }
    if (wrap) {
      wrap.classList.toggle('has-error', Boolean(message));
    }
  }

  function clearErrors() {
    Object.keys(fields).forEach(function (key) {
      setError(key, '');
    });
  }

  function validate() {
    clearErrors();
    var isValid = true;
    var firstInvalid = null;

    var category = fields.category.value;
    if (!category) {
      setError('category', 'Выберите категорию груза');
      isValid = false;
      firstInvalid = firstInvalid || fields.category;
    }

    var weight = parseFloat(fields.weight.value);
    if (!fields.weight.value || isNaN(weight) || weight <= 0) {
      setError('weight', 'Укажите вес груза в кг (больше нуля)');
      isValid = false;
      firstInvalid = firstInvalid || fields.weight;
    }

    var volumeRaw = fields.volume.value;
    var volume = volumeRaw ? parseFloat(volumeRaw) : 0;
    if (volumeRaw && (isNaN(volume) || volume < 0)) {
      setError('volume', 'Объём не может быть отрицательным');
      isValid = false;
      firstInvalid = firstInvalid || fields.volume;
    }

    var method = fields.method.value;
    if (!method) {
      setError('method', 'Выберите способ доставки');
      isValid = false;
      firstInvalid = firstInvalid || fields.method;
    }

    var city = fields.city.value.trim();
    if (!city) {
      setError('city', 'Укажите город назначения');
      isValid = false;
      firstInvalid = firstInvalid || fields.city;
    }

    return {
      isValid: isValid,
      firstInvalid: firstInvalid,
      values: { category: category, weight: weight, volume: volume, method: method, city: city }
    };
  }

  function formatMoney(value) {
    var rounded = Math.round(value / 500) * 500;
    return rounded.toLocaleString('ru-RU') + ' ₽';
  }

  function calculateRange(values) {
    var rate = RATES[values.method];
    var multiplier = CATEGORY_MULTIPLIER[values.category] || 1;
    var base = values.weight * rate.perKg + values.volume * rate.perM3;
    var adjusted = base * multiplier;

    return {
      min: formatMoney(adjusted * 0.85),
      max: formatMoney(adjusted * 1.25),
      days: rate.days
    };
  }

  function renderResult(values, range) {
    var categoryLabel = CATEGORY_LABELS[values.category] || values.category;
    var methodLabel = METHOD_LABELS[values.method] || values.method;
    var volumeText = values.volume ? ', объём ' + values.volume + ' м³' : '';

    resultBox.innerHTML =
      '<p class="calculator__result-caption">Предварительный расчёт</p>' +
      '<p class="calculator__result-value">' + range.min + ' – ' + range.max + '</p>' +
      '<p class="calculator__result-meta">' +
        categoryLabel + ', вес ' + values.weight + ' кг' + volumeText + ', доставка ' + methodLabel +
        ' → ' + values.city + '. Ориентировочный срок в пути: ' + range.days[0] + '–' + range.days[1] + ' дн.' +
      '</p>' +
      '<p class="calculator__result-meta">Предварительно, точную стоимость подтвердим после проверки груза.</p>' +
      '<button type="button" class="btn btn--outline calculator__result-cta" id="calc-send-request">Отправить как заявку</button>';

    var sendBtn = document.getElementById('calc-send-request');
    if (sendBtn) {
      sendBtn.addEventListener('click', function () {
        sendAsRequest(values, range, categoryLabel, methodLabel);
      });
    }
  }

  function sendAsRequest(values, range, categoryLabel, methodLabel) {
    var comment = document.getElementById('contact-comment');
    var contactsSection = document.getElementById('contacts');
    var nameInput = document.getElementById('contact-name');
    var volumeText = values.volume ? ', объём ' + values.volume + ' м³' : '';

    if (comment) {
      comment.value =
        'Груз: ' + categoryLabel + ', вес ' + values.weight + ' кг' + volumeText +
        ', доставка ' + methodLabel + ', город назначения: ' + values.city + '. ' +
        'Предварительный расчёт с сайта: ' + range.min + ' – ' + range.max + '.';
    }

    if (contactsSection) {
      contactsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (nameInput) {
      window.setTimeout(function () {
        nameInput.focus({ preventScroll: true });
      }, 400);
    }
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var validation = validate();
    if (!validation.isValid) {
      if (validation.firstInvalid) {
        validation.firstInvalid.focus();
      }
      return;
    }

    var range = calculateRange(validation.values);
    renderResult(validation.values, range);
  });
})();
