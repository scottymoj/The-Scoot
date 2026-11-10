/* The Scoot — personal sports app. Data: ESPN public site API (no key). */
"use strict";

const API = "https://site.api.espn.com/apis/site/v2/sports";
const API2 = "https://site.api.espn.com/apis/v2/sports";
const SEARCH = "https://site.web.api.espn.com/apis/common/v3/search";

/* ---------------- leagues ---------------- */
const LEAGUES = [
  { l:"nfl", s:"football", name:"NFL", group:"Football" },
  { l:"college-football", s:"football", name:"College Football", group:"Football", q:"groups=80" },
  { l:"nba", s:"basketball", name:"NBA", group:"Basketball" },
  { l:"mens-college-basketball", s:"basketball", name:"Men's College Hoops", short:"NCAAM", group:"Basketball", q:"groups=50&limit=400" },
  { l:"womens-college-basketball", s:"basketball", name:"Women's College Hoops", short:"NCAAW", group:"Basketball", q:"groups=50&limit=400" },
  { l:"wnba", s:"basketball", name:"WNBA", group:"Basketball" },
  { l:"nhl", s:"hockey", name:"NHL", group:"Hockey" },
  { l:"mlb", s:"baseball", name:"MLB", group:"Baseball" },
  { l:"eng.1", s:"soccer", name:"Premier League", group:"Soccer" },
  { l:"eng.2", s:"soccer", name:"Championship", group:"Soccer" },
  { l:"uefa.champions", s:"soccer", name:"Champions League", group:"Soccer" },
  { l:"uefa.europa", s:"soccer", name:"Europa League", group:"Soccer" },
  { l:"eng.fa", s:"soccer", name:"FA Cup", group:"Soccer" },
  { l:"eng.league_cup", s:"soccer", name:"Carabao Cup", group:"Soccer" },
  { l:"esp.1", s:"soccer", name:"LaLiga", group:"Soccer" },
  { l:"ita.1", s:"soccer", name:"Serie A", group:"Soccer" },
  { l:"ger.1", s:"soccer", name:"Bundesliga", group:"Soccer" },
  { l:"fra.1", s:"soccer", name:"Ligue 1", group:"Soccer" },
  { l:"usa.1", s:"soccer", name:"MLS", group:"Soccer" },
  { l:"mex.1", s:"soccer", name:"Liga MX", group:"Soccer" },
  { l:"fifa.friendly", s:"soccer", name:"Int'l Friendlies", group:"Soccer" },
  { l:"concacaf.nations.league", s:"soccer", name:"CONCACAF Nations League", short:"Nations League", group:"Soccer" },
  { l:"fifa.world", s:"soccer", name:"World Cup", group:"Soccer" },
  { l:"concacaf.gold", s:"soccer", name:"Gold Cup", group:"Soccer" },
  { l:"mens-college-lacrosse", s:"lacrosse", name:"College Lacrosse", group:"Lacrosse" },
  { l:"pll", s:"lacrosse", name:"PLL", group:"Lacrosse" },
  { l:"pga", s:"golf", name:"PGA Tour", group:"Golf", event:true },
  { l:"lpga", s:"golf", name:"LPGA", group:"Golf", event:true },
  { l:"f1", s:"racing", name:"Formula 1", short:"F1", group:"Racing", event:true },
  { l:"nascar-premier", s:"racing", name:"NASCAR Cup", group:"Racing", event:true },
  { l:"atp", s:"tennis", name:"ATP", group:"Tennis", event:true },
  { l:"wta", s:"tennis", name:"WTA", group:"Tennis", event:true },
  { l:"ufc", s:"mma", name:"UFC", group:"MMA", event:true },
];
const LG = Object.fromEntries(LEAGUES.map(x => [x.l, x]));
const lgName = l => (LG[l] && LG[l].name) || l.toUpperCase();
const REG_PERIODS = { football:4, basketball:4, hockey:3, soccer:2, baseball:9, lacrosse:4 };

/* ---------------- favorites ---------------- */
const DEFAULT_FAVS = [
  { s:"football", l:"nfl", id:"19", name:"Giants" },
  { s:"soccer", l:"eng.1", id:"359", name:"Arsenal" },
  { s:"soccer", l:"eng.2", id:"334", name:"QPR" },
  { s:"basketball", l:"nba", id:"18", name:"Knicks" },
  { s:"hockey", l:"nhl", id:"12", name:"Islanders" },
  { s:"basketball", l:"mens-college-basketball", id:"222", name:"Villanova" },
  { s:"baseball", l:"mlb", id:"10", name:"Yankees" },
  { s:"soccer", l:"concacaf.nations.league", ls:["concacaf.nations.league","fifa.friendly","fifa.world","concacaf.gold"], id:"660", name:"USA" },
  { kind:"series", s:"racing", l:"f1", id:"f1", name:"Formula 1" },
  { kind:"series", s:"racing", l:"nascar-premier", id:"nascar", name:"NASCAR Cup" },
];
const store = {
  get(k, d){ try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch(e){ return d; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} },
};
let favs = store.get("scoot-favs-v2", null);
if (!favs){
  const old = store.get("scoot-favs-v1", null);
  favs = old ? [...old, ...DEFAULT_FAVS.filter(d => !old.some(o => o.l === d.l && String(o.id) === String(d.id)))] : DEFAULT_FAVS.slice();
  store.set("scoot-favs-v2", favs);
}
const saveFavs = () => store.set("scoot-favs-v2", favs);
const favLeagues = f => f.ls || [f.l];
const isFav = (l, id) => favs.some(f => !f.kind && String(f.id) === String(id) && (l == null || favLeagues(f).includes(l)));
const favFor = (s, id) => favs.find(f => !f.kind && f.s === s && String(f.id) === String(id));
function toggleFav(t){
  if (isFav(t.l, t.id)) favs = favs.filter(f => !(favLeagues(f).includes(t.l) && String(f.id) === String(t.id)));
  else favs.push(t);
  saveFavs();
}

/* ---------------- utils ---------------- */
const $ = s => document.querySelector(s);
const app = $("#app");
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const uniq = a => [...new Set(a.filter(Boolean))];
const pad = n => String(n).padStart(2, "0");
const ymd = d => `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
const fromYmd = s => new Date(+s.slice(0,4), +s.slice(4,6)-1, +s.slice(6,8), 12);
const sameDay = (a, b) => ymd(a) === ymd(b);
const fmtTime = d => d.toLocaleTimeString([], { hour:"numeric", minute:"2-digit" });
function fmtWhen(iso, withTime = true){
  const d = new Date(iso), now = new Date();
  const tmr = new Date(now); tmr.setDate(now.getDate()+1);
  const t = withTime ? " " + fmtTime(d) : "";
  if (sameDay(d, now)) return withTime ? fmtTime(d) : "Today";
  if (sameDay(d, tmr)) return "Tmrw" + t;
  const diff = (d - now) / 864e5;
  if (diff > 0 && diff < 6) return d.toLocaleDateString([], { weekday:"short" }) + t;
  return d.toLocaleDateString([], { month:"short", day:"numeric" }) + t;
}
function ago(iso){
  const m = Math.round((Date.now() - new Date(iso)) / 6e4);
  if (m < 60) return `${Math.max(m,1)}m ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString([], { month:"short", day:"numeric" });
}
const logoOf = t => t ? (t.logo || (t.logos && t.logos[0] && t.logos[0].href) || "") : "";
const img = (src, alt = "") => src ? `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" onerror="this.style.visibility='hidden'">` : `<span style="display:inline-block;width:22px"></span>`;
const scoreOf = x => x == null ? "" : (typeof x.score === "object" && x.score ? (x.score.displayValue ?? x.score.value) : x.score);
const tName = t => t ? (t.shortDisplayName || t.displayName || t.name || t.abbreviation) : "TBD";
const cName = x => (x.athlete && (x.athlete.displayName || x.athlete.shortName)) || (x.team && (x.team.displayName || x.team.name)) || (x.roster && (x.roster.shortDisplayName || x.roster.displayName)) || "TBD";

/* fetch with short cache */
const cache = new Map();
async function j(url, ttl = 12000){
  const c = cache.get(url);
  if (c && Date.now() - c.t < ttl) return c.v;
  let r, err;
  for (let i = 0; i < 2; i++){
    try { r = await fetch(url); if (r.ok) break; err = new Error(`HTTP ${r.status}`); }
    catch (e){ err = e; r = null; }
    await new Promise(z => setTimeout(z, 600));
  }
  if (!r || !r.ok){ if (c) return c.v; throw err || new Error("Network error"); }
  const v = await r.json();
  cache.set(url, { t: Date.now(), v });
  return v;
}
const safe = p => p.catch(e => { console.warn(e); return null; });

/* ---------------- game normalisation ---------------- */
function statusOf(c, e){
  const st = (c && c.status) || (e && e.status) || {};
  const type = st.type || {};
  const state = type.state || "pre";
  let text;
  if (state === "pre"){
    const det = (type.detail || "") + (type.shortDetail || "");
    if (/postpon|cancel|delay|suspend/i.test(type.description || "")) text = type.shortDetail || type.description;
    else if (/TBD/.test(det)) text = "TBD";
    else text = fmtWhen(e.date || c.date);
  } else text = type.shortDetail || type.detail || type.description || "";
  return { state, text, live: state === "in" };
}
function tvOf(c){
  const out = { national: [], local: [] };
  const push = (name, market) => {
    if (!name) return;
    const m = (typeof market === "string" ? market : (market && market.type) || "").toLowerCase();
    (m && m !== "national" ? out.local : out.national).push(name);
  };
  (c.broadcasts || []).forEach(b => {
    if (b.names) b.names.forEach(n => push(n, b.market));
    else push(b.media && (b.media.shortName || b.media.name) || b.station, b.market);
  });
  (c.geoBroadcasts || []).forEach(b => push(b.media && b.media.shortName, b.market));
  out.national = uniq(out.national);
  out.local = uniq(out.local).filter(n => !out.national.includes(n));
  out.all = [...out.national, ...out.local];
  return out;
}
function norm(e, s, l){
  const c = (e.competitions || [])[0] || {};
  const comps = c.competitors || [];
  const home = comps.find(x => x.homeAway === "home") || comps[1];
  const away = comps.find(x => x.homeAway === "away") || comps[0];
  if (!home || !away || !home.team || !away.team) return null;
  const st = statusOf(c, e);
  const side = x => ({
    id: String(x.team.id), name: tName(x.team), full: x.team.displayName, abbr: x.team.abbreviation,
    logo: logoOf(x.team), score: scoreOf(x), winner: x.winner,
    rec: x.records && x.records[0] && x.records[0].summary,
    rank: x.curatedRank && x.curatedRank.current && x.curatedRank.current <= 25 ? x.curatedRank.current : null,
  });
  const o = (c.odds || [])[0];
  let odds = "";
  if (o && st.state === "pre"){
    odds = [o.details, o.overUnder ? `O/U ${o.overUnder}` : ""].filter(Boolean).join(" · ");
  }
  return { id: String(e.id), s, l, date: e.date, st, home: side(home), away: side(away), tv: tvOf(c), odds, note: c.notes && c.notes[0] && c.notes[0].headline };
}
const gameHref = g => `#/game/${g.s}/${g.l}/${g.id}`;
function loseCls(g, side){
  if (g.st.state !== "post") return "";
  const me = g[side], other = g[side === "home" ? "away" : "home"];
  if (me.winner === false && other.winner === true) return "lose";
  if (me.winner == null && other.winner == null && +me.score < +other.score) return "lose";
  return "";
}

/* scoreboard */
function sbUrl(l, date){
  const L = LG[l] || { s:"", l };
  const qs = [L.q, date ? `dates=${date}` : ""].filter(Boolean).join("&");
  return `${API}/${L.s}/${l}/scoreboard${qs ? "?" + qs : ""}`;
}

/* ---------------- router / chrome ---------------- */
let timer = null, viewToken = 0, current = null;
function setChrome(tab, back){
  document.querySelectorAll(".nav a").forEach(a => a.classList.toggle("on", a.dataset.tab === tab));
  $("#mast").classList.toggle("has-back", !!back);
  const d = new Date();
  $("#mastDate").innerHTML = `<b>${d.toLocaleDateString([], { weekday:"long" })}</b>${d.toLocaleDateString([], { month:"long", day:"numeric" })}`;
}
$("#back").addEventListener("click", () => { if (history.length > 1) history.back(); else location.hash = "#/home"; });

function schedule(fn, ms){
  clearTimeout(timer);
  const tok = viewToken;
  timer = setTimeout(async () => { if (tok !== viewToken) return; if (document.hidden) { schedule(fn, ms); return; } await fn(true); }, ms);
}
document.addEventListener("visibilitychange", () => { if (!document.hidden && current) current(true); });

async function route(){
  viewToken++; clearTimeout(timer);
  const parts = (location.hash.replace(/^#\/?/, "") || "home").split("/").map(decodeURIComponent);
  const [v, ...a] = parts;
  let fn;
  if (v === "scores") fn = q => viewScores(a[0], a[1], q);
  else if (v === "team") fn = q => viewTeam(a[0], a[1], a[2], a[3] || "schedule", q);
  else if (v === "game") fn = q => viewGame(a[0], a[1], a[2], q);
  else if (v === "search") fn = q => viewSearch(q);
  else if (v === "news") fn = q => viewNews(a[0], q);
  else if (v === "live") fn = q => viewLive(q);
  else if (v === "player") fn = q => viewPlayer(a[0], a[1], a[2], q);
  else if (v === "fantasy") fn = q => viewFantasy(a[0], a[1], q);
  else fn = q => viewHome(q);
  current = fn;
  window.scrollTo(0, 0);
  app.innerHTML = `<span class="spin"></span>`;
  try { await fn(false); }
  catch (e) { console.error(e); app.innerHTML = `<div class="err">Couldn't load this right now. Check your connection and pull down to try again.<br><small class="muted">${esc(e.message)}</small></div>`; }
}
window.addEventListener("hashchange", route);

/* render helper that ignores stale async results and keeps scroll on refresh */
function paint(tok, html){
  if (tok !== viewToken) return false;
  const y = window.scrollY;
  app.innerHTML = html;
  window.scrollTo(0, y);
  return true;
}
const stamp = live => `<div class="updated">Updated ${fmtTime(new Date())}${live ? " · live, refreshing every 20s" : ""}</div>`;

/* ---------------- shared renderers ---------------- */
function gameRow(g){
  const row = side => {
    const t = g[side];
    return `<div class="tm ${loseCls(g, side)}">${img(t.logo)}${t.rank ? `<span class="rank">${t.rank}</span>` : ""}<span>${esc(t.name)}${isFav(g.l, t.id) ? `<span class="fav-mark"></span>` : ""} <span class="rec">${esc(t.rec || "")}</span></span><span class="sc mono">${g.st.state === "pre" ? "" : esc(t.score)}</span></div>`;
  };
  const tv = g.tv.all.slice(0, 2).join(", ");
  return `<a class="game" href="${gameHref(g)}">
    <div>${row("away")}${row("home")}</div>
    <div class="meta"><div class="s ${g.st.live ? "live" : ""}">${g.st.live ? `<span class="dot"></span>` : ""}${esc(g.st.state === "pre" && g.st.text === fmtWhen(g.date) ? fmtTime(new Date(g.date)) : g.st.text)}</div>
      ${tv ? `<div class="x">${esc(tv)}</div>` : ""}
      ${g.odds ? `<div class="odds">${esc(g.odds)}</div>` : ""}</div></a>`;
}
function chipGame(g){
  const t = side => `<div class="tm ${loseCls(g, side)}">${img(g[side].logo)}<span>${esc(g[side].abbr || g[side].name)}</span><span class="sc mono">${g.st.state === "pre" ? "" : esc(g[side].score)}</span></div>`;
  return `<a class="chip-game" href="${gameHref(g)}">
    <div class="st ${g.st.live ? "live" : ""}"><span>${g.st.live ? `<span class="dot"></span>` : ""}${esc(g.st.text)}</span><span>${esc((LG[g.l] && (LG[g.l].short || LG[g.l].name)) || "")}</span></div>
    ${t("away")}${t("home")}
    <div class="tv">${esc(g.tv.all.slice(0, 2).join(", ") || " ")}</div></a>`;
}
function storyHtml(a, lead){
  const href = (a.links && a.links.web && a.links.web.href) || "#";
  const im = (a.images || [])[0];
  const tag = a._tag ? `<div class="tag">${esc(a._tag)}</div>` : "";
  if (lead) return `<a class="lead" href="${esc(href)}" target="_blank" rel="noopener">${im ? img(im.url) : ""}${tag}<h3>${esc(a.headline)}</h3>${a.description ? `<p>${esc(a.description)}</p>` : ""}<div class="when muted" style="font-size:11px;margin-top:6px">${a.published ? ago(a.published) : ""}</div></a>`;
  return `<a class="story ${im ? "" : "noimg"}" href="${esc(href)}" target="_blank" rel="noopener"><div>${tag}<h3>${esc(a.headline)}</h3>${a.description ? `<p>${esc(a.description)}</p>` : ""}<div class="when">${a.published ? ago(a.published) : ""}</div></div>${im ? img(im.url) : ""}</a>`;
}

/* ---------------- team schedule helpers ---------------- */
async function teamSchedule(s, l, id, ls){
  const leagues = ls || (favFor(s, id) && favFor(s, id).ls) || [l];
  const parts = await Promise.all(leagues.map(async lg => {
    const base = `${API}/${s}/${lg}/teams/${id}/schedule`;
    const [a, b] = await Promise.all([safe(j(base, 30000)), s === "soccer" ? safe(j(base + "?fixture=true", 60000)) : null]);
    // after a season ends the default can be postseason-only; pull the regular season too
    let c = null;
    if (s !== "soccer" && a && (a.events || []).length < 20) c = await safe(j(base + "?seasontype=2", 120000));
    return { lg, list: [c, a, b] };
  }));
  const map = new Map(); let team = null;
  parts.forEach(({ lg, list }) => list.forEach(x => {
    if (!x) return;
    if (!team && x.team && x.team.displayName) team = x.team;
    (x.events || []).forEach(e => map.set(String(e.id), { ...e, _l: lg }));
  }));
  if (!team && !map.size) throw new Error("No schedule");
  const events = [...map.values()].sort((x, y) => new Date(x.date) - new Date(y.date));
  return { team: team || {}, events };
}
function teamView(e, s, l, id){
  const g = norm(e, s, e._l || l); if (!g) return null;
  const meSide = g.home.id === String(id) ? "home" : "away";
  const me = g[meSide], op = g[meSide === "home" ? "away" : "home"];
  let res = "";
  if (g.st.state === "post"){
    const a = +me.score, b = +op.score;
    res = me.winner === true || (me.winner == null && a > b) ? "W" : (op.winner === true || a < b) ? "L" : (s === "football" ? "T" : "D");
  }
  return { g, me, op, home: meSide === "home", res };
}

/* ================= HOME ================= */
async function viewHome(quiet){
  setChrome("home");
  const tok = viewToken;
  if (!favs.length){
    paint(tok, `<div class="empty" style="padding-top:60px">No favorite teams yet.<br><br><a class="more" href="#/search">Find teams</a></div>`);
    return;
  }
  const today = ymd(new Date());
  const leagues = uniq(favs.filter(f => !f.kind).flatMap(favLeagues));
  const [boards, scheds, series] = await Promise.all([
    Promise.all(leagues.map(l => safe(j(sbUrl(l, today))).then(d => [l, d]))),
    Promise.all(favs.map(f => f.kind ? null : safe(teamSchedule(f.s, f.l, f.id, f.ls)))),
    Promise.all(favs.map(f => f.kind === "series" ? safe(seriesData(f)) : null)),
  ]);
  const boardEvents = {};
  boards.forEach(([l, d]) => { boardEvents[l] = (d && d.events) || []; });

  let anyLive = false;
  const blocks = favs.map((f, i) => {
    if (f.kind === "series"){ const b = seriesBlock(f, series[i]); if (b.live) anyLive = true; return { ...b, i }; }
    const sc = scheds[i];
    const team = (sc && sc.team) || {};
    // schedule, with today's games swapped for fresher scoreboard data
    const byId = new Map();
    (sc ? sc.events : []).forEach(e => byId.set(String(e.id), e));
    favLeagues(f).forEach(lg => (boardEvents[lg] || []).forEach(e => {
      const c = (e.competitions || [])[0] || {};
      if ((c.competitors || []).some(x => x.team && String(x.team.id) === String(f.id))) byId.set(String(e.id), { ...e, _l: lg });
    }));
    const evs = [...byId.values()].sort((x, y) => new Date(x.date) - new Date(y.date)).map(e => teamView(e, f.s, f.l, f.id)).filter(Boolean);
    const live = evs.find(x => x.g.st.live);
    const last = [...evs].reverse().find(x => x.g.st.state === "post");
    const next = evs.find(x => x.g.st.state === "pre");
    if (live) anyLive = true;
    const sub = [team.recordSummary, team.standingSummary].filter(Boolean).join(" · ") || lgName(f.l);
    const opp = x => `${x.home ? "vs" : "@"} ${img(x.op.logo)}<span>${esc(x.op.name)}</span>`;
    const lastRow = last ? `<a class="hg" href="${gameHref(last.g)}"><span class="lab">Last</span><span class="op">${opp(last)}</span><span class="rt"><span class="wl ${last.res}">${last.res}</span><b class="mono">${esc(last.me.score)}-${esc(last.op.score)}</b><small>${esc(fmtWhen(last.g.date, false))}</small></span></a>`
      : `<div class="hg none"><span class="lab">Last</span><span class="op muted">No games yet this season</span></div>`;
    let nextRow;
    if (live) nextRow = `<a class="hg live" href="${gameHref(live.g)}"><span class="lab"><span class="dot"></span>Live</span><span class="op">${opp(live)}</span><span class="rt"><b class="mono">${esc(live.me.score)}-${esc(live.op.score)}</b><small>${esc(live.g.st.text)}</small></span></a>`;
    else if (next) nextRow = `<a class="hg" href="${gameHref(next.g)}"><span class="lab">Next</span><span class="op">${opp(next)}</span><span class="rt"><b>${esc(/TBD/.test(next.g.st.text) ? "TBD" : fmtWhen(next.g.date))}</b><small>${esc(next.g.tv.all.slice(0, 2).join(", "))}</small></span></a>`;
    else nextRow = `<div class="hg none"><span class="lab">Next</span><span class="op muted">No upcoming games listed</span></div>`;
    const html = `<section class="hteam">
      <a class="hhead" href="#/team/${f.s}/${f.l}/${f.id}">${img(logoOf(team) || f.logo, f.name)}<div><div class="nm">${esc(team.shortDisplayName || f.name)}</div><div class="sub">${esc(sub)}</div></div><span class="go">›</span></a>
      ${lastRow}${nextRow}</section>`;
    return { html, live: !!live, i };
  });
  blocks.sort((x, y) => (y.live - x.live) || x.i - y.i);

  const html = `
    <div class="h-sec"><h2>Your Teams</h2><a href="#/search">Edit ›</a></div>
    ${blocks.map(b => b.html).join("")}
    ${stamp(anyLive)}`;
  if (!paint(tok, html)) return;
  schedule(viewHome, anyLive ? 20000 : 120000);
}

/* ================= NEWS ================= */
const BIG_LEAGUES = ["nfl","nba","eng.1","nhl","mlb","mens-college-basketball","college-football","uefa.champions","f1"];
async function viewNews(filter, quiet){
  setChrome("news");
  const tok = viewToken;
  filter = filter || "all";
  const chips = `<div class="chips">${[["all","All"],["teams","My Teams"],...favs.map((f, i) => ["t" + i, f.name]),["leagues","Around the Leagues"]].map(([k, v]) => `<a class="chip ${k === filter ? "on" : ""}" href="#/news/${k}">${esc(v)}</a>`).join("")}</div>`;
  const notVideo = a => a && a.headline && a.type !== "Media";
  const dedupe = list => { const seen = new Set(); return list.filter(a => !seen.has(a.headline) && seen.add(a.headline)); };
  const byDate = (a, b) => new Date(b.published || 0) - new Date(a.published || 0);

  const teamNews = async (f, n) => {
    const d = await safe(j(`${API}/${f.s}/${f.l}/news?team=${f.id}&limit=${n}`, 120000));
    return ((d && d.articles) || []).filter(notVideo).map(a => ({ ...a, _tag: f.name }));
  };
  const leagueNews = async () => {
    const all = await Promise.all(BIG_LEAGUES.map(l => safe(j(`${API}/${LG[l].s}/${l}/news?limit=25`, 120000)).then(d => ((d && d.articles) || []).map(a => ({ ...a, _tag: LG[l].short || LG[l].name })))));
    const flat = all.flat().filter(notVideo);
    const breaking = flat.filter(a => a.type === "HeadlineNews");
    // top breaking news first; top up with feature stories if it's a slow news day
    return dedupe([...breaking.sort(byDate), ...flat.filter(a => a.type !== "HeadlineNews").sort(byDate)]);
  };

  let body = "";
  if (filter === "all"){
    const [tn, ln] = await Promise.all([Promise.all(favs.map(f => teamNews(f, 8))), leagueNews()]);
    const mine = dedupe(tn.flat().sort(byDate)).slice(0, 12);
    const big = ln.filter(a => !mine.some(m => m.headline === a.headline)).slice(0, 12);
    body = `<div class="h-sec"><h2>Your Teams</h2><a href="#/news/teams">More ›</a></div>
      ${mine.length ? storyHtml(mine[0], true) + mine.slice(1).map(a => storyHtml(a)).join("") : `<div class="empty">No team news right now.</div>`}
      <div class="h-sec"><h2>Around the Leagues</h2><a href="#/news/leagues">More ›</a></div>
      ${big.length ? big.map(a => storyHtml(a)).join("") : `<div class="empty">No league news right now.</div>`}`;
  } else if (filter === "teams"){
    const tn = await Promise.all(favs.map(f => teamNews(f, 15)));
    const mine = dedupe(tn.flat().sort(byDate)).slice(0, 40);
    body = mine.length ? storyHtml(mine[0], true) + mine.slice(1).map(a => storyHtml(a)).join("") : `<div class="empty">No team news right now.</div>`;
  } else if (filter === "leagues"){
    const ln = (await leagueNews()).slice(0, 40);
    body = ln.length ? storyHtml(ln[0], true) + ln.slice(1).map(a => storyHtml(a)).join("") : `<div class="empty">No league news right now.</div>`;
  } else {
    const f = favs[+filter.slice(1)];
    if (!f){ location.hash = "#/news"; return; }
    const arts = await teamNews(f, 25);
    body = arts.length ? storyHtml(arts[0], true) + arts.slice(1).map(a => storyHtml(a)).join("") : `<div class="empty">No ${esc(f.name)} news right now.</div>`;
  }
  if (!paint(tok, chips + body + stamp(false))) return;
  const on = app.querySelector(".chips .on"); if (on && !quiet) on.scrollIntoView({ inline:"center", block:"nearest" });
  schedule(q => viewNews(filter, q), 300000);
}

/* ================= SCORES / LEAGUE ================= */
function leagueChips(active){
  const favL = uniq(favs.map(f => f.l));
  const order = [...favL, ...LEAGUES.map(x => x.l).filter(l => !favL.includes(l))];
  return `<div class="chips" id="chips"><a class="chip live-chip" href="#/live"><span class="dot"></span>Live</a>${order.map(l => `<a class="chip ${l === active ? "on" : ""}" href="#/scores/${l}">${esc((LG[l] && (LG[l].short || LG[l].name)) || l)}</a>`).join("")}</div>`;
}
async function viewScores(l, sub, quiet){
  setChrome("scores");
  const tok = viewToken;
  l = l || store.get("scoot-league", favs[0] ? favs[0].l : "nfl");
  if (!LG[l]) l = "nfl";
  store.set("scoot-league", l);
  const L = LG[l];
  const tab = ["standings","news","leaders","playoffs"].includes(sub) ? sub : "scores";
  const date = /^\d{8}$/.test(sub || "") ? sub : ymd(new Date());
  const tabList = [["scores","Scores"]];
  if (!L.event || L.s === "racing") tabList.push(["standings","Standings"]);
  if (PLAYOFF_CUTS[l]) tabList.push(["playoffs","Playoffs"]);
  if (/college-(football|basketball)/.test(l)) tabList.push(["playoffs","Rankings"]);
  if (!L.event && L.s !== "lacrosse") tabList.push(["leaders","Leaders"]);
  tabList.push(["news","News"]);
  const tabs = `<div class="subtabs">${tabList.map(([k, v]) => `<a class="${tab === k ? "on" : ""}" href="#/scores/${l}${k === "scores" ? "" : "/" + k}">${v}</a>`).join("")}</div>`;
  const head = leagueChips(l) + tabs;
  const keepChips = () => { const c = $("#chips"); const on = c && c.querySelector(".on"); if (on && !quiet) on.scrollIntoView({ inline:"center", block:"nearest" }); };

  if (tab === "leaders"){ paint(tok, head + await leadersTabHtml(L) + stamp(false)); keepChips(); return; }
  if (tab === "playoffs"){ paint(tok, head + await playoffsHtml(L) + stamp(false)); keepChips(); return; }
  if (tab === "standings" && L.s === "racing"){ paint(tok, head + await racingStandingsHtml(L) + stamp(false)); keepChips(); return; }
  if (tab === "standings"){
    const d = await j(`${API2}/${L.s}/${l}/standings`, 120000);
    paint(tok, head + standingsHtml(d, L.s, null, l) + stamp(false)); keepChips(); return;
  }
  if (tab === "news"){
    const d = await j(`${API}/${L.s}/${l}/news?limit=25`, 120000);
    const arts = (d.articles || []);
    paint(tok, head + (arts.length ? storyHtml(arts[0], true) + arts.slice(1).map(a => storyHtml(a)).join("") : `<div class="empty">No news.</div>`)); keepChips(); return;
  }

  if (L.event){
    const d = await j(sbUrl(l, null));
    const evs = d.events || [];
    const live = evs.some(e => statusOf((e.competitions || [])[0], e).live);
    paint(tok, head + (evs.length ? evs.map(e => eventHtml(e, L)).join("") : `<div class="empty">No current events.</div>`) + stamp(live));
    keepChips(); bindMore();
    schedule(q => viewScores(l, sub, q), live ? 20000 : 120000); return;
  }

  // ---- week view: 7 days loaded in parallel, grouped by day ----
  const start = weekStart(fromYmd(date), L.s);
  const days = Array.from({ length:7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  const todayY = ymd(new Date());
  const ttlFor = d => ymd(d) === todayY ? 12000 : (d < new Date() ? 600000 : 300000);
  const res = await Promise.all(days.map(d => safe(j(sbUrl(l, ymd(d)), ttlFor(d)))));
  const byId = new Map();
  res.forEach(r => r && (r.events || []).forEach(e => byId.set(String(e.id), e)));
  const games = [...byId.values()].map(e => norm(e, L.s, l)).filter(Boolean).sort((a, b) => new Date(a.date) - new Date(b.date));
  const groups = days.map(d => ({ d, list: games.filter(g => sameDay(new Date(g.date), d)) }));
  const live = games.some(g => g.st.live);
  const prev = new Date(start), next = new Date(start);
  prev.setDate(start.getDate() - 7); next.setDate(start.getDate() + 7);
  const end = days[6];
  const thisWeek = days.some(d => ymd(d) === todayY);
  const rangeTxt = start.getMonth() === end.getMonth()
    ? `${start.toLocaleDateString([], { month:"short", day:"numeric" })} – ${end.getDate()}`
    : `${start.toLocaleDateString([], { month:"short", day:"numeric" })} – ${end.toLocaleDateString([], { month:"short", day:"numeric" })}`;
  const bar = `<div class="datebar"><a href="#/scores/${l}/${ymd(prev)}"><button aria-label="Previous week">‹</button></a>
    <div class="d">${thisWeek ? "This Week" : rangeTxt}<small>${thisWeek ? rangeTxt : `<a href="#/scores/${l}" style="text-decoration:underline">Back to this week</a>`}</small></div>
    <a href="#/scores/${l}/${ymd(next)}"><button aria-label="Next week">›</button></a></div>
    <div class="days">${groups.map(g => `<button data-day="${ymd(g.d)}" class="${ymd(g.d) === todayY ? "today" : ""} ${g.list.length ? "" : "off"}"><span>${g.d.toLocaleDateString([], { weekday:"short" })}</span><b>${g.d.getDate()}</b><i>${g.list.length || "–"}</i></button>`).join("")}</div>`;
  let body = groups.filter(g => g.list.length).map(g => `<div class="dayhead" id="day-${ymd(g.d)}"><h3>${ymd(g.d) === todayY ? "Today" : g.d.toLocaleDateString([], { weekday:"long" })}</h3><span>${g.d.toLocaleDateString([], { month:"long", day:"numeric" })} · ${g.list.length} game${g.list.length > 1 ? "s" : ""}</span></div>${g.list.map(gameRow).join("")}`).join("");
  if (!games.length){
    body = `<div class="empty">No ${esc(L.name)} games this week.</div>`;
    const cal = res.find(r => r && r.leagues && r.leagues[0] && r.leagues[0].calendar);
    if (cal){
      const flat = [];
      cal.leagues[0].calendar.forEach(c => typeof c === "string" ? flat.push(c) : (c.entries || []).forEach(en => flat.push(en.startDate)));
      const nd = flat.map(x => new Date(x)).filter(x => x > end).sort((a, b) => a - b)[0];
      if (nd) body += `<a class="more" href="#/scores/${l}/${ymd(nd)}">Next games: week of ${weekStart(nd, L.s).toLocaleDateString([], { month:"short", day:"numeric" })} ›</a>`;
    }
  }
  if (!paint(tok, head + bar + body + stamp(live))) return;
  keepChips();
  app.querySelectorAll(".days button").forEach(b => b.addEventListener("click", () => {
    const el = $("#day-" + b.dataset.day); if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 70, behavior:"smooth" });
  }));
  if (!quiet && thisWeek){
    const el = $("#day-" + todayY) || groups.map(g => $("#day-" + ymd(g.d))).find((x, i) => x && groups[i].d > new Date());
    if (el && el !== app.querySelector(".dayhead")) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 70);
  }
  schedule(q => viewScores(l, sub, q), live ? 20000 : 120000);
}
// football weeks run Tue–Mon (so Monday Night Football stays with its week); everything else Mon–Sun
function weekStart(d, sport){
  const startDay = sport === "football" ? 2 : 1;
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
  x.setDate(x.getDate() - ((x.getDay() - startDay + 7) % 7));
  return x;
}

/* non-team events: golf, racing, tennis, mma */
function eventHtml(e, L){
  const comps = e.competitions || [];
  const st = statusOf(comps[0] || {}, e);
  let body = "";
  if (L.s === "golf"){
    const c = comps[0] || {};
    const cs = (c.competitors || []).slice().sort((a, b) => (a.order || 999) - (b.order || 999));
    body = cs.length ? `<table class="lb" data-more>${cs.map((x, i) => `<tr ${i >= 12 ? 'class="hide" style="display:none"' : ""}><td class="p">${esc((x.status && x.status.position && x.status.position.displayName) || i + 1)}</td><td>${esc(cName(x))}</td><td class="r">${esc(scoreOf(x) || "")}</td></tr>`).join("")}</table>${cs.length > 12 ? `<button class="more" data-toggle>Full leaderboard</button>` : ""}`
      : `<div class="muted" style="font-size:13px">Leaderboard appears once play starts.</div>`;
  } else if (L.s === "racing"){
    const race = comps.find(c => /race/i.test((c.type && (c.type.abbreviation || c.type.text)) || "")) || comps[comps.length - 1] || {};
    const cs = (race.competitors || []).slice().sort((a, b) => (a.order || 999) - (b.order || 999));
    const rst = statusOf(race, e);
    if (rst.state !== "pre" && cs.length){
      body = `<table class="lb" data-more>${cs.map((x, i) => `<tr ${i >= 10 ? 'class="hide" style="display:none"' : ""}><td class="p">${i + 1}</td><td>${esc(cName(x))}</td><td class="r">${esc((x.team && x.team.displayName) || (x.vehicle && x.vehicle.manufacturer) || "")}</td></tr>`).join("")}</table>${cs.length > 10 ? `<button class="more" data-toggle>Full results</button>` : ""}`;
    } else {
      body = `<table class="lb">${comps.map(c => `<tr><td>${esc((c.type && (c.type.text || c.type.abbreviation)) || "Session")}</td><td class="r">${esc(c.date ? fmtWhen(c.date) : "")}</td></tr>`).join("")}</table>`;
    }
  } else if (L.s === "tennis"){
    const groups = e.groupings || [{ grouping:{ displayName:"" }, competitions: comps }];
    const ord = { in:0, post:1, pre:2 };
    body = groups.map(gr => {
      const ms = (gr.competitions || []).slice().sort((a, b) => ord[statusOf(a, e).state] - ord[statusOf(b, e).state] || (statusOf(a, e).state === "post" ? new Date(b.date) - new Date(a.date) : new Date(a.date) - new Date(b.date)));
      if (!ms.length) return "";
      return `<div class="kicker" style="margin:10px 0 2px">${esc(gr.grouping && gr.grouping.displayName)}</div><div data-more>${ms.map((m, i) => {
        const s2 = statusOf(m, e);
        const p = (m.competitors || []).map(x => `<div class="${s2.state === "post" ? (x.winner ? "w" : "l") : ""}">${esc(cName(x))} <span class="mono">${esc((x.linescores || []).map(z => z.value).join(" "))}</span></div>`).join("");
        return `<div class="fight ${i >= 8 ? "hide" : ""}" ${i >= 8 ? 'style="display:none"' : ""}><div>${p}</div><div class="${s2.live ? "live" : "muted"}" style="text-align:right;white-space:nowrap;font-size:12px;${s2.live ? "color:var(--live);font-weight:700" : ""}">${esc(s2.text)}</div></div>`;
      }).join("")}</div>${ms.length > 8 ? `<button class="more" data-toggle>All matches</button>` : ""}`;
    }).join("");
  } else if (L.s === "mma"){
    const fights = comps.slice().reverse();
    body = `<div data-more>${fights.map((c, i) => {
      const s2 = statusOf(c, e);
      const cs = c.competitors || [];
      const nm = x => `<span class="${s2.state === "post" ? (x.winner ? "w" : "l") : ""}">${esc(cName(x))}</span>`;
      return `<div class="fight ${i >= 6 ? "hide" : ""}" ${i >= 6 ? 'style="display:none"' : ""}><div>${cs[0] ? nm(cs[0]) : ""} <span class="muted">vs</span> ${cs[1] ? nm(cs[1]) : ""}<div class="muted" style="font-size:11px">${esc((c.type && c.type.abbreviation) || "")}</div></div><div class="muted" style="font-size:12px;text-align:right">${esc(s2.state === "pre" ? "" : s2.text)}</div></div>`;
    }).join("")}</div>${fights.length > 6 ? `<button class="more" data-toggle>Full card</button>` : ""}`;
  }
  const tv = tvOf(comps[0] || {}).all.join(", ");
  return `<div class="event"><h3>${esc(e.name)}</h3><div class="st ${st.live ? "live" : ""}">${st.live ? `<span class="dot"></span>` : ""}${esc(st.state === "pre" ? fmtWhen(e.date) : ((e.status && e.status.type && e.status.type.detail) || st.text))}${tv ? " · " + esc(tv) : ""}</div>${body}</div>`;
}
function bindMore(){
  app.querySelectorAll("[data-toggle]").forEach(b => b.addEventListener("click", () => {
    const box = b.previousElementSibling;
    box.querySelectorAll(".hide").forEach(r => r.style.display = "");
    b.remove();
  }));
}

/* ---------------- standings ---------------- */
const COLS = {
  soccer: [["gamesPlayed","GP"],["wins","W"],["ties","D"],["losses","L"],["pointDifferential","GD"],["points","PTS"]],
  football: [["wins","W"],["losses","L"],["ties","T"],["winPercent","PCT"],["pointsFor","PF"],["pointsAgainst","PA"],["streak","STRK"]],
  basketball: [["wins","W"],["losses","L"],["winPercent","PCT"],["gamesBehind","GB"],["streak","STRK"]],
  hockey: [["gamesPlayed","GP"],["wins","W"],["losses","L"],["otLosses","OTL"],["points","PTS"],["streak","STRK"]],
  baseball: [["wins","W"],["losses","L"],["winPercent","PCT"],["gamesBehind","GB"],["streak","STRK"]],
  lacrosse: [["wins","W"],["losses","L"],["winPercent","PCT"]],
};
function collectGroups(d){
  const out = [];
  const walk = (n, name) => {
    if (n.standings && n.standings.entries && n.standings.entries.length) out.push({ name: n.name || name, entries: n.standings.entries });
    (n.children || []).forEach(c => walk(c, c.name));
  };
  walk(d, d.name);
  return out;
}
function standingsHtml(d, s, teamId, l){
  if (!d) return `<div class="empty">Standings unavailable.</div>`;
  let groups = collectGroups(d);
  if (teamId){
    const mine = groups.filter(g => g.entries.some(e => String(e.team.id) === String(teamId)));
    if (mine.length) groups = mine.slice(0, 1);
  }
  if (!groups.length) return `<div class="empty">Standings unavailable for this league.</div>`;
  const cols = COLS[s] || COLS.basketball;
  const statMap = e => Object.fromEntries((e.stats || []).map(x => [x.name, x]));
  return groups.map(g => {
    const rows = g.entries.map(e => ({ e, m: statMap(e) }));
    const num = (r, k) => r.m[k] ? +r.m[k].value : 0;
    if (s === "soccer") rows.sort((a, b) => (num(a, "rank") || 99) - (num(b, "rank") || 99) || num(b, "points") - num(a, "points"));
    else if (s === "hockey") rows.sort((a, b) => num(b, "points") - num(a, "points"));
    else rows.sort((a, b) => num(b, "winPercent") - num(a, "winPercent") || num(b, "wins") - num(a, "wins"));
    const useCols = cols.filter(([k]) => rows.some(r => r.m[k]));
    return `${groups.length > 1 || teamId ? `<div class="grp">${esc(g.name)}</div>` : ""}<div class="tbl-wrap"><table class="t"><thead><tr><th>Team</th>${useCols.map(c => `<th>${c[1]}</th>`).join("")}</tr></thead><tbody>${rows.map((r, i) => {
      const t = r.e.team;
      const me = String(t.id) === String(teamId) || isFav(l, t.id);
      return `<tr class="${me ? "me" : ""}"><td><a class="tn" href="#/team/${s}/${l}/${t.id}">${s === "soccer" ? `<span class="pos">${i + 1}</span>` : ""}${img(logoOf(t))}<span>${esc(t.shortDisplayName || t.displayName)}</span></a></td>${useCols.map(([k]) => `<td>${esc(r.m[k] ? r.m[k].displayValue : "")}</td>`).join("")}</tr>`;
    }).join("")}</tbody></table></div>`;
  }).join("");
}

/* ================= TEAM ================= */
async function viewTeam(s, l, id, tab, quiet){
  setChrome("", true);
  const tok = viewToken;
  const fv = favFor(s, id);
  const sc = await teamSchedule(s, l, id, fv && fv.ls);
  const t = sc.team;
  const color = t.color ? "#" + t.color : "var(--ink)";
  const fav = isFav(l, id);
  const head = `<div class="team-hero" style="--tc:${esc(color)}">${img(logoOf(t), t.displayName)}<div><h1>${esc(t.displayName || "Team")}</h1><div class="sub">${esc([t.recordSummary, t.standingSummary].filter(Boolean).join(" · ") || lgName(l))}</div></div>
    <button class="star ${fav ? "on" : ""}" id="star">${fav ? "★ Following" : "☆ Follow"}</button></div>
    <div class="subtabs">${["schedule","standings","news"].map(x => `<a class="${tab === x ? "on" : ""}" href="#/team/${s}/${l}/${id}/${x}">${x[0].toUpperCase() + x.slice(1)}</a>`).join("")}</div>`;
  let body = "", live = false;

  if (tab === "standings"){
    const d = await safe(j(`${API2}/${s}/${l}/standings`, 120000));
    body = standingsHtml(d, s, id, l) + `<a class="more" href="#/scores/${l}/standings">Full ${esc(lgName(l))} standings ›</a>`;
  } else if (tab === "news"){
    const d = await safe(j(`${API}/${s}/${l}/news?team=${id}&limit=20`, 120000));
    const arts = (d && d.articles) || [];
    body = arts.length ? storyHtml(arts[0], true) + arts.slice(1).map(a => storyHtml(a)).join("") : `<div class="empty">No news right now.</div>`;
  } else {
    const evs = sc.events.map(e => teamView(e, s, l, id)).filter(Boolean);
    // pull live status from today's scoreboard (schedule data can lag)
    const tdy = evs.find(x => sameDay(new Date(x.g.date), new Date()));
    if (tdy){
      const b = await safe(j(sbUrl(l, ymd(new Date()))));
      const e2 = b && (b.events || []).find(e => String(e.id) === tdy.g.id);
      if (e2){ const fresh = teamView(e2, s, l, id); if (fresh) Object.assign(tdy, fresh); }
    }
    live = evs.some(x => x.g.st.live);
    const up = evs.filter(x => x.g.st.state !== "post");
    const past = evs.filter(x => x.g.st.state === "post").reverse();
    const row = x => {
      const d = new Date(x.g.date);
      let r;
      if (x.g.st.state === "post") r = `<span class="wl ${x.res}">${x.res}</span><b class="mono">${esc(x.me.score)}-${esc(x.op.score)}</b>`;
      else if (x.g.st.live) r = `<b style="color:var(--live)"><span class="dot"></span>${esc(x.me.score)}-${esc(x.op.score)}</b><span class="tv">${esc(x.g.st.text)}</span>`;
      else r = `<b>${esc(/TBD/.test(x.g.st.text) ? "TBD" : fmtTime(d))}</b>${x.g.tv.all.length ? `<span class="tv">${esc(x.g.tv.all.slice(0, 2).join(", "))}</span>` : ""}`;
      return `<a class="sched" href="${gameHref(x.g)}"><div class="dt">${d.toLocaleDateString([], { weekday:"short" })}<br>${d.toLocaleDateString([], { month:"short", day:"numeric" })}</div><div class="op">${x.home ? "vs" : "@"} ${img(x.op.logo)}<span>${esc(x.op.name)}</span></div><div class="r">${r}</div></a>`;
    };
    body = `<div class="h-sec"><h2>Upcoming</h2></div>${up.length ? up.slice(0, 10).map(row).join("") : `<div class="empty">No upcoming games listed.</div>`}
      <div class="h-sec"><h2>Results</h2></div>${past.length ? past.map(row).join("") : `<div class="empty">No results yet this season.</div>`}`;
  }
  if (!paint(tok, head + body + stamp(live))) return;
  $("#star").addEventListener("click", () => {
    toggleFav({ s, l, id: String(id), name: t.shortDisplayName || t.displayName, logo: logoOf(t), ...(fv && fv.ls ? { ls: fv.ls } : {}) });
    const on = isFav(l, id); const b = $("#star"); b.classList.toggle("on", on); b.textContent = on ? "★ Following" : "☆ Follow";
  });
  if (tab === "schedule") schedule(q => viewTeam(s, l, id, tab, q), live ? 20000 : 180000);
}

/* ================= GAME ================= */
let gameTab = "overview", GS = "", GL = "";
async function viewGame(s, l, id, quiet){
  setChrome("", true);
  const tok = viewToken;
  if (!quiet) gameTab = "overview";
  GS = s; GL = l;
  const d = await j(`${API}/${s}/${l}/summary?event=${id}`, 8000);
  const hc = (d.header && d.header.competitions && d.header.competitions[0]) || {};
  const comps = hc.competitors || [];
  const home = comps.find(x => x.homeAway === "home") || comps[1] || {};
  const away = comps.find(x => x.homeAway === "away") || comps[0] || {};
  const st = statusOf(hc, { date: hc.date, status: hc.status });
  const teams = { home, away };
  const lose = side => {
    if (st.state !== "post") return "";
    const me = teams[side], o = teams[side === "home" ? "away" : "home"];
    return (me.winner === false && o.winner === true) || (+scoreOf(me) < +scoreOf(o)) ? "lose" : "";
  };
  const recOf = x => x.record && x.record[0] && (x.record[0].summary || x.record[0].displayValue);
  const tm = x => `<a class="g-team" href="#/team/${s}/${l}/${x.team && x.team.id}">${img(logoOf(x.team))}<div class="n">${esc(tName(x.team))}</div><div class="rc">${esc(recOf(x) || "")}</div></a>`;
  const vi = d.gameInfo && d.gameInfo.venue;
  const venue = vi ? [vi.fullName, vi.address && [vi.address.city, vi.address.state || vi.address.country].filter(Boolean).join(", ")].filter(Boolean).join(" · ") : "";
  const when = hc.date ? new Date(hc.date).toLocaleString([], { weekday:"short", month:"short", day:"numeric", hour:"numeric", minute:"2-digit" }) : "";

  // linescore
  const n = Math.max((home.linescores || []).length, (away.linescores || []).length);
  let ls = "";
  if (n && st.state !== "pre"){
    const reg = (l === "mens-college-basketball") ? 2 : (REG_PERIODS[s] || 4);
    const lab = i => (s === "baseball" ? i + 1 : (i < reg ? i + 1 : (s === "soccer" ? "ET" : "OT" + (i - reg > 0 ? i - reg + 1 : ""))));
    const line = x => `<tr><td><div class="tn">${img(logoOf(x.team))}<span>${esc(x.team && x.team.abbreviation)}</span></div></td>${Array.from({ length:n }, (_, i) => `<td>${esc(((x.linescores || [])[i] || {}).displayValue ?? "")}</td>`).join("")}<td><b>${esc(scoreOf(x))}</b></td></tr>`;
    ls = `<div class="tbl-wrap linescore"><table class="t"><thead><tr><th></th>${Array.from({ length:n }, (_, i) => `<th>${lab(i)}</th>`).join("")}<th>T</th></tr></thead><tbody>${line(away)}${line(home)}</tbody></table></div>`;
  }
  const hero = `<div class="g-hero"><div class="lg">${esc(lgName(l))}${hc.notes && hc.notes[0] ? " · " + esc(hc.notes[0].headline) : ""}</div>
    <div class="g-teams">${tm(away)}<div class="g-score">${st.state === "pre" ? `<div class="vs">${esc(fmtWhen(hc.date))}</div>` : `<span class="${lose("away")}">${esc(scoreOf(away))}</span><span class="vs">–</span><span class="${lose("home")}">${esc(scoreOf(home))}</span>`}</div>${tm(home)}</div>
    ${st.state !== "pre" ? `<div class="g-status ${st.live ? "live" : ""}">${st.live ? `<span class="dot"></span>` : ""}${esc(st.text)}</div>` : ""}
    <div class="g-venue">${esc(when)}${venue ? "<br>" + esc(venue) : ""}</div>${ls}</div>`;

  const tabs = `<div class="subtabs" id="gtabs">${[["overview","Overview"],["box","Box Score"],["plays","Plays"]].map(([k, v]) => `<button class="${gameTab === k ? "on" : ""}" data-k="${k}">${v}</button>`).join("")}</div>`;
  let body = "";
  if (gameTab === "overview") body = winProbHtml(d, away, home, st) + watchHtml(d, hc) + oddsHtml(d, away, home, st, s) + `<div id="betx"></div>` + teamStatsHtml(d, away, home) + leadersHtml(d) + formH2HHtml(d, away, home, s, l) + injuriesHtml(d, s, l);
  else if (gameTab === "box") body = boxHtml(d, s);
  else body = playsHtml(d, away, home, s);

  if (!paint(tok, hero + tabs + body + stamp(st.live))) return;
  if (gameTab === "overview") bettingExtras(s, l, id, away, home, tok);
  $("#gtabs").addEventListener("click", ev => {
    const b = ev.target.closest("button"); if (!b) return;
    gameTab = b.dataset.k; viewGame(s, l, id, true);
  });
  if (st.state !== "post") schedule(q => viewGame(s, l, id, q), st.live ? 20000 : 120000);
}

function watchHtml(d, hc){
  const tv = tvOf({ broadcasts: [...(hc.broadcasts || []), ...(d.broadcasts || [])] });
  const inner = tv.all.length
    ? `<div class="watch">${tv.national.map(n => `<span>${esc(n)}</span>`).join("")}${tv.local.map(n => `<span class="local">${esc(n)}</span>`).join("")}${tv.local.length && tv.national.length ? `<small>Bold = national. Outlined = local / team networks.</small>` : tv.local.length ? `<small>Local and team networks.</small>` : ""}</div>`
    : `<div class="muted" style="font-size:13px">No US TV or streaming listing yet. Listings usually appear closer to game time.</div>`;
  return `<div class="card"><h4>Where to watch</h4>${inner}</div>`;
}

function oddsHtml(d, away, home, st, s){
  const p = (d.pickcenter || [])[0] || (d.odds || [])[0];
  if (!p) return st.state === "post" ? "" : `<div class="card"><h4>Betting lines</h4><div class="muted" style="font-size:13px">No lines posted for this game yet.</div></div>`;
  const cell = (cur, odds, open) => {
    if (cur == null || cur === "") return `<td class="muted">–</td>`;
    const moved = open != null && open !== "" && String(open) !== String(cur);
    return `<td><b>${esc(cur)}</b>${odds ? `<span class="o">${esc(odds)}</span>` : ""}${open != null && open !== "" ? `<span class="mv">${moved ? "Open " : "Open "}${esc(open)}</span>` : ""}</td>`;
  };
  const ps = p.pointSpread || {}, tot = p.total || {}, ml = p.moneyline || {};
  const g = (o, side, k) => o && o[side] && o[side].close && o[side].close[k];
  const go = (o, side, k) => o && o[side] && o[side].open && o[side].open[k];
  const fmtML = v => v == null ? null : (typeof v === "number" ? (v > 0 ? "+" + v : String(v)) : v);
  const spreadFallback = side => {
    const sp = p.spread; if (sp == null) return null;
    const favHome = p.homeTeamOdds && p.homeTeamOdds.favorite;
    const v = Math.abs(sp); const sign = (side === "home") === !!favHome ? "-" : "+";
    return v === 0 ? "PK" : sign + v;
  };
  const row = (side, x) => {
    const to = side === "home" ? p.homeTeamOdds : p.awayTeamOdds;
    return `<tr><td>${esc((x.team && x.team.abbreviation) || side)}</td>
      ${cell(g(ps, side, "line") ?? spreadFallback(side), g(ps, side, "odds"), go(ps, side, "line"))}
      ${cell(g(tot, side === "away" ? "over" : "under", "line") ?? (p.overUnder != null ? (side === "away" ? "o" : "u") + p.overUnder : null), g(tot, side === "away" ? "over" : "under", "odds"), go(tot, side === "away" ? "over" : "under", "line"))}
      ${cell(g(ml, side, "odds") ?? fmtML(to && to.moneyLine), null, go(ml, side, "odds"))}</tr>`;
  };
  const drawML = (ml.draw && ml.draw.close && ml.draw.close.odds) || (p.drawOdds && fmtML(p.drawOdds.moneyLine));
  const drawRow = s === "soccer" && drawML ? `<tr><td>Draw</td><td class="muted">–</td><td class="muted">–</td>${cell(drawML, null, ml.draw && ml.draw.open && ml.draw.open.odds)}</tr>` : "";
  const prov = (p.provider && (p.provider.displayName || p.provider.name)) || "Sportsbook";
  return `<div class="card"><h4>Betting lines · ${esc(prov)}${st.state === "post" ? " (closing)" : ""}</h4>
    <table class="odds-grid"><thead><tr><th></th><th>Spread</th><th>Total</th><th>Moneyline</th></tr></thead><tbody>${row("away", away)}${row("home", home)}${drawRow}</tbody></table>
    ${p.details ? `<div class="odds-note">Favorite: <b>${esc(p.details)}</b>${p.overUnder ? ` · Over/Under ${esc(p.overUnder)}` : ""}</div>` : ""}
    <div class="disclaimer">"Open" is where the line started. Lines via ESPN. 21+. Gambling problem? Call 1-800-GAMBLER.</div></div>`;
}

function flatStats(t){
  const out = [];
  (t.statistics || []).forEach(x => { if (x.stats) x.stats.forEach(y => out.push(y)); else out.push(x); });
  return out.filter(x => x && (x.label || x.displayName || x.name) && x.displayValue != null);
}
function teamStatsHtml(d, away, home){
  const bt = (d.boxscore && d.boxscore.teams) || [];
  if (bt.length < 2) return "";
  const A = bt.find(t => String(t.team.id) === String(away.team && away.team.id)) || bt[0];
  const H = bt.find(t => String(t.team.id) === String(home.team && home.team.id)) || bt[1];
  const as = flatStats(A), hs = flatStats(H);
  if (!as.length) return "";
  const hm = new Map(hs.map(x => [x.name || x.label, x]));
  const rows = as.map(a => {
    const h = hm.get(a.name || a.label); if (!h) return "";
    const av = parseFloat(String(a.displayValue).replace("%", "")), hv = parseFloat(String(h.displayValue).replace("%", ""));
    let bar = "";
    if (!isNaN(av) && !isNaN(hv) && av + hv > 0 && !/-/.test(a.displayValue)){
      const pct = Math.round(av / (av + hv) * 100);
      bar = `<div class="bar"><i style="width:${pct}%"></i></div>`;
    }
    return `<div class="cmp"><div class="a mono">${esc(a.displayValue)}</div><div class="m">${esc(a.label || a.displayName || a.name)}${bar}</div><div class="b mono">${esc(h.displayValue)}</div></div>`;
  }).filter(Boolean).slice(0, 16).join("");
  if (!rows) return "";
  return `<div class="card"><h4>Team stats</h4><div class="cmp-head"><span>${esc(away.team.abbreviation)}</span><span></span><span>${esc(home.team.abbreviation)}</span></div>${rows}</div>`;
}

function leadersHtml(d){
  try {
    const L = (d.leaders || []).filter(x => x && x.leaders && x.leaders.length && x.team);
    if (!L.length) return "";
    const items = L.map(t => t.leaders.slice(0, 3).map(cat => {
      const p = (cat.leaders || [])[0]; if (!p || !p.athlete) return "";
      const hs = p.athlete.headshot && p.athlete.headshot.href;
      return `<div class="leader">${hs ? img(hs) : `<img alt="">`}<div><div class="c">${esc(t.team.abbreviation)} · ${esc(cat.displayName)}</div><div class="p"><a class="plink" href="#/player/${GS}/${GL}/${p.athlete.id}">${esc(p.athlete.displayName)}</a></div><div class="v">${esc(p.displayValue)}</div></div></div>`;
    }).join("")).join("");
    return items ? `<div class="card"><h4>Leaders</h4>${items}</div>` : "";
  } catch (e){ return ""; }
}

function boxHtml(d, s){
  const pl = (d.boxscore && d.boxscore.players) || [];
  if (pl.length){
    return pl.map(team => `<div class="h-sec"><h2>${esc(team.team.displayName)}</h2></div>` + (team.statistics || []).map(g => {
      const labels = g.labels || g.names || [];
      const aths = (g.athletes || []).filter(a => a.stats && a.stats.length);
      if (!aths.length) return "";
      const title = g.text || g.displayName || g.name || "";
      return `${title && title !== team.team.displayName ? `<div class="period">${esc(title[0].toUpperCase() + title.slice(1))}</div>` : ""}<div class="tbl-wrap"><table class="t"><thead><tr><th>Player</th>${labels.map(x => `<th>${esc(x)}</th>`).join("")}</tr></thead><tbody>${aths.map(a => `<tr><td>${a.athlete && a.athlete.id ? `<a class="plink" href="#/player/${s}/${GL}/${a.athlete.id}">` : ""}${esc((a.athlete && (a.athlete.shortName || a.athlete.displayName)) || "")}${a.athlete && a.athlete.id ? "</a>" : ""}${a.athlete && a.athlete.position ? ` <span class="muted" style="font-size:11px">${esc(a.athlete.position.abbreviation)}</span>` : ""}</td>${a.stats.map(v => `<td>${esc(v)}</td>`).join("")}</tr>`).join("")}${g.totals && g.totals.some(x => x) ? `<tr class="tot"><td>Team</td>${g.totals.map(v => `<td>${esc(v)}</td>`).join("")}</tr>` : ""}</tbody></table></div>`;
    }).join("")).join("");
  }
  const ro = d.rosters || [];
  if (ro.length && ro.some(r => r.roster && r.roster.length)){
    return ro.map(r => {
      const list = r.roster || [];
      const st = (k, p) => { const x = (p.stats || []).find(z => z.abbreviation === k || z.name === k); return x ? x.displayValue : ""; };
      const rowp = p => `<tr><td>${esc(p.jersey || "")} <a class="plink" href="#/player/${s}/${GL}/${p.athlete && p.athlete.id}">${esc(p.athlete && p.athlete.displayName)}</a> <span class="muted" style="font-size:11px">${esc(p.position && p.position.abbreviation || "")}</span></td><td>${esc(st("G", p) || st("totalGoals", p))}</td><td>${esc(st("A", p) || st("goalAssists", p))}</td><td>${esc(st("SH", p) || st("totalShots", p))}</td><td>${esc(st("YC", p) || st("yellowCards", p))}</td></tr>`;
      const head = `<thead><tr><th>Player</th><th>G</th><th>A</th><th>SH</th><th>YC</th></tr></thead>`;
      const starters = list.filter(p => p.starter), subs = list.filter(p => !p.starter && p.subbedIn);
      return `<div class="h-sec"><h2>${esc(r.team && r.team.displayName)}</h2><span>${esc(r.formation || "")}</span></div>
        <div class="tbl-wrap"><table class="t">${head}<tbody>${starters.map(rowp).join("")}</tbody></table></div>
        ${subs.length ? `<div class="period">Subs used</div><div class="tbl-wrap"><table class="t">${head}<tbody>${subs.map(rowp).join("")}</tbody></table></div>` : ""}`;
    }).join("");
  }
  return `<div class="empty">Box score shows up once the game starts.</div>`;
}

function playsHtml(d, away, home, s){
  const logos = {};
  [away, home].forEach(x => { if (x.team) logos[String(x.team.id)] = logoOf(x.team); });
  let plays = [];
  if (d.scoringPlays && d.scoringPlays.length) plays = d.scoringPlays.map(p => ({ ...p, _title: p.type && p.type.text }));
  else if (d.keyEvents && d.keyEvents.length) plays = d.keyEvents.filter(k => !/delay|kickoff/i.test((k.type && k.type.text) || "")).map(p => ({ ...p, _title: p.type && p.type.text }));
  else if (d.plays && d.plays.length) plays = d.plays.filter(p => p.scoringPlay).map(p => ({ ...p, _title: "" }));
  if (!plays.length) return `<div class="empty">No plays yet.</div>`;
  plays = plays.slice().reverse();
  const isSoccer = s === "soccer";
  let lastP = null, out = "";
  plays.forEach(p => {
    const per = p.period && (p.period.displayValue || p.period.number);
    if (!isSoccer && per != null && per !== lastP){ out += `<div class="period">${esc(typeof per === "number" ? `Period ${per}` : per)}</div>`; lastP = per; }
    const tid = p.team && String(p.team.id);
    const score = p.awayScore != null && p.homeScore != null ? `${p.awayScore}-${p.homeScore}` : "";
    out += `<div class="play"><div class="clk">${esc((p.clock && p.clock.displayValue) || "")}</div><div class="tx">${p._title ? `<b>${esc(p._title)}</b>` : ""}${esc(p.text || p.shortText || "")}</div><div class="scr">${tid && logos[tid] ? img(logos[tid]) : ""}${score ? `<span class="mono">${esc(score)}</span>` : ""}</div></div>`;
  });
  const label = d.scoringPlays && d.scoringPlays.length ? "Scoring plays, newest first" : isSoccer ? "Match events, newest first" : "Scoring plays, newest first";
  return `<div class="kicker" style="margin-top:14px">${label}</div>${out}`;
}

/* ================= SEARCH ================= */
let searchQ = "";
async function viewSearch(){
  setChrome("search");
  const tok = viewToken;
  const groups = {};
  LEAGUES.forEach(x => (groups[x.group] = groups[x.group] || []).push(x));
  const favList = favs.map((f, i) => `<div class="hit"><a href="${f.kind ? `#/scores/${f.l}` : `#/team/${f.s}/${f.l}/${f.id}`}" style="display:flex;align-items:center;gap:12px;flex:1">${f.kind ? `<span class="sbadge">${esc(seriesAbbr(f))}</span>` : img(f.logo || "")}<div><div class="n">${esc(f.name)}</div><div class="l">${esc(f.kind ? "Racing series" : lgName(f.l))}</div></div></a><button data-rm="${i}" class="muted" style="font-size:12px;font-weight:600">Remove</button></div>`).join("");
  const html = `<label class="search">${'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 5 5"/></svg>'}<input id="q" type="search" placeholder="Find any team" autocomplete="off" value="${esc(searchQ)}"></label>
    <div id="results"></div>
    <div id="browse">
      <div class="h-sec"><h2>Your Teams</h2><span>Shown on Home</span></div>${favList || `<div class="empty">Search for a team and tap Follow.</div>`}
      <div class="h-sec"><h2>All Leagues</h2></div>
      ${Object.entries(groups).map(([g, ls]) => `<div class="kicker" style="margin:16px 0 2px">${esc(g)}</div><div class="lg-grid">${ls.map(x => `<a href="#/scores/${x.l}">${esc(x.name)}</a>`).join("")}</div>`).join("")}
    </div>`;
  if (!paint(tok, html)) return;
  // fill logos for favorites missing them
  favs.forEach((f, i) => { if (!f.logo && !f.kind) safe(teamSchedule(f.s, f.l, f.id, f.ls)).then(sc => { if (sc && sc.team){ f.logo = logoOf(sc.team); saveFavs(); const im = app.querySelectorAll(".hit img")[i]; if (im && tok === viewToken) im.src = f.logo; } }); });
  app.querySelectorAll("[data-rm]").forEach(b => b.addEventListener("click", () => { favs.splice(+b.dataset.rm, 1); saveFavs(); viewSearch(); }));
  const input = $("#q");
  let t = null;
  const run = async () => {
    const q = input.value.trim(); searchQ = q;
    $("#browse").style.display = q ? "none" : "";
    if (q.length < 2){ $("#results").innerHTML = ""; return; }
    try {
      const r = await j(`${SEARCH}?query=${encodeURIComponent(q)}&limit=30&type=team`, 60000);
      if (input.value.trim() !== q) return;
      const known = new Set(LEAGUES.map(x => x.l));
      const items = (r.items || []).filter(x => x.type === "team" && x.sport && (x.defaultLeagueSlug || x.league))
        .map(x => ({ ...x, lg: x.defaultLeagueSlug || x.league }))
        .filter(x => !/friendly|club\./.test(x.lg) || known.has(x.lg))
        .sort((a, b) => (known.has(b.lg) - known.has(a.lg)));
      $("#results").innerHTML = items.length ? items.map(x => {
        const lg = x.logos && x.logos[0] && x.logos[0].href;
        return `<a class="hit" href="#/team/${esc(x.sport)}/${esc(x.lg)}/${esc(x.id)}">${img(lg)}<div><div class="n">${esc(x.displayName)}</div><div class="l">${esc(LG[x.lg] ? LG[x.lg].name : (x.label || x.lg))}</div></div></a>`;
      }).join("") : `<div class="empty">No teams found for “${esc(q)}”.</div>`;
    } catch (e){ $("#results").innerHTML = `<div class="err">Search isn't working right now.</div>`; }
  };
  input.addEventListener("input", () => { clearTimeout(t); t = setTimeout(run, 250); });
  if (searchQ) run();
}


