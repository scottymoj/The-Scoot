/* The Scoot — fantasy, live-now, players, leaders, playoffs, racing, game extras, pull to refresh */
"use strict";

const SLEEPER = "https://api.sleeper.app/v1";
const WEB3 = "https://site.web.api.espn.com/apis/common/v3/sports";
const PLAYOFF_CUTS = { nfl:[7], nba:[6,10], nhl:[8], mlb:[6], wnba:[8] };

/* small concurrency helper so we don't fire 30 requests at once */
async function pool(items, n, fn){
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length){ const k = i++; out[k] = await fn(items[k], k); }
  }));
  return out;
}

/* ================= RACING SERIES (favorites) ================= */
const seriesAbbr = f => f.l === "f1" ? "F1" : f.l.startsWith("nascar") ? "NAS" : f.name.slice(0, 3).toUpperCase();
async function seriesData(f){
  const [sb, st] = await Promise.all([safe(j(sbUrl(f.l, null), 30000)), safe(j(`${API2}/racing/${f.l}/standings`, 600000))]);
  return { sb, st };
}
function raceWinner(e){
  const comps = (e && e.competitions) || [];
  const race = comps.find(c => /race/i.test((c.type && (c.type.abbreviation || c.type.text)) || "")) || comps[comps.length - 1];
  const cs = ((race && race.competitors) || []).slice().sort((a, b) => (a.order || 999) - (b.order || 999));
  return { race, first: cs[0] };
}
function seriesBlock(f, data){
  const sb = data && data.sb, st = data && data.st;
  const e = sb && (sb.events || [])[0];
  const cal = (sb && sb.leagues && sb.leagues[0] && sb.leagues[0].calendar) || [];
  const now = new Date();
  let live = false, lastRow = "", nextRow = "";
  if (e){
    const s2 = statusOf((e.competitions || [])[0] || {}, e);
    const { race, first } = raceWinner(e);
    const rs = race ? statusOf(race, e) : s2;
    if (rs.live || s2.live){
      live = true;
      nextRow = `<a class="hg live" href="#/scores/${f.l}"><span class="lab"><span class="dot"></span>Live</span><span class="op"><span>${esc(e.shortName || e.name)}</span></span><span class="rt"><b>${esc(first ? cName(first) : "")}</b><small>${esc(rs.text)}</small></span></a>`;
    } else if (rs.state === "post" && first){
      lastRow = `<a class="hg" href="#/scores/${f.l}"><span class="lab">Last</span><span class="op"><span>${esc(e.shortName || e.name)}</span></span><span class="rt"><b>🏁 ${esc(cName(first))}</b><small>${esc(new Date((race && race.date) || e.date).toLocaleDateString([], { month:"short", day:"numeric" }))}</small></span></a>`;
    }
  }
  if (!nextRow){
    const nx = cal.filter(c => c && c.startDate && new Date(c.endDate || c.startDate) > now && !(e && c.label === e.name && statusOf((e.competitions || [])[0] || {}, e).state === "post"))
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0];
    nextRow = nx ? `<a class="hg" href="#/scores/${f.l}"><span class="lab">Next</span><span class="op"><span>${esc(nx.label)}</span></span><span class="rt"><b>${esc(new Date(nx.startDate).toLocaleDateString([], { month:"short", day:"numeric" }))}</b><small>Race weekend</small></span></a>`
      : `<div class="hg none"><span class="lab">Next</span><span class="op muted">Season's over</span></div>`;
  }
  if (!lastRow) lastRow = `<div class="hg none"><span class="lab">Last</span><span class="op muted">No recent race</span></div>`;
  let sub = f.name;
  try {
    const ent = st.children[0].standings.entries.slice().sort((a, b) => rankOf(a) - rankOf(b))[0];
    const pts = ent.stats.find(x => x.name === "championshipPts");
    sub = `Leader: ${ent.athlete.displayName}${pts ? ` · ${pts.displayValue} pts` : ""}`;
  } catch (err){}
  const html = `<section class="hteam"><a class="hhead" href="#/scores/${f.l}"><span class="sbadge">${esc(seriesAbbr(f))}</span><div><div class="nm">${esc(f.name)}</div><div class="sub">${esc(sub)}</div></div><span class="go">›</span></a>${lastRow}${nextRow}</section>`;
  return { html, live };
}
const rankOf = e => { const r = (e.stats || []).find(x => x.name === "rank"); return r ? +r.value || 999 : 999; };
async function racingStandingsHtml(L){
  const d = await j(`${API2}/racing/${L.l}/standings`, 600000);
  return (d.children || []).map(ch => {
    const ents = ((ch.standings && ch.standings.entries) || []).slice().sort((a, b) => rankOf(a) - rankOf(b));
    return `<div class="grp">${esc(ch.name)}</div><div class="tbl-wrap"><table class="t"><thead><tr><th>${ch.name && /constructor/i.test(ch.name) ? "Team" : "Driver"}</th><th>PTS</th></tr></thead><tbody>${ents.map(e => {
      const who = e.athlete ? e.athlete.displayName : e.team ? e.team.displayName : "";
      const pts = (e.stats || []).find(x => x.name === "championshipPts");
      return `<tr><td><span class="pos">${rankOf(e)}</span>${esc(who)}</td><td><b>${esc(pts ? pts.displayValue : "")}</b></td></tr>`;
    }).join("")}</tbody></table></div>`;
  }).join("") || `<div class="empty">Standings unavailable.</div>`;
}

/* ================= ON TV NOW ================= */
async function viewLive(quiet){
  setChrome("scores");
  const tok = viewToken;
  const today = ymd(new Date());
  const res = await pool(LEAGUES, 6, L => safe(j(sbUrl(L.l, L.event ? null : today), 20000)).then(d => ({ L, d })));
  const live = [], soon = [], events = [];
  const now = Date.now();
  res.forEach(({ L, d }) => {
    if (!d) return;
    (d.events || []).forEach(e => {
      if (L.event){
        const st = statusOf((e.competitions || [])[0] || {}, e);
        const anyLive = st.live || (e.competitions || []).some(c => statusOf(c, e).live) || (e.groupings || []).some(g => (g.competitions || []).some(c => statusOf(c, e).live));
        if (anyLive) events.push({ L, e });
        return;
      }
      const g = norm(e, L.s, L.l); if (!g) return;
      if (g.st.live) live.push(g);
      else if (g.st.state === "pre"){ const t = new Date(g.date) - now; if (t > -9e5 && t < 3 * 36e5) soon.push(g); }
    });
  });
  const group = list => {
    const by = {};
    list.forEach(g => (by[g.l] = by[g.l] || []).push(g));
    return Object.entries(by).sort((a, b) => LEAGUES.findIndex(x => x.l === a[0]) - LEAGUES.findIndex(x => x.l === b[0]))
      .map(([l, gs]) => `<div class="kicker" style="margin:16px 0 0">${esc(lgName(l))}</div>${gs.map(gameRow).join("")}`).join("");
  };
  soon.sort((a, b) => new Date(a.date) - new Date(b.date));
  const html = `<div class="h-sec"><h2><span class="dot"></span>On TV Now</h2><span>${live.length + events.length} live</span></div>
    ${live.length || events.length ? group(live) + events.map(({ L, e }) => `<div class="kicker" style="margin:16px 0 0">${esc(L.name)}</div>${eventHtml(e, L)}`).join("") : `<div class="empty">Nothing's live right now.</div>`}
    <div class="h-sec"><h2>Starting Soon</h2><span>Next 3 hours</span></div>
    ${soon.length ? group(soon) : `<div class="empty">Nothing starting in the next 3 hours.</div>`}
    ${stamp(true)}`;
  if (!paint(tok, html)) return;
  bindMore();
  schedule(viewLive, 30000);
}

/* ================= PLAYER ================= */
async function viewPlayer(s, l, id, quiet){
  setChrome("", true);
  const tok = viewToken;
  const base = `${WEB3}/${s}/${l}/athletes/${id}`;
  const [a, ov, gl] = await Promise.all([j(base, 600000), safe(j(base + "/overview", 120000)), s === "soccer" ? null : safe(j(base + "/gamelog", 120000))]);
  const p = a.athlete || {};
  const team = p.team || {};
  const facts = [p.position && p.position.displayName, p.jersey && "#" + p.jersey, p.displayHeight, p.displayWeight, p.age && `Age ${p.age}`].filter(Boolean).join(" · ");
  const inj = (p.injuries || [])[0];
  let html = `<div class="team-hero" style="--tc:${team.color ? "#" + esc(team.color) : "var(--ink)"}">
    ${p.headshot ? `<img class="hs" src="${esc(p.headshot.href)}" alt="" onerror="this.style.visibility='hidden'">` : ""}
    <div><h1>${esc(p.displayName || "Player")}</h1><div class="sub">${esc(facts)}</div>
    ${team.id ? `<a class="sub" style="display:flex;align-items:center;gap:6px;margin-top:6px;font-weight:600;color:var(--ink)" href="#/team/${s}/${l}/${team.id}">${img(logoOf(team))}${esc(team.displayName)}</a>` : ""}</div></div>
    ${inj ? `<div class="err" style="margin-top:12px"><b>${esc(inj.status || "Injured")}</b>${inj.details && inj.details.type ? " · " + esc(inj.details.type) : ""}</div>` : ""}`;
  const st = ov && ov.statistics;
  if (st && st.labels && st.splits && st.splits.length){
    html += `<div class="h-sec"><h2>Season Stats</h2></div><div class="tbl-wrap"><table class="t"><thead><tr><th></th>${st.labels.map(x => `<th>${esc(x)}</th>`).join("")}</tr></thead><tbody>${st.splits.map(r => `<tr><td>${esc(r.displayName)}</td>${(r.stats || []).map(v => `<td>${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  }
  if (gl && gl.seasonTypes && gl.labels){
    const rows = [];
    gl.seasonTypes.forEach(stp => (stp.categories || []).forEach(c => (c.events || []).forEach(ev => rows.push({ ev, meta: (gl.events || {})[ev.eventId] || {}, season: stp.displayName }))));
    const recent = rows.filter(r => r.meta.gameDate).sort((a, b) => new Date(b.meta.gameDate) - new Date(a.meta.gameDate)).slice(0, 15);
    if (recent.length){
      html += `<div class="h-sec"><h2>Game Log</h2><span>Last ${recent.length}</span></div><div class="tbl-wrap"><table class="t"><thead><tr><th>Game</th><th></th>${gl.labels.map(x => `<th>${esc(x)}</th>`).join("")}</tr></thead><tbody>${recent.map(r => {
        const m = r.meta, o = m.opponent || {};
        const d = new Date(m.gameDate);
        return `<tr><td><a href="#/game/${s}/${l}/${r.ev.eventId}">${d.getMonth() + 1}/${d.getDate()} ${esc(m.atVs || "")} ${esc(o.abbreviation || "")}</a></td><td><span class="wl ${esc(m.gameResult || "")}" style="margin:0">${esc(m.gameResult || "")}</span></td>${(r.ev.stats || []).map(v => `<td>${esc(v)}</td>`).join("")}</tr>`;
      }).join("")}</tbody></table></div>`;
    }
  } else if (ov && ov.gameLog && ov.gameLog.statistics && ov.gameLog.statistics[0]){
    const g0 = ov.gameLog.statistics[0];
    if (g0.events && g0.events.length) html += `<div class="h-sec"><h2>Recent Games</h2></div><div class="tbl-wrap"><table class="t"><thead><tr><th>Game</th>${(g0.labels || []).map(x => `<th>${esc(x)}</th>`).join("")}</tr></thead><tbody>${g0.events.map(ev => `<tr><td>${esc(ev.eventId ? ((ov.gameLog.events || {})[ev.eventId] || {}).opponent?.abbreviation || "" : "")}</td>${(ev.stats || []).map(v => `<td>${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  }
  const news = (ov && ov.news) || [];
  if (news.length) html += `<div class="h-sec"><h2>News</h2></div>${news.slice(0, 6).map(n => storyHtml(n)).join("")}`;
  paint(tok, html + stamp(false));
}

/* ================= LEADERS ================= */
async function leadersTabHtml(L){
  if (L.s === "soccer"){
    const d = await safe(j(`${API}/soccer/${L.l}/statistics`, 600000));
    const cats = (d && d.stats) || [];
    if (!cats.length) return `<div class="empty">No leaders for this league yet.</div>`;
    return cats.map(c => `<div class="grp">${esc(c.displayName)}</div>${(c.leaders || []).slice(0, 10).map((x, i) => leaderRow(i, x, L, (x.shortDisplayValue || x.displayValue || "").replace(/^.*?(G|A):\s*(\d+).*$/, (m0, k, v) => v) || x.value)).join("")}`).join("");
  }
  const d = await safe(j(`https://site.api.espn.com/apis/site/v3/sports/${L.s}/${L.l}/leaders`, 600000));
  const cats = (d && d.leaders && d.leaders.categories) || [];
  if (!cats.length) return `<div class="empty">No leaders for this league yet.</div>`;
  return cats.slice(0, 10).map(c => `<div class="grp">${esc(c.displayName)}</div>${(c.leaders || []).slice(0, 5).map((x, i) => leaderRow(i, x, L, x.displayValue)).join("")}`).join("");
}
function leaderRow(i, x, L, val){
  const a = x.athlete || {}, t = x.team || a.team || {};
  const hs = a.headshot && a.headshot.href;
  return `<a class="lrow" href="#/player/${L.s}/${L.l}/${a.id}"><span class="pos">${i + 1}</span>${hs ? `<img class="hs" src="${esc(hs)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">` : `<span class="hs"></span>`}<span class="nm">${esc(a.displayName || "")}<small>${esc(t.abbreviation || t.displayName || "")}</small></span><b>${esc(val)}</b></a>`;
}

/* ================= PLAYOFFS / RANKINGS ================= */
async function playoffsHtml(L){
  if (/college/.test(L.l)){
    const d = await j(`${API}/${L.s}/${L.l}/rankings`, 600000);
    const rk = d.rankings || [];
    const pick = [rk.find(r => /playoff/i.test(r.name)), rk.find(r => /^AP/i.test(r.name)), rk.find(r => /coach/i.test(r.name) && !/FCS|Division/i.test(r.name))].filter(Boolean);
    const note = L.l === "college-football"
      ? (rk.some(r => /playoff/i.test(r.name)) ? "" : `<div class="note-box">The College Football Playoff rankings show up here once the committee releases them. The bracket view comes once the field is set in December.</div>`)
      : (L.l === "mens-college-basketball" ? `<div class="note-box">The March Madness bracket shows up here once the field is set in March.</div>` : "");
    return note + (pick.length ? pick.map(r => `<div class="grp">${esc(r.name)}</div>${(r.ranks || []).map(x => {
      const t = x.team || {};
      const tr = x.trend && x.trend !== "-" ? `<small class="${/^\+/.test(x.trend) ? "up" : "down"}">${esc(x.trend)}</small>` : "";
      return `<a class="lrow" href="#/team/${L.s}/${L.l}/${t.id}"><span class="pos">${x.current}</span>${img(t.logo || (t.logos && t.logos[0] && t.logos[0].href))}<span class="nm">${esc(t.location || t.nickname || t.name)}<small>${esc(x.recordSummary || "")}</small></span>${tr}</a>`;
    }).join("")}`).join("") : `<div class="empty">No rankings yet.</div>`);
  }
  const d = await j(`${API2}/${L.s}/${L.l}/standings`, 300000);
  const cuts = PLAYOFF_CUTS[L.l] || [8];
  const confs = (d.children || []).length ? d.children : [d];
  return `<div class="note-box">If the season ended today.${L.l === "nba" ? " Seeds 7–10 go to the Play-In." : ""}${L.l === "nhl" ? " Projected from current points." : ""}</div>` + confs.map(cf => {
    const ents = [];
    const walk = n => { if (n.standings && n.standings.entries) ents.push(...n.standings.entries); (n.children || []).forEach(walk); };
    walk(cf);
    const val = (e, k) => { const x = (e.stats || []).find(z => z.name === k); return x ? +x.value : null; };
    const hasSeed = ents.some(e => val(e, "playoffSeed") > 0);
    ents.sort((a, b) => hasSeed ? ((val(a, "playoffSeed") || 99) - (val(b, "playoffSeed") || 99))
      : L.s === "hockey" ? (val(b, "points") - val(a, "points")) : (val(b, "winPercent") - val(a, "winPercent")));
    const rec = e => { const o = (e.stats || []).find(z => z.name === "overall" || z.type === "total"); if (o) return o.displayValue || o.summary; const w = val(e, "wins"), l2 = val(e, "losses"), t = val(e, "ties"), ot = val(e, "otLosses"); return `${w}-${l2}${ot ? "-" + ot : t ? "-" + t : ""}`; };
    const last = cuts[cuts.length - 1];
    const rows = ents.slice(0, last + 4).map((e, i) => {
      const t = e.team;
      const line = cuts.includes(i) ? `<tr class="cut"><td colspan="3">${i === last ? "In the hunt" : "Play-In"}</td></tr>` : "";
      return line + `<tr class="${isFav(L.l, t.id) ? "me" : ""}"><td><a class="tn" href="#/team/${L.s}/${L.l}/${t.id}"><span class="pos">${i + 1}</span>${img(logoOf(t))}<span>${esc(t.shortDisplayName || t.displayName)}</span></a></td><td>${esc(rec(e))}</td><td>${L.s === "hockey" ? esc(val(e, "points") ?? "") + " pts" : esc(((e.stats || []).find(z => z.name === "gamesBehind") || {}).displayValue || "")}</td></tr>`;
    }).join("");
    return `<div class="grp">${esc(cf.name || "")}</div><div class="tbl-wrap"><table class="t"><thead><tr><th>Seed</th><th>Record</th><th>${L.s === "hockey" ? "Points" : "GB"}</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }).join("");
}

/* ================= GAME EXTRAS ================= */
function winProbHtml(d, away, home, st){
  const ha = (home.team && home.team.abbreviation) || "HOME", aa = (away.team && away.team.abbreviation) || "AWAY";
  const wp = d.winprobability || [];
  if (wp.length > 2 && st.state !== "pre"){
    const W = 340, H = 110;
    const pts = wp.map((x, i) => `${(i / (wp.length - 1) * W).toFixed(1)},${((1 - x.homeWinPercentage) * H).toFixed(1)}`).join(" ");
    const cur = wp[wp.length - 1].homeWinPercentage;
    const lead = cur >= .5 ? [ha, cur] : [aa, 1 - cur];
    return `<div class="card"><h4>Win probability</h4><div class="wp-now"><b>${esc(lead[0])} ${Math.round(lead[1] * 1000) / 10}%</b>${st.state === "post" ? " · final" : ""}</div>
      <svg class="wp" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><line x1="0" y1="${H / 2}" x2="${W}" y2="${H / 2}" class="mid"/><polyline points="${pts}" class="ln"/></svg>
      <div class="wp-lab"><span>▲ ${esc(ha)}</span><span>▼ ${esc(aa)}</span></div></div>`;
  }
  const pr = d.predictor;
  if (pr && pr.homeTeam && pr.awayTeam && st.state === "pre"){
    const h = parseFloat(pr.homeTeam.gameProjection), a = parseFloat(pr.awayTeam.gameProjection);
    if (!isNaN(h) && !isNaN(a)) return `<div class="card"><h4>Matchup predictor</h4><div class="pred"><span><b>${esc(aa)}</b> ${a}%</span><span>${h}% <b>${esc(ha)}</b></span></div><div class="pbar"><i style="width:${a}%"></i></div></div>`;
  }
  return "";
}
function formH2HHtml(d, away, home, s, l){
  let out = "";
  const lf = d.lastFiveGames || [];
  if (lf.length){
    lf.forEach(t => { t.events = (t.events || []).slice().sort((a, b) => new Date(a.gameDate) - new Date(b.gameDate)); });
    out += `<div class="card"><h4>Last five <span style="text-transform:none;letter-spacing:0;font-weight:500">(oldest → newest)</span></h4>${lf.map(t => `<div class="form-row"><b>${esc(t.team && t.team.abbreviation)}</b><span>${(t.events || []).map(ev => `<a class="wl ${esc(ev.gameResult)}" title="${esc(ev.atVs + " " + ((ev.opponent && ev.opponent.abbreviation) || "") + " " + ev.score)}" href="#/game/${s}/${l}/${ev.id}">${esc(ev.gameResult)}</a>`).join("")}</span><small>${esc((t.events || []).slice(-1).map(ev => `Last: ${ev.gameResult} ${ev.score} ${ev.atVs} ${(ev.opponent && ev.opponent.abbreviation) || ""}`).join(""))}</small></div>`).join("")}</div>`;
  }
  const ss = (d.seasonseries || []).find(x => (x.events || []).some(e => e.status === "post" || (e.statusType && e.statusType.completed)));
  if (ss){
    const evs = (ss.events || []).filter(e => e.status === "post" || (e.statusType && e.statusType.completed)).slice(0, 6);
    out += `<div class="card"><h4>${esc(ss.title && /vs\./.test(ss.title) ? "Head-to-head" : (ss.seriesLabel || "Season series"))}</h4><div style="font-weight:700;font-size:14px;margin-bottom:6px">${esc(ss.summary || "")}</div>${evs.map(e => {
      const cs = e.competitors || [];
      const h = cs.find(x => x.homeAway === "home") || {}, a = cs.find(x => x.homeAway === "away") || {};
      const tn = x => esc((x.team && (x.team.abbreviation || x.team.shortDisplayName)) || "");
      return `<a class="h2h" href="#/game/${s}/${l}/${e.id}"><span class="muted">${esc(new Date(e.date).toLocaleDateString([], { month:"short", day:"numeric", year:"2-digit" }))}</span><span class="${a.winner ? "w" : ""}">${tn(a)} ${esc(scoreOf(a) ?? "")}</span><span class="muted">@</span><span class="${h.winner ? "w" : ""}">${tn(h)} ${esc(scoreOf(h) ?? "")}</span></a>`;
    }).join("")}</div>`;
  }
  return out;
}
function injuriesHtml(d, s, l){
  const inj = (d.injuries || []).filter(t => (t.injuries || []).length);
  if (!inj.length) return "";
  return `<div class="card"><h4>Injury report</h4>${inj.map(t => `<div class="kicker" style="margin:8px 0 2px">${esc(t.team && t.team.displayName)}</div>${t.injuries.slice(0, 12).map(i => {
    const a = i.athlete || {};
    const det = i.details ? [i.details.type, i.details.location, i.details.detail].filter(Boolean)[0] : "";
    return `<div class="inj"><a class="plink" href="#/player/${s}/${l}/${a.id}">${esc(a.displayName || "")}</a> <span class="muted">${esc((a.position && a.position.abbreviation) || "")}</span><span class="st ${/out|injured reserve|IR/i.test(i.status || "") ? "out" : ""}">${esc(i.status || "")}${det ? ` · ${esc(det)}` : ""}</span></div>`;
  }).join("")}`).join("")}</div>`;
}

/* betting extras: ATS + over/under over each team's last 10 finished games, from closing lines */
const betxCache = new Map();
async function teamBetRecord(s, l, teamId){
  const key = `${l}/${teamId}`;
  if (betxCache.has(key)) return betxCache.get(key);
  const p = (async () => {
    const sc = await teamSchedule(s, l, teamId, [l]);
    const done = sc.events.filter(e => { const c = (e.competitions || [])[0] || {}; return statusOf(c, e).state === "post"; }).slice(-10);
    const res = await pool(done, 4, async e => {
      const sm = await safe(j(`${API}/${s}/${l}/summary?event=${e.id}`, 3600000));
      const pc = sm && (sm.pickcenter || [])[0];
      if (!pc || pc.spread == null && pc.overUnder == null) return null;
      const comps = (sm.header && sm.header.competitions && sm.header.competitions[0] && sm.header.competitions[0].competitors) || [];
      const me = comps.find(x => String(x.team && x.team.id) === String(teamId)), op = comps.find(x => String(x.team && x.team.id) !== String(teamId));
      if (!me || !op) return null;
      const ms = +scoreOf(me), os = +scoreOf(op);
      const homeSpread = pc.spread != null ? +pc.spread : null;
      const mySpread = homeSpread == null ? null : (me.homeAway === "home" ? homeSpread : -homeSpread);
      const ats = mySpread == null ? null : Math.sign(ms - os + mySpread);
      const ou = pc.overUnder != null ? Math.sign(ms + os - +pc.overUnder) : null;
      return { ats, ou };
    });
    const r = res.filter(Boolean);
    const cnt = (k, v) => r.filter(x => x[k] === v).length;
    return { n: r.length, aw: cnt("ats", 1), al: cnt("ats", -1), ap: cnt("ats", 0), o: cnt("ou", 1), u: cnt("ou", -1), op: cnt("ou", 0) };
  })();
  betxCache.set(key, p);
  return p;
}
async function bettingExtras(s, l, id, away, home, tok){
  const box = $("#betx"); if (!box || !away.team || !home.team) return;
  box.innerHTML = `<div class="card"><h4>Betting trends</h4><div class="muted" style="font-size:13px">Crunching the last 10 games…</div></div>`;
  const [ra, rh] = await Promise.all([safe(teamBetRecord(s, l, away.team.id)), safe(teamBetRecord(s, l, home.team.id))]);
  const b = $("#betx"); if (!b || tok !== viewToken) return;
  if (!ra && !rh || (ra && !ra.n) && (rh && !rh.n)){ b.innerHTML = ""; return; }
  const row = (t, r) => r && r.n ? `<tr><td>${esc(t.abbreviation)}</td><td><b>${r.aw}-${r.al}${r.ap ? "-" + r.ap : ""}</b></td><td><b>${r.o}-${r.u}${r.op ? "-" + r.op : ""}</b></td><td class="muted">${r.n}</td></tr>` : "";
  b.innerHTML = `<div class="card"><h4>Betting trends · last 10</h4><table class="odds-grid"><thead><tr><th></th><th>vs Spread (W-L)</th><th>Over-Under</th><th>Games</th></tr></thead><tbody>${row(away.team, ra)}${row(home.team, rh)}</tbody></table><div class="disclaimer">Worked out from each game's closing DraftKings line. Pushes shown third.</div></div>`;
}

/* ================= FANTASY (Sleeper) ================= */
const SL_USER = () => store.get("scoot-sleeper-user", "scottymoj");
const PCACHE = "scoot-sl-players-v1";
async function sleeperPlayers(neededIds){
  let c = store.get(PCACHE, { t: 0, m: {} });
  const missing = neededIds.filter(id => !c.m[id]);
  if (missing.length && Date.now() - c.t > 30 * 60000){
    const all = await j(`${SLEEPER}/players/nfl`, 3600000);
    const m = {};
    const keep = new Set([...Object.keys(c.m), ...neededIds]);
    keep.forEach(id => { const p = all[id]; if (p) m[id] = [p.full_name || `${p.first_name || ""} ${p.last_name || ""}`.trim(), p.position, p.team, p.injury_status]; });
    c = { t: Date.now(), m };
    store.set(PCACHE, c);
    cache.delete(`${SLEEPER}/players/nfl`); // don't keep 14MB in memory
  }
  return c.m;
}
function plName(m, id){
  const p = m[id];
  if (!p){ return isNaN(+id) ? { n: `${id} D/ST`, pos: "DEF", tm: id } : { n: "Unknown", pos: "", tm: "" }; }
  const [full, pos, tm, inj] = p;
  if (pos === "DEF") return { n: `${tm || id} D/ST`, pos, tm, inj };
  const parts = (full || "").split(" ");
  return { n: parts.length > 1 ? `${parts[0][0]}. ${parts.slice(1).join(" ")}` : full, pos, tm, inj };
}
async function viewFantasy(idx, wk, quiet){
  setChrome("fantasy");
  const tok = viewToken;
  const user = await j(`${SLEEPER}/user/${SL_USER()}`, 86400000);
  if (!user || !user.user_id){ paint(tok, `<div class="err">Couldn't find Sleeper user "${esc(SL_USER())}".</div>`); return; }
  const state = await j(`${SLEEPER}/state/nfl`, 300000);
  const season = state.league_season || state.season;
  const leagues = (await j(`${SLEEPER}/user/${user.user_id}/leagues/nfl/${season}`, 3600000)) || [];
  if (!leagues.length){ paint(tok, `<div class="empty">No Sleeper leagues found for ${esc(season)}.</div>`); return; }
  const li = Math.min(+idx || 0, leagues.length - 1);
  const lg = leagues[li];
  const curWeek = Math.max(1, state.display_week || state.week || 1);
  const week = Math.min(Math.max(1, +wk || curWeek), 18);
  const [rosters, users, matchups, allRosters] = await Promise.all([
    j(`${SLEEPER}/league/${lg.league_id}/rosters`, 300000),
    j(`${SLEEPER}/league/${lg.league_id}/users`, 3600000),
    j(`${SLEEPER}/league/${lg.league_id}/matchups/${week}`, 30000),
    Promise.all(leagues.map(x => safe(j(`${SLEEPER}/league/${x.league_id}/rosters`, 300000)))),
  ]);
  const need = uniq([...allRosters.flat().filter(Boolean).flatMap(r => r.players || []), ...(matchups || []).flatMap(m => m.players || [])]);
  const pm = await sleeperPlayers(need);
  const uById = Object.fromEntries((users || []).map(u => [u.user_id, u]));
  const teamOf = r => { const u = uById[r.owner_id] || {}; return { name: (u.metadata && u.metadata.team_name) || u.display_name || `Team ${r.roster_id}`, owner: u.display_name || "", avatar: u.avatar }; };
  const rById = Object.fromEntries(rosters.map(r => [r.roster_id, r]));
  const mine = rosters.find(r => r.owner_id === user.user_id || (r.co_owners || []).includes(user.user_id));
  const rec = r => r && r.settings ? `${r.settings.wins}-${r.settings.losses}${r.settings.ties ? "-" + r.settings.ties : ""}` : "";
  const fpts = (r, k) => r && r.settings ? (r.settings[k] || 0) + (r.settings[k + "_decimal"] || 0) / 100 : 0;
  const pts = v => (Math.round((v || 0) * 100) / 100).toFixed(2);

  const chips = `<div class="chips">${leagues.map((x, i) => `<a class="chip ${i === li ? "on" : ""}" href="#/fantasy/${i}/${week}">${esc(x.name)}</a>`).join("")}</div>`;
  const bar = `<div class="datebar"><a href="#/fantasy/${li}/${Math.max(1, week - 1)}"><button aria-label="Previous week">‹</button></a><div class="d">Week ${week}<small>${week === curWeek ? "This week" : `<a href="#/fantasy/${li}/${curWeek}" style="text-decoration:underline">Back to week ${curWeek}</a>`}</small></div><a href="#/fantasy/${li}/${Math.min(18, week + 1)}"><button aria-label="Next week">›</button></a></div>`;

  let hero = "", lineup = "";
  const myM = mine && (matchups || []).find(m => m.roster_id === mine.roster_id);
  const oppM = myM && myM.matchup_id != null && matchups.find(m => m.matchup_id === myM.matchup_id && m.roster_id !== myM.roster_id);
  if (myM){
    const me = teamOf(mine), op = oppM ? teamOf(rById[oppM.roster_id]) : null;
    const av = a => a ? `<img class="av" src="https://sleepercdn.com/avatars/thumbs/${esc(a)}" alt="" onerror="this.style.visibility='hidden'">` : `<span class="av"></span>`;
    const lead = oppM ? (myM.points > oppM.points ? "me" : myM.points < oppM.points ? "op" : "") : "";
    hero = `<div class="fhero"><div class="fside ${lead === "me" ? "lead" : ""}">${av(me.avatar)}<div class="fn">${esc(me.name)}</div><div class="fr">${esc(rec(mine))}</div><div class="fp mono">${pts(myM.points)}</div></div><div class="fvs">vs</div>
      <div class="fside ${lead === "op" ? "lead" : ""}">${op ? av(op.avatar) : ""}<div class="fn">${esc(op ? op.name : "Bye")}</div><div class="fr">${esc(oppM ? rec(rById[oppM.roster_id]) : "")}</div><div class="fp mono">${oppM ? pts(oppM.points) : ""}</div></div></div>`;
    const slots = (lg.roster_positions || []).filter(p => p !== "BN" && p !== "IR" && p !== "TAXI");
    const cell = (m, i, side) => {
      const id = m && m.starters && m.starters[i];
      let pl, val;
      if (!id || id === "0"){ pl = `<td class="fpl ${side}"><span class="muted">Empty</span></td>`; val = `<td class="fv ${side}">–</td>`; }
      else {
        const p = plName(pm, id); const v = m.players_points && m.players_points[id];
        pl = `<td class="fpl ${side}"><div class="pn">${esc(p.n)}${p.inj ? ` <i class="inj-tag">${esc(p.inj[0])}</i>` : ""}</div><div class="pt">${esc(p.pos || "")} · ${esc(p.tm || "FA")}</div></td>`;
        val = `<td class="fv ${side}">${v != null ? pts(v) : "–"}</td>`;
      }
      return side === "l" ? pl + val : val + pl;
    };
    lineup = `<div class="h-sec"><h2>Starters</h2></div><table class="ftbl">${slots.map((sl, i) => `<tr>${cell(myM, i, "l")}<td class="slot">${esc(sl.replace("SUPER_FLEX", "SF").replace("REC_FLEX", "WR/TE"))}</td>${oppM ? cell(oppM, i, "r") : `<td></td><td></td>`}</tr>`).join("")}</table>`;
    const bench = (myM.players || []).filter(id => !(myM.starters || []).includes(id));
    if (bench.length) lineup += `<div class="h-sec"><h2>Your Bench</h2></div><table class="ftbl">${bench.map(id => { const p = plName(pm, id); const v = myM.players_points && myM.players_points[id]; return `<tr><td class="fpl l"><div class="pn">${esc(p.n)}${p.inj ? ` <i class="inj-tag">${esc(p.inj[0])}</i>` : ""}</div><div class="pt">${esc(p.pos || "")} · ${esc(p.tm || "FA")}</div></td><td class="fv l">${v != null ? pts(v) : "–"}</td></tr>`; }).join("")}</table>`;
  } else {
    hero = `<div class="empty">No matchup for you in week ${week}.</div>`;
  }

  // league scoreboard
  const byM = {};
  (matchups || []).forEach(m => { if (m.matchup_id != null) (byM[m.matchup_id] = byM[m.matchup_id] || []).push(m); });
  const board = Object.values(byM).map(pair => {
    const [a, b] = pair; if (!a || !b) return "";
    const ta = teamOf(rById[a.roster_id]), tb = teamOf(rById[b.roster_id]);
    const isMine = mine && (a.roster_id === mine.roster_id || b.roster_id === mine.roster_id);
    return `<div class="fm ${isMine ? "mine" : ""}"><div class="${a.points > b.points ? "w" : ""}"><span>${esc(ta.name)}</span><b class="mono">${pts(a.points)}</b></div><div class="${b.points > a.points ? "w" : ""}"><span>${esc(tb.name)}</span><b class="mono">${pts(b.points)}</b></div></div>`;
  }).join("");

  // standings
  const stand = rosters.slice().sort((a, b) => (b.settings.wins - a.settings.wins) || (fpts(b, "fpts") - fpts(a, "fpts")));
  const playoffN = (lg.settings && lg.settings.playoff_teams) || 6;
  const standings = `<div class="tbl-wrap"><table class="t"><thead><tr><th>Team</th><th>W-L</th><th>PF</th><th>PA</th><th>STRK</th></tr></thead><tbody>${stand.map((r, i) => `${i === playoffN ? `<tr class="cut"><td colspan="5">Playoff line</td></tr>` : ""}<tr class="${mine && r.roster_id === mine.roster_id ? "me" : ""}"><td><span class="pos">${i + 1}</span>${esc(teamOf(r).name)}</td><td>${esc(rec(r))}</td><td>${fpts(r, "fpts").toFixed(1)}</td><td>${fpts(r, "fpts_against").toFixed(1)}</td><td>${esc((r.metadata && r.metadata.streak) || "")}</td></tr>`).join("")}</tbody></table></div>`;

  const html = chips + bar + hero + lineup + `<div class="h-sec"><h2>League Scoreboard</h2><span>Week ${week}</span></div>${board || `<div class="empty">No matchups.</div>`}<div class="h-sec"><h2>Standings</h2><span>Top ${playoffN} make playoffs</span></div>${standings}${stamp(false)}`;
  if (!paint(tok, html)) return;
  if (week === curWeek || week === state.week) schedule(q => viewFantasy(li, week, q), 45000);
}

/* ================= PULL TO REFRESH ================= */
(function(){
  const ind = document.createElement("div");
  ind.id = "ptr"; ind.innerHTML = `<span class="spin" style="margin:0"></span>`;
  document.body.appendChild(ind);
  let y0 = null, dy = 0, busy = false;
  window.addEventListener("touchstart", e => { if (window.scrollY <= 0 && !busy) { y0 = e.touches[0].clientY; dy = 0; } else y0 = null; }, { passive: true });
  window.addEventListener("touchmove", e => {
    if (y0 == null) return;
    dy = e.touches[0].clientY - y0;
    if (dy > 0){ ind.style.transform = `translate(-50%, ${Math.min(dy, 90) - 50}px)`; ind.style.opacity = Math.min(dy / 70, 1); }
  }, { passive: true });
  window.addEventListener("touchend", async () => {
    if (y0 == null) return;
    y0 = null;
    if (dy > 70 && current){
      busy = true;
      ind.style.transform = "translate(-50%, 30px)";
      [...cache.keys()].forEach(k => { if (!/players\/nfl/.test(k)) cache.delete(k); });
      try { await current(true); } catch (e){}
      busy = false;
    }
    ind.style.transform = "translate(-50%, -50px)"; ind.style.opacity = 0;
  });
})();

/* ---------------- boot ---------------- */
if (!location.hash) location.replace("#/home");
route();
