/**
 * flashcards.js — Flashcard system with 3D flip
 */
(function() {
  'use strict';

  let allDecks     = {};
  let currentDeck  = [];
  let deckId       = '';
  let currentIndex = 0;
  let isFlipped    = false;
  let learnedSet   = new Set();

  /* ── Load data ── */
  fetch('../data/flashcards.json')
    .then(r => r.json())
    .then(data => {
      allDecks = data.decks || {};
      renderDeckButtons();
      loadDeck('vocabulary');
    })
    .catch(() => console.error('Could not load flashcards.json'));

  /* ── Deck Buttons ── */
  function renderDeckButtons() {
    const container = document.getElementById('deckGrid');
    if (!container) return;
    container.innerHTML = Object.entries(allDecks).map(([id, deck]) => {
      const learned = window.Progress ? Progress.getLearnedCards(id).length : 0;
      const total   = deck.cards.length;
      const pct     = total > 0 ? Math.round(learned / total * 100) : 0;
      return `
        <button class="deck-btn ${id === deckId ? 'active' : ''}" data-deck="${id}" onclick="FC.loadDeck('${id}')">
          <div class="d-icon">${deck.icon}</div>
          <div class="d-name">${deck.name}</div>
          <div class="d-count">${total} карточек</div>
          <div class="d-prog">
            <div class="progress-bar-wrap" style="height:6px">
              <div class="progress-bar-fill" style="width:${pct}%"></div>
            </div>
          </div>
        </button>
      `;
    }).join('');
  }

  function loadDeck(id) {
    const deck = allDecks[id];
    if (!deck) return;
    deckId      = id;
    currentDeck = [...deck.cards];
    currentIndex = 0;
    isFlipped   = false;

    // Load learned from progress
    const learned = window.Progress ? Progress.getLearnedCards(id) : [];
    learnedSet = new Set(learned);

    // Update active deck button
    document.querySelectorAll('.deck-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.deck === id);
    });

    // Show deck info
    const nameEl = document.getElementById('deckName');
    if (nameEl) nameEl.textContent = deck.name + ' (' + deck.nameRu + ')';

    renderCard();
    renderLearnedStrip();
    updateCounter();
    document.getElementById('fcComplete').style.display = 'none';
    document.getElementById('fcArea').style.display = 'block';
  }

  window.FC = {
    loadDeck,

    flip() {
      const card3d = document.getElementById('card3d');
      if (!card3d) return;
      isFlipped = !isFlipped;
      card3d.classList.toggle('flipped', isFlipped);
    },

    markKnow() {
      learnedSet.add(currentIndex);
      if (window.Progress) Progress.setFlashcardLearned(deckId, currentIndex, true);
      updateNavPoints();
      renderLearnedStrip();
      renderDeckButtons();
      FC.next();
    },

    markUnknown() {
      learnedSet.delete(currentIndex);
      if (window.Progress) Progress.setFlashcardLearned(deckId, currentIndex, false);
      renderLearnedStrip();
      renderDeckButtons();
      FC.next();
    },

    next() {
      if (currentIndex < currentDeck.length - 1) {
        currentIndex++;
        isFlipped = false;
        renderCard();
        updateCounter();
      } else {
        checkCompletion();
      }
    },

    prev() {
      if (currentIndex > 0) {
        currentIndex--;
        isFlipped = false;
        renderCard();
        updateCounter();
      }
    },

    shuffle() {
      // Fisher-Yates shuffle preserving indices by rebuilding deck with original indices
      const indexed = currentDeck.map((c, i) => ({ card: c, origIdx: i }));
      for (let i = indexed.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
      }
      currentDeck = indexed.map(x => x.card);
      currentIndex = 0; isFlipped = false;
      renderCard(); updateCounter();
      showToast('Карточки перемешаны!');
    },

    restart() {
      currentIndex = 0; isFlipped = false;
      renderCard(); updateCounter();
      document.getElementById('fcComplete').style.display = 'none';
      document.getElementById('fcArea').style.display = 'block';
    }
  };

  function renderCard() {
    const card = currentDeck[currentIndex];
    if (!card) return;

    const card3d = document.getElementById('card3d');
    if (card3d) {
      card3d.classList.remove('flipped');
      isFlipped = false;
    }

    // Front face
    const frontEl = document.getElementById('cardFront');
    if (frontEl) {
      frontEl.innerHTML = `
        <div class="word">${card.front}</div>
        ${card.example ? `<div class="hint">"${card.example}"</div>` : ''}
        <div class="flip-hint"><i class="fa fa-rotate-right"></i> Click to flip</div>
      `;
    }

    // Back face
    const backEl = document.getElementById('cardBack');
    if (backEl) {
      let extras = '';
      if (card.tip)  extras += `<div class="tip-box"><i class="fa fa-lightbulb"></i> ${card.tip}</div>`;
      if (card.fact) extras += `<div class="fact-box-fc"><i class="fa fa-star"></i> ${card.fact}</div>`;
      if (card.location) extras += `<div class="tip-box"><i class="fa fa-map-pin"></i> ${card.location}</div>`;

      backEl.innerHTML = `
        <div class="translation">${card.back}</div>
        ${card.example ? `<div class="example">"${card.example}"</div>` : ''}
        ${extras}
      `;
    }
  }

  function updateCounter() {
    const el = document.getElementById('fcCounter');
    if (el) el.textContent = `${currentIndex + 1} / ${currentDeck.length}`;

    const learned = learnedSet.size;
    const total   = currentDeck.length;
    const progEl  = document.getElementById('fcProgressText');
    if (progEl) progEl.textContent = `✅ Изучено: ${learned} / ${total}`;

    // Prev/next buttons
    const prevBtn = document.getElementById('fcPrevBtn');
    const nextBtn = document.getElementById('fcNextBtn');
    if (prevBtn) prevBtn.disabled = currentIndex === 0;
    if (nextBtn) nextBtn.disabled = currentIndex === currentDeck.length - 1;
  }

  function renderLearnedStrip() {
    const strip = document.getElementById('learnedStrip');
    if (!strip) return;
    strip.innerHTML = currentDeck.map((_, i) => {
      const isKnown   = learnedSet.has(i);
      const isCurrent = i === currentIndex;
      return `<div class="learned-dot ${isKnown ? 'known' : ''} ${isCurrent ? 'current' : ''}"></div>`;
    }).join('');
  }

  function checkCompletion() {
    const learned = learnedSet.size;
    const total   = currentDeck.length;
    if (learned === total) {
      document.getElementById('fcArea').style.display    = 'none';
      document.getElementById('fcComplete').style.display = 'block';
      document.getElementById('fcCompleteCount').textContent = total;
    }
  }

  function updateNavPoints() {
    const nav = document.querySelector('.nav-pts-value');
    if (nav && window.Progress) nav.textContent = Progress.getTotalPoints();
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Card click = flip
    const scene = document.getElementById('cardScene');
    if (scene) scene.addEventListener('click', FC.flip);
  });

})();
