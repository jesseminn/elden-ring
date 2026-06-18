/* 艾爾登法環 流程攻略追蹤器 — 前端邏輯（零依賴） */
(function () {
  "use strict";

  var DATA = window.ELDEN_DATA || { chapters: [], quests: [] };
  var LS_PROGRESS = "elden-progress-v1";
  var LS_UI = "elden-ui-v1";

  // ---- 索引 ----
  var stepById = {};
  var chapterById = {};
  var questById = {};
  var allSteps = []; // 依流程順序
  DATA.chapters.forEach(function (ch) {
    chapterById[ch.id] = ch;
    ch.steps.forEach(function (s) { stepById[s.id] = s; allSteps.push(s); });
  });
  DATA.quests.forEach(function (q) { questById[q.id] = q; });

  // ---- 狀態 ----
  var progress = load(LS_PROGRESS, {});
  var ui = load(LS_UI, { tab: "flow", collapsed: {}, hideDone: false, onlyMain: false, activeQuest: null });

  function load(key, def) {
    try { var v = JSON.parse(localStorage.getItem(key)); return v || def; }
    catch (e) { return def; }
  }
  function save() {
    localStorage.setItem(LS_PROGRESS, JSON.stringify(progress));
    localStorage.setItem(LS_UI, JSON.stringify(ui));
  }

  function isDone(id) { return !!progress[id]; }
  function actionable(s) { return s.type !== "note"; }

  // 全域「目前進度」= 流程上第一個未完成且可執行的步驟
  function currentStepId() {
    for (var i = 0; i < allSteps.length; i++) {
      if (actionable(allSteps[i]) && !isDone(allSteps[i].id)) return allSteps[i].id;
    }
    return null;
  }

  // ---- 計數 ----
  function chapterStats(ch) {
    var total = 0, done = 0;
    ch.steps.forEach(function (s) {
      if (!actionable(s)) return;
      total++; if (isDone(s.id)) done++;
    });
    return { total: total, done: done };
  }
  function overallStats() {
    var total = 0, done = 0;
    allSteps.forEach(function (s) {
      if (!actionable(s)) return;
      total++; if (isDone(s.id)) done++;
    });
    return { total: total, done: done };
  }
  function questStats(q) {
    var total = q.stepIds.length, done = 0;
    q.stepIds.forEach(function (id) { if (isDone(id)) done++; });
    return { total: total, done: done };
  }
  function questNextId(q) {
    for (var i = 0; i < q.stepIds.length; i++) {
      if (!isDone(q.stepIds[i])) return q.stepIds[i];
    }
    return null;
  }

  // ---- DOM helpers ----
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function $(id) { return document.getElementById(id); }

  // =========================================================================
  // 線性流程
  // =========================================================================
  function renderFlow() {
    var wrap = $("chapters");
    wrap.innerHTML = "";
    DATA.chapters.forEach(function (ch) {
      if (ui.onlyMain && ch.nonMainline) return;
      wrap.appendChild(renderChapter(ch));
    });
    refreshCurrent();
  }

  function renderChapter(ch) {
    var stats = chapterStats(ch);
    var box = el("div", "chapter" + (ui.collapsed[ch.id] ? " collapsed" : ""));
    box.dataset.ch = ch.id;

    var head = el("div", "chapter-head");
    head.appendChild(el("span", "chapter-num", String(ch.num)));
    head.appendChild(el("span", "chapter-title", esc(ch.title)));

    var meta = el("div", "chapter-meta");
    if (ch.level) meta.appendChild(el("span", "badge lvl", "Lv " + esc(ch.level)));
    if (ch.upgrade) meta.appendChild(el("span", "badge upg", "強化 " + esc(ch.upgrade)));
    if (ch.nonMainline) meta.appendChild(el("span", "badge side", "非主線地圖"));
    head.appendChild(meta);

    var prog = el("div", "chapter-prog");
    var bar = el("div", "mini-bar");
    var fill = el("div", "mini-fill");
    fill.style.width = pct(stats.done, stats.total) + "%";
    bar.appendChild(fill);
    prog.appendChild(el("span", "ch-count", stats.done + "/" + stats.total));
    prog.appendChild(bar);
    prog.appendChild(el("span", "chapter-caret", "▾"));
    head.appendChild(prog);

    head.addEventListener("click", function () {
      ui.collapsed[ch.id] = !ui.collapsed[ch.id];
      box.classList.toggle("collapsed");
      save();
    });
    box.appendChild(head);

    var body = el("div", "chapter-body");
    ch.steps.forEach(function (s) { body.appendChild(renderStep(s)); });
    box.appendChild(body);
    return box;
  }

  function renderStep(s) {
    var done = isDone(s.id);
    var row = el("div", "step " + s.type + (done ? " done" : ""));
    row.dataset.step = s.id;

    if (s.type === "note") {
      if (ui.hideDone) {} // notes 永遠顯示
      var m = el("div", "step-main");
      m.innerHTML = '<span class="note-label">提示</span><span class="step-text">' + esc(s.text) + "</span>";
      appendDetail(m, s);
      row.appendChild(m);
      return row;
    }

    if (ui.hideDone && done) row.classList.add("hidden");

    var cb = el("label", "step-cb");
    var input = el("input");
    input.type = "checkbox";
    input.checked = done;
    input.addEventListener("change", function () { setDone(s.id, input.checked); });
    cb.appendChild(input);
    row.appendChild(cb);

    var main = el("div", "step-main");
    var icon = s.type === "optional" ? "▲" : "●";
    main.appendChild(el("span", "step-text",
      '<span class="step-icon">' + icon + '</span>' + esc(s.text)));

    var extra = el("div", "step-extra");
    if (s.boss) extra.appendChild(el("span", "chip boss", "⚔ BOSS"));
    (s.items || []).forEach(function (it) {
      extra.appendChild(el("span", "chip item", esc(it)));
    });
    (s.quests || []).forEach(function (qid) {
      var q = questById[qid];
      if (!q) return;
      var chip = el("button", "chip quest", esc(q.name));
      chip.style.background = q.color;
      chip.title = "查看「" + q.name + "」完整支線流程";
      chip.addEventListener("click", function (e) {
        e.stopPropagation();
        openQuest(qid);
      });
      extra.appendChild(chip);
    });
    if (extra.children.length) main.appendChild(extra);

    appendDetail(main, s);
    row.appendChild(main);
    return row;
  }

  function appendDetail(container, s) {
    if (!s.detail || !s.detail.length) return;
    var toggle = el("button", "detail-toggle", "▸ 補充說明 (" + s.detail.length + ")");
    var box = el("div", "step-detail hidden");
    s.detail.forEach(function (d) {
      var branch = d.indexOf("→") === 0 || d.indexOf("→") >= 0 && d.length < 80;
      box.appendChild(el("div", "dl" + (d.indexOf("→") >= 0 ? " branch" : ""), esc(d)));
    });
    toggle.addEventListener("click", function () {
      box.classList.toggle("hidden");
      toggle.innerHTML = (box.classList.contains("hidden") ? "▸" : "▾") + " 補充說明 (" + s.detail.length + ")";
    });
    container.appendChild(toggle);
    container.appendChild(box);
  }

  // ---- 勾選 ----
  function setDone(id, val) {
    if (val) progress[id] = true; else delete progress[id];
    save();
    // 更新流程畫面該步驟
    var row = document.querySelector('.step[data-step="' + id + '"]');
    if (row) {
      row.classList.toggle("done", val);
      if (ui.hideDone && val) row.classList.add("hidden"); else row.classList.remove("hidden");
      var inp = row.querySelector('input[type=checkbox]');
      if (inp) inp.checked = val;
    }
    // 更新章節進度條
    var s = stepById[id];
    if (s) updateChapterProg(s.chapterId);
    updateOverall();
    refreshCurrent();
    // 更新支線視圖
    if (ui.tab === "quests" && ui.activeQuest) renderQuestDetail(ui.activeQuest);
    refreshQuestList();
  }

  function updateChapterProg(chId) {
    var ch = chapterById[chId];
    if (!ch) return;
    var box = document.querySelector('.chapter[data-ch="' + chId + '"]');
    if (!box) return;
    var st = chapterStats(ch);
    var fill = box.querySelector(".mini-fill");
    var cnt = box.querySelector(".ch-count");
    if (fill) fill.style.width = pct(st.done, st.total) + "%";
    if (cnt) cnt.textContent = st.done + "/" + st.total;
  }

  function updateOverall() {
    var st = overallStats();
    $("overallFill").style.width = pct(st.done, st.total) + "%";
    $("overallText").textContent = st.done + " / " + st.total;
  }

  function refreshCurrent() {
    var prev = document.querySelector(".step.current");
    if (prev) {
      prev.classList.remove("current");
      var t = prev.querySelector(".current-tag");
      if (t) t.remove();
    }
    var cid = currentStepId();
    if (!cid) return;
    var row = document.querySelector('.step[data-step="' + cid + '"]');
    if (row) {
      row.classList.add("current");
      if (!row.querySelector(".current-tag")) {
        var tag = el("span", "current-tag", "目前進度");
        var txt = row.querySelector(".step-text");
        if (txt) txt.appendChild(tag);
      }
    }
  }

  function pct(a, b) { return b ? Math.round((a / b) * 100) : 0; }

  // =========================================================================
  // 支線總覽
  // =========================================================================
  function renderQuestList() {
    var list = $("questList");
    list.innerHTML = "";
    var major = DATA.quests.filter(function (q) { return q.major; });
    var minor = DATA.quests.filter(function (q) { return !q.major; });
    list.appendChild(el("div", "quest-list-group", "主要支線"));
    major.forEach(function (q) { list.appendChild(questListItem(q)); });
    list.appendChild(el("div", "quest-list-group", "其他 NPC / 收集"));
    minor.forEach(function (q) { list.appendChild(questListItem(q)); });
  }

  function questListItem(q) {
    var st = questStats(q);
    var complete = st.total > 0 && st.done === st.total;
    var item = el("button", "quest-item" + (ui.activeQuest === q.id ? " active" : "") + (complete ? " complete" : ""));
    item.dataset.q = q.id;
    var top = el("div", "quest-item-top");
    var dot = el("span", "quest-dot"); dot.style.background = q.color;
    top.appendChild(dot);
    top.appendChild(el("span", "quest-name", esc(q.name)));
    top.appendChild(el("span", "quest-count", st.done + "/" + st.total));
    item.appendChild(top);
    var bar = el("div", "mini-bar");
    var fill = el("div", "mini-fill"); fill.style.width = pct(st.done, st.total) + "%";
    if (q.color) fill.style.background = q.color;
    bar.appendChild(fill); item.appendChild(bar);
    item.addEventListener("click", function () { openQuest(q.id); });
    return item;
  }

  function refreshQuestList() {
    DATA.quests.forEach(function (q) {
      var item = document.querySelector('.quest-item[data-q="' + q.id + '"]');
      if (!item) return;
      var st = questStats(q);
      item.querySelector(".quest-count").textContent = st.done + "/" + st.total;
      var fill = item.querySelector(".mini-fill"); fill.style.width = pct(st.done, st.total) + "%";
      item.classList.toggle("complete", st.total > 0 && st.done === st.total);
    });
  }

  function openQuest(qid) {
    ui.activeQuest = qid;
    switchTab("quests");
    document.querySelectorAll(".quest-item").forEach(function (it) {
      it.classList.toggle("active", it.dataset.q === qid);
    });
    renderQuestDetail(qid);
    var active = document.querySelector('.quest-item[data-q="' + qid + '"]');
    if (active) active.scrollIntoView({ block: "nearest" });
    save();
  }

  function renderQuestDetail(qid) {
    var q = questById[qid];
    var box = $("questDetail");
    box.innerHTML = "";
    if (!q) { box.innerHTML = '<div class="quest-empty">找不到此支線</div>'; return; }
    var st = questStats(q);
    var complete = st.total > 0 && st.done === st.total;
    var nextId = questNextId(q);

    var header = el("div", "qd-header");
    var dot = el("span", "quest-dot"); dot.style.background = q.color; dot.style.width = "16px"; dot.style.height = "16px";
    header.appendChild(dot);
    var ttlWrap = el("div");
    ttlWrap.appendChild(el("div", "qd-title", esc(q.name)));
    ttlWrap.appendChild(el("p", "qd-desc", esc(q.desc || "")));
    header.appendChild(ttlWrap);
    var pr = el("div", "qd-prog");
    pr.innerHTML = '<div class="num">' + st.done + " / " + st.total + "</div><div class='qd-desc'>步驟完成</div>";
    header.appendChild(pr);
    box.appendChild(header);

    // 下一步 / 完成提示
    var next = el("div", "qd-next");
    if (complete) {
      next.innerHTML = '<span class="qd-alldone">✓ 此支線全部步驟已完成</span>';
    } else if (nextId) {
      var ns = stepById[nextId];
      var nc = chapterById[ns.chapterId];
      next.innerHTML = '<div class="lbl">下一步</div><div class="txt">' + esc(ns.text) +
        '</div><div class="qd-desc">位於：第 ' + nc.num + " 章 " + esc(nc.title) + "</div>";
    }
    box.appendChild(next);

    // 時間軸
    var tl = el("div", "timeline");
    q.stepIds.forEach(function (sid) {
      tl.appendChild(renderQuestStep(sid, sid === nextId));
    });
    box.appendChild(tl);
  }

  function renderQuestStep(sid, isNext) {
    var s = stepById[sid];
    var ch = chapterById[s.chapterId];
    var done = isDone(sid);
    var step = el("div", "tl-step" + (done ? " done" : "") + (isNext ? " current" : ""));
    step.appendChild(el("div", "tl-node"));

    var head = el("div", "tl-head");
    var cb = el("label", "tl-cb");
    var input = el("input"); input.type = "checkbox"; input.checked = done;
    input.addEventListener("change", function (e) { e.stopPropagation(); setDone(sid, input.checked); });
    cb.appendChild(input);
    head.appendChild(cb);
    head.appendChild(el("span", "tl-text", esc(s.text)));
    var loc = el("span", "tl-loc", "第" + ch.num + "章 ›");
    loc.title = "在線性流程中查看此步驟";
    loc.addEventListener("click", function () { gotoStep(sid); });
    head.appendChild(loc);
    step.appendChild(head);

    if ((s.items && s.items.length) || s.boss) {
      var extra = el("div", "tl-extra");
      if (s.boss) extra.appendChild(el("span", "chip boss", "⚔ BOSS"));
      (s.items || []).forEach(function (it) { extra.appendChild(el("span", "chip item", esc(it))); });
      step.appendChild(extra);
    }
    if (s.detail && s.detail.length) {
      var d = el("div", "tl-detail");
      s.detail.forEach(function (x) { d.appendChild(el("div", "dl", esc(x))); });
      step.appendChild(d);
    }
    return step;
  }

  // 從支線跳回線性流程，展開章節並閃爍該步驟
  function gotoStep(sid) {
    var s = stepById[sid];
    switchTab("flow");
    if (ui.collapsed[s.chapterId]) {
      ui.collapsed[s.chapterId] = false;
      var box = document.querySelector('.chapter[data-ch="' + s.chapterId + '"]');
      if (box) box.classList.remove("collapsed");
      save();
    }
    setTimeout(function () {
      var row = document.querySelector('.step[data-step="' + sid + '"]');
      if (row) {
        row.classList.remove("hidden");
        row.scrollIntoView({ block: "center", behavior: "smooth" });
        row.style.transition = "background .2s";
        var orig = row.style.background;
        row.style.background = "rgba(201,162,74,.35)";
        setTimeout(function () { row.style.background = orig; }, 900);
      }
    }, 60);
  }

  // =========================================================================
  // 分頁 / 工具列
  // =========================================================================
  function switchTab(tab) {
    ui.tab = tab;
    document.querySelectorAll(".tab").forEach(function (t) {
      t.classList.toggle("active", t.dataset.tab === tab);
    });
    document.querySelectorAll(".view").forEach(function (v) {
      v.classList.toggle("active", v.id === "view-" + tab);
    });
    save();
  }

  function toast(msg) {
    var t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.remove("show"); }, 1800);
  }

  // =========================================================================
  // 初始化
  // =========================================================================
  function init() {
    // 分頁
    document.querySelectorAll(".tab").forEach(function (t) {
      t.addEventListener("click", function () { switchTab(t.dataset.tab); });
    });
    // 工具列
    $("hideDone").checked = ui.hideDone;
    $("onlyMain").checked = ui.onlyMain;
    $("hideDone").addEventListener("change", function () {
      ui.hideDone = this.checked; save(); renderFlow();
    });
    $("onlyMain").addEventListener("change", function () {
      ui.onlyMain = this.checked; save(); renderFlow();
    });
    $("expandAll").addEventListener("click", function () {
      DATA.chapters.forEach(function (c) { ui.collapsed[c.id] = false; });
      save(); renderFlow();
    });
    $("collapseAll").addEventListener("click", function () {
      DATA.chapters.forEach(function (c) { ui.collapsed[c.id] = true; });
      save(); renderFlow();
    });
    $("jumpCurrent").addEventListener("click", function () {
      var cid = currentStepId();
      if (cid) gotoStep(cid); else toast("流程已全部完成 🎉");
    });
    $("resetBtn").addEventListener("click", function () {
      if (confirm("確定要清除所有進度嗎？此動作無法復原。")) {
        progress = {}; save();
        renderFlow(); renderQuestList();
        if (ui.activeQuest) renderQuestDetail(ui.activeQuest);
        updateOverall();
        toast("已清除所有進度");
      }
    });

    renderFlow();
    renderQuestList();
    updateOverall();
    switchTab(ui.tab || "flow");
    if (ui.activeQuest && questById[ui.activeQuest]) renderQuestDetail(ui.activeQuest);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
