(() => {
  const LETTERS = "ABCDEFGH";
  const SCORE_KEY = "gi2exam.totalScore";
  const PROGRESS_KEY = "gi2exam.progress";
  const FILTER_KEY = "gi2exam.filters";
  const HISTORY_KEY = "gi2exam.history";
  const allQuestions = window.QUESTIONS || [];

  // Ordered list of every blueprintGroup present in the bank, each with a live count.
  const GROUPS = (() => {
    const counts = new Map();
    allQuestions.forEach((q) => {
      const g = q.blueprintGroup || "Uncategorized";
      counts.set(g, (counts.get(g) || 0) + 1);
    });
    return [...counts.entries()].map(([name, count]) => ({ name, count }));
  })();

  const $ = (id) => document.getElementById(id);
  const els = {
    progress: $("progress"),
    score: $("score"),
    case: document.querySelector(".case"),
    frame: $("figureFrame"),
    caption: $("figCaption"),
    eyebrow: $("eyebrow"),
    question: $("question"),
    options: $("options"),
    feedback: $("feedback"),
    verdict: $("verdict"),
    explanation: $("explanation"),
    hint: $("hint"),
    btn: $("submitBtn"),
    filterToggle: $("filterToggle"),
    filterCount: $("filterCount"),
    filterPanel: $("filterPanel"),
    filterList: $("filterList"),
    filterAll: $("filterAll"),
    filterNone: $("filterNone"),
    statCorrect: $("statCorrect"),
    statWrong: $("statWrong"),
    statUnseen: $("statUnseen"),
    statCorrectN: $("statCorrectN"),
    statWrongN: $("statWrongN"),
    statUnseenN: $("statUnseenN"),
    statsBar: $("statsBar"),
    optionsWrap: $("optionsWrap"),
    revealGate: $("revealGate"),
    revealBtn: $("revealBtn"),
  };

  let questions = allQuestions;
  let index = 0;
  let selected = null;
  let answered = false;
  let revealed = false; // "no length tell": option text is hidden until this is true
  let sessionCorrect = 0;
  let total = loadScore();
  let activeGroups = loadFilters();
  let history = loadHistory(); // { [question.id]: "correct" | "wrong" }

  // ---------- persistence ----------
  function loadFilters() {
    try {
      const raw = JSON.parse(localStorage.getItem(FILTER_KEY));
      if (Array.isArray(raw) && raw.length) return new Set(raw);
    } catch {}
    return new Set(GROUPS.map((g) => g.name)); // default: everything on
  }
  function saveFilters() {
    try { localStorage.setItem(FILTER_KEY, JSON.stringify([...activeGroups])); } catch {}
  }

  function loadHistory() {
    try {
      const raw = JSON.parse(localStorage.getItem(HISTORY_KEY));
      if (raw && typeof raw === "object") return raw;
    } catch {}
    return {};
  }
  function saveHistory() {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch {}
  }

  // Unanswered first, then previously-wrong, then previously-correct last.
  // Stable within each group, so topic order stays predictable.
  function orderQuestions(list) {
    const priority = (q) => {
      const status = history[q.id];
      if (status === "wrong") return 1;
      if (status === "correct") return 2;
      return 0; // unanswered
    };
    return list
      .map((q, i) => [q, i])
      .sort((a, b) => priority(a[0]) - priority(b[0]) || a[1] - b[1])
      .map(([q]) => q);
  }

  function buildActiveQuestions() {
    const filtered = allQuestions.filter((q) => activeGroups.has(q.blueprintGroup || "Uncategorized"));
    return orderQuestions(filtered);
  }

  function loadProgress() {
    try {
      const raw = JSON.parse(localStorage.getItem(PROGRESS_KEY));
      if (raw && typeof raw.id === "string") return raw;
    } catch {}
    return null;
  }
  function saveProgress() {
    const q = questions[index];
    if (!q) return;
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify({ id: q.id, sessionCorrect })); } catch {}
  }
  function clearProgress() {
    try { localStorage.removeItem(PROGRESS_KEY); } catch {}
  }

  function loadScore() {
    try { return Number(localStorage.getItem(SCORE_KEY)) || 0; } catch { return 0; }
  }
  function saveScore() {
    try { localStorage.setItem(SCORE_KEY, String(total)); } catch {}
  }

  function renderScore(bump) {
    els.score.textContent = total.toLocaleString("en-US");
    if (bump) {
      const el = els.score.parentElement;
      el.classList.remove("bump");
      void el.offsetWidth;
      el.classList.add("bump");
    }
  }

  // ---------- stats bar (correct / wrong / unseen, within the current filter) ----------
  function renderStats() {
    const totalQ = questions.length;
    let correct = 0, wrong = 0;
    questions.forEach((q) => {
      const status = history[q.id];
      if (status === "correct") correct++;
      else if (status === "wrong") wrong++;
    });
    const unseen = totalQ - correct - wrong;

    const pct = (n) => (totalQ ? (n / totalQ) * 100 : 0);
    els.statCorrect.style.width = pct(correct) + "%";
    els.statWrong.style.width = pct(wrong) + "%";
    els.statUnseen.style.width = pct(unseen) + "%";

    els.statCorrectN.textContent = correct.toLocaleString("en-US");
    els.statWrongN.textContent = wrong.toLocaleString("en-US");
    els.statUnseenN.textContent = unseen.toLocaleString("en-US");
    els.statsBar.setAttribute(
      "aria-label",
      `${correct} correct, ${wrong} wrong, ${unseen} unseen out of ${totalQ}`
    );
  }

  // ---------- filter panel ----------
  function buildFilterPanel() {
    els.filterList.innerHTML = "";
    GROUPS.forEach(({ name, count }) => {
      const li = document.createElement("li");
      li.className = "filter-item" + (/not in blueprint/i.test(name) ? " out-of-scope" : "");
      const id = "flt-" + name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      li.innerHTML = `
        <input type="checkbox" id="${id}">
        <span class="label"></span>
        <span class="count">${count}</span>
      `;
      const input = li.querySelector("input");
      input.checked = activeGroups.has(name);
      li.querySelector(".label").textContent = name;
      input.addEventListener("change", () => {
        if (input.checked) activeGroups.add(name);
        else activeGroups.delete(name);
        applyFilters();
      });
      li.addEventListener("click", (e) => {
        if (e.target !== input) input.click();
      });
      els.filterList.appendChild(li);
    });
    updateFilterCount();
  }

  function updateFilterCount() {
    els.filterCount.textContent =
      activeGroups.size === GROUPS.length ? "" : `(${activeGroups.size}/${GROUPS.length})`;
  }

  function applyFilters() {
    saveFilters();
    updateFilterCount();
    questions = buildActiveQuestions();
    index = 0;
    sessionCorrect = 0;
    clearProgress();
    render();
  }

  els.filterToggle.addEventListener("click", () => {
    const open = els.filterPanel.hidden;
    els.filterPanel.hidden = !open;
    els.filterToggle.setAttribute("aria-expanded", String(open));
  });
  els.filterAll.addEventListener("click", () => {
    activeGroups = new Set(GROUPS.map((g) => g.name));
    buildFilterPanel();
    applyFilters();
  });
  els.filterNone.addEventListener("click", () => {
    activeGroups = new Set();
    buildFilterPanel();
    applyFilters();
  });

  // ---------- quiz ----------
  function placeholderSvg(label) {
    return `<svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label}">
      <rect width="300" height="200" fill="#111"/>
      <text x="150" y="104" fill="#666" font-family="Inter, sans-serif" font-size="12"
        text-anchor="middle" letter-spacing="2">IMAGE NOT FOUND</text></svg>`;
  }

  function renderFigure(q) {
    els.case.classList.toggle("no-figure", !q.image);
    els.frame.innerHTML = "";
    if (!q.image) return;
    const img = new Image();
    img.alt = q.caption || "Case image";
    img.onerror = () => { els.frame.innerHTML = placeholderSvg(img.alt); };
    img.src = q.image;
    els.frame.appendChild(img);
    els.caption.textContent = q.caption || "";
  }

  function statusLabel(q) {
    const status = history[q.id];
    if (status === "wrong") return "Review · missed last time";
    if (status === "correct") return "Review · correct last time";
    return null;
  }

  function render() {
    renderStats();
    if (!questions.length) {
      els.progress.textContent = "No questions match this filter";
      els.eyebrow.textContent = "Case study · Question";
      els.case.classList.add("no-figure");
      els.question.textContent = "Turn a topic back on in Filter topics to keep going.";
      els.options.innerHTML = "";
      els.feedback.hidden = true;
      els.btn.disabled = true;
      return;
    }

    const q = questions[index];
    selected = null;
    answered = false;
    revealed = false;

    const label = statusLabel(q);
    els.progress.textContent = `Question ${index + 1} of ${questions.length}` + (label ? ` · ${label}` : "");
    els.eyebrow.textContent = q.topic ? `${q.topic} · Question` : "Case study · Question";
    renderFigure(q);
    els.question.textContent = q.stem;

    els.options.innerHTML = "";
    els.options.classList.remove("locked");
    q.options.forEach((text, i) => {
      const li = document.createElement("li");
      li.className = "option";
      li.tabIndex = 0;
      li.setAttribute("role", "option");
      li.innerHTML = `<span class="letter">${LETTERS[i]}</span><span class="opt-text"></span>`;
      li.querySelector(".opt-text").textContent = text;
      li.addEventListener("click", () => (revealed ? select(i) : reveal()));
      els.options.appendChild(li);
    });

    // No length tell: option text stays hidden (see .options-wrap:not(.revealed) in CSS)
    // until reveal() fires, so nothing about relative option length is visible beforehand.
    els.optionsWrap.classList.remove("revealed");

    els.feedback.hidden = true;
    els.btn.textContent = "Submit answer";
    els.btn.disabled = true;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reveal() {
    if (revealed) return;
    revealed = true;
    els.optionsWrap.classList.add("revealed");
  }

  function select(i) {
    if (answered || !revealed) return;
    selected = i;
    [...els.options.children].forEach((li, j) => {
      li.classList.toggle("selected", j === i);
      li.setAttribute("aria-selected", j === i);
    });
    els.btn.disabled = false;
  }

  function submit() {
    if (selected === null || answered || !questions.length) return;
    const q = questions[index];
    const correct = selected === q.answer;
    answered = true;

    const items = [...els.options.children];
    items[q.answer].classList.add("correct");
    if (!correct) items[selected].classList.add("wrong");
    items.forEach((li) => li.classList.remove("selected"));
    els.options.classList.add("locked");

    history[q.id] = correct ? "correct" : "wrong";
    saveHistory();
    renderStats();

    if (correct) {
      sessionCorrect++;
      total += q.points ?? 250;
      saveScore();
      renderScore(true);
    }

    els.verdict.textContent = correct
      ? `Correct · +${q.points ?? 250} pts`
      : `Incorrect · Answer: ${LETTERS[q.answer]}. ${q.options[q.answer]}`;
    els.verdict.className = "verdict " + (correct ? "ok" : "no");
    els.explanation.textContent = q.explanation || "";
    els.feedback.hidden = false;

    els.btn.disabled = false;
    els.btn.textContent = index < questions.length - 1 ? "Next question →" : "See results";
  }

  function next() {
    if (index < questions.length - 1) {
      index++;
      saveProgress();
      render();
    } else {
      clearProgress();
      finish();
    }
  }

  function finish() {
    els.case.classList.add("no-figure");
    els.eyebrow.textContent = "Case study · Question";
    els.progress.textContent = "Exam complete";
    els.question.textContent = `You answered ${sessionCorrect} of ${questions.length} correctly.`;
    els.options.innerHTML = "";
    els.feedback.hidden = true;
    els.btn.textContent = "Restart";
    els.btn.disabled = false;
    els.btn.onclick = () => {
      els.btn.onclick = null;
      // Re-order for the new pass: anything just marked wrong/correct moves accordingly.
      questions = buildActiveQuestions();
      index = 0;
      sessionCorrect = 0;
      clearProgress();
      render();
    };
  }

  els.btn.addEventListener("click", () => {
    if (els.btn.onclick) return;
    answered ? next() : submit();
  });

  els.revealBtn.addEventListener("click", reveal);

  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const i = e.key.length === 1 ? LETTERS.indexOf(e.key.toUpperCase()) : -1;
    const q = questions[index];
    if (i >= 0 && q && i < q.options.length && !answered && els.options.children.length) {
      revealed ? select(i) : reveal();
    } else if ((e.key === "Enter" || e.code === "Enter") && !revealed && q && els.options.children.length) {
      e.preventDefault();
      reveal();
    } else if ((e.key === "Enter" || e.code === "Enter") && !els.btn.disabled) {
      e.preventDefault();
      els.btn.click();
    }
  });

  renderScore(false);
  buildFilterPanel();
  questions = buildActiveQuestions();

  if (allQuestions.length) {
    const saved = loadProgress();
    if (saved) {
      const foundIndex = questions.findIndex((q) => q.id === saved.id);
      index = foundIndex >= 0 ? foundIndex : 0;
      sessionCorrect = saved.sessionCorrect || 0;
    }
    render();
  } else {
    els.question.textContent = "No questions loaded. Add some to questions.js.";
  }
})();
