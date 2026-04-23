// ── STATE ──────────────────────────────────────────────────────────────────
var app_data = await localforage.getItem('app_data');
if (app_data === null) {
  app_data = {
    players: [],
    scores: [],
    currentRound: 0
  };
  await localforage.setItem('app_data', app_data);
}

let currentRound = 0;  // 0-indexed
let currentPlayer = 0; // 0-indexed (whose turn it is)
let totalRounds = 20;  // grow dynamically
let gameStarted = false;
let winnerIndex = -1;

// ── SETUP ──────────────────────────────────────────────────────────────────
function createPlayerTable() {
  const player_container = document.getElementById('player-inputs');
  player_container.innerHTML = '';

  var player_node_template = document.getElementById("player-node-template");
  for (var i=0; i<app_data.players.length; i++) {
    var player_node = player_node_template.content.cloneNode(true);
    player_node.querySelector(".player-num").textContent = i + 1;
    var name_node = player_node.querySelector(".player-name");
    name_node.textContent = app_data.players[i].name;
    name_node.addEventListener("click", function() { this.classList.toggle('selected'); });
    var rmv_btn = player_node.querySelector(".remove-btn");
    rmv_btn.name = app_data.players[i].name;
    rmv_btn.addEventListener("click", removePlayer);
    player_container.appendChild(player_node);
  }
}
createPlayerTable();

async function addPlayer() {
  var name_node = document.getElementById("player-input");
  var name = name_node.value.trim();
  if (name.length == 0) return;
  var player = { name: name }
  app_data.players.push(player);
  await localforage.setItem('app_data', app_data);
  name_node.value = '';
  createPlayerTable();
}

async function removePlayer(event) {
  var name = event.currentTarget.name;
  app_data.players = app_data.players.filter(function(item) {
    return item.name != name;
  })
  await localforage.setItem('app_data', app_data);
  createPlayerTable();
}

function setCurrentRound() {
  currentRound = 100;
  currentPlayer = 0;
  app_data.scores.forEach((p, i) => {
    if (p.scores.length < currentRound && !p.won) {
      currentRound = p.scores.length;
      currentPlayer = i
    }
  });
  if (currentRound == 100) currentRound = 0;

  winnerIndex = -1;

  console.log(currentRound, currentPlayer)
}

function createGame() {
  const players = document.querySelectorAll('.selected');
  var scores = [];
  players.forEach((p, i) => {
    const name = p.textContent.trim() || `Player ${i+1}`;
    scores.push({ name: name, scores: [], total: 0, misses: 0, eliminated: false, won: false });
  });
  if (scores.length < 2) { alert('Add at least 2 players!'); return; }
  app_data.scores = scores

  startGame();
}

function startGame() {

  setCurrentRound();
  gameStarted = true;
  totalRounds = 20;

  document.getElementById('setup-screen').style.display = 'none';
  document.getElementById('game-screen').style.display = 'block';
  document.getElementById('totals-bar').style.display = 'block';
  document.getElementById('continue-btn').style.display = 'none';
  document.getElementById('new-game-btn').style.display = 'inline-block';

  createScoreTable();
  renderTable();
}

function newGame() {
  gameStarted = false;
  document.getElementById('setup-screen').style.display = 'flex';
  document.getElementById('game-screen').style.display = 'none';
  document.getElementById('totals-bar').style.display = 'none';
  document.getElementById('continue-btn').style.display = 'inline-block';
  document.getElementById('new-game-btn').style.display = 'none';
  document.getElementById('win-banner').style.display = 'none';
  createPlayerTable();
}

// ── TABLE BUILD ────────────────────────────────────────────────────────────
function createScoreTable() {
  // Header
  const hr = document.getElementById('header-row');
  hr.innerHTML = `<th class="round-header"></th>`;
  app_data.scores.forEach((p, i) => {
    hr.innerHTML += `<th id="hdr-${i}">${escHtml(p.name)}</th>`;
  });

  // Clear rows
  const body = document.getElementById('score-body');
  body.innerHTML = '';

  // Totals row
  const tr = document.getElementById('totals-row');
  tr.innerHTML = `<td class="total-label"></td>`;
  app_data.scores.forEach((p, i) => {
    tr.innerHTML += `<td id="tot-${i}"><span class="total-val">0</span></td>`;
  });

}

function ensureRows() {
  const needed = currentRound + 2;
  if (needed > totalRounds) totalRounds = needed;
  const body = document.getElementById('score-body');
  const existing = body.querySelectorAll('tr').length;
  for (let r = existing; r < totalRounds; r++) {
    const row = document.createElement('tr');
    row.id = `row-${r}`;
    row.innerHTML = `<td class="round-label">${r+1}</td>`;
    app_data.scores.forEach((p, pi) => {
      row.innerHTML += `<td id="cell-${r}-${pi}"><div class="score-cell" onclick="cellClick(${r},${pi})"></div></td>`;
    });
    body.appendChild(row);
  }
}

// ── RENDER ─────────────────────────────────────────────────────────────────
async function renderTable() {
  // save data
  await localforage.setItem('app_data', app_data);

  ensureRows();
  app_data.scores.forEach((p, pi) => {
    // header
    const hdr = document.getElementById(`hdr-${pi}`);
    hdr.className = p.won ? 'winner-col' : p.eliminated ? 'eliminated-col' : '';
    hdr.textContent = p.name;

    // cells
    for (let r = 0; r < totalRounds; r++) {
      const td = document.getElementById(`cell-${r}-${pi}`);
      if (!td) continue;
      const div = td.querySelector('.score-cell');
      const score = p.scores[r];
      const isActive = (r === currentRound && pi === currentPlayer && !p.won);
      const isCurrentRound = (r === currentRound);

      div.className = 'score-cell';
      div.onclick = () => cellClick(r, pi);
      div.innerHTML = '';

      if (p.won) {
        div.classList.add('cell-winner');
        if (score !== undefined) div.innerHTML = `<span class="score-badge">${score}</span>`;
        div.onclick = () => cellClick(r, pi);
      } else if (p.eliminated) {
        div.classList.add('cell-eliminated');
        if (score !== undefined) div.innerHTML = score === 0
          ? `<span class="miss-badge">✗</span>`
          : `<span class="score-badge">${score}</span>`;
      } else if (score !== undefined) {
        if (score === 0) div.innerHTML = `<span class="miss-badge">✗</span>`;
        else div.innerHTML = `<span class="score-badge">${score}</span>`;
        if (isCurrentRound) div.classList.add('cell-current-round');
      } else if (isCurrentRound && !p.won && !p.eliminated) {
        div.classList.add('cell-current-round');
      }

      if (isActive) {
        div.classList.add('cell-active');
        div.innerHTML = `<span style="color:var(--accent);font-size:1.1rem">+</span>`;
      }
    }

    // totals
    const tot = document.getElementById(`tot-${pi}`);
    const total = p.total;
    tot.innerHTML = `<span class="total-val ${p.won ? 'total-winner' : p.eliminated ? 'total-eliminated' : total >= 45 ? 'total-close' : ''}">${total}</span>`;
    if (p.won) tot.innerHTML += `<br><span style="font-size:0.6rem;color:var(--win)">WINNER</span>`;
    if (p.eliminated) tot.innerHTML += `<br><span style="font-size:0.6rem;color:var(--accent2)">OUT</span>`;
  });
}


// ── CELL CLICK ─────────────────────────────────────────────────────────────
function cellClick(r, pi) {
  if (r > currentRound) return; // future cell, not editing
  openModal(r, pi);
}

// ── MODAL ──────────────────────────────────────────────────────────────────
let modalR = -1, modalPi = -1;

function openModal(r, pi) {
  modalR = r; modalPi = pi;
  const p = app_data.scores[pi];
  document.getElementById('modal-title').textContent = escHtml(p.name);
  document.getElementById('modal-subtitle').textContent = `Round ${r+1} — current total: ${p.total}`;

  const grid = document.getElementById('number-grid');
  grid.innerHTML = '';

  // Miss button
  const missBtn = document.createElement('button');
  missBtn.className = 'num-btn miss';
  missBtn.textContent = 'MISS';
  missBtn.onclick = () => submitScore(0);
  grid.appendChild(missBtn);

  for (let n = 1; n <= 12; n++) {
    const btn = document.createElement('button');
    btn.className = 'num-btn';
    btn.textContent = n;
    btn.onclick = () => submitScore(n);
    grid.appendChild(btn);
  }

  document.getElementById('modal-overlay').classList.add('active');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
  modalR = -1; modalPi = -1;
}

function submitScore(score) {
  const r = modalR, pi = modalPi;
  closeModal();
  const p = app_data.scores[pi];
  const isEdit = p.scores[r] !== undefined;

  // Un-win / un-eliminate if editing
  if (isEdit) {
    p.won = false;
    p.eliminated = false;
    winnerIndex = -1;
    document.getElementById('win-banner').style.display = 'none';
    // Recompute misses up to this round
    // We'll recalculate after setting
  }

  p.scores[r] = score;

  // Recompute misses & state for this player from scratch
  recomputePlayer(pi);

  // If this was the current active cell, advance turn
  if (!isEdit && r === currentRound && pi === currentPlayer) {
    advanceTurn();
  } else {
    // just re-render
    renderTable();
  }
}

function recomputePlayer(pi) {
  const p = app_data.scores[pi];
  let total = 0;
  let consecutiveMisses = 0;
  p.won = false;
  p.eliminated = false;

  for (let r = 0; r < p.scores.length; r++) {
    const s = p.scores[r];
    if (s === 0) {
      consecutiveMisses++;
    } else {
      consecutiveMisses = 0;
    }
    total += s;

    if (total > 50) {
      total = 25; // over 50 → reset to 25
    }
    p.total = total;

    if (total === 50) {
      p.won = true;
      winnerIndex = pi;
      break;
    }

    if (consecutiveMisses >= 3) {
      p.eliminated = true;
      break;
    }
  }
}

function advanceTurn() {
  var players = app_data.scores;

  // Check if someone won
  if (winnerIndex !== -1) {
    showWinner(winnerIndex);
  }
  setCurrentRound();
  renderTable();
  scrollToCurrentCell();
}

function scrollToCurrentCell() {
  const cell = document.getElementById(`cell-${currentRound}-${currentPlayer}`);
  if (cell) cell.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
}

function showWinner(pi) {
  var players = app_data.scores;
  const banner = document.getElementById('win-banner');
  banner.textContent = `🏆 ${players[pi].name} wins with 50 points!`;
  banner.style.display = 'block';
  setTimeout(() => banner.style.display = 'none', 6000);
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Close modal on overlay click
document.getElementById('modal-overlay').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});


// ── BUTTONS ───────────────────────────────────────────────────────────────────
document.getElementById("new-game-btn").addEventListener("click", newGame)
document.getElementById("add-player-btn").addEventListener("click", addPlayer)
document.getElementById("start-btn").addEventListener("click", createGame)
document.getElementById("continue-btn").addEventListener("click", startGame)
document.getElementById("cancel-modal").addEventListener("click", closeModal)

