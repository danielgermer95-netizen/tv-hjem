(function () {
  "use strict";
  var C = window.TV_CONFIG;
  var $ = function (id) { return document.getElementById(id); };
  var HAS_TIZEN = typeof window.tizen !== "undefined";
  var DEMO = /[?&]demo/.test(location.search);

  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }

  /* ---------- Skalering til skærmen ---------- */
  function fit() {
    var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    var st = $("stage");
    st.style.transform = "scale(" + s + ")";
    st.style.left = (window.innerWidth - 1920 * s) / 2 + "px";
    st.style.top = (window.innerHeight - 1080 * s) / 2 + "px";
  }
  window.addEventListener("resize", fit); fit();

  /* ---------- Ur ---------- */
  var DAGE = ["søndag", "mandag", "tirsdag", "onsdag", "torsdag", "fredag", "lørdag"];
  var DAGE_K = ["Søn", "Man", "Tir", "Ons", "Tor", "Fre", "Lør"];
  var MDR = ["januar", "februar", "marts", "april", "maj", "juni", "juli", "august", "september", "oktober", "november", "december"];
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function tick() {
    var d = new Date();
    $("clock").textContent = pad(d.getHours()) + ":" + pad(d.getMinutes());
    var dn = DAGE[d.getDay()]; $("date").textContent = dn.charAt(0).toUpperCase() + dn.slice(1) + " " + d.getDate() + ". " + MDR[d.getMonth()];
  }
  tick(); setInterval(tick, 5000);

  /* ---------- Ikoner ---------- */
  var SUN = '<circle cx="32" cy="32" r="11" fill="#FFD25A"/><g stroke="#FFD25A" stroke-width="4" stroke-linecap="round"><path d="M32 6v7M32 51v7M6 32h7M51 32h7M13.6 13.6l5 5M45.4 45.4l5 5M13.6 50.4l5-5M45.4 18.6l5-5"/></g>';
  var MOON = '<path d="M40 10a22 22 0 1 0 14 34A18 18 0 0 1 40 10z" fill="#E6E9FF"/>';
  var CLOUD = function (x, y, c) { return '<path transform="translate(' + x + ' ' + y + ')" d="M18 44h28a12 12 0 0 0 0-24 16 16 0 0 0-30-4A12 12 0 0 0 18 44z" fill="' + (c || "#EEF2FA") + '"/>'; };
  function icon(code, day) {
    var s = '<svg viewBox="0 0 64 64">';
    var sky = day === false ? MOON : SUN;
    if (code === 0) s += sky;
    else if (code <= 2) s += '<g transform="translate(-6 -8) scale(.85)">' + sky + '</g>' + CLOUD(2, 6);
    else if (code === 3) s += CLOUD(-4, -4, "#B9C3D6") + CLOUD(4, 6);
    else if (code === 45 || code === 48) s += CLOUD(0, -4, "#C9D1DF") + '<g stroke="#C9D1DF" stroke-width="4" stroke-linecap="round"><path d="M10 50h44M16 58h32"/></g>';
    else if ((code >= 71 && code <= 77) || code === 85 || code === 86) s += CLOUD(0, -6) + '<g fill="#fff"><circle cx="20" cy="50" r="3.5"/><circle cx="32" cy="56" r="3.5"/><circle cx="44" cy="50" r="3.5"/></g>';
    else if (code >= 95) s += CLOUD(0, -6, "#9AA6BE") + '<path d="M34 40l-8 12h7l-4 10 12-14h-7l4-8z" fill="#FFD25A"/>';
    else s += CLOUD(0, -6, "#C9D1DF") + '<g stroke="#6EC6FF" stroke-width="4" stroke-linecap="round"><path d="M20 46l-3 9M32 46l-3 9M44 46l-3 9"/></g>';
    return s + "</svg>";
  }
  function beskriv(c) {
    if (c === 0) return "Klart";
    if (c === 1) return "Overvejende klart";
    if (c === 2) return "Delvist skyet";
    if (c === 3) return "Overskyet";
    if (c === 45 || c === 48) return "Tåge";
    if (c >= 51 && c <= 57) return "Støvregn";
    if (c >= 61 && c <= 65) return c === 65 ? "Kraftig regn" : "Regn";
    if (c === 66 || c === 67) return "Isslag";
    if (c >= 71 && c <= 77) return "Sne";
    if (c >= 80 && c <= 82) return "Regnbyger";
    if (c === 85 || c === 86) return "Snebyger";
    if (c >= 95) return "Torden";
    return "";
  }

  /* ---------- Himmel efter vejr og tid ---------- */
  var THEMES = {
    nat:     ["#050914", "#111c3d", "#2a2f5a", "#141a33", "#0d1226", "#070a16", 1],
    gry:     ["#1c2350", "#7a5a8c", "#f0a37a", "#3a2c4f", "#271e3a", "#140f22", .3],
    dag:     ["#163c78", "#3f74b8", "#9cc0e4", "#33507a", "#243b5e", "#152640", 0],
    gra:     ["#4d5868", "#7b8697", "#b4bcc8", "#4a5462", "#363e4a", "#22282f", 0],
    gra_nat: ["#0b0f17", "#1b2230", "#2c3442", "#161b25", "#10141c", "#090c12", .1]
  };
  function theme(day, code, hour) {
    var name = !day ? (code >= 3 ? "gra_nat" : "nat") : (code >= 3 ? "gra" : ((hour < 9 || hour >= 16) ? "gry" : "dag"));
    var t = THEMES[name], r = document.documentElement.style;
    r.setProperty("--sky1", t[0]); r.setProperty("--sky2", t[1]); r.setProperty("--sky3", t[2]);
    r.setProperty("--hill1", t[3]); r.setProperty("--hill2", t[4]); r.setProperty("--hill3", t[5]);
    r.setProperty("--stars", t[6]);
    var p = $("precip"), wet = (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95,
        snow = (code >= 71 && code <= 77) || code === 85 || code === 86;
    p.className = snow ? "snow" : "";
    var n = wet || snow ? 70 : 0, html = "";
    for (var i = 0; i < n; i++) html += '<i style="left:' + (Math.random() * 1920 | 0) + 'px;animation-duration:' + (snow ? 6 + Math.random() * 6 : .7 + Math.random() * .5) + 's;animation-delay:-' + (Math.random() * 6).toFixed(2) + 's"></i>';
    p.innerHTML = html;
  }
  (function stars() {
    var h = "";
    for (var i = 0; i < 90; i++) h += '<i style="left:' + (Math.random() * 1920 | 0) + 'px;top:' + (Math.random() * 640 | 0) + 'px;animation-delay:-' + (Math.random() * 4).toFixed(1) + 's;opacity:' + (.3 + Math.random() * .7).toFixed(2) + '"></i>';
    $("stars").innerHTML = h;
  })();

  /* ---------- Vejr ---------- */
  function weatherUrl() {
    return "https://api.open-meteo.com/v1/forecast?latitude=" + C.lat + "&longitude=" + C.lon +
      "&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_gusts_10m,relative_humidity_2m,is_day" +
      "&hourly=temperature_2m,weather_code,precipitation_probability,is_day" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,sunrise,sunset" +
      "&timezone=Europe%2FCopenhagen&forecast_days=10&wind_speed_unit=ms";
  }
  function loadWeather() {
    if (DEMO) return render(demoData());
    var x = new XMLHttpRequest();
    x.open("GET", weatherUrl());
    x.timeout = 15000;
    x.onload = function () {
      try { var d = JSON.parse(x.responseText); d._t = Date.now(); store("vejr", d); render(d); }
      catch (e) { fallback(); }
    };
    x.onerror = x.ontimeout = fallback;
    x.send();
  }
  function fallback() { var d = store("vejr"); if (d) render(d, true); else $("now-desc").textContent = "Ingen forbindelse til vejret"; }

  function hhmm(iso) { return iso.slice(11, 16); }
  function render(d, old) {
    var c = d.current, now = new Date();
    $("city").textContent = C.by;
    var t = new Date(d._t || Date.now());
    $("updated").textContent = (old ? "Gemt " : "Opdateret ") + pad(t.getHours()) + ":" + pad(t.getMinutes());
    $("now-icon").innerHTML = icon(c.weather_code, !!c.is_day);
    $("now-temp").textContent = Math.round(c.temperature_2m) + "°";
    $("now-desc").textContent = beskriv(c.weather_code) + " · H:" + Math.round(d.daily.temperature_2m_max[0]) + "° L:" + Math.round(d.daily.temperature_2m_min[0]) + "°";
    $("now-stats").innerHTML =
      "<div><b>Føles som</b>" + Math.round(c.apparent_temperature) + "°</div>" +
      "<div><b>Vind</b>" + Math.round(c.wind_speed_10m) + " m/s (" + Math.round(c.wind_gusts_10m) + ")</div>" +
      "<div><b>Regn i dag</b>" + d.daily.precipitation_sum[0].toFixed(1) + " mm</div>" +
      "<div><b>Sol</b>" + hhmm(d.daily.sunrise[0]) + " – " + hhmm(d.daily.sunset[0]) + "</div>";

    // Time for time: næste 24 timer, hver 2. time
    var nowKey = d.current.time.slice(0, 13), start = 0;
    for (var i = 0; i < d.hourly.time.length; i++) if (d.hourly.time[i].slice(0, 13) === nowKey) { start = i; break; }
    var h = "";
    for (var k = 0; k < 12; k++) {
      var j = start + k * 2; if (j >= d.hourly.time.length) break;
      var pp = d.hourly.precipitation_probability[j];
      h += '<div class="hr"><div class="t">' + (k === 0 ? "Nu" : d.hourly.time[j].slice(11, 13)) + '</div>' +
        icon(d.hourly.weather_code[j], !!d.hourly.is_day[j]) +
        '<div class="v">' + Math.round(d.hourly.temperature_2m[j]) + '°</div>' +
        '<div class="p">' + (pp >= 20 ? pp + "%" : "") + '</div></div>';
    }
    $("hourly").innerHTML = h;

    // 10 dage
    var lo = Math.min.apply(null, d.daily.temperature_2m_min), hi = Math.max.apply(null, d.daily.temperature_2m_max), span = Math.max(1, hi - lo);
    var out = "";
    for (var n = 0; n < d.daily.time.length; n++) {
      var dt = new Date(d.daily.time[n] + "T12:00:00");
      var mn = d.daily.temperature_2m_min[n], mx = d.daily.temperature_2m_max[n];
      var l = (mn - lo) / span * 100, w = Math.max(4, (mx - mn) / span * 100);
      var p = d.daily.precipitation_probability_max[n], mm = d.daily.precipitation_sum[n];
      out += '<div class="day"><span class="n">' + (n === 0 ? "I dag" : DAGE_K[dt.getDay()] + " " + dt.getDate()) + '</span>' +
        icon(d.daily.weather_code[n], true) +
        '<span class="p">' + (p >= 20 ? p + "%" : "") + '</span>' +
        '<span class="lo">' + Math.round(mn) + '°</span>' +
        '<div class="bar"><span style="left:' + l + '%;width:' + w + '%"></span></div>' +
        '<span class="hi">' + Math.round(mx) + '°</span>' +
        '<span class="w">' + (mm >= 0.5 ? mm.toFixed(1) + " mm · " : "") + Math.round(d.daily.wind_speed_10m_max[n]) + " m/s</span></div>";
    }
    $("daily").innerHTML = out;
    theme(!!c.is_day, c.weather_code, now.getHours());
  }
  function demoData() {
    var t0 = new Date(); t0.setMinutes(0, 0, 0);
    var iso = function (d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":00"; };
    var codes = [2, 3, 61, 80, 1, 0, 3, 71, 2, 63], hourly = { time: [], temperature_2m: [], weather_code: [], precipitation_probability: [], is_day: [] };
    for (var i = 0; i < 48; i++) { var d = new Date(t0.getTime() + i * 3600e3); hourly.time.push(iso(d)); hourly.temperature_2m.push(5 + 3 * Math.sin(i / 4)); hourly.weather_code.push(codes[(i / 6 | 0) % 10]); hourly.precipitation_probability.push((i * 17) % 90); hourly.is_day.push(d.getHours() > 7 && d.getHours() < 16 ? 1 : 0); }
    var daily = { time: [], weather_code: codes, temperature_2m_max: [], temperature_2m_min: [], precipitation_sum: [], precipitation_probability_max: [], wind_speed_10m_max: [], sunrise: [], sunset: [] };
    for (var k = 0; k < 10; k++) { var dd = new Date(t0.getTime() + k * 864e5); var ds = iso(dd).slice(0, 10); daily.time.push(ds); daily.temperature_2m_max.push(7 + (k % 4)); daily.temperature_2m_min.push(1 + (k % 3) - (k === 7 ? 4 : 0)); daily.precipitation_sum.push([0, .4, 6.2, 3.1, 0, 0, 1.2, 2.5, 0, 8][k]); daily.precipitation_probability_max.push([10, 35, 90, 70, 5, 0, 40, 60, 15, 95][k]); daily.wind_speed_10m_max.push(4 + k % 5); daily.sunrise.push(ds + "T08:12"); daily.sunset.push(ds + "T15:51"); }
    return { _t: Date.now(), current: { time: iso(t0), temperature_2m: 6.4, apparent_temperature: 3.1, weather_code: 2, wind_speed_10m: 5.2, wind_gusts_10m: 11, relative_humidity_2m: 88, is_day: 1 }, hourly: hourly, daily: daily };
  }
  loadWeather(); setInterval(loadWeather, 15 * 60 * 1000);

  /* ---------- Toast ---------- */
  var toastT;
  function toast(msg) { var t = $("toast"); t.textContent = msg; t.classList.remove("hidden"); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.add("hidden"); }, 3500); }

  /* ---------- Apps på TV'et ---------- */
  var installed = [];
  function findApp(a) {
    for (var i = 0; i < installed.length; i++) if (a.match && a.match.test(installed[i].name)) return installed[i].id;
    return a.id;
  }
  function tileHtml(a) {
    var inner = {
      drtv: "DR<small>TV</small>", tv2play: "TV 2<small>PLAY</small>", netflix: "N", hbomax: "HBO<small>max</small>",
      prime: "prime<small>video</small>", disney: "<span>Disney<b>+</b></span>", viaplay: "viaplay", skyshow: "Sky<small>Showtime</small>",
      appletv: "tv", youtube: "<i></i>", spotify: "<i></i>", playstation: "PS5<small>HDMI " + C.playstationHdmi + "</small>"
    }[a.key] || a.navn;
    return '<div class="tile t-' + a.key + '" data-key="' + a.key + '">' + inner + '<span class="label">' + a.navn + '</span></div>';
  }
  var focus = store("fokus") || 0;
  function buildDock() {
    $("dock").innerHTML = C.apps.map(tileHtml).join("");
    markMissing(); setFocus(focus);
  }
  function markMissing() {
    if (!HAS_TIZEN || !installed.length) return;
    var tiles = $("dock").children;
    C.apps.forEach(function (a, i) { if (!a.hdmi && !findApp(a)) tiles[i].classList.add("missing"); });
  }
  function setFocus(i) {
    var tiles = $("dock").children, n = tiles.length;
    focus = (i + n) % n;
    for (var k = 0; k < n; k++) tiles[k].classList.toggle("focus", k === focus);
    store("fokus", focus);
  }
  function launch(key) {
    var a = C.apps.filter(function (x) { return x.key === key; })[0];
    if (!a) return;
    if (a.hdmi) return sendKey("KEY_HDMI" + C.playstationHdmi, "Tænd PlayStation – eller tryk PS-knappen på controlleren");
    if (!HAS_TIZEN) return toast("Åbn " + a.navn + " fra mobilen (Apps-fanen)");
    var id = findApp(a);
    if (!id) return toast(a.navn + " er ikke installeret");
    try {
      tizen.application.launch(id, null, function (e) { toast("Kunne ikke åbne " + a.navn + ": " + e.message); });
    } catch (e) { toast("Fejl: " + e.message); }
  }
  if (HAS_TIZEN) {
    try {
      tizen.application.getAppsInfo(function (list) { installed = list; markMissing(); }, function () {});
    } catch (e) {}
  }
  buildDock();

  /* ---------- TV'ets egen fjernbetjenings-API (til HDMI-skift) ---------- */
  function sendKey(key, fejltekst) {
    var name = btoa("TV Hjem"), token = store("rc_token"), urls = [
      "wss://127.0.0.1:8002/api/v2/channels/samsung.remote.control?name=" + name + (token ? "&token=" + token : ""),
      "ws://127.0.0.1:8001/api/v2/channels/samsung.remote.control?name=" + name
    ];
    (function attempt(i) {
      if (i >= urls.length) return toast(fejltekst || "Kunne ikke sende tastetryk");
      var done = false, ws;
      try { ws = new WebSocket(urls[i]); } catch (e) { return attempt(i + 1); }
      ws.onmessage = function (ev) {
        var m; try { m = JSON.parse(ev.data); } catch (e) { return; }
        if (m.event === "ms.channel.connect") {
          if (m.data && m.data.token) store("rc_token", m.data.token);
          ws.send(JSON.stringify({ method: "ms.remote.control", params: { Cmd: "Click", DataOfCmd: key, Option: "false", TypeOfRemote: "SendRemoteKey" } }));
          done = true; setTimeout(function () { ws.close(); }, 600);
        } else if (m.event === "ms.channel.unauthorized") { done = true; toast("Tillad 'TV Hjem' på TV'et og prøv igen"); }
      };
      ws.onerror = function () { if (!done) { done = true; attempt(i + 1); } };
      setTimeout(function () { if (!done) { done = true; try { ws.close(); } catch (e) {} attempt(i + 1); } }, 4000);
    })(0);
  }

  /* ---------- Fjernbetjening ---------- */
  document.addEventListener("keydown", function (e) {
    switch (e.keyCode) {
      case 37: setFocus(focus - 1); break;
      case 39: setFocus(focus + 1); break;
      case 13: launch(C.apps[focus].key); break;
      case 10009: // Tilbage: skjul beskeden
        $("note").classList.add("hidden"); store("note", null); break;
      default: return;
    }
    e.preventDefault();
  });

  /* ---------- Beskeder fra mobilen (ntfy.sh) ---------- */
  function showNote(n) {
    if (!n) return;
    $("note-img").src = n.img || "";
    $("note-text").textContent = n.text || "";
    var t = new Date(n.t);
    $("note-meta").textContent = "Fra mobilen · " + pad(t.getHours()) + ":" + pad(t.getMinutes());
    var el = $("note"); el.classList.add("hidden"); void el.offsetWidth; el.classList.remove("hidden");
  }
  showNote(store("note"));

  function handle(m) {
    if (m.event !== "message") return;
    if (m.title === "cmd") {
      var cmd = (m.message || "").split(":");
      if (cmd[0] === "launch") launch(cmd[1]);
      else if (cmd[0] === "key") sendKey(cmd[1]);
      else if (cmd[0] === "clear") { $("note").classList.add("hidden"); store("note", null); }
      return;
    }
    if (m.attachment && m.attachment.url) {
      // Gem billedet lokalt – ntfy sletter vedhæftninger efter nogle timer
      var x = new XMLHttpRequest();
      x.open("GET", m.attachment.url); x.responseType = "blob";
      x.onload = function () {
        var r = new FileReader();
        r.onload = function () { var n = { img: r.result, text: m.title === "note" ? "" : (m.message || ""), t: m.time * 1000 }; store("note", n); showNote(n); };
        r.readAsDataURL(x.response);
      };
      x.send();
      return;
    }
    var n = { text: m.message, t: m.time * 1000 }; store("note", n); showNote(n);
  }
  var es;
  function listen() {
    if (DEMO || !C.kanal || typeof EventSource === "undefined") return;
    try { if (es) es.close(); } catch (e) {}
    es = new EventSource("https://ntfy.sh/" + encodeURIComponent(C.kanal) + "/sse");
    es.onmessage = function (ev) { try { handle(JSON.parse(ev.data)); } catch (e) {} };
  }
  listen();

  /* Når appen kommer i forgrunden igen */
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) { tick(); loadWeather(); listen(); }
  });

  if (DEMO) showNote({ text: "Pizza i aften? 🍕", t: Date.now() });
})();
