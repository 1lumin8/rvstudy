const chapterSelect = document.querySelector("#chapterSelect");
const countSelect = document.querySelector("#countSelect");
const focusSelect = document.querySelector("#focusSelect");
const difficultySelect = document.querySelector("#difficultySelect");
const generateBtn = document.querySelector("#generateBtn");
const chapterNote = document.querySelector("#chapterNote");
const quizForm = document.querySelector("#quizForm");
const results = document.querySelector("#results");
const tabButtons = document.querySelectorAll(".tab-button");
const studyPanels = document.querySelectorAll(".study-panel");
const graduationPart = document.querySelector("#graduationPart");
const graduationJump = document.querySelector("#graduationJump");
const orderGraduationBtn = document.querySelector("#orderGraduationBtn");
const shuffleGraduationBtn = document.querySelector("#shuffleGraduationBtn");
const graduationCard = document.querySelector("#graduationCard");
const graduationProgress = document.querySelector("#graduationProgress");
const graduationSide = document.querySelector("#graduationSide");
const graduationText = document.querySelector("#graduationText");
const prevGraduationBtn = document.querySelector("#prevGraduationBtn");
const flipGraduationBtn = document.querySelector("#flipGraduationBtn");
const nextGraduationBtn = document.querySelector("#nextGraduationBtn");

let activeQuiz = [];
let graduationDeck = [];
let graduationIndex = 0;
let graduationShowingAnswer = false;

function init() {
  CHAPTERS.forEach((chapter) => {
    const option = document.createElement("option");
    option.value = chapter.chapter;
    option.textContent = `Revelation ${chapter.chapter}: ${chapter.title}`;
    chapterSelect.append(option);
  });

  chapterSelect.value = "18";
  updateChapterNote();
  generateQuiz();
  resetGraduationDeck();
}

function switchPanel(panelId) {
  tabButtons.forEach((button) => {
    const isActive = button.dataset.panel === panelId;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  studyPanels.forEach((panel) => {
    panel.hidden = panel.id !== panelId;
  });
}

function updateChapterNote() {
  const chapter = getSelectedChapter();
  const classCount = chapter.questions.filter((item) => item.source === "class").length;
  const detailCount = chapter.questions.filter((item) => item.source === "detail").length;
  const pool = getQuestionPool(chapter, focusSelect.value);
  const difficultyText = difficultySelect.value === "mixedFormats"
    ? "Mixed formats are on: multiple choice, true/false, and typed answers."
    : "Multiple choice is on.";
  const sourceText = [
    classCount ? `${classCount} source question${classCount === 1 ? "" : "s"}` : "",
    detailCount ? `${detailCount} detailed question${detailCount === 1 ? "" : "s"}` : ""
  ].filter(Boolean).join(" and ") || "a general Revelation chapter study bank";
  chapterNote.textContent = `${chapter.note} This chapter has ${sourceText}. ${difficultyText} Current focus has ${pool.length} matching question${pool.length === 1 ? "" : "s"} and can fill up to ${chapter.questions.length} from the full chapter bank.`;
}

function getSelectedChapter() {
  return CHAPTERS.find((chapter) => String(chapter.chapter) === chapterSelect.value);
}

function getQuestionPool(chapter, focus) {
  if (focus === "mixed") return chapter.questions;

  const focusedPool = chapter.questions.filter((item) => {
    if (focus === "text") return item.source === "text" || item.source === "detail";
    return item.source === focus;
  });
  return focusedPool.length ? focusedPool : chapter.questions;
}

function generateQuiz() {
  const chapter = getSelectedChapter();
  const focus = focusSelect.value;
  const wanted = Number(countSelect.value);
  const pool = getQuestionPool(chapter, focus);
  const fillerPool = chapter.questions.filter((question) => !pool.includes(question));
  const quizPool = [...shuffle(pool), ...shuffle(fillerPool)].slice(0, Math.min(wanted, chapter.questions.length));

  activeQuiz = quizPool.map((question, index) => ({
    ...question,
    id: `${chapter.chapter}-${index}-${Date.now()}`,
    format: getQuestionFormat(index),
    trueFalse: buildTrueFalse(question, index),
    shuffledChoices: shuffle(question.choices.map((choice, choiceIndex) => ({ choice, choiceIndex })))
  }));

  renderQuiz(chapter);
  updateChapterNote();
}

function renderQuiz(chapter) {
  const isMixedFormats = difficultySelect.value === "mixedFormats";
  results.hidden = true;
  results.innerHTML = "";
  quizForm.innerHTML = "";

  const heading = document.createElement("div");
  heading.className = "question-card";
  heading.innerHTML = `
    <div class="question-head">
      <div>
        <span class="question-number">Revelation ${chapter.chapter}</span>
        <p class="prompt">${chapter.title}</p>
      </div>
      <span class="tag">${isMixedFormats ? "Mixed formats" : "Multiple choice"} · ${activeQuiz.length} questions</span>
    </div>
  `;
  quizForm.append(heading);

  activeQuiz.forEach((question, index) => {
    const card = document.createElement("fieldset");
    card.className = "question-card";
    card.dataset.questionIndex = index;
    card.innerHTML = `
      <div class="question-head">
        <legend class="question-number">Question ${index + 1}</legend>
        <span class="tag">${getSourceLabel(question.source)}</span>
      </div>
      <p class="prompt">${question.prompt}</p>
      ${renderQuestionInput(question)}
    `;
    quizForm.append(card);
  });

  const submitRow = document.createElement("div");
  submitRow.className = "submit-row";
  submitRow.innerHTML = `
    <button class="secondary" id="resetBtn" type="button">New Version</button>
    <button type="submit">Show Answers</button>
  `;
  quizForm.append(submitRow);

  document.querySelector("#resetBtn").addEventListener("click", generateQuiz);
}

function showResults(event) {
  event.preventDefault();

  const data = new FormData(quizForm);
  let correct = 0;
  const review = activeQuiz.map((question, index) => {
    const selected = getSelectedAnswer(data, question);
    const isCorrect = isAnswerCorrect(question, selected);
    if (isCorrect) correct += 1;
    markQuestion(index, selected);
    return { question, selected, isCorrect };
  });

  const missed = review.filter((item) => !item.isCorrect);
  const percent = Math.round((correct / activeQuiz.length) * 100);

  results.hidden = false;
  results.innerHTML = `
    <div class="score">
      <strong>${correct}/${activeQuiz.length}</strong>
      <span>${percent}% correct</span>
    </div>
    <p class="explanation">
      ${missed.length ? `You missed ${missed.length} question${missed.length === 1 ? "" : "s"}.` : "Perfect score. Nice and tidy."}
    </p>
    <div class="review-list">
      ${review.map(renderReviewItem).join("")}
    </div>
  `;

  results.scrollIntoView({ behavior: "smooth", block: "start" });
}

function getQuestionFormat(index) {
  if (difficultySelect.value !== "mixedFormats") return "choice";
  return ["choice", "trueFalse", "recall"][index % 3];
}

function buildTrueFalse(question, index) {
  const makeTrue = index % 2 === 0;
  const correctChoice = question.choices[question.answer];
  const wrongChoices = question.choices.filter((_, choiceIndex) => choiceIndex !== question.answer);
  const displayedChoice = makeTrue ? correctChoice : wrongChoices[index % wrongChoices.length];

  return {
    expected: makeTrue,
    statement: `The answer to "${question.prompt}" is "${displayedChoice}."`
  };
}

function getSourceLabel(source) {
  if (source === "class") return "Source";
  if (source === "detail") return "Detailed";
  return "Chapter text";
}

function renderQuestionInput(question) {
  if (question.format === "recall") return renderRecallInput(question);
  if (question.format === "trueFalse") return renderTrueFalseInputs(question);
  return renderChoiceInputs(question);
}

function renderChoiceInputs(question) {
  return `
    <div class="answers">
      ${question.shuffledChoices
        .map(
          ({ choice, choiceIndex }) => `
            <label class="answer-option">
              <input type="radio" name="${question.id}" value="${choiceIndex}" />
              <span>${choice}</span>
            </label>
          `
        )
        .join("")}
    </div>
  `;
}

function renderTrueFalseInputs(question) {
  return `
    <p class="true-false-statement">${question.trueFalse.statement}</p>
    <div class="answers">
      <label class="answer-option">
        <input type="radio" name="${question.id}" value="true" />
        <span>True</span>
      </label>
      <label class="answer-option">
        <input type="radio" name="${question.id}" value="false" />
        <span>False</span>
      </label>
    </div>
  `;
}

function renderRecallInput(question) {
  return `
    <label class="recall-answer">
      <span>Type the answer from memory</span>
      <input type="text" name="${question.id}" autocomplete="off" />
    </label>
  `;
}

function getSelectedAnswer(data, question) {
  const value = data.get(question.id);
  if (question.format === "recall") return String(value || "");
  if (value === null) return null;
  if (question.format === "trueFalse") return String(value) === "true";
  return Number(value);
}

function isAnswerCorrect(question, selected) {
  if (question.format === "recall") {
    return isRecallCorrect(selected, question.choices[question.answer]);
  }
  if (question.format === "trueFalse") {
    return selected === question.trueFalse.expected;
  }
  return selected === question.answer;
}

function markQuestion(questionIndex, selected) {
  const question = activeQuiz[questionIndex];
  const card = quizForm.querySelector(`[data-question-index="${questionIndex}"]`);
  if (question.format === "recall") {
    const label = card.querySelector(".recall-answer");
    const input = label.querySelector("input");
    input.disabled = true;
    label.classList.toggle("correct", isAnswerCorrect(question, selected));
    label.classList.toggle("incorrect", !isAnswerCorrect(question, selected));
    return;
  }

  card.querySelectorAll(".answer-option").forEach((option) => {
    const input = option.querySelector("input");
    const value = question.format === "trueFalse" ? input.value === "true" : Number(input.value);
    input.disabled = true;
    const expected = question.format === "trueFalse" ? question.trueFalse.expected : question.answer;
    option.classList.toggle("correct", value === expected);
    option.classList.toggle("incorrect", value === selected && selected !== expected);
  });
}

function renderReviewItem({ question, selected, isCorrect }, index) {
  const selectedText = getReviewSelectedText(question, selected);
  const answerText = getReviewAnswerText(question);
  const evidence = getEvidenceExcerpt(question);
  return `
    <article class="review-item ${isCorrect ? "right" : ""}">
      <strong>${index + 1}. ${isCorrect ? "Correct" : "Review this one"}</strong>
      <p class="explanation">${escapeHtml(question.prompt)}</p>
      <p class="explanation">Your answer: <strong>${escapeHtml(selectedText)}</strong></p>
      <p class="explanation">Correct answer: <strong>${escapeHtml(answerText)}</strong></p>
      <p class="evidence"><span>Evidence excerpt:</span> ${evidence}</p>
    </article>
  `;
}

function resetGraduationDeck() {
  const selectedPart = graduationPart.value;
  graduationDeck = GRADUATION_CARDS.filter((card) => {
    return selectedPart === "all" || String(card.part) === selectedPart;
  });
  graduationIndex = 0;
  graduationShowingAnswer = false;
  renderGraduationJumpOptions();
  renderGraduationCard();
}

function renderGraduationJumpOptions() {
  graduationJump.innerHTML = "";
  graduationDeck.forEach((card, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = `Part ${card.part}, Question ${card.number}`;
    graduationJump.append(option);
  });
}

function renderGraduationCard() {
  const card = graduationDeck[graduationIndex];
  if (!card) {
    graduationProgress.textContent = "No cards";
    graduationSide.textContent = "Question";
    graduationText.textContent = "";
    return;
  }

  graduationJump.value = String(graduationIndex);
  graduationProgress.textContent = `Card ${graduationIndex + 1} of ${graduationDeck.length} · Part ${card.part}, Question ${card.number}`;
  graduationSide.textContent = graduationShowingAnswer ? "Answer" : "Question";
  graduationCard.classList.toggle("showing-answer", graduationShowingAnswer);
  graduationText.innerHTML = formatGraduationText(card, graduationShowingAnswer);
  flipGraduationBtn.textContent = graduationShowingAnswer ? "Show Question" : "Show Answer";
}

function formatGraduationText(card, showingAnswer) {
  const content = showingAnswer
    ? splitAnswerLines(card.answer)
    : splitQuestionLines(card.question);
  const lead = content.lead
    ? `<span class="flashcard-lead">${escapeHtml(content.lead)}</span>`
    : "";

  return lead + content.lines
    .map((line, index) => {
      return `
        <span class="flashcard-line">
          <span class="answer-index">${index + 1}.</span>
          <span>${escapeHtml(line)}</span>
        </span>
      `;
    })
    .join("");
}

function splitAnswerLines(answer) {
  return {
    lead: "",
    lines: answer
      .split("\n")
      .map((line) => line.replace(/^(\d+\)|[①②③④⑤⑥⑦⑧⑨⑩])\s*/, "").trim())
      .filter(Boolean)
  };
}

function splitQuestionLines(question) {
  const markers = [...question.matchAll(/①|②|③|④|⑤|⑥|⑦|⑧|⑨|⑩|\b\d+\)/g)];
  if (!markers.length) {
    return { lead: "", lines: [question.trim()].filter(Boolean) };
  }

  const lead = question.slice(0, markers[0].index).trim();
  const lines = markers
    .map((marker, index) => {
      const start = marker.index + marker[0].length;
      const end = markers[index + 1]?.index ?? question.length;
      return question.slice(start, end).trim();
    })
    .filter(Boolean);

  return { lead, lines };
}

function moveGraduationCard(direction) {
  graduationIndex = (graduationIndex + direction + graduationDeck.length) % graduationDeck.length;
  graduationShowingAnswer = false;
  renderGraduationCard();
}

function getEvidenceExcerpt(question) {
  return escapeHtml(question.excerpt || question.explanation);
}

function getReviewSelectedText(question, selected) {
  if (question.format === "recall") return String(selected || "No answer selected");
  if (selected === null) return "No answer selected";
  if (question.format === "trueFalse") return selected ? "True" : "False";
  return question.choices[selected] || "No answer selected";
}

function getReviewAnswerText(question) {
  if (question.format === "trueFalse") return question.trueFalse.expected ? "True" : "False";
  return question.choices[question.answer];
}

function isRecallCorrect(userAnswer, correctAnswer) {
  const user = normalizeAnswer(userAnswer);
  const correct = normalizeAnswer(correctAnswer);
  if (!user) return false;
  if (user === correct || user.includes(correct)) return true;

  const importantTerms = correct
    .split(" ")
    .filter((term) => term.length > 3 && !COMMON_WORDS.has(term));

  if (!importantTerms.length) return false;
  const matchedTerms = importantTerms.filter((term) => user.includes(term));
  return matchedTerms.length / importantTerms.length >= 0.6;
}

function normalizeAnswer(value) {
  return String(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const COMMON_WORDS = new Set([
  "that",
  "this",
  "with",
  "from",
  "only",
  "their",
  "those",
  "they",
  "them",
  "into",
  "about",
  "because",
  "according",
  "great"
]);

function shuffle(items) {
  return [...items]
    .map((item) => ({ item, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ item }) => item);
}

tabButtons.forEach((button) => {
  button.addEventListener("click", () => switchPanel(button.dataset.panel));
});

chapterSelect.addEventListener("change", () => {
  updateChapterNote();
  generateQuiz();
});
countSelect.addEventListener("change", generateQuiz);
focusSelect.addEventListener("change", generateQuiz);
difficultySelect.addEventListener("change", generateQuiz);
generateBtn.addEventListener("click", generateQuiz);
quizForm.addEventListener("submit", showResults);
graduationPart.addEventListener("change", resetGraduationDeck);
orderGraduationBtn.addEventListener("click", resetGraduationDeck);
graduationJump.addEventListener("change", () => {
  graduationIndex = Number(graduationJump.value);
  graduationShowingAnswer = false;
  renderGraduationCard();
});
shuffleGraduationBtn.addEventListener("click", () => {
  graduationDeck = shuffle(graduationDeck);
  graduationIndex = 0;
  graduationShowingAnswer = false;
  renderGraduationJumpOptions();
  renderGraduationCard();
});
prevGraduationBtn.addEventListener("click", () => moveGraduationCard(-1));
nextGraduationBtn.addEventListener("click", () => moveGraduationCard(1));
flipGraduationBtn.addEventListener("click", () => {
  graduationShowingAnswer = !graduationShowingAnswer;
  renderGraduationCard();
});
graduationCard.addEventListener("click", () => {
  graduationShowingAnswer = !graduationShowingAnswer;
  renderGraduationCard();
});

init();
