/**
 * quiz.js — Quiz engine
 */
(function() {
  'use strict';

  let allQuestions = {};
  let currentQuestions = [];
  let currentIndex   = 0;
  let score          = 0;
  let answered       = false;
  let selectedTopic  = '';
  let selectedLevel  = '';
  let wrongAnswers   = [];
  let timerInterval  = null;
  let timeLeft       = 0;

  const QUESTION_TIME = 30; // seconds per question

  /* ── Load data ── */
  fetch('../data/quizzes.json')
    .then(r => r.json())
    .then(data => { allQuestions = data; updateBestScores(); })
    .catch(() => console.error('Could not load quizzes.json'));

  /* ── DOM Refs ── */
  const setupEl   = () => document.getElementById('quizSetup');
  const activeEl  = () => document.getElementById('quizActive');
  const resultsEl = () => document.getElementById('quizResults');

  /* ── Setup screen ── */
  function selectTopic(topic) {
    selectedTopic = topic;
    document.querySelectorAll('.topic-btn').forEach(b => b.classList.remove('selected'));
    const btn = document.querySelector(`.topic-btn[data-topic="${topic}"]`);
    if (btn) btn.classList.add('selected');
    updateBestScores();
  }

  function selectLevel(level) {
    selectedLevel = level;
    document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('selected'));
    const btn = document.querySelector(`.level-btn[data-level="${level}"]`);
    if (btn) btn.classList.add('selected');
    updateBestScores();
  }

  function updateBestScores() {
    if (!window.Progress || !selectedTopic || !selectedLevel) return;
    const best  = Progress.getQuizBest(selectedTopic, selectedLevel);
    const played = Progress.getQuizPlayed(selectedTopic, selectedLevel);
    const el = document.getElementById('bestScoreInfo');
    if (el) {
      if (played > 0) {
        el.innerHTML = `🏆 Лучший результат: <strong>${best}</strong> баллов &nbsp;|&nbsp; Пройдено раз: <strong>${played}</strong>`;
      } else {
        el.textContent = 'Ещё не проходили этот тест';
      }
    }
  }

  function startQuiz() {
    if (!selectedTopic || !selectedLevel) {
      showToast('Выберите тему и уровень!'); return;
    }
    const qs = (allQuestions[selectedTopic] || {})[selectedLevel];
    if (!qs || qs.length === 0) {
      showToast('Вопросы для этого уровня не найдены'); return;
    }

    // Shuffle and pick up to 10
    currentQuestions = shuffle([...qs]).slice(0, 10);
    currentIndex  = 0;
    score         = 0;
    wrongAnswers  = [];
    answered      = false;

    setupEl().style.display  = 'none';
    activeEl().style.display = 'block';
    resultsEl().style.display = 'none';

    renderQuestion();
  }

  function renderQuestion() {
    const q   = currentQuestions[currentIndex];
    const tot = currentQuestions.length;

    // Header
    document.getElementById('qProgressText').textContent = `Вопрос ${currentIndex + 1} из ${tot}`;
    document.getElementById('qScoreVal').textContent = score;

    // Progress bar
    const pct = (currentIndex / tot) * 100;
    document.getElementById('qProgressBar').style.width = pct + '%';

    // Question card
    document.getElementById('questionNum').textContent  = `Question ${currentIndex + 1}`;
    document.getElementById('questionText').textContent = q.q;

    // Options
    const grid = document.getElementById('optionsGrid');
    const letters = ['A', 'B', 'C', 'D'];
    grid.innerHTML = q.options.map((opt, i) => `
      <button class="option-btn" data-index="${i}" onclick="Quiz.selectAnswer(${i})">
        <span class="option-letter">${letters[i]}</span>
        <span class="option-text">${opt}</span>
      </button>
    `).join('');

    // Feedback
    const fb = document.getElementById('feedbackBox');
    fb.style.display = 'none';
    fb.className = 'feedback-box';

    // Next button
    document.getElementById('nextBtnRow').style.display = 'none';

    answered = false;

    // Start timer
    startTimer();
  }

  function startTimer() {
    clearInterval(timerInterval);
    timeLeft = QUESTION_TIME;
    updateTimer();
    timerInterval = setInterval(() => {
      timeLeft--;
      updateTimer();
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        if (!answered) autoAnswer();
      }
    }, 1000);
  }

  function updateTimer() {
    const el = document.getElementById('qTimer');
    if (!el) return;
    el.textContent = timeLeft + 's';
    el.parentElement.className = 'game-stat quiz-timer' + (timeLeft <= 8 ? ' urgent' : '');
  }

  function autoAnswer() {
    // Time ran out — treat as wrong
    answered = true;
    const q = currentQuestions[currentIndex];
    const opts = document.querySelectorAll('.option-btn');
    opts.forEach(o => o.disabled = true);
    opts[q.answer].classList.add('correct');
    showFeedback(false, q);
    wrongAnswers.push({ q: q.q, correct: q.options[q.answer], explanation: q.explanation });
    showNextBtn();
  }

  window.Quiz = {
    selectTopic, selectLevel, startQuiz,

    selectAnswer(index) {
      if (answered) return;
      answered = true;
      clearInterval(timerInterval);

      const q    = currentQuestions[currentIndex];
      const opts = document.querySelectorAll('.option-btn');
      opts.forEach(o => o.disabled = true);

      const isCorrect = index === q.answer;
      opts[index].classList.add(isCorrect ? 'correct' : 'wrong');
      if (!isCorrect) opts[q.answer].classList.add('correct');

      if (isCorrect) {
        score++;
        document.getElementById('qScoreVal').textContent = score;
      } else {
        wrongAnswers.push({ q: q.q, correct: q.options[q.answer], explanation: q.explanation });
      }

      showFeedback(isCorrect, q);
      showNextBtn();
    },

    nextQuestion() {
      currentIndex++;
      if (currentIndex >= currentQuestions.length) {
        showResults();
      } else {
        renderQuestion();
      }
    },

    restart() {
      clearInterval(timerInterval);
      setupEl().style.display  = 'block';
      activeEl().style.display = 'none';
      resultsEl().style.display = 'none';
    }
  };

  function showFeedback(correct, q) {
    const fb = document.getElementById('feedbackBox');
    fb.style.display = 'block';
    fb.className = 'feedback-box ' + (correct ? 'correct' : 'wrong');
    fb.innerHTML = `
      <div class="fb-title">${correct ? '✅ Correct!' : '❌ Incorrect'}</div>
      <div>${q.explanation}</div>
    `;
  }

  function showNextBtn() {
    const row = document.getElementById('nextBtnRow');
    const tot = currentQuestions.length;
    row.style.display = 'block';
    const btn = row.querySelector('.next-btn');
    if (btn) {
      btn.textContent = currentIndex + 1 >= tot ? '📊 See Results' : 'Next Question →';
    }
  }

  function showResults() {
    clearInterval(timerInterval);
    activeEl().style.display  = 'none';
    resultsEl().style.display = 'block';

    const tot = currentQuestions.length;
    const pct = Math.round(score / tot * 100);

    document.getElementById('rScore').textContent = score;
    document.getElementById('rTotal').textContent = '/' + tot;
    document.getElementById('rCorrect').textContent = score;
    document.getElementById('rWrong').textContent   = tot - score;
    document.getElementById('rPercent').textContent = pct + '%';

    // Emoji result
    let emoji = '⭐', msg = '';
    if (pct === 100) { emoji = '🏆'; msg = 'Perfect score! Brilliant!'; }
    else if (pct >= 80) { emoji = '🎉'; msg = 'Excellent work!'; }
    else if (pct >= 60) { emoji = '👍'; msg = 'Good job! Keep it up!'; }
    else if (pct >= 40) { emoji = '📚'; msg = 'Keep studying!'; }
    else { emoji = '💪'; msg = 'Don\'t give up, try again!'; }

    document.getElementById('resultEmoji').textContent = emoji;
    document.getElementById('resultMsg').textContent   = msg;

    // Save progress
    if (window.Progress) {
      const pts = Progress.saveQuiz(selectedTopic, selectedLevel, score, tot);
      document.getElementById('pointsEarned').textContent = pts;
      updateNavPoints();
    }

    // Wrong answers review
    const reviewEl = document.getElementById('reviewList');
    if (wrongAnswers.length === 0) {
      reviewEl.innerHTML = '<p style="color:var(--green);font-weight:600">🎉 No mistakes! Perfect!</p>';
    } else {
      reviewEl.innerHTML = wrongAnswers.map(w => `
        <div class="review-item">
          <div class="ri-q">${w.q}</div>
          <div class="ri-correct">✅ Correct answer: <strong>${w.correct}</strong></div>
          <div class="ri-explanation">${w.explanation}</div>
        </div>
      `).join('');
    }
  }

  function updateNavPoints() {
    const nav = document.querySelector('.nav-pts-value');
    if (nav && window.Progress) nav.textContent = Progress.getTotalPoints();
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Set defaults
    selectTopic('geography');
    selectLevel('5-7');
  });

})();
