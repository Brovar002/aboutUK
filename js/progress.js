/**
 * progress.js — localStorage progress tracking
 * Key: 'uk_progress'
 */
(function(window) {
  'use strict';

  const STORAGE_KEY = 'uk_progress';

  const defaults = {
    quizScores:        {},   // "topic-level": bestScore
    quizPlayed:        {},   // "topic-level": timesPlayed
    flashcardsLearned: {},   // "deckId": [indices of learned cards]
    gamesPlayed:       0,
    wordSearchWins:    0,
    hangmanWins:       0,
    totalPoints:       0,
    achievements:      []
  };

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return Object.assign({}, defaults);
      return Object.assign({}, defaults, JSON.parse(raw));
    } catch(e) {
      return Object.assign({}, defaults);
    }
  }

  function save(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
    catch(e) { console.warn('Progress save failed:', e); }
  }

  const Progress = {
    get() { return load(); },

    /** Save quiz result. Returns points earned. */
    saveQuiz(topic, level, score, total) {
      const data   = load();
      const key    = topic + '-' + level;
      const prev   = data.quizScores[key] || 0;
      const points = score * 10;
      if (score > prev) {
        data.quizScores[key]  = score;
        data.totalPoints     += Math.max(0, points - prev * 10);
      }
      data.quizPlayed[key] = (data.quizPlayed[key] || 0) + 1;
      save(data);
      return points;
    },

    /** Mark a flashcard as learned/unlearned */
    setFlashcardLearned(deckId, index, learned) {
      const data = load();
      if (!data.flashcardsLearned[deckId]) data.flashcardsLearned[deckId] = [];
      const arr = data.flashcardsLearned[deckId];
      const i   = arr.indexOf(index);
      if (learned && i === -1) {
        arr.push(index);
        data.totalPoints += 2;
      } else if (!learned && i !== -1) {
        arr.splice(i, 1);
      }
      save(data);
    },

    getLearnedCards(deckId) {
      return load().flashcardsLearned[deckId] || [];
    },

    addGamePoints(game, won) {
      const data = load();
      data.gamesPlayed++;
      if (won) {
        if (game === 'wordsearch') data.wordSearchWins++;
        if (game === 'hangman')   data.hangmanWins++;
        data.totalPoints += 15;
      }
      save(data);
    },

    getTotalPoints() { return load().totalPoints; },

    getQuizBest(topic, level) {
      return load().quizScores[topic + '-' + level] || 0;
    },

    getQuizPlayed(topic, level) {
      return load().quizPlayed[topic + '-' + level] || 0;
    },

    /** Returns progress %: quizzes completed across all topics */
    getOverallProgress() {
      const data   = load();
      const topics  = ['geography','culture','history','language'];
      const levels  = ['5-7','8-9','10-11'];
      const total   = topics.length * levels.length;
      let   done    = 0;
      for (const t of topics)
        for (const l of levels)
          if (data.quizScores[t + '-' + l] !== undefined) done++;
      return Math.round(done / total * 100);
    },

    reset() {
      save(Object.assign({}, defaults));
    }
  };

  window.Progress = Progress;

})(window);
