(function () {
  "use strict";
  var C = window.TV_CONFIG;
  var $ = function (id) { return document.getElementById(id); };
  var HAS_TIZEN = typeof window.tizen !== "undefined";
  var DEMO = /[?&]demo/.test(location.search);

  /* Ældre installationer har en anden index.html – byg den nye beskedkolonne, hvis den mangler */
  (function upgradeDom() {
    if (document.getElementById("notes")) return;
    var old = document.getElementById("note"); if (old) old.parentNode.removeChild(old);
    var sec = document.createElement("section");
    sec.id = "notes"; sec.className = "glass";
    sec.innerHTML = '<div class="notes-head">Beskeder</div><div id="note-body">' +
      '<div id="note-empty">Ingen beskeder<br>Tegn eller skriv en fra mobilen ✍️</div>' +
      '<img id="note-img" src="" alt=""><div id="note-text"></div></div><div id="note-meta"></div>';
    var dock = document.getElementById("dock");
    dock.parentNode.insertBefore(sec, dock);
  })();

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
    var n = wet || snow ? 24 : 0, html = "";
    for (var i = 0; i < n; i++) html += '<i style="left:' + (Math.random() * 1920 | 0) + 'px;animation-duration:' + (snow ? 6 + Math.random() * 6 : .7 + Math.random() * .5) + 's;animation-delay:-' + (Math.random() * 6).toFixed(2) + 's"></i>';
    p.innerHTML = html;
  }
  (function stars() {
    var h = "";
    for (var i = 0; i < 60; i++) h += '<i style="left:' + (Math.random() * 1920 | 0) + 'px;top:' + (Math.random() * 640 | 0) + 'px;animation-delay:-' + (Math.random() * 4).toFixed(1) + 's;opacity:' + (.3 + Math.random() * .7).toFixed(2) + '"></i>';
    $("stars").innerHTML = h;
  })();

  /* ---------- Vejr ---------- */
  function weatherUrl() {
    return "https://api.open-meteo.com/v1/forecast?latitude=" + C.lat + "&longitude=" + C.lon +
      "&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_gusts_10m,relative_humidity_2m,is_day" +
      "&hourly=temperature_2m,weather_code,precipitation_probability,precipitation,wind_gusts_10m,is_day" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,sunrise,sunset" +
      "&timezone=Europe%2FCopenhagen&past_days=3&forecast_days=10&wind_speed_unit=ms";
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
    // De seneste dage (past_days) bruges kun til at vurdere, om vejene er saltede
    var today = c.time.slice(0, 10), off = d.daily.time.indexOf(today), pastMin = [];
    if (off > 0) {
      pastMin = d.daily.temperature_2m_min.slice(0, off);
      Object.keys(d.daily).forEach(function (k) { if (d.daily[k] && d.daily[k].slice) d.daily[k] = d.daily[k].slice(off); });
    }
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

    // ---------- MC-vejr ----------
    var nowKey = d.current.time.slice(0, 13), start = 0;
    for (var i = 0; i < d.hourly.time.length; i++) if (d.hourly.time[i].slice(0, 13) === nowKey) { start = i; break; }
    /* MC-vurdering (Honda CB650R, naked bike, sport-touring-dæk):
       Kulde: dæk mister greb under ~10°, bliver hårde under ~5° (Michelin)
       Vind: naked bike – vindstød over 11 m/s mærkes, over 15 m/s frarådes
       Salt: frost de seneste dage = sandsynligt saltede veje (ætser en ny cykel)
       Regn: våd + kold asfalt er det farligste */
    var MC = { koldNej: 5, koldMaaske: 10, vindMaaske: 11, vindNej: 15, regnMaaske: 30, regnNej: 60, mmMaaske: 0.2, mmNej: 1, frost: 1 };
    function gustOf(n) { return ((d.daily.wind_gusts_10m_max || d.daily.wind_speed_10m_max)[n]) || 0; }
    function salted(n) {
      var mins = pastMin.concat(d.daily.temperature_2m_min.slice(0, n + 1)).slice(-4);
      return mins.some(function (x) { return x <= MC.frost; });
    }
    function dom(n) {
      var p = d.daily.precipitation_probability_max[n] || 0, mm = d.daily.precipitation_sum[n] || 0;
      var tx = d.daily.temperature_2m_max[n], g = gustOf(n), bad = [], meh = [];
      if (tx < MC.koldNej) bad.push("For koldt"); else if (tx < MC.koldMaaske) meh.push("Kolde dæk");
      if (p >= MC.regnNej || mm >= MC.mmNej) bad.push("Regn"); else if (p >= MC.regnMaaske || mm >= MC.mmMaaske) meh.push("Byger");
      if (g >= MC.vindNej) bad.push("Blæst"); else if (g >= MC.vindMaaske) meh.push("Vindstød");
      if (salted(n)) meh.push("Salt på vejen");
      if (bad.length) return ["bad", "Nej", bad[0]];
      if (meh.length) return ["meh", "Måske", meh[0]];
      return ["good", "Godt", "Fint MC-vejr"];
    }
    // I dag: tidslinje for de næste 15 timer + bedste tørre vindue i dagslys
    var tl = "", lbl = "", best = null, run = null;
    for (var k = 0; k < 15; k++) {
      var j = start + k; if (j >= d.hourly.time.length) break;
      var pp = d.hourly.precipitation_probability[j] || 0, hh = +d.hourly.time[j].slice(11, 13);
      tl += '<i class="' + (pp >= 50 ? "bad" : pp >= 25 ? "meh" : "good") + '"></i>';
      lbl += '<span>' + (k % 3 === 0 ? (k === 0 ? "Nu" : pad(hh)) : "") + '</span>';
      var sr = +d.daily.sunrise[0].slice(11, 13), ss = +d.daily.sunset[0].slice(11, 13);
      var gh = d.hourly.wind_gusts_10m ? d.hourly.wind_gusts_10m[j] : 0;
      var dry = pp < 25 && hh >= sr && hh < ss && d.hourly.temperature_2m[j] >= MC.koldNej && gh < MC.vindNej;
      if (dry) { run = run || { s: hh, e: hh, t: [] }; run.e = hh; run.t.push(d.hourly.temperature_2m[j]); }
      if (!dry || k === 14) { if (run && (!best || run.e - run.s > best.e - best.s)) best = run; if (!dry) run = null; }
    }
    var v = dom(0), tip;
    if (best && best.e > best.s) tip = "Bedste tur: kl. " + pad(best.s) + "–" + pad(best.e + 1) + " · tørt · " + Math.round(Math.max.apply(null, best.t)) + "°";
    else if (best) tip = "Kun en kort tør periode omkring kl. " + pad(best.s);
    else tip = "Ingen gode perioder i dagslys de næste timer";
    tip = v[2] + " · " + tip;
    $("hourly").innerHTML =
      '<div class="mc-top"><span class="mc-title">MC-vejr i dag</span><span class="pill ' + v[0] + '">' + v[1] + '</span>' +
      (d.daily.temperature_2m_min[0] <= MC.frost ? '<span class="ice">Glat morgen</span>' : "") +
      (salted(0) ? '<span class="ice salt">Saltede veje</span>' : "") + '</div>' +
      '<div class="mc-tip">' + tip + '</div>' +
      '<div class="tl">' + tl + '</div><div class="tl lbl">' + lbl + '</div>';

    // 7 dage som kort
    var out = "";
    for (var n = 0; n < Math.min(7, d.daily.time.length); n++) {
      var dt = new Date(d.daily.time[n] + "T12:00:00"), vv = dom(n);
      var g = Math.round((d.daily.wind_gusts_10m_max || d.daily.wind_speed_10m_max)[n] || 0);
      out += '<div class="dc ' + vv[0] + '"><div class="dn">' + (n === 0 ? "I dag" : DAGE_K[dt.getDay()]) + '</div>' +
        icon(d.daily.weather_code[n], true) +
        '<div class="tx">' + Math.round(d.daily.temperature_2m_max[n]) + '°</div>' +
        '<div class="tn">' + Math.round(d.daily.temperature_2m_min[n]) + '°' + (d.daily.temperature_2m_min[n] <= MC.frost ? ' <b>glat</b>' : '') + '</div>' +
        '<div class="kv"><span>Regn</span>' + (d.daily.precipitation_probability_max[n] || 0) + '%</div>' +
        '<div class="kv"><span>Vind</span>' + g + ' m/s</div>' +
        '<div class="why">' + vv[2] + '</div>' +
        '<div class="vb">' + vv[1] + '</div></div>';
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
    for (var k = 0; k < 10; k++) { var dd = new Date(t0.getTime() + k * 864e5); var ds = iso(dd).slice(0, 10); daily.time.push(ds); daily.temperature_2m_max.push(7 + (k % 4)); daily.temperature_2m_min.push(1 + (k % 3) - (k === 7 ? 4 : 0)); daily.precipitation_sum.push([0, .4, 6.2, 3.1, 0, 0, 1.2, 2.5, 0, 8][k]); daily.precipitation_probability_max.push([10, 35, 90, 70, 5, 0, 40, 60, 15, 95][k]); daily.wind_speed_10m_max.push(4 + k % 5); (daily.wind_gusts_10m_max = daily.wind_gusts_10m_max || []).push(8 + (k * 3) % 12); daily.sunrise.push(ds + "T08:12"); daily.sunset.push(ds + "T15:51"); }
    return { _t: Date.now(), current: { time: iso(t0), temperature_2m: 6.4, apparent_temperature: 3.1, weather_code: 2, wind_speed_10m: 5.2, wind_gusts_10m: 11, relative_humidity_2m: 88, is_day: 1 }, hourly: hourly, daily: daily };
  }
  loadWeather(); setInterval(loadWeather, 15 * 60 * 1000);

  /* ---------- Toast ---------- */
  var toastT;
  function toast(msg) { var t = $("toast"); t.textContent = msg; t.classList.remove("hidden"); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.add("hidden"); }, 3500); }

  /* ---------- Apps på TV'et ---------- */
  // config.js på TV'et opdateres ikke automatisk – ret søgningen efter HBO her
  C.apps.forEach(function (a) { if (a.key === "hbomax") a.match = /hbo|^max\b/i; });
  var installed = [];
  function findInfo(a) {
    for (var i = 0; i < installed.length; i++) if (a.match && a.match.test(installed[i].name)) return installed[i];
    return null;
  }
  function findApp(a) { var f = findInfo(a); return f ? f.id : a.id; }
  function tileHtml(a) {
    var inner = {
      drtv: "DR<small>TV</small>", tv2play: "TV 2<small>PLAY</small>", netflix: "N", hbomax: "HBO<small>max</small>",
      prime: "prime<i></i><small>video</small>", disney: "<span>Disney<b>+</b></span>", viaplay: "viaplay", skyshow: "Sky<small>Showtime</small>",
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
    C.apps.forEach(function (a, i) {
      if (a.hdmi) return;
      if (!findApp(a)) return tiles[i].classList.add("missing");
      // Brug appens rigtige ikon fra TV'et
      if (a.key === "youtube") return; // TV'et giver YouTube et forkert standard-ikon
      var info = findInfo(a), src = info && info.iconPath;
      if (!src) return;
      if (src.indexOf("://") < 0) src = "file://" + src;
      var img = new Image();
      img.onload = function () {
        tiles[i].classList.add("real");
        tiles[i].innerHTML = '<img src="' + src + '" alt=""><span class="label">' + a.navn + '</span>';
      };
      img.src = src;
    });
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
      tizen.application.getAppsInfo(function (list) { installed = list; markMissing(); publishApps(); }, function () {});
    } catch (e) {}
  }
  buildDock();

  /* Send TV'ets egne app-ID'er til mobilen, så den kan åbne apps med de rigtige ID'er */
  function publishApps() {
    if (!C.kanal || !installed.length) return;
    var out = {};
    C.apps.forEach(function (a) { var f = findInfo(a); if (f) out[a.key] = f.id; });
    var all = installed.map(function (x) { return x.name + "|" + x.id; }).filter(function (s) { return s.length < 120; }).slice(0, 80);
    try {
      var x = new XMLHttpRequest();
      x.open("POST", "https://ntfy.sh/" + encodeURIComponent(C.kanal));
      x.setRequestHeader("Title", "apps");
      x.send(JSON.stringify({ ids: out, all: all }));
    } catch (e) {}
  }
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
    if (JV.open() && JV.key(e.keyCode)) { e.preventDefault(); return; }
    switch (e.keyCode) {
      case 37: setFocus(focus - 1); break;
      case 39: setFocus(focus + 1); break;
      case 13: launch(C.apps[focus].key); break;
      case 10009: // Tilbage: skjul beskeden
        clearNote(); break;
      default: return;
    }
    e.preventDefault();
  });

  /* ---------- Jarvis på TV'et: kugle, svar og forslag med plakater ---------- */
  var JV = (function () {
    var el = document.createElement("div"); el.id = "jv"; el.className = "hidden";
    el.innerHTML = '<canvas id="jv-orb" width="420" height="420"></canvas>' +
      '<div id="jv-pill"></div><div id="jv-q"></div><div id="jv-text"></div>' +
      '<div id="jv-head"></div><div id="jv-cards"></div><div id="jv-hint"></div>';
    $("stage").appendChild(el);
    var cv = el.querySelector("#jv-orb"), cx = cv.getContext("2d"), raf = 0, t0 = 0, hideT, items = [], sel = 0;
    // Partikel-kugle
    var P = [];
    for (var i = 0; i < 520; i++) {
      var u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u);
      P.push([r * Math.cos(th), u, r * Math.sin(th), Math.random()]);
    }
    var busy = false;
    function draw(ts) {
      if (!t0) t0 = ts;
      var tt = (ts - t0) / 1000, a = tt * (busy ? 0.9 : 0.35), ca = Math.cos(a), sa = Math.sin(a);
      var pulse = busy ? 1 + Math.sin(tt * 3) * 0.05 : 1;
      cx.clearRect(0, 0, 420, 420);
      for (var i = 0; i < P.length; i++) {
        var p = P[i], x = p[0] * ca - p[2] * sa, z = p[0] * sa + p[2] * ca, y = p[1];
        var s = 150 * pulse * (1 + 0.04 * Math.sin(tt * 2 + p[3] * 6)), d = (z + 1.6) / 2.6;
        cx.fillStyle = "rgba(" + (90 + 80 * d | 0) + "," + (150 + 70 * d | 0) + ",255," + (0.25 + 0.75 * d).toFixed(2) + ")";
        cx.fillRect(210 + x * s, 210 + y * s, 2.4 * d + 0.6, 2.4 * d + 0.6);
      }
      raf = requestAnimationFrame(draw);
    }
    function openUI() {
      el.classList.remove("hidden");
      if (!raf) raf = requestAnimationFrame(draw);
    }
    function close() {
      el.classList.add("hidden"); cancelAnimationFrame(raf); raf = 0; t0 = 0; clearTimeout(hideT); items = [];
    }
    function autoHide(sec) { clearTimeout(hideT); hideT = setTimeout(close, sec * 1000); }
    function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
    // Plakater fra Apples filmkatalog (ingen nøgle nødvendig)
    function poster(title, year, img) {
      var cb = "__jvp" + Math.random().toString(36).slice(2), s = document.createElement("script");
      window[cb] = function (res) {
        delete window[cb]; if (s.parentNode) s.parentNode.removeChild(s);
        var list = (res && res.results) || [], best = null;
        for (var i = 0; i < list.length; i++) {
          var y = +(list[i].releaseDate || "").slice(0, 4);
          if (!best || (year && Math.abs(y - year) < Math.abs(+(best.releaseDate || "").slice(0, 4) - year))) best = list[i];
        }
        if (best && best.artworkUrl100) img.src = best.artworkUrl100.replace(/\/\d+x\d+bb\./, "/400x600bb.");
      };
      s.src = "https://itunes.apple.com/search?media=movie&country=dk&limit=5&term=" + encodeURIComponent(title) + "&callback=" + cb;
      s.onerror = function () { delete window[cb]; };
      document.head.appendChild(s);
    }
    var SERVICE = [[/netflix/i, "netflix"], [/hbo|max/i, "hbomax"], [/prime|amazon/i, "prime"], [/disney/i, "disney"],
      [/viaplay/i, "viaplay"], [/sky\s?show/i, "skyshow"], [/apple/i, "appletv"], [/dr\b|drtv/i, "drtv"], [/tv\s?2/i, "tv2play"], [/youtube/i, "youtube"]];
    function serviceKey(s) { for (var i = 0; i < SERVICE.length; i++) if (SERVICE[i][0].test(s || "")) return SERVICE[i][1]; return null; }
    function renderCards() {
      var c = el.querySelector("#jv-cards");
      for (var i = 0; i < c.children.length; i++) c.children[i].classList.toggle("sel", i === sel);
    }
    function show(d) {
      openUI();
      el.className = "st-" + (d.state || "answer");
      busy = d.state === "thinking";
      el.querySelector("#jv-pill").textContent = d.state === "thinking" ? "Jarvis tænker…" : "Jarvis";
      el.querySelector("#jv-q").textContent = d.question ? "“" + d.question + "”" : "";
      el.querySelector("#jv-text").textContent = d.text || "";
      el.querySelector("#jv-head").textContent = d.heading || "";
      var c = el.querySelector("#jv-cards"); c.innerHTML = ""; items = d.items || []; sel = 0;
      items.slice(0, 6).forEach(function (it) {
        var card = document.createElement("div"); card.className = "jv-card";
        card.innerHTML = '<div class="jv-poster"><img alt=""><span>' + esc(it.title) + '</span></div>' +
          '<div class="jv-t">' + esc(it.title) + (it.year ? ' <em>' + esc(it.year) + '</em>' : "") + '</div>' +
          '<div class="jv-s">' + esc(it.service || "") + '</div><div class="jv-w">' + esc(it.why || "") + '</div>';
        c.appendChild(card);
        var img = card.querySelector("img"); img.onload = function () { card.classList.add("has-img"); };
        poster(it.title, +it.year || 0, img);
      });
      renderCards();
      el.querySelector("#jv-hint").textContent = items.length ? "← → vælg · OK åbn · Tilbage luk" : "";
      if (d.state === "thinking") autoHide(40);
      else autoHide(items.length ? 120 : 15);
    }
    function key(code) {
      if (code === 10009 || code === 8 || code === 27) { close(); return true; }
      if (!items.length) return false;
      if (code === 37) { sel = Math.max(0, sel - 1); renderCards(); return true; }
      if (code === 39) { sel = Math.min(Math.min(items.length, 6) - 1, sel + 1); renderCards(); return true; }
      if (code === 13) {
        var k = serviceKey(items[sel].service);
        if (k) { close(); launch(k); } else toast("Ved ikke hvilken app " + items[sel].title + " ligger på");
        return true;
      }
      return false;
    }
    return { show: show, key: key, open: function () { return !el.classList.contains("hidden"); }, close: close };
  })();

  /* ---------- Beskeder fra mobilen (ntfy.sh) ---------- */
  function showNote(n) {
    if (!n) return clearNote();
    $("note-empty").style.display = "none";
    $("note-img").src = n.img || "";
    $("note-text").textContent = n.text || "";
    var t = new Date(n.t);
    $("note-meta").textContent = "Fra mobilen · " + pad(t.getHours()) + ":" + pad(t.getMinutes());
    var el = $("note-body"); el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop");
  }
  function clearNote() {
    store("note", null);
    $("note-img").src = ""; $("note-text").textContent = ""; $("note-meta").textContent = "";
    $("note-empty").style.display = "";
  }
  // Ryd en gammel app-liste, der ved en fejl blev vist som besked
  (function () { var n = store("note"); if (n && n.text && /^\{"ids"/.test(n.text)) store("note", null); })();
  showNote(store("note"));

  function handle(m) {
    if (m.event !== "message") return;
    if (m.title === "apps") return; // Hjems egen app-liste til mobilen – ikke en besked
    if (m.title === "jarvis") {
      if (!m.time || Date.now() / 1000 - m.time > 60) return;
      try { JV.show(JSON.parse(m.message)); } catch (e) {}
      return;
    }
    if (m.title === "cmd") {
      // Kun nye kommandoer, mens Hjem er synlig – ellers udføres gamle tryk, når Hjem kommer frem
      if (document.hidden || !m.time || Date.now() / 1000 - m.time > 15) return;
      var cmd = (m.message || "").split(":");
      if (cmd[0] === "launch") return; // App-start sker nu direkte fra mobilen
      else if (cmd[0] === "key") sendKey(cmd[1]);
      else if (cmd[0] === "clear") clearNote();
      return;
    }
    if (m.attachment && m.attachment.url) {
      var cap = (m.title === "note" || /^You received a file/.test(m.message || "") || m.message === "GIF") ? "" : (m.message || "");
      var show = function (src, keep) {
        var n = { img: src, text: cap, t: m.time * 1000 };
        showNote(n);
        // Gem til næste opstart. Store GIF'er kan være for store til at gemme – så gemmes linket i stedet.
        try { store("note", keep ? n : { img: m.attachment.url, text: cap, t: n.t }); } catch (e) {}
      };
      var x = new XMLHttpRequest();
      x.open("GET", m.attachment.url); x.responseType = "blob";
      x.onload = function () {
        if (x.status !== 200 || !x.response) return show(m.attachment.url, false);
        var r = new FileReader();
        r.onload = function () { show(r.result, r.result.length < 2500000); };
        r.readAsDataURL(x.response);
      };
      x.onerror = function () { show(m.attachment.url, false); };
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
  if (/[?&]jv=/.test(location.search)) JV.show(/jv=think/.test(location.search) ? { state: "thinking", question: "Find en god film til date night" } :
    { state: "answer", text: "Her er fem bud på en hyggelig date night – alle med god kemi og et strejf af humor.", heading: "Til date night",
      items: [{ title: "La La Land", year: 2016, service: "Netflix", why: "Musik, kærlighed og flotte billeder" },
              { title: "Crazy, Stupid, Love", year: 2011, service: "HBO Max", why: "Sjov og varm" },
              { title: "About Time", year: 2013, service: "Prime Video", why: "Rørende med humor" },
              { title: "The Proposal", year: 2009, service: "Disney+", why: "Klassisk rom-com" },
              { title: "Past Lives", year: 2023, service: "Viaplay", why: "Stille og smuk" }] });
})();
