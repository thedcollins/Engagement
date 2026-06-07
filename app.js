/* =========================================================================
   Scott & Dominik — shared site behaviour (runs on every page)
   ========================================================================= */
(function () {
  'use strict';

  /* ---- EDITABLE CONFIG -------------------------------------------------
     Update these values whenever you like.
  ---------------------------------------------------------------------- */
  var CONFIG = {
    engagementDate: '2027-02-27T19:00:00',   // countdown target (7pm)
    rsvpEndpoint: 'https://script.google.com/macros/s/AKfycbx4fGfDVbmN9RGDnyvsFuYaWdaGry-_hNmW5RMayuG46usgqVCZCgWXNgqATk-cPSSLNQ/exec'   // Google Apps Script web app
  };

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---- NAV: scroll state + mobile toggle ---- */
  var nav = $('#nav');
  var navToggle = $('#navToggle');
  var navLinks = $('#navLinks');
  if (nav) {
    var onScroll = function () {
      if (window.scrollY > 40) nav.classList.add('nav--scrolled');
      else nav.classList.remove('nav--scrolled');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      navLinks.classList.toggle('open');
      navToggle.textContent = navLinks.classList.contains('open') ? 'Close' : 'Menu';
    });
    navLinks.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        navLinks.classList.remove('open');
        navToggle.textContent = 'Menu';
      }
    });
  }

  /* ---- COUNTDOWN ---- */
  var cdEls = {
    days: $('[data-cd="days"]'), hours: $('[data-cd="hours"]'),
    mins: $('[data-cd="mins"]'), secs: $('[data-cd="secs"]')
  };
  if (cdEls.days || cdEls.hours || cdEls.mins || cdEls.secs) {
    var target = new Date(CONFIG.engagementDate).getTime();
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var tick = function () {
      var diff = Math.max(0, target - Date.now());
      var d = Math.floor(diff / 86400000);
      var h = Math.floor((diff % 86400000) / 3600000);
      var m = Math.floor((diff % 3600000) / 60000);
      var s = Math.floor((diff % 60000) / 1000);
      if (cdEls.days)  cdEls.days.textContent  = d;
      if (cdEls.hours) cdEls.hours.textContent = pad(h);
      if (cdEls.mins)  cdEls.mins.textContent  = pad(m);
      if (cdEls.secs)  cdEls.secs.textContent  = pad(s);
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ---- REVEAL ON SCROLL ---- */
  var revealEls = $$('.reveal');
  if (revealEls.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---- FOLDED INVITE REVEAL (home) — pinned, scroll scrubs the fold open ---- */
  var inviteReveal = $('#inviteReveal');
  var pinTrack = $('#invitePinTrack');
  if (inviteReveal && pinTrack) {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      inviteReveal.style.setProperty('--open', '1');
    } else {
      var ticking = false;
      var update = function () {
        ticking = false;
        var rect = pinTrack.getBoundingClientRect();
        var total = pinTrack.offsetHeight - window.innerHeight; // scroll distance while pinned
        var p = total > 0 ? (-rect.top) / total : 0;
        if (p < 0) p = 0; else if (p > 1) p = 1;
        inviteReveal.style.setProperty('--open', p.toFixed(4));
      };
      var onScrollOrResize = function () {
        if (!ticking) { ticking = true; requestAnimationFrame(update); }
      };
      window.addEventListener('scroll', onScrollOrResize, { passive: true });
      window.addEventListener('resize', onScrollOrResize);
      update();
    }
  }

  /* ---- FAQ ACCORDION ---- */
  var faqItems = $$('.faq-item');
  faqItems.forEach(function (item) {
    var q = $('.faq-q', item), a = $('.faq-a', item);
    if (!q || !a) return;
    q.addEventListener('click', function () {
      var open = item.classList.contains('open');
      faqItems.forEach(function (other) {
        other.classList.remove('open');
        var oa = $('.faq-a', other); if (oa) oa.style.maxHeight = null;
      });
      if (!open) { item.classList.add('open'); a.style.maxHeight = a.scrollHeight + 'px'; }
    });
  });

  /* ---- RSVP FORM ---- */
  var form = $('#rsvpForm');
  if (form) {
    var success = $('#rsvpSuccess');
    var errEl = $('#rsvpError');
    var resetBtn = $('#rsvpReset');
    var STORE = 'sd_rsvp_v1';

    var showSuccess = function () {
      form.style.display = 'none';
      if (success) success.classList.add('show');
    };
    if (localStorage.getItem(STORE)) showSuccess();

    // origin-driven visibility: travellers get the stay block; locals choose events
    var stayBlock = $('#rsvpStayBlock');
    var stayNote = $('#rsvpStayNote');
    var partyExtras = $('#rsvpPartyExtras');
    var localInfo = $('#rsvpLocalInfo');
    var evtParty = $('#evtParty');
    var syncOrigin = function () {
      var sel = form.querySelector('input[name="origin"]:checked');
      var travelling = !!(sel && sel.value === 'Travelling in');
      var local = !!(sel && sel.value === 'Local');
      if (stayBlock) stayBlock.hidden = !travelling;
      if (stayNote) stayNote.hidden = !travelling;
      if (localInfo) localInfo.hidden = !local;            // weekend summary for locals
      // allergies/karaoke only matter for guests at the Saturday party
      var atParty = !evtParty || evtParty.checked;
      if (partyExtras) partyExtras.hidden = !atParty;
    };
    $$('input[name="origin"]', form).forEach(function (r) {
      r.addEventListener('change', syncOrigin);
    });
    if (evtParty) evtParty.addEventListener('change', syncOrigin);
    syncOrigin();

// accommodation logic driven by arrival night + length of stay
    var oneNight = form.querySelector('input[name="length"][value="1 night"]');
    var oneChip = oneNight ? oneNight.closest('.radio-chip') : null;
    var roseChip = $('#stayRose');
    var roseInput = roseChip ? roseChip.querySelector('input') : null;
    var innInput = form.querySelector('input[name="stay"][value="Holiday Inn, Corby"]');
    var splitField = $('#rsvpSplitField');

    // "splitting your stay" only matters when both hotels are chosen
    var syncSplit = function () {
      if (!splitField) return;
      var both = !!(innInput && innInput.checked && roseInput && roseInput.checked);
      splitField.hidden = !both;
      if (!both) { var i = splitField.querySelector('input'); if (i) i.value = ''; }
    };
    $$('input[name="stay"]', form).forEach(function (r) {
      r.addEventListener('change', syncSplit);
    });

    var syncStayLogic = function () {
      var arr = form.querySelector('input[name="arrival"]:checked');
      var len = form.querySelector('input[name="length"]:checked');
      var arrival = arr ? arr.value : '';
      var fridayIn = arrival === 'Friday';

      // Friday arrival needs at least 2 nights (Saturday is the party night)
      if (oneNight) {
        oneNight.disabled = fridayIn;
        if (oneChip) oneChip.classList.toggle('is-disabled', fridayIn);
        if (fridayIn && oneNight.checked) { oneNight.checked = false; len = null; }
      }
      var length = len ? len.value : '';

      // The party night is always at the Inn; the Rose & Crown only fits a spare
      // night — Friday before, or a Sunday/Monday after a 2+ night Saturday stay.
      var showRose = fridayIn || (arrival === 'Saturday' && (length === '2 nights' || length === '3 nights'));
      if (roseChip) {
        roseChip.hidden = !showRose;
        if (!showRose && roseInput && roseInput.checked) roseInput.checked = false;
      }
      syncSplit();
    };
    $$('input[name="arrival"], input[name="length"]', form).forEach(function (r) {
      r.addEventListener('change', syncStayLogic);
    });
    syncStayLogic();

    // reveal the allergy/preference details only when the guest picks "Yes"
    var dietDetail = $('#rsvpDietaryDetail');
    if (dietDetail) {
      var syncDiet = function () {
        var sel = form.querySelector('input[name="dietary"]:checked');
        dietDetail.hidden = !(sel && sel.value === 'Yes');
      };
      $$('input[name="dietary"]', form).forEach(function (r) {
        r.addEventListener('change', syncDiet);
      });
      syncDiet();
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = new FormData(form);
      var name = (data.get('name') || '').trim();
      var email = (data.get('email') || '').trim();
      if (!name || !email || email.indexOf('@') === -1) {
        if (errEl) errEl.style.display = 'block';
        return;
      }
      if (errEl) errEl.style.display = 'none';
      var record = {
        name: name, email: email,
        events: data.getAll('events'),
        names: data.get('names'),
        guests: data.get('guests'),
        origin: data.get('origin'), from: data.get('from'),
        arrival: data.get('arrival'), length: data.get('length'),
        stay: data.getAll('stay'),
        split: data.get('split'),
        dietary: data.get('dietary'),
        dietPref: data.get('diet_pref'),
        diet: data.get('diet'),
        song: data.get('song'), message: data.get('message'),
        at: new Date().toISOString()
      };
      // send to the Google Sheet (fire-and-forget; no-cors so the browser won't block it)
      if (CONFIG.rsvpEndpoint) {
        fetch(CONFIG.rsvpEndpoint, { method: 'POST', mode: 'no-cors', body: JSON.stringify(record) }).catch(function () {});
      }
      localStorage.setItem(STORE, JSON.stringify(record));
      showSuccess();
      if (success) window.scrollTo({ top: success.getBoundingClientRect().top + window.scrollY - 120, behavior: 'smooth' });
    });

    if (resetBtn) resetBtn.addEventListener('click', function () {
      localStorage.removeItem(STORE);
      if (success) success.classList.remove('show');
      form.style.display = '';
    });
  }

})();
