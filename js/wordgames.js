/**
 * wordgames.js — Word Search + Hangman
 */
(function() {
  'use strict';

  let vocabData = {};

  /* ── Load data ── */
  fetch('../data/vocabulary.json')
    .then(r => r.json())
    .then(data => { vocabData = data; })
    .catch(() => console.error('Could not load vocabulary.json'));

  /* ════════════════════════════════
     TAB SWITCHING
     ════════════════════════════════ */
  window.WG = {
    switchTab(tab) {
      document.querySelectorAll('.game-tab').forEach(t =>
        t.classList.toggle('active', t.dataset.tab === tab));
      document.querySelectorAll('.game-panel').forEach(p =>
        p.classList.toggle('active', p.id === 'panel-' + tab));
    }
  };

  /* ════════════════════════════════
     WORD SEARCH
     ════════════════════════════════ */
  const WS = {
    GRID_SIZE:   10,
    grid:        [],
    words:       [],
    wordDefs:    {},
    found:       new Set(),
    selecting:   false,
    startCell:   null,
    currentPath: [],
    timer:       null,
    seconds:     0,
    theme:       'cities',

    init(theme) {
      this.theme   = theme || 'cities';
      this.found   = new Set();
      this.seconds = 0;
      clearInterval(this.timer);

      const themeData = vocabData.wordSearch[this.theme];
      if (!themeData) return;

      this.words = themeData.words.slice(0, 12);

      this.generateGrid();
      this.renderGrid();
      this.renderWordList();
      this.startTimer();

      document.getElementById('wsFoundCount').textContent = '0';
      document.getElementById('wsWordCount').textContent  = this.words.length;
    },

    generateGrid() {
      const SIZE = this.GRID_SIZE;
      this.grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(''));

      const directions = [
        [0,1],[1,0],[1,1],[0,-1],[-1,0],[-1,-1],[1,-1],[-1,1]
      ];

      for (const word of this.words) {
        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 200) {
          attempts++;
          const dir = directions[Math.floor(Math.random() * directions.length)];
          const row = Math.floor(Math.random() * SIZE);
          const col = Math.floor(Math.random() * SIZE);

          if (this.canPlace(word, row, col, dir, SIZE)) {
            this.placeWord(word, row, col, dir);
            placed = true;
          }
        }
      }

      // Fill empty cells
      const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      for (let r = 0; r < SIZE; r++)
        for (let c = 0; c < SIZE; c++)
          if (!this.grid[r][c])
            this.grid[r][c] = alpha[Math.floor(Math.random() * alpha.length)];
    },

    canPlace(word, row, col, dir, size) {
      for (let i = 0; i < word.length; i++) {
        const r = row + dir[0] * i;
        const c = col + dir[1] * i;
        if (r < 0 || r >= size || c < 0 || c >= size) return false;
        if (this.grid[r][c] && this.grid[r][c] !== word[i]) return false;
      }
      return true;
    },

    placeWord(word, row, col, dir) {
      for (let i = 0; i < word.length; i++) {
        this.grid[row + dir[0] * i][col + dir[1] * i] = word[i];
      }
    },

    renderGrid() {
      const container = document.getElementById('wsGrid');
      if (!container) return;
      const SIZE = this.GRID_SIZE;
      container.style.gridTemplateColumns = `repeat(${SIZE}, 36px)`;
      container.innerHTML = '';

      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          const cell = document.createElement('div');
          cell.className = 'ws-cell';
          cell.textContent = this.grid[r][c];
          cell.dataset.row = r;
          cell.dataset.col = c;

          // Mouse events
          cell.addEventListener('mousedown', e => { e.preventDefault(); WS.startSelect(r, c); });
          cell.addEventListener('mouseover', () => { if (WS.selecting) WS.updateSelect(r, c); });
          cell.addEventListener('mouseup',   () => WS.endSelect());

          // Touch events
          cell.addEventListener('touchstart', e => { e.preventDefault(); WS.startSelect(r, c); }, { passive: false });
          cell.addEventListener('touchmove',  e => {
            e.preventDefault();
            const t = e.touches[0];
            const el = document.elementFromPoint(t.clientX, t.clientY);
            if (el && el.classList.contains('ws-cell')) {
              WS.updateSelect(+el.dataset.row, +el.dataset.col);
            }
          }, { passive: false });
          cell.addEventListener('touchend', () => WS.endSelect());

          container.appendChild(cell);
        }
      }

      // End select on mouseup anywhere
      document.addEventListener('mouseup', () => { if (WS.selecting) WS.endSelect(); });
    },

    startSelect(r, c) {
      this.selecting   = true;
      this.startCell   = [r, c];
      this.currentPath = [[r, c]];
      this.highlightPath([[r, c]]);
    },

    updateSelect(r, c) {
      if (!this.selecting) return;
      const [sr, sc] = this.startCell;
      const path = this.getLinePath(sr, sc, r, c);
      this.currentPath = path;
      this.clearHighlight();
      this.highlightPath(path);
    },

    endSelect() {
      if (!this.selecting) return;
      this.selecting = false;
      const word = this.currentPath.map(([r, c]) => this.grid[r][c]).join('');
      const rev  = word.split('').reverse().join('');

      const match = this.words.find(w => (w === word || w === rev) && !this.found.has(w));
      if (match) {
        this.found.add(match);
        this.markFound(this.currentPath, match);
        document.getElementById('wsFoundCount').textContent = this.found.size;
        showToast(`✅ Found: ${match}`);
        if (window.Progress) {
          Progress.addGamePoints('wordsearch', this.found.size === this.words.length);
          updateNavPts();
        }
        if (this.found.size === this.words.length) this.onWin();
      } else {
        this.clearHighlight();
      }
      this.currentPath = [];
    },

    getLinePath(r1, c1, r2, c2) {
      const path = [];
      const dr = Math.sign(r2 - r1);
      const dc = Math.sign(c2 - c1);
      // Only allow 8-directional straight lines
      const lenR = Math.abs(r2 - r1);
      const lenC = Math.abs(c2 - c1);
      const len  = (dr === 0 || dc === 0) ? Math.max(lenR, lenC)
                 : (lenR === lenC) ? lenR : Math.max(lenR, lenC);

      for (let i = 0; i <= len; i++) {
        const r = r1 + dr * i;
        const c = c1 + dc * i;
        const SIZE = this.GRID_SIZE;
        if (r >= 0 && r < SIZE && c >= 0 && c < SIZE) path.push([r, c]);
      }
      return path;
    },

    highlightPath(path) {
      path.forEach(([r, c]) => {
        const cell = this.getCell(r, c);
        if (cell && !cell.classList.contains('found')) cell.classList.add('selected');
      });
    },

    clearHighlight() {
      document.querySelectorAll('.ws-cell.selected').forEach(c => c.classList.remove('selected'));
    },

    markFound(path, word) {
      path.forEach(([r, c]) => {
        const cell = this.getCell(r, c);
        if (cell) { cell.classList.remove('selected'); cell.classList.add('found'); }
      });
      // Update word list
      document.querySelectorAll('.ws-word-item').forEach(item => {
        if (item.dataset.word === word) item.classList.add('found');
      });
    },

    getCell(r, c) {
      return document.querySelector(`.ws-cell[data-row="${r}"][data-col="${c}"]`);
    },

    startTimer() {
      this.seconds = 0;
      this.timer = setInterval(() => {
        this.seconds++;
        const min = String(Math.floor(this.seconds / 60)).padStart(2, '0');
        const sec = String(this.seconds % 60).padStart(2, '0');
        const el  = document.getElementById('wsTimer');
        if (el) el.textContent = `${min}:${sec}`;
      }, 1000);
    },

    onWin() {
      clearInterval(this.timer);
      setTimeout(() => showToast(`🏆 All words found in ${Math.floor(this.seconds/60)}:${String(this.seconds%60).padStart(2,'0')}!`), 300);
    },

    renderWordList() {
      const ul = document.getElementById('wsWordList');
      if (!ul) return;
      ul.innerHTML = this.words.map(w => `
        <li class="ws-word-item ${this.found.has(w) ? 'found' : ''}" data-word="${w}">
          <i class="fa fa-check ws-check"></i> ${w}
        </li>
      `).join('');
    },

    newGame(theme) {
      clearInterval(this.timer);
      this.init(theme || this.theme);
    }
  };

  /* ════════════════════════════════
     HANGMAN
     ════════════════════════════════ */
  const HM = {
    MAX_WRONG: 6,
    word:      '',
    hint:      '',
    emoji:     '',
    guessed:   new Set(),
    wrongCount: 0,
    category:   'cities',

    BODY_PARTS: [
      // head
      `<circle cx="100" cy="45" r="20"/>`,
      // body
      `<line x1="100" y1="65" x2="100" y2="120"/>`,
      // left arm
      `<line x1="100" y1="80" x2="70"  y2="105"/>`,
      // right arm
      `<line x1="100" y1="80" x2="130" y2="105"/>`,
      // left leg
      `<line x1="100" y1="120" x2="75"  y2="155"/>`,
      // right leg
      `<line x1="100" y1="120" x2="125" y2="155"/>`,
    ],

    init(category) {
      this.category   = category || 'cities';
      this.guessed    = new Set();
      this.wrongCount = 0;

      const words = vocabData.hangman?.[category];
      if (!words || words.length === 0) return;

      const picked = words[Math.floor(Math.random() * words.length)];
      this.word  = picked.word;
      this.hint  = picked.hint;
      this.emoji = picked.emoji || '❓';

      this.renderDrawing();
      this.renderWord();
      this.renderKeyboard();
      this.renderHint();
      this.hideResult();

      document.getElementById('hmTriesLeft').textContent = this.MAX_WRONG - this.wrongCount;
    },

    renderDrawing() {
      const svg = document.getElementById('hmSvg');
      if (!svg) return;
      // Gallows structure (always shown)
      svg.innerHTML = `
        <line x1="20"  y1="185" x2="180" y2="185"/>
        <line x1="60"  y1="185" x2="60"  y2="15"/>
        <line x1="60"  y1="15"  x2="100" y2="15"/>
        <line x1="100" y1="15"  x2="100" y2="25"/>
        ${this.BODY_PARTS.slice(0, this.wrongCount).join('')}
      `;
    },

    renderWord() {
      const container = document.getElementById('hmWord');
      if (!container) return;
      container.innerHTML = this.word.split('').map(letter => `
        <div class="hm-letter ${this.guessed.has(letter) ? 'revealed' : ''}">
          ${this.guessed.has(letter) ? letter : ''}
        </div>
      `).join('');
    },

    renderKeyboard() {
      const kb = document.getElementById('hmKeyboard');
      if (!kb) return;
      const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      kb.innerHTML = alpha.split('').map(l => {
        const isGuessed = this.guessed.has(l);
        const isCorrect = isGuessed && this.word.includes(l);
        const isWrong   = isGuessed && !this.word.includes(l);
        return `
          <button class="hm-key ${isCorrect ? 'correct' : ''} ${isWrong ? 'wrong' : ''}"
            ${isGuessed ? 'disabled' : ''}
            onclick="HangmanGame.guess('${l}')">
            ${l}
          </button>
        `;
      }).join('');
    },

    renderHint() {
      const el = document.getElementById('hmHint');
      if (el) el.innerHTML = `<span class="hint-emoji">${this.emoji}</span> <strong>Hint:</strong> ${this.hint}`;
    },

    guess(letter) {
      if (this.guessed.has(letter)) return;
      this.guessed.add(letter);

      if (this.word.includes(letter)) {
        // correct guess
        this.renderWord();
        this.renderKeyboard();

        const allRevealed = this.word.split('').every(l => this.guessed.has(l));
        if (allRevealed) this.onWin();
      } else {
        this.wrongCount++;
        this.renderDrawing();
        this.renderWord();
        this.renderKeyboard();
        document.getElementById('hmTriesLeft').textContent = Math.max(0, this.MAX_WRONG - this.wrongCount);
        if (this.wrongCount >= this.MAX_WRONG) this.onLose();
      }
    },

    onWin() {
      if (window.Progress) {
        Progress.addGamePoints('hangman', true);
        updateNavPts();
      }
      const el = document.getElementById('hmResult');
      if (el) {
        el.style.display = 'block';
        el.className = 'hm-result win win-pop';
        el.innerHTML = `
          <h3>🎉 Excellent! You won!</h3>
          <p class="answer">${this.word}</p>
          <p>${this.hint}</p>
          <button class="btn btn-primary btn-sm mt-16" onclick="HangmanGame.newGame()">Play Again</button>
        `;
      }
      this.disableKeyboard();
    },

    onLose() {
      if (window.Progress) {
        Progress.addGamePoints('hangman', false);
        updateNavPts();
      }
      // Reveal full word
      this.guessed = new Set(this.word.split(''));
      this.renderWord();

      const el = document.getElementById('hmResult');
      if (el) {
        el.style.display = 'block';
        el.className = 'hm-result lose';
        el.innerHTML = `
          <h3>😞 Game Over</h3>
          <p>The word was: <span class="answer">${this.word}</span></p>
          <p style="color:var(--text-muted);font-size:0.875rem">${this.hint}</p>
          <button class="btn btn-primary btn-sm mt-16" onclick="HangmanGame.newGame()">Try Again</button>
        `;
      }
      this.disableKeyboard();
    },

    disableKeyboard() {
      document.querySelectorAll('.hm-key').forEach(k => k.disabled = true);
    },

    hideResult() {
      const el = document.getElementById('hmResult');
      if (el) { el.style.display = 'none'; el.className = 'hm-result'; }
    },

    newGame(category) {
      this.init(category || this.category);
    }
  };

  window.WordSearch   = WS;
  window.HangmanGame  = HM;

  function updateNavPts() {
    const nav = document.querySelector('.nav-pts-value');
    if (nav && window.Progress) nav.textContent = Progress.getTotalPoints();
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure vocabData is loaded
    setTimeout(() => {
      WS.init('cities');
      HM.init('cities');
    }, 300);
  });

})();
