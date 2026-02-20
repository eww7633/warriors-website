(function () {
  const cfg = window.WARRIOR_HQ_BAR_CONFIG || {};
  const bars = Array.from(document.querySelectorAll('[data-hq-bar="1"]'));
  if (!bars.length) return;

  const hqBase = (cfg.hqBaseUrl || "").replace(/\/+$/, "");
  const summaryUrl = cfg.sessionSummaryUrl || (hqBase ? hqBase + "/api/public/session-summary" : "");
  const logoutBase = cfg.logoutUrl || (hqBase ? hqBase + "/api/public/auth/logout" : "");

  function actionHtml(primary, secondary) {
    return (
      '<div class="warrior-hq-bar-actions">' +
      '<a class="warrior-hq-btn primary" href="' + primary.href + '">' + primary.label + "</a>" +
      '<a class="warrior-hq-btn secondary" href="' + secondary.href + '">' + secondary.label + "</a>" +
      "</div>"
    );
  }

  function setBar(bar, payload) {
    const status = bar.querySelector("[data-hq-status]");
    const actions = bar.querySelector("[data-hq-actions]");
    if (!actions || !status) return;
    if (!payload || !payload.actions) {
      status.textContent = "Guest";
      actions.innerHTML = actionHtml(
        { label: "Join", href: hqBase + "/join" },
        { label: "Log In", href: hqBase + "/login" }
      );
      return;
    }

    const primary = payload.actions.primary || { label: "Join", href: hqBase + "/join" };
    const secondary = payload.actions.secondary || { label: "Log In", href: hqBase + "/login" };

    if ((secondary.label || "").toLowerCase() === "log out") {
      const returnTo = encodeURIComponent(window.location.href);
      secondary.href = (logoutBase || hqBase + "/api/public/auth/logout") + "?returnTo=" + returnTo;
    }

    status.textContent = payload.loggedIn
      ? payload.user && payload.user.fullName
        ? "Signed in: " + payload.user.fullName
        : "Signed in"
      : "Guest";
    actions.innerHTML = actionHtml(primary, secondary);
  }

  if (!summaryUrl) {
    bars.forEach((bar) => setBar(bar, null));
    return;
  }

  fetch(summaryUrl, {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  })
    .then((res) => (res.ok ? res.json() : null))
    .then((payload) => {
      bars.forEach((bar) => setBar(bar, payload));
    })
    .catch(() => {
      bars.forEach((bar) => setBar(bar, null));
    });
})();
