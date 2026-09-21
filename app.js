(() => {
  const LETTERS = "ABCDEFGH";
  const SCORE_KEY = "gi2exam.totalScore";
  const questions = window.QUESTIONS || [];

  const $ = (id) => document.getElementById(id);
  const els = {
    progress: $("progress"),
    score: $("score"),
    case: document.querySelector(".case"),
    frame: $("figureFrame"),
    caption: $("figCaption"),
    question: $("question"),
    options: $("options"),
    feedback: $("feedback"),
    verdict: $("verdict"),
    explanation: $("explanation"),
    hint: $("hint"),
    btn: $("submitBtn"),
  };

  let index = 0;
  let selected = null;
  let answered = false;
  let sessionCorrect = 0;
  let total = loadScore();

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
    const q = questions[index];
    selected = null;
    answered = false;

    els.progress.textContent = `Question ${index + 1} of ${questions.length}`;
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
    if (selected === null || answered) return;
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
      render();
    } else {
      finish();
    }
  }

  function finish() {
    els.case.classList.add("no-figure");
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
  if (questions.length) render();
  else els.question.textContent = "No questions loaded. Add some to questions.js.";
})();
