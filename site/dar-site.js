/* ДАР: меню и демо-запись на экскурсию (вход через двери варианта A — в dar-entry.js).
   Ничего не отправляет и не загружает со сторонних адресов. */
(function () {
  'use strict';
  var PHONE = '+7 909 420-40-00';

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  /* ---------- Menu ---------- */
  function initMenu() {
    var menu = document.getElementById('site-menu');
    if (!menu) return;
    function open() {
      if (typeof menu.showModal === 'function') menu.showModal(); else menu.setAttribute('open', '');
    }
    function close() {
      if (typeof menu.close === 'function') menu.close(); else menu.removeAttribute('open');
    }
    document.querySelectorAll('[data-menu-open]').forEach(function (b) { b.addEventListener('click', open); });
    menu.querySelectorAll('[data-menu-close]').forEach(function (b) { b.addEventListener('click', close); });
    menu.addEventListener('click', function (e) { if (e.target === menu) close(); });
    menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', close); });
  }

  /* ---------- Demo excursion booking ---------- */
  var MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  var WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  var WDL = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
  var PLACES = {
    school: { label: 'Школа', addr: 'ул. Павленко, 11/47', slots: ['10:00', '11:30', '14:30', '16:00'] },
    kg: { label: 'Детский сад', addr: 'ул. Пермская, 45', slots: ['9:30', '11:00', '16:30'] }
  };
  var GRADES = {
    school: ['1 класс', '2 класс', '3 класс', '4 класс', '5 класс', '6 класс', '7 класс', '8 класс', '9 класс', '10 класс', '11 класс'],
    kg: ['3 года', '4 года', '5 лет', '6 лет']
  };
  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }
  function busy(date, i, place) {
    var h = (date.getDate() * 7 + date.getMonth() * 3 + i * 5 + (place === 'kg' ? 2 : 0)) % 9;
    return h === 0 || h === 4 || h === 7;
  }

  function initBooking(root) {
    var daysEl = root.querySelector('[data-days]');
    var slotsEl = root.querySelector('[data-slots]');
    var slotsTitle = root.querySelector('[data-slots-title]');
    var summary = root.querySelector('[data-summary]');
    var summaryText = root.querySelector('[data-summary-text]');
    var done = root.querySelector('[data-done]');
    var doneText = root.querySelector('[data-done-text]');
    var grade = root.querySelector('[data-grade]');
    var gradeLabel = root.querySelector('[data-grade-label]');
    var state = { place: 'school', day: null, time: null };

    var today = new Date(); today.setHours(0, 0, 0, 0);
    var monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    var futureThisWeek = 0;
    for (var k = 0; k < 5; k++) {
      var t = new Date(monday); t.setDate(monday.getDate() + k);
      if (t > today) futureThisWeek++;
    }
    if (futureThisWeek < 2) monday.setDate(monday.getDate() + 7);

    function fmt(d) { return WDL[d.getDay()] + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()]; }

    function fillGrades() {
      var list = GRADES[state.place];
      grade.innerHTML = '';
      list.forEach(function (g, i) {
        var o = document.createElement('option');
        o.textContent = g; o.value = g;
        if ((state.place === 'school' && i === 0) || (state.place === 'kg' && i === 0)) o.selected = true;
        grade.appendChild(o);
      });
      gradeLabel.textContent = state.place === 'kg' ? 'Возраст ребёнка' : 'Класс, в который планируете поступать';
    }

    function renderDays() {
      daysEl.innerHTML = '';
      var first = null;
      for (var w = 0; w < 2; w++) {
        var start = new Date(monday); start.setDate(monday.getDate() + w * 7);
        var end = new Date(start); end.setDate(start.getDate() + 4);
        var title = document.createElement('p');
        title.className = 'cal-week';
        title.textContent = start.getMonth() === end.getMonth()
          ? start.getDate() + '–' + end.getDate() + ' ' + MONTHS[end.getMonth()]
          : start.getDate() + ' ' + MONTHS[start.getMonth()] + ' – ' + end.getDate() + ' ' + MONTHS[end.getMonth()];
        daysEl.appendChild(title);
        var row = document.createElement('div');
        row.className = 'cal-days';
        for (var d = 0; d < 5; d++) {
          var date = new Date(start); date.setDate(start.getDate() + d);
          var free = PLACES[state.place].slots.filter(function (s, i) { return !busy(date, i, state.place); }).length;
          var past = date <= today;
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'cal-day';
          b.setAttribute('aria-pressed', 'false');
          b.innerHTML = '<span class="wd">' + WD[date.getDay()] + '</span><span class="d">' + date.getDate() + '</span><span class="n">' +
            (past ? '—' : free ? free + ' ' + plural(free, 'окно', 'окна', 'окон') : 'нет мест') + '</span>';
          b.setAttribute('aria-label', fmt(date) + (past ? ', запись закрыта' : free ? ', свободно ' + free + ' ' + plural(free, 'окно', 'окна', 'окон') : ', нет свободного времени'));
          if (past || !free) b.disabled = true;
          else {
            b.dataset.ts = String(date.getTime());
            b.addEventListener('click', onDay);
            if (!first) first = b;
          }
          row.appendChild(b);
        }
        daysEl.appendChild(row);
      }
      if (first) selectDay(first);
    }

    function onDay(e) { selectDay(e.currentTarget); }
    function selectDay(btn) {
      daysEl.querySelectorAll('.cal-day').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
      btn.setAttribute('aria-pressed', 'true');
      state.day = new Date(Number(btn.dataset.ts));
      state.time = null;
      renderSlots();
      update();
    }
    function renderSlots() {
      slotsEl.innerHTML = '';
      slotsTitle.textContent = 'Свободное время · ' + fmt(state.day);
      PLACES[state.place].slots.forEach(function (s, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'slot';
        b.textContent = s;
        b.setAttribute('aria-pressed', 'false');
        if (busy(state.day, i, state.place)) { b.disabled = true; b.setAttribute('aria-label', s + ', занято'); }
        else b.addEventListener('click', function () {
          slotsEl.querySelectorAll('.slot').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
          b.setAttribute('aria-pressed', 'true');
          state.time = s;
          update();
        });
        slotsEl.appendChild(b);
      });
    }
    function describe() {
      var p = PLACES[state.place];
      return p.label + ', ' + p.addr + ' · ' + fmt(state.day) + ', ' + state.time + ' · ' + grade.value;
    }
    function update() {
      done.hidden = true;
      if (state.day && state.time) {
        summary.hidden = false;
        summaryText.textContent = describe();
      } else summary.hidden = true;
    }

    root.querySelectorAll('input[name="place"]').forEach(function (r) {
      r.addEventListener('change', function () {
        if (!r.checked) return;
        state.place = r.value;
        fillGrades();
        renderDays();
      });
    });
    grade.addEventListener('change', update);
    root.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      if (!state.day || !state.time) return;
      doneText.textContent = describe();
      summary.hidden = true;
      done.hidden = false;
      done.focus();
    });
    root.querySelector('[data-reset]').addEventListener('click', function () {
      done.hidden = true;
      state.time = null;
      slotsEl.querySelectorAll('.slot').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
      var first = slotsEl.querySelector('.slot:not([disabled])');
      if (first) first.focus();
    });

    if (location.hash === '#visit-kg') {
      var kg = root.querySelector('input[value="kg"]');
      if (kg) { kg.checked = true; state.place = 'kg'; }
    }
    fillGrades();
    renderDays();
  }

  ready(function () {
    initMenu();
    document.querySelectorAll('[data-booking]').forEach(initBooking);
  });
})();
