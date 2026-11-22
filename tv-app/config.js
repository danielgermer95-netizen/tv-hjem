// ===== Indstillinger – ret frit her =====
window.TV_CONFIG = {
  // Vejr (Aarhus)
  by: "Aarhus",
  lat: 56.1567,
  lon: 10.2108,

  // Hemmeligt "kanal-navn" som mobilen og TV'et deler (ntfy.sh).
  // Skal være det samme i mobil/index.html. Hold det for dig selv.
  kanal: "INDSAET-DIN-NOEGLE-HER",

  // Hvilket HDMI-indgangsnummer sidder PlayStation i? (1-4)
  playstationHdmi: 1,

  // Apps i docken. "match" finder appen på TV'et ud fra navnet,
  // "id" er en reserve hvis navnet ikke kan findes.
  apps: [
    { key: "drtv",      navn: "DR TV",       match: /^dr\s?tv/i,                id: null },
    { key: "tv2play",   navn: "TV 2 Play",   match: /tv\s?2\s?play/i,           id: null },
    { key: "netflix",   navn: "Netflix",     match: /^netflix/i,                id: "3201907018807" },
    { key: "hbomax",    navn: "HBO Max",     match: /hbo\s?max|^max$/i,         id: null },
    { key: "prime",     navn: "Prime Video", match: /prime\s?video|amazon/i,    id: "3201910019365" },
    { key: "disney",    navn: "Disney+",     match: /disney/i,                  id: "3201901017640" },
    { key: "viaplay",   navn: "Viaplay",     match: /viaplay/i,                 id: null },
    { key: "skyshow",   navn: "SkyShowtime", match: /sky\s?show\s?time/i,       id: null },
    { key: "appletv",   navn: "Apple TV",    match: /apple\s?tv/i,              id: "3201807016597" },
    { key: "youtube",   navn: "YouTube",     match: /^youtube$/i,               id: "111299001912" },
    { key: "spotify",   navn: "Spotify",     match: /spotify/i,                 id: "3201606009684" },
    { key: "playstation", navn: "PlayStation", hdmi: true }
  ]
};
