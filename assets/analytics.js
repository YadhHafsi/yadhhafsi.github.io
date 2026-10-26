/* Google Analytics 4 with an opt-in consent banner.
   The Google tag loads only after the visitor clicks "Accept".
   The choice is kept in localStorage under "ga-consent". */
(function () {
  "use strict";
  var GA_ID = "G-SCHBRNWWDH";
  var KEY = "ga-consent";

  function read() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function write(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  function loadAnalytics() {
    if (window.__gaLoaded) return;
    window.__gaLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", GA_ID, { anonymize_ip: true });
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    document.head.appendChild(s);
  }

  function showBanner() {
    var bar = document.createElement("div");
    bar.className = "consent";
    bar.setAttribute("role", "dialog");
    bar.setAttribute("aria-label", "Cookie consent");
    bar.innerHTML =
      '<p>This site uses Google Analytics to count visits. It sets cookies only if you accept.</p>' +
      '<div class="consent-actions">' +
      '<button type="button" class="consent-decline">Decline</button>' +
      '<button type="button" class="consent-accept">Accept</button>' +
      '</div>';
    document.body.appendChild(bar);
    bar.querySelector(".consent-accept").addEventListener("click", function () {
      write("granted"); bar.remove(); loadAnalytics();
    });
    bar.querySelector(".consent-decline").addEventListener("click", function () {
      write("denied"); bar.remove();
    });
  }

  var state = read();
  if (state === "granted") loadAnalytics();
  else if (state !== "denied") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", showBanner);
    else showBanner();
  }
})();
