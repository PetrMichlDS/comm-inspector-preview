/* =================================================================
   AI Communication Inspector — minimal vanilla JS
   No frameworks, no libraries. Progressive enhancement only:
   the page is fully usable with JS disabled.
   ================================================================= */
(function () {
  "use strict";

  /* --- Current year in footer --- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* --- Sticky header: subtle shadow once scrolled --- */
  var header = document.getElementById("siteHeader");
  var onScroll = function () {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* --- Mobile nav toggle --- */
  var toggle = document.querySelector(".nav__toggle");
  var mobileNav = document.getElementById("mobileNav");
  if (toggle && header && mobileNav) {
    var setOpen = function (open) {
      header.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      mobileNav.hidden = !open;
    };
    toggle.addEventListener("click", function () {
      setOpen(!header.classList.contains("is-open"));
    });
    // Close the drawer after tapping any link inside it
    mobileNav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { setOpen(false); });
    });
  }

  /* --- Desktop nav dropdowns ("Modules", "Resources") ---
     Same setOpen idiom as the mobile drawer: flip aria-expanded + an
     .is-open class (no inline styles). Each closes on: toggle again,
     click outside, Escape (returns focus to the button), or a link
     click. Opening one closes the others, so only ever one panel is
     open. Driven off every .nav__dropdown in the markup rather than a
     single hard-coded menu id, so adding a dropdown needs no JS change. */
  var navDropdowns = document.querySelectorAll(".nav__dropdown");
  if (navDropdowns.length) {
    var dropdowns = [];

    var closeDropdowns = function (except) {
      dropdowns.forEach(function (d) {
        if (d !== except) d.setOpen(false);
      });
    };

    navDropdowns.forEach(function (dropdown) {
      var toggle = dropdown.querySelector(".nav__dropdown-toggle");
      var menu = dropdown.querySelector(".nav__dropdown-menu");
      if (!toggle || !menu) return;

      var d = {
        dropdown: dropdown,
        toggle: toggle,
        isOpen: function () { return toggle.getAttribute("aria-expanded") === "true"; },
        setOpen: function (open) {
          dropdown.classList.toggle("is-open", open);
          toggle.setAttribute("aria-expanded", String(open));
        }
      };
      dropdowns.push(d);

      toggle.addEventListener("click", function (e) {
        e.stopPropagation();
        var open = !d.isOpen();
        closeDropdowns(d);
        d.setOpen(open);
      });
      menu.querySelectorAll("a").forEach(function (a) {
        a.addEventListener("click", function () { d.setOpen(false); });
      });
    });

    document.addEventListener("click", function (e) {
      dropdowns.forEach(function (d) {
        if (!d.dropdown.contains(e.target)) d.setOpen(false);
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      dropdowns.forEach(function (d) {
        if (!d.isOpen()) return;
        d.setOpen(false);
        d.toggle.focus();
      });
    });
  }

  /* --- Scroll-reveal (IntersectionObserver), respects reduced-motion --- */
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var reveals = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* --- Animated metrics: count-up figures + hero coverage bars ---
     Reuses the same scroll-in idea as .reveal. Honours reduced-motion:
     when reduced, every value and bar is shown at its final state with no
     animation (the bars are filled purely by CSS via their --w target). */
  var counters = document.querySelectorAll("[data-count]");
  var coverageCard = document.querySelector(".coverage-card");

  var easeOutCubic = function (t) { return 1 - Math.pow(1 - t, 3); };

  var countUp = function (el) {
    var to = parseFloat(el.getAttribute("data-count-to"));
    if (isNaN(to)) return;
    var prefix = el.getAttribute("data-count-prefix") || "";
    var suffix = el.getAttribute("data-count-suffix") || "";
    var duration = 1150;
    var startTime = null;
    var step = function (now) {
      if (startTime === null) startTime = now;
      var p = Math.min((now - startTime) / duration, 1);
      el.textContent = prefix + Math.round(easeOutCubic(p) * to) + suffix;
      if (p < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
  };

  if (reduceMotion || !("IntersectionObserver" in window)) {
    // Final state, no animation. Bars fill via CSS; values keep their markup.
    if (coverageCard) coverageCard.classList.add("is-in");
  } else {
    // Hold counters at zero until they scroll into view, then count up.
    counters.forEach(function (el) {
      var prefix = el.getAttribute("data-count-prefix") || "";
      var suffix = el.getAttribute("data-count-suffix") || "";
      el.textContent = prefix + "0" + suffix;
    });

    var mio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var t = entry.target;
        if (t === coverageCard) t.classList.add("is-in");
        if (t.hasAttribute("data-count")) countUp(t);
        mio.unobserve(t);
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.25 });

    if (coverageCard) mio.observe(coverageCard);
    counters.forEach(function (el) { mio.observe(el); });
  }

  /* --- FAQ: per-question accordions + "view all" list disclosure ---
     Two independent layers. Each question toggles only its own answer
     (several can be open at once), and separately the list shows 4 of
     12 until expanded. Both are CSS-gated behind .js, so this script
     only flips classes and aria state. */
  var faq = document.getElementById("faq");
  if (faq) {
    faq.querySelectorAll(".faq__q").forEach(function (q) {
      q.addEventListener("click", function () {
        var item = q.closest(".faq__item");
        if (!item) return;
        var open = !item.classList.contains("is-open");
        item.classList.toggle("is-open", open);
        q.setAttribute("aria-expanded", String(open));
      });
    });

    var moreBtn = faq.querySelector("[data-faq-more]");
    var lessBtn = faq.querySelector("[data-faq-less]");
    if (moreBtn && lessBtn) {
      var setFaqExpanded = function (expanded) {
        faq.classList.toggle("faq--expanded", expanded);
        moreBtn.setAttribute("aria-expanded", String(expanded));
      };
      moreBtn.addEventListener("click", function () { setFaqExpanded(true); });
      lessBtn.addEventListener("click", function () {
        setFaqExpanded(false);
        // The collapse button sits far down the page; without this the
        // viewport would be left below the now-shorter section.
        moreBtn.scrollIntoView({ block: "center" });
      });
    }
  }

  /* --- Build vs. Partner vs. Buy: sync Build/Buy SaaS to equal height,
     excluding the (deliberately taller) featured card. CSS Grid has no
     way to match two siblings' height while excluding a third from the
     same row's height calculation, so this is a one-time static
     measurement, re-run on resize — not an animation. --- */
  var bpbGrid = document.querySelector(".bpb__grid");
  if (bpbGrid) {
    var syncBpbHeights = function () {
      var cards = bpbGrid.querySelectorAll(".bpb-card:not(.bpb-card--featured)");
      if (cards.length < 2) return;
      cards.forEach(function (c) { c.style.minHeight = ""; });
      if (window.matchMedia("(max-width: 860px)").matches) return; // single-column stack, nothing to sync
      var max = Math.max.apply(null, Array.prototype.map.call(cards, function (c) { return c.offsetHeight; }));
      cards.forEach(function (c) { c.style.minHeight = max + "px"; });
    };
    window.addEventListener("load", syncBpbHeights);
    window.addEventListener("resize", syncBpbHeights);
  }

  /* --- "Request a Demo" jumps to the form and focuses the first field --- */
  document.querySelectorAll("[data-demo-open]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      // Allow the default anchor jump to #demo, then focus the first input.
      window.setTimeout(function () {
        var first = document.getElementById("df-name");
        if (first) first.focus({ preventScroll: true });
      }, 420);
    });
  });

  /* --- Force English validation-bubble copy ---
     The native "Please fill in this field." bubble is localized by the
     browser/OS language, not by this page's lang="en" — so a Czech-locale
     browser shows Czech text regardless. Override with setCustomValidity
     so the bubble always reads in English, and clear it on input so the
     field still revalidates normally once corrected. */
  var validatedFields = document.querySelectorAll(
    "#demoForm input[required], #demoForm textarea[required], " +
    "#quoteForm input[required], #quoteForm textarea[required]"
  );
  validatedFields.forEach(function (field) {
    field.addEventListener("invalid", function () {
      if (field.validity.valueMissing) {
        field.setCustomValidity("Please fill in this field.");
      } else if (field.validity.typeMismatch && field.type === "email") {
        field.setCustomValidity("Please enter a valid email address.");
      }
    });
    field.addEventListener("input", function () {
      field.setCustomValidity("");
    });
  });

  /* --- Demo form handling ---
     Submits to Web3Forms via fetch so we can show the inline confirmation
     copy below instead of a page redirect. */
  var form = document.getElementById("demoForm");
  var note = document.getElementById("demoFormNote");
  var fields = document.getElementById("demoFormFields");
  var success = document.getElementById("demoFormSuccess");
  if (form && note && fields && success) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      var submitBtn = form.querySelector("button[type=submit]");
      var data = {};
      new FormData(form).forEach(function (value, key) { data[key] = value; });

      note.textContent = "";
      note.className = "demo-form__note";
      if (submitBtn) submitBtn.disabled = true;

      fetch(form.getAttribute("action"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data)
      })
        .then(function (res) { return res.json(); })
        .then(function (result) {
          if (result.success) {
            form.reset();
            fields.hidden = true;
            success.hidden = false;
            /* GA4 conversion for ad measurement and audience exclusion. No form data is sent. */
            if (typeof gtag === "function") gtag("event", "generate_lead", { form_id: "demo_walkthrough" });
          } else {
            note.textContent = "Something went wrong. Please try again or email us directly.";
            note.className = "demo-form__note is-err";
          }
        })
        .catch(function () {
          note.textContent = "Something went wrong. Please try again or email us directly.";
          note.className = "demo-form__note is-err";
        })
        .then(function () {
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }

  /* --- Custom quote form handling (pricing.html) — mirrors the demo
     form's Web3Forms fetch submit above. Distinct var names
     (quoteForm/quoteNote rather than reusing form/note) so the two
     submit closures never share state. --- */
  var quoteForm = document.getElementById("quoteForm");
  var quoteNote = document.getElementById("quoteFormNote");
  var quoteFields = document.getElementById("quoteFormFields");
  var quoteSuccess = document.getElementById("quoteFormSuccess");
  if (quoteForm && quoteNote && quoteFields && quoteSuccess) {
    quoteForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!quoteForm.checkValidity()) {
        quoteForm.reportValidity();
        return;
      }

      var quoteSubmitBtn = quoteForm.querySelector("button[type=submit]");
      var quoteData = {};
      new FormData(quoteForm).forEach(function (value, key) {
        if (key === "modules") {
          quoteData.modules = quoteData.modules ? quoteData.modules + ", " + value : value;
        } else {
          quoteData[key] = value;
        }
      });

      quoteNote.textContent = "";
      quoteNote.className = "demo-form__note";
      if (quoteSubmitBtn) quoteSubmitBtn.disabled = true;

      fetch(quoteForm.getAttribute("action"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(quoteData)
      })
        .then(function (res) { return res.json(); })
        .then(function (result) {
          if (result.success) {
            quoteForm.reset();
            quoteFields.hidden = true;
            quoteSuccess.hidden = false;
            if (typeof gtag === "function") gtag("event", "generate_lead", { form_id: "quote_request" });
          } else {
            quoteNote.textContent = "Something went wrong. Please try again or email us directly.";
            quoteNote.className = "demo-form__note is-err";
          }
        })
        .catch(function () {
          quoteNote.textContent = "Something went wrong. Please try again or email us directly.";
          quoteNote.className = "demo-form__note is-err";
        })
        .then(function () {
          if (quoteSubmitBtn) quoteSubmitBtn.disabled = false;
        });
    });
  }

  /* --- Call Inspector demo video facade (ai-call-inspector.html) ---
     No iframe, and so no request to Google, until the visitor clicks.
     This page covers GDPR compliance and the site carries no cookie
     banner, so a standard youtube.com/embed firing on page load would
     set cookies without consent. youtube-nocookie.com only loads once
     the visitor explicitly asks for the video. */
  var videoPlay = document.getElementById("callInspectorVideoPlay");
  var videoFrame = document.getElementById("callInspectorVideoFrame");
  if (videoPlay && videoFrame) {
    videoPlay.addEventListener("click", function () {
      videoFrame.innerHTML =
        '<iframe src="https://www.youtube-nocookie.com/embed/Rx2tAZUPuXI?autoplay=1" ' +
        'title="Call Inspector demo" allowfullscreen loading="lazy"></iframe>';
    });
  }

  /* --- Processing pipeline: one-shot trace, 01 -> 05 (architecture.html) ---
     Draws each stage card's outline in turn, growing the connector across
     to the next one in between, in the order the stages actually happen.
     This section is a real chronological sequence, which is why it carries
     the trace; the ecosystem diagram deliberately does not, being
     concurrent primary and supporting flows rather than a timeline.

     Deliberately simpler than one unbroken path: each card is a closed
     rounded rect and each connector a scaleX bar, chained by timing, with
     the connector starting shortly before its card finishes so there is no
     visible seam at the handover. A linear chain needs nothing more.

     Measured from the live layout, so it follows the grid and survives
     resize. Below 1024px .flow--five drops its connectors, so the
     connector legs are skipped and the timeline tightens automatically.
     Decorative only: aria-hidden, pointer-events none, injected after the
     section scrolls into view, and card text never waits on it. Plays once
     per visit — no perpetual animation over five seconds needing a pause
     control (WCAG 2.2 SC 2.2.2) — and is skipped under
     prefers-reduced-motion. */
  var flowTrace = document.querySelector(".flow-trace");
  var flowList = flowTrace && flowTrace.querySelector(".flow--five");
  if (flowTrace && flowList && !reduceMotion) {
    var TSVGNS = "http://www.w3.org/2000/svg";
    var CARD_MS = 2400;    // drawing one card outline
    var CONN_MS = 400;     // growing one connector across
    var OVERLAP = 0.1;     // connector starts this fraction before the card ends

    var steps = flowList.querySelectorAll(".flow__step");
    var conns = flowList.querySelectorAll(".flow__connector");

    var tSvg = null, tLinks = [], tPaths = [], tPlayed = false, tReady = false;
    var q = function (v) { return Math.round(v * 10) / 10; };

    var relTo = function (el, origin) {
      var r = el.getBoundingClientRect();
      return { x: r.left - origin.left, y: r.top - origin.top, w: r.width, h: r.height };
    };

    /* Closed rounded rectangle, clockwise from the start of the top edge:
       across the top, down the right, back along the bottom, up the left. */
    var closedRect = function (b, rad) {
      var x = b.x, y = b.y, x2 = b.x + b.w, y2 = b.y + b.h;
      var r = Math.max(0, Math.min(rad, Math.min(b.w, b.h) / 2));
      var arc = function (ex, ey) {
        return "A " + q(r) + " " + q(r) + " 0 0 1 " + q(ex) + " " + q(ey);
      };
      return [
        "M " + q(x + r) + " " + q(y),
        "L " + q(x2 - r) + " " + q(y), arc(x2, y + r),
        "L " + q(x2) + " " + q(y2 - r), arc(x2 - r, y2),
        "L " + q(x + r) + " " + q(y2), arc(x, y2 - r),
        "L " + q(x) + " " + q(y + r), arc(x + r, y),
        "Z"
      ].join(" ");
    };

    var buildTrace = function () {
      var origin = flowTrace.getBoundingClientRect();
      if (!origin.width || !steps.length) return false;

      if (!tSvg) {
        tSvg = document.createElementNS(TSVGNS, "svg");
        tSvg.setAttribute("class", "flow-trace__svg");
        tSvg.setAttribute("aria-hidden", "true");
        tSvg.setAttribute("focusable", "false");
        flowTrace.appendChild(tSvg);
      }
      tSvg.setAttribute("width", q(origin.width));
      tSvg.setAttribute("height", q(origin.height));
      tSvg.setAttribute("viewBox", "0 0 " + q(origin.width) + " " + q(origin.height));
      while (tSvg.firstChild) tSvg.removeChild(tSvg.firstChild);
      tLinks.forEach(function (el) { el.remove(); });
      tPaths = [];
      tLinks = [];

      // Connectors are display:none below 1024px; with none rendered the
      // sequence is cards only and the connector legs cost no time.
      var connLive = conns.length > 0 && conns[0].getBoundingClientRect().width > 0;
      var connStep = connLive ? CONN_MS : 0;

      Array.prototype.forEach.call(steps, function (step, i) {
        var b = relTo(step, origin);
        var rad = parseFloat(getComputedStyle(step).borderTopLeftRadius) || 0;
        var path = document.createElementNS(TSVGNS, "path");
        path.setAttribute("d", closedRect(b, rad));
        tSvg.appendChild(path);
        var len = path.getTotalLength();
        path.style.strokeDasharray = len;
        // A rebuild after the run comes back drawn rather than replaying.
        path.style.strokeDashoffset = tPlayed ? 0 : len;
        tPaths.push({ el: path, len: len, at: i * (CARD_MS * (1 - OVERLAP) + connStep) });
      });

      if (connLive) {
        Array.prototype.forEach.call(conns, function (conn, i) {
          var b = relTo(conn, origin);
          var bar = document.createElement("span");
          bar.className = "flow-trace__link";
          bar.setAttribute("aria-hidden", "true");
          bar.style.left = q(b.x) + "px";
          bar.style.top = q(b.y) + "px";
          bar.style.width = q(b.w) + "px";
          bar.style.height = q(b.h) + "px";
          bar.style.transform = tPlayed ? "scaleX(1)" : "scaleX(0)";
          flowTrace.appendChild(bar);
          tLinks.push(bar);
          // Starts just before card i finishes, so the handover has no gap.
          tPaths.push({
            el: bar, bar: true,
            at: i * (CARD_MS * (1 - OVERLAP) + connStep) + CARD_MS * (1 - OVERLAP)
          });
        });
      }
      return true;
    };

    var playTrace = function () {
      tPlayed = true;
      tPaths.forEach(function (p) {
        if (typeof p.el.animate !== "function") {
          if (p.bar) p.el.style.transform = "scaleX(1)";
          else p.el.style.strokeDashoffset = 0;
          return;
        }
        if (p.bar) {
          p.el.animate(
            [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
            { duration: CONN_MS, delay: p.at, easing: "linear", fill: "forwards" }
          );
        } else {
          p.el.animate(
            [{ strokeDashoffset: p.len }, { strokeDashoffset: 0 }],
            { duration: CARD_MS, delay: p.at, easing: "ease-in-out", fill: "forwards" }
          );
        }
      });
    };

    /* Measured when it is needed rather than up front, so web fonts have
       settled and the card boxes are at their final size. */
    var startFlowTrace = function () {
      if (tPlayed || !buildTrace()) return;
      tReady = true;
      playTrace();
    };

    if ("IntersectionObserver" in window) {
      var flowIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting || tPlayed) return;
          flowIO.unobserve(entry.target);   // one shot, never a loop
          startFlowTrace();
        });
      }, { threshold: 0.15 });
      flowIO.observe(flowTrace);
    } else {
      window.addEventListener("load", startFlowTrace);
    }

    var flowResize = null;
    window.addEventListener("resize", function () {
      if (!tReady) return;
      window.clearTimeout(flowResize);
      flowResize = window.setTimeout(buildTrace, 150);
    });
  }

  /* --- Ecosystem diagram: route Data warehouse/Knowledge base's feeds up
     to the product card on mobile (architecture.html) ---
     Below 860px the diagram is a single column, so Comms Inspector
     database ends up sitting between each of these two supporting feeds
     and the product card they actually feed - a short arrow just points
     into empty space. Card heights in between are content-driven, so the
     real gap is measured live rather than guessed: each arrow is
     stretched into a long line reaching the product card's bottom edge,
     routed in the side padding lane reserved for this in CSS (left for
     Data warehouse, right for Knowledge base - mirrors their desktop
     positions, and keeps the two lines visibly apart). Above 860px this is
     a no-op and the short arrows work exactly as they did before. */
  var ecoInfra = document.querySelector(".eco__infra");
  var ecoAiCard = document.querySelector(".eco__card--accent");
  var ecoSupport = document.querySelector(".eco__support");
  var ecoSupportItems = document.querySelectorAll(".eco__support-item");
  if (ecoInfra && ecoAiCard && ecoSupport && ecoSupportItems.length === 2) {
    var ecoFeeds = [
      { item: ecoSupportItems[0], side: "left" },
      { item: ecoSupportItems[1], side: "right" }
    ]
      .map(function (f) {
        var arrow = f.item.querySelector(".eco__link--up");
        var card = f.item.querySelector(".eco__card");
        return arrow && card ? { arrow: arrow, card: card, side: f.side } : null;
      })
      .filter(Boolean);

    var resetEcoFeeds = function () {
      ecoSupport.classList.remove("has-long-connectors");
      ecoFeeds.forEach(function (f) {
        f.arrow.classList.remove("eco__link--long");
        f.arrow.style.position = "";
        f.arrow.style.top = "";
        f.arrow.style.height = "";
        f.arrow.style.left = "";
        f.arrow.style.right = "";
      });
    };

    var layoutEcoFeeds = function () {
      if (!window.matchMedia("(max-width: 860px)").matches) {
        resetEcoFeeds();
        return;
      }
      var infraRect = ecoInfra.getBoundingClientRect();
      var aiBottom = ecoAiCard.getBoundingClientRect().bottom - infraRect.top;
      var clearance = 8; // breathing room off both the card and the arrowhead's target edge

      /* Read every card's position before writing anything: taking the
         first arrow out of flow shifts its own card (and the grid row
         after it) upward immediately, which would make a card read here
         after that write already stale - measure-then-mutate in two
         separate passes avoids that entirely. */
      /* `left` on an absolutely positioned element resolves against the
         containing block's padding box, so the frame's border has to come
         out of the maths for the arrow to line up with tile geometry. */
      var infraBorderLeft = parseFloat(getComputedStyle(ecoInfra).borderLeftWidth) || 0;
      var padBoxLeft = infraRect.left + infraBorderLeft;
      var inset = 12; // how far inside its own tile's right edge each line runs

      var targets = ecoFeeds
        .map(function (f) {
          var cardRect = f.card.getBoundingClientRect();
          var top = aiBottom + clearance;
          return {
            f: f,
            top: top,
            height: cardRect.top - infraRect.top - clearance - top,
            /* Sits just inside its own source tile, which is what ties the
               line to the box it comes from. The staggered tile insets in
               CSS are what let it clear the tiles in between: each arrow is
               further right than the tiles it has to pass. */
            left: cardRect.right - inset - padBoxLeft
          };
        })
        .filter(function (t) { return t.height > 0; }); // else mid-reflow; next pass corrects it

      targets.forEach(function (t) {
        t.f.arrow.classList.add("eco__link--long");
        t.f.arrow.style.position = "absolute";
        t.f.arrow.style.top = t.top + "px";
        t.f.arrow.style.height = t.height + "px";
        t.f.arrow.style.left = t.left + "px";
        t.f.arrow.style.right = "auto";
      });
      ecoSupport.classList.add("has-long-connectors");
    };

    layoutEcoFeeds();
    window.addEventListener("load", layoutEcoFeeds);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(layoutEcoFeeds);
    }

    /* The containing section is itself a .reveal: it slides up 18px over
       0.5s (see .reveal/.reveal.is-in) the moment it scrolls into view.
       getBoundingClientRect() reflects that transform at whatever point
       mid-transition it's called, so a measurement taken while it's still
       animating is reading a moving target - confirmed live: two
       measurements 100ms apart during the transition disagreed by ~24px.
       Re-running once the transition actually finishes is what makes the
       result trustworthy; the calls above still fire for the
       reduced-motion path, where .is-in lands with no transition at all
       and the very first measurement is already correct. */
    var ecoSection = document.getElementById("fit");
    if (ecoSection) {
      ecoSection.addEventListener("transitionend", function (e) {
        if (e.target === ecoSection) layoutEcoFeeds();
      });
    }

    var ecoFeedsResize = null;
    window.addEventListener("resize", function () {
      window.clearTimeout(ecoFeedsResize);
      ecoFeedsResize = window.setTimeout(layoutEcoFeeds, 150);
    });
  }
})();

/* =================================================================
   Gated demo video ([data-vid-root] component)
   Soft e-mail gate, ported from the product video on claimsense.app. Every play path
   (centre button, control-bar toggle, click on the stage) ends in play(), so one guard
   covers them all; it opens the dialog until the visitor has given a work e-mail.
   Config comes from data attributes on the root (src, src-small, subject, source, form-id).
   The <video> has no src until the gate is unlocked, so no mp4 is fetched before that and
   only one file is ever chosen (matchMedia, 640px, keep in sync with the CSS breakpoint).
   Only an unlock flag + timestamp is stored, never the e-mail. */
(function () {
  var GATE_KEY = "ci_video_gate_v1";
  var SMALL = "(max-width: 640px)";

  var ICON_PLAY = '<svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
  var ICON_PAUSE = '<svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';
  var ICON_VOL = '<svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/></svg>';
  var ICON_MUTED = '<svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';

  /* Consumer mailbox providers common in our European markets, plus the global ones and the
     throwaway services (same list as claimsense.app). A hit is not a hard error: the visitor
     is asked for a work address instead. Exact domains only, no pattern guessing. */
  var FREE_MAIL = ("gmail.com googlemail.com yahoo.com yahoo.co.uk yahoo.de yahoo.fr yahoo.es yahoo.it " +
    "yahoo.ie yahoo.gr yahoo.se yahoo.dk yahoo.no yahoo.pl yahoo.com.br ymail.com rocketmail.com " +
    "hotmail.com hotmail.co.uk hotmail.de hotmail.fr hotmail.es hotmail.it hotmail.se hotmail.be hotmail.nl " +
    "outlook.com outlook.de outlook.fr outlook.es outlook.it outlook.cz outlook.pt live.com live.co.uk " +
    "live.de live.fr live.it live.nl live.se live.dk msn.com passport.com " +
    "icloud.com me.com mac.com aol.com aim.com " +
    "proton.me protonmail.com protonmail.ch pm.me tuta.com tutanota.com tutanota.de hushmail.com " +
    "zoho.com fastmail.com fastmail.fm hey.com mail.com email.com usa.com " +
    "gmx.de gmx.net gmx.at gmx.ch gmx.com gmx.co.uk web.de t-online.de freenet.de arcor.de " +
    "posteo.de mailbox.org 1und1.de " +
    "orange.fr wanadoo.fr free.fr laposte.net sfr.fr neuf.fr bbox.fr numericable.fr aliceadsl.fr " +
    "libero.it virgilio.it alice.it tiscali.it tin.it inwind.it fastwebnet.it email.it " +
    "terra.es telefonica.net ono.com ya.com " +
    "sapo.pt iol.pt clix.pt netcabo.pt " +
    "seznam.cz email.cz centrum.cz centrum.sk volny.cz post.cz atlas.cz tiscali.cz quick.cz " +
    "azet.sk zoznam.sk pobox.sk " +
    "wp.pl onet.pl onet.eu op.pl o2.pl interia.pl interia.eu gazeta.pl poczta.fm poczta.onet.pl " +
    "freemail.hu citromail.hu indamail.hu vipmail.hu " +
    "abv.bg mail.bg dir.bg " +
    "yahoo.ro mail.ru inbox.ru list.ru bk.ru yandex.com yandex.ru ya.ru rambler.ru ukr.net " +
    "telenet.be skynet.be proximus.be scarlet.be voo.be " +
    "ziggo.nl kpnmail.nl home.nl hetnet.nl xs4all.nl planet.nl chello.nl casema.nl " +
    "bluewin.ch sunrise.ch hispeed.ch gmx.li " +
    "aon.at chello.at a1.net " +
    "telia.com telia.se spray.se bredband.net comhem.se " +
    "online.no broadpark.no getmail.no start.no " +
    "mail.dk sol.dk stofanet.dk post.tele.dk " +
    "luukku.com suomi24.fi elisanet.fi saunalahti.fi kolumbus.fi " +
    "mail.ee hot.ee inbox.lv one.lv mail.lt " +
    "eircom.net btinternet.com virginmedia.com sky.com talktalk.net ntlworld.com blueyonder.co.uk " +
    "mailinator.com guerrillamail.com 10minutemail.com yopmail.com temp-mail.org trashmail.com " +
    "sharklasers.com getnada.com dispostable.com maildrop.cc").split(" ");
  var FREE_MAIL_SET = {};
  FREE_MAIL.forEach(function (d) { FREE_MAIL_SET[d] = 1; });
  var isFreeMail = function (addr) {
    var at = String(addr).lastIndexOf("@");
    if (at < 0) return false;
    return FREE_MAIL_SET[String(addr).slice(at + 1).trim().toLowerCase()] === 1;
  };

  /* The flag is the only thing stored. Storage can throw outright (private windows,
     blocked site data), so every access is guarded; blocked storage just means the gate shows again. */
  var readGate = function () {
    try { if (localStorage.getItem(GATE_KEY)) return true; } catch (e) {}
    try { if (document.cookie.indexOf(GATE_KEY + "=1") !== -1) return true; } catch (e) {}
    return false;
  };
  var saveGate = function () {
    try { localStorage.setItem(GATE_KEY, JSON.stringify({ t: Date.now() })); } catch (e) {}
    try { document.cookie = GATE_KEY + "=1; max-age=31536000; path=/; SameSite=Lax"; } catch (e) {}
  };
  var track = function (name, params) {
    try { if (typeof gtag === "function") gtag("event", name, params || {}); } catch (e) {}
  };
  var fmt = function (s) {
    if (!isFinite(s) || s < 0) s = 0;
    var m = Math.floor(s / 60), r = Math.floor(s % 60);
    return m + ":" + (r < 10 ? "0" : "") + r;
  };

  var initVideo = function (root) {
    var $ = function (sel) { return root.querySelector(sel); };
    var frame = $("[data-vid-frame]");
    var stage = $("[data-vid-stage]");
    var video = $("[data-vid-el]");
    var playLayer = $("[data-vid-playlayer]");
    var playBtn = $("[data-vid-play]");
    var controls = $("[data-vid-controls]");
    var toggle = $("[data-vid-toggle]");
    var seek = $("[data-vid-seek]");
    var timeEl = $("[data-vid-time]");
    var muteBtn = $("[data-vid-mute]");
    var fsBtn = $("[data-vid-fs]");
    var badge = $("[data-vid-badge]");
    var lock = $("[data-vid-lock]");
    var cta = $("[data-vid-cta]");
    var gate = $("[data-vid-gate]");
    var form = $("[data-vid-gate-form]");
    var emailEl = $("[data-vid-gate-email]");
    var errEl = $("[data-vid-gate-error]");
    var closeBtn = $("[data-vid-gate-close]");
    if (!(frame && stage && video && playBtn && controls && toggle && seek && gate && form && emailEl)) return;

    var unlocked = readGate();
    var wantPlay = false;
    var playPromise = null;

    /* Hidden fields come from the data attributes, so a second page only changes the markup. */
    form.elements.subject.value = root.getAttribute("data-vid-subject") || "";
    form.elements.source.value = root.getAttribute("data-vid-source") || "";
    form.elements.page.value = window.location.pathname;

    /* Returning visitor: no badge, no lock line, no dialog. */
    var hideGateUi = function () {
      if (badge) badge.hidden = true;
      if (lock) lock.hidden = true;
    };
    if (unlocked) hideGateUi();

    if (!(stage.requestFullscreen || stage.webkitRequestFullscreen || video.webkitEnterFullscreen)) fsBtn.hidden = true;

    /* --- Render: play button, control bar, labels. All driven from the real media state --- */
    var render = function () {
      var started = frame.classList.contains("is-started");
      var playing = started && !video.paused && !video.ended;
      playLayer.hidden = playing;
      controls.hidden = !started;
      toggle.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
      toggle.setAttribute("aria-label", playing ? "Pause" : "Play");
      muteBtn.innerHTML = video.muted ? ICON_MUTED : ICON_VOL;
      muteBtn.setAttribute("aria-label", video.muted ? "Unmute" : "Mute");
    };
    var renderTime = function () {
      var d = video.duration;
      var t = video.currentTime || 0;
      timeEl.textContent = fmt(t) + " / " + fmt(d);
      if (isFinite(d) && d > 0) seek.value = String((t / d) * 100);
      seek.setAttribute("aria-valuetext", fmt(t) + " of " + fmt(d));
    };

    /* --- Playback intent. play() resolves late; a pause issued before then must still win --- */
    var reconcile = function () {
      if (wantPlay && video.paused) { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
      else if (!wantPlay && !video.paused) video.pause();
    };
    var play = function () {
      if (!unlocked) { openGate(); return; }
      if (!video.getAttribute("src")) {
        /* Only now does the browser learn the file name, and only one of the two is chosen. */
        var small = window.matchMedia(SMALL).matches;
        var src = (small && root.getAttribute("data-vid-src-small")) || root.getAttribute("data-vid-src");
        video.setAttribute("src", src);
      }
      frame.classList.add("is-started");
      if (video.ended) video.currentTime = 0;
      wantPlay = true;
      var p = video.play();
      playPromise = p && p.then ? p : null;
      if (playPromise) playPromise.then(function () { playPromise = null; reconcile(); }, function () { playPromise = null; reconcile(); });
      render();
    };
    var pause = function () {
      wantPlay = false;
      if (playPromise) playPromise.then(reconcile, reconcile);
      else video.pause();
      render();
    };
    var toggleVideo = function () { if (wantPlay) pause(); else play(); };

    playBtn.addEventListener("click", play);
    toggle.addEventListener("click", toggleVideo);
    stage.addEventListener("click", function (e) {
      if (e.target.closest("[data-vid-controls]") || e.target.closest("[data-vid-play]")) return;
      toggleVideo();
    });
    ["play", "pause", "ended", "volumechange", "loadedmetadata", "durationchange"].forEach(function (n) {
      video.addEventListener(n, function () {
        if (n === "pause" || n === "ended") wantPlay = false;
        render();
        renderTime();
      });
    });
    video.addEventListener("timeupdate", renderTime);
    seek.addEventListener("input", function () {
      if (isFinite(video.duration)) video.currentTime = (seek.value / 100) * video.duration;
    });
    muteBtn.addEventListener("click", function () { video.muted = !video.muted; render(); });
    fsBtn.addEventListener("click", function () {
      var d = document;
      if (d.fullscreenElement || d.webkitFullscreenElement) {
        (d.exitFullscreen || d.webkitExitFullscreen).call(d);
      } else if (stage.requestFullscreen) stage.requestFullscreen();
      else if (stage.webkitRequestFullscreen) stage.webkitRequestFullscreen();
      else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
    });

    /* --- Dialog --- */
    var showError = function (msg) {
      errEl.textContent = msg;
      errEl.hidden = false;
    };
    var closeGate = function (focusBack) {
      if (gate.hidden) return;
      gate.hidden = true;
      document.documentElement.classList.remove("vid-gate-open");
      if (focusBack) { try { playBtn.focus(); } catch (e) {} }
    };
    var openGate = function () {
      if (unlocked || !gate.hidden) return;
      gate.hidden = false;
      document.documentElement.classList.add("vid-gate-open");
      errEl.hidden = true;
      track("video_gate_open");
      try { emailEl.focus(); } catch (e) {}
    };
    closeBtn.addEventListener("click", function () { closeGate(true); });
    /* A click on the dimmed backdrop (not inside the box) closes it. */
    gate.addEventListener("click", function (e) { if (e.target === gate) closeGate(true); });
    gate.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.stopPropagation(); closeGate(true); return; }
      if (e.key !== "Tab") return;
      var f = Array.prototype.slice.call(gate.querySelectorAll("button:not([disabled]), input[type=email], a[href]"));
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    emailEl.addEventListener("input", function () { errEl.hidden = true; });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (form.__busy) return;
      var val = String(emailEl.value || "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        showError("Please enter a valid email address.");
        return;
      }
      if (isFreeMail(val)) {
        showError("That looks like a personal address. Please use your work email.");
        track("video_gate_freemail");
        return;
      }
      var btn = form.querySelector("button[type=submit]");
      var label = btn.textContent;
      var release = function () { form.__busy = false; btn.disabled = false; btn.textContent = label; };
      form.__busy = true;
      btn.disabled = true;
      btn.textContent = "Sending…";
      errEl.hidden = true;
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      var fail = function () { release(); showError("Something went wrong. Please try again or email us directly."); };
      fetch(form.getAttribute("action"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data)
      })
        .then(function (res) { return res.json(); })
        .then(function (result) {
          if (!(result && result.success)) { fail(); return; }
          release();
          unlocked = true;
          saveGate();
          hideGateUi();
          track("video_gate_submit");
          /* GA4 conversion for ad measurement and audience exclusion. No form data is sent. */
          track("generate_lead", { form_id: root.getAttribute("data-vid-form-id") || "video_gate" });
          closeGate(false);
          if (cta) cta.hidden = false;
          /* Safari can refuse play() this long after the click; the centre button then stays up
             and the next click starts it. The gate is already done either way. */
          play();
          try { (frame.classList.contains("is-started") ? toggle : playBtn).focus(); } catch (err) {}
        })
        .catch(fail);
    });

    render();
    renderTime();
  };

  document.querySelectorAll("[data-vid-root]").forEach(initVideo);
})();
