(() => {
  const LETTERS = "ABCDEFGH";
  const SCORE_KEY = "gi2exam.totalScore";
  const PROGRESS_KEY = "gi2exam.progress";
  const FILTER_KEY = "gi2exam.filters";
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
  };

  let questions = allQuestions;
  let index = 0;
  let selected = null;
  let answered = false;
  let sessionCorrect = 0;
  let total = loadScore();
  let activeGroups = loadFilters();

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

  function loadProgress() {
    try {
      const raw = JSON.parse(localStorage.getItem(PROGRESS_KEY));
      if (raw && Number.isInteger(raw.index) && raw.index >= 0 && raw.index < questions.length) {
        return raw;
      }
    } catch {}
    return null;
  }
  function saveProgress() {
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify({ index, sessionCorrect })); } catch {}
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
    questions = allQuestions.filter((q) => activeGroups.has(q.blueprintGroup || "Uncategorized"));
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

  function render() {
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

    els.progress.textContent = `Question ${index + 1} of ${questions.length}`;
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
      li.innerHTML = `<span class="letter">${LETTERS[i]}</span><span></span>`;
      li.lastChild.textContent = text;
      li.addEventListener("click", () => select(i));
      els.options.appendChild(li);
    });

    els.feedback.hidden = true;
    els.btn.textContent = "Submit answer";
    els.btn.disabled = true;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function select(i) {
    if (answered) return;
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

  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const i = e.key.length === 1 ? LETTERS.indexOf(e.key.toUpperCase()) : -1;
    const q = questions[index];
    if (i >= 0 && q && i < q.options.length && !answered && els.options.children.length) {
      select(i);
    } else if ((e.key === "Enter" || e.code === "Enter") && !els.btn.disabled) {
      e.preventDefault();
      els.btn.click();
    }
  });

  renderScore(false);
  buildFilterPanel();
  questions = allQuestions.filter((q) => activeGroups.has(q.blueprintGroup || "Uncategorized"));

  if (allQuestions.length) {
    const saved = loadProgress();
    if (saved) {
      index = saved.index;
      sessionCorrect = saved.sessionCorrect || 0;
    }
    render();
  } else {
    els.question.textContent = "No questions loaded. Add some to questions.js.";
  }
})();
