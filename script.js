const pitch = document.getElementById("pitch");
const piecesLayer = document.getElementById("pieces-layer");
const drawLayer = document.getElementById("draw-layer");
const formationLeft = document.getElementById("formation-left");
const formationRight = document.getElementById("formation-right");
const toolButtons = document.querySelectorAll("[data-tool]");
const undoButton = document.querySelector("[data-action='undo']");
const clearLinesButton = document.querySelector("[data-action='clear-lines']");
const resetBoardButton = document.querySelector("[data-action='reset-board']");
const storageKey = "fotballtaktikk-board-v1";
const defaultFormation = "2-3-1";
const historyLimit = 100;

const pitchSize = { width: 1000, height: 680 };
const defaultBall = { x: 500, y: 340 };

const formations = {
  "2-3-1": {
    left: [
      { id: "red-gk", role: "keeper", label: "K", color: "keeper", x: 90, y: 340 },
      { id: "red-1", role: "player", label: "1", color: "red", x: 240, y: 220 },
      { id: "red-2", role: "player", label: "2", color: "red", x: 240, y: 460 },
      { id: "red-3", role: "player", label: "3", color: "red", x: 430, y: 160 },
      { id: "red-4", role: "player", label: "4", color: "red", x: 430, y: 340 },
      { id: "red-5", role: "player", label: "5", color: "red", x: 430, y: 520 },
      { id: "red-6", role: "player", label: "6", color: "red", x: 640, y: 340 }
    ],
    right: [
      { id: "blue-gk", role: "keeper", label: "K", color: "keeper", x: 910, y: 340 },
      { id: "blue-1", role: "player", label: "1", color: "blue", x: 760, y: 220 },
      { id: "blue-2", role: "player", label: "2", color: "blue", x: 760, y: 460 },
      { id: "blue-3", role: "player", label: "3", color: "blue", x: 570, y: 160 },
      { id: "blue-4", role: "player", label: "4", color: "blue", x: 570, y: 340 },
      { id: "blue-5", role: "player", label: "5", color: "blue", x: 570, y: 520 },
      { id: "blue-6", role: "player", label: "6", color: "blue", x: 360, y: 340 }
    ]
  },
  "3-2-1": {
    left: [
      { id: "red-gk", role: "keeper", label: "K", color: "keeper", x: 90, y: 340 },
      { id: "red-1", role: "player", label: "1", color: "red", x: 230, y: 150 },
      { id: "red-2", role: "player", label: "2", color: "red", x: 230, y: 340 },
      { id: "red-3", role: "player", label: "3", color: "red", x: 230, y: 530 },
      { id: "red-4", role: "player", label: "4", color: "red", x: 450, y: 240 },
      { id: "red-5", role: "player", label: "5", color: "red", x: 450, y: 440 },
      { id: "red-6", role: "player", label: "6", color: "red", x: 660, y: 340 }
    ],
    right: [
      { id: "blue-gk", role: "keeper", label: "K", color: "keeper", x: 910, y: 340 },
      { id: "blue-1", role: "player", label: "1", color: "blue", x: 770, y: 150 },
      { id: "blue-2", role: "player", label: "2", color: "blue", x: 770, y: 340 },
      { id: "blue-3", role: "player", label: "3", color: "blue", x: 770, y: 530 },
      { id: "blue-4", role: "player", label: "4", color: "blue", x: 550, y: 240 },
      { id: "blue-5", role: "player", label: "5", color: "blue", x: 550, y: 440 },
      { id: "blue-6", role: "player", label: "6", color: "blue", x: 340, y: 340 }
    ]
  }
};

const state = {
  tool: "move",
  activePointerId: null,
  activePieceId: null,
  drawStart: null,
  previewLine: null,
  suppressSave: false,
  suppressHistory: false,
  history: [],
  pendingSnapshot: null,
  dragStartPositions: null
};

const pieces = new Map();

createPiece({ id: "ball", label: "", color: "ball", x: defaultBall.x, y: defaultBall.y, role: "ball" });
restoreBoard();
setTool("move");

formationLeft.addEventListener("change", () => {
  pushHistory();
  applyFormation("left", formationLeft.value);
  saveBoard();
});

formationRight.addEventListener("change", () => {
  pushHistory();
  applyFormation("right", formationRight.value);
  saveBoard();
});

toolButtons.forEach((button) => {
  button.addEventListener("click", () => setTool(button.dataset.tool));
});

clearLinesButton.addEventListener("click", () => {
  if (!drawLayer.querySelector(".drawn-line")) {
    return;
  }

  pushHistory();
  clearDrawnLines();
  saveBoard();
});

undoButton.addEventListener("click", undoBoard);
resetBoardButton.addEventListener("click", resetBoard);

pitch.addEventListener("pointerdown", handlePitchPointerDown);
pitch.addEventListener("pointermove", handlePitchPointerMove);
pitch.addEventListener("pointerup", handlePitchPointerUp);
pitch.addEventListener("pointercancel", handlePitchPointerUp);

function createPiece(config) {
  const piece = document.createElement("div");
  piece.className = `piece ${config.color}`;
  piece.dataset.id = config.id;
  piece.dataset.role = config.role;

  const label = document.createElement("span");
  label.className = "piece-label";
  label.textContent = config.label;
  piece.appendChild(label);

  piecesLayer.appendChild(piece);
  pieces.set(config.id, { element: piece, ...config });
  setPiecePosition(config.id, config.x, config.y);
}

function ensurePiece(config) {
  if (!pieces.has(config.id)) {
    createPiece(config);
    return;
  }

  const piece = pieces.get(config.id);
  piece.label = config.label;
  piece.color = config.color;
  piece.role = config.role;
  piece.element.className = `piece ${config.color}`;
  piece.element.dataset.role = config.role;
  piece.element.querySelector(".piece-label").textContent = config.label;
  setPiecePosition(config.id, config.x, config.y);
}

function applyFormation(side, formationName) {
  formations[formationName][side].forEach((pieceConfig) => ensurePiece(pieceConfig));
}

function setTool(tool) {
  state.tool = tool;
  pitch.classList.toggle("is-draw-mode", tool === "draw");
  toolButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tool === tool);
  });
}

function setPiecePosition(id, x, y) {
  const piece = pieces.get(id);
  if (!piece) {
    return;
  }

  piece.x = clamp(x, 20, pitchSize.width - 20);
  piece.y = clamp(y, 20, pitchSize.height - 20);
  piece.element.style.left = `${(piece.x / pitchSize.width) * 100}%`;
  piece.element.style.top = `${(piece.y / pitchSize.height) * 100}%`;
}

function handlePitchPointerDown(event) {
  if (state.tool === "draw") {
    if (event.target.closest(".piece")) {
      return;
    }

    const start = getPitchPoint(event);
    state.activePointerId = event.pointerId;
    state.drawStart = start;
    state.pendingSnapshot = createBoardSnapshot();
    state.previewLine = createSvgLine(start, start, "line-preview");
    drawLayer.appendChild(state.previewLine);
    pitch.setPointerCapture(event.pointerId);
    return;
  }

  const pieceElement = event.target.closest(".piece");
  if (!pieceElement) {
    return;
  }

  const pieceId = pieceElement.dataset.id;
  state.activePointerId = event.pointerId;
  state.activePieceId = pieceId;
  state.dragStartPositions = capturePiecePositions();
  pieceElement.classList.add("dragging");
  pitch.setPointerCapture(event.pointerId);
  updateDraggedPiece(event);
}

function handlePitchPointerMove(event) {
  if (state.activePointerId !== event.pointerId) {
    return;
  }

  if (state.tool === "draw" && state.previewLine && state.drawStart) {
    const current = getPitchPoint(event);
    updateSvgLine(state.previewLine, state.drawStart, current);
    return;
  }

  if (state.activePieceId) {
    updateDraggedPiece(event);
  }
}

function handlePitchPointerUp(event) {
  if (state.activePointerId !== event.pointerId) {
    return;
  }

  if (state.tool === "draw" && state.previewLine && state.drawStart) {
    const end = getPitchPoint(event);
    const distance = Math.hypot(end.x - state.drawStart.x, end.y - state.drawStart.y);

    if (distance > 8) {
      if (state.pendingSnapshot) {
        pushHistory(state.pendingSnapshot);
      }
      state.previewLine.classList.remove("line-preview");
      state.previewLine.classList.add("drawn-line");
      saveBoard();
    } else {
      state.previewLine.remove();
    }
  }

  if (state.activePieceId) {
    const piece = pieces.get(state.activePieceId);
    if (piece) {
      piece.element.classList.remove("dragging");
    }

    if (hasPieceMoved(state.dragStartPositions, capturePiecePositions())) {
      pushHistory({
        formations: {
          left: formationLeft.value,
          right: formationRight.value
        },
        pieces: state.dragStartPositions,
        lines: getCurrentLines()
      });
    }
  }

  state.activePointerId = null;
  state.activePieceId = null;
  state.drawStart = null;
  state.previewLine = null;
  state.pendingSnapshot = null;
  state.dragStartPositions = null;

  if (pitch.hasPointerCapture(event.pointerId)) {
    pitch.releasePointerCapture(event.pointerId);
  }

  saveBoard();
}

function updateDraggedPiece(event) {
  const point = getPitchPoint(event);
  setPiecePosition(state.activePieceId, point.x, point.y);
}

function getPitchPoint(event) {
  const rect = pitch.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * pitchSize.width;
  const y = ((event.clientY - rect.top) / rect.height) * pitchSize.height;
  return {
    x: clamp(x, 0, pitchSize.width),
    y: clamp(y, 0, pitchSize.height)
  };
}

function createSvgLine(start, end, className) {
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("class", className);
  updateSvgLine(line, start, end);
  return line;
}

function updateSvgLine(line, start, end) {
  line.setAttribute("x1", start.x);
  line.setAttribute("y1", start.y);
  line.setAttribute("x2", end.x);
  line.setAttribute("y2", end.y);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function clearDrawnLines() {
  drawLayer.querySelectorAll(".drawn-line").forEach((line) => line.remove());
}

function resetBoard() {
  pushHistory();
  formationLeft.value = defaultFormation;
  formationRight.value = defaultFormation;
  clearDrawnLines();
  applyFormation("left", formationLeft.value);
  applyFormation("right", formationRight.value);
  setPiecePosition("ball", defaultBall.x, defaultBall.y);
  saveBoard();
}

function saveBoard() {
  if (state.suppressSave) {
    return;
  }

  localStorage.setItem(storageKey, JSON.stringify(createBoardSnapshot()));
}

function restoreBoard() {
  const saved = loadSavedBoard();

  if (!saved) {
    formationLeft.value = defaultFormation;
    formationRight.value = defaultFormation;
    applyFormation("left", formationLeft.value);
    applyFormation("right", formationRight.value);
    saveBoard();
    updateUndoButton();
    return;
  }

  state.suppressSave = true;

  formationLeft.value = saved.formations?.left || defaultFormation;
  formationRight.value = saved.formations?.right || defaultFormation;
  applyFormation("left", formationLeft.value);
  applyFormation("right", formationRight.value);

  saved.pieces?.forEach((piece) => {
    if (pieces.has(piece.id)) {
      setPiecePosition(piece.id, piece.x, piece.y);
    }
  });

  clearDrawnLines();
  saved.lines?.forEach((lineData) => {
    const line = createSvgLine(
      { x: lineData.x1, y: lineData.y1 },
      { x: lineData.x2, y: lineData.y2 },
      "drawn-line"
    );
    drawLayer.appendChild(line);
  });

  state.suppressSave = false;
  saveBoard();
  updateUndoButton();
}

function loadSavedBoard() {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function createBoardSnapshot() {
  return {
    formations: {
      left: formationLeft.value,
      right: formationRight.value
    },
    pieces: capturePiecePositions(),
    lines: getCurrentLines()
  };
}

function capturePiecePositions() {
  return Array.from(pieces.values()).map((piece) => ({
    id: piece.id,
    x: piece.x,
    y: piece.y
  }));
}

function getCurrentLines() {
  return Array.from(drawLayer.querySelectorAll(".drawn-line")).map((line) => ({
    x1: Number(line.getAttribute("x1")),
    y1: Number(line.getAttribute("y1")),
    x2: Number(line.getAttribute("x2")),
    y2: Number(line.getAttribute("y2"))
  }));
}

function pushHistory(snapshot = createBoardSnapshot()) {
  if (state.suppressHistory) {
    return;
  }

  state.history.push(JSON.stringify(snapshot));

  if (state.history.length > historyLimit) {
    state.history.shift();
  }

  updateUndoButton();
}

function undoBoard() {
  const previous = state.history.pop();
  if (!previous) {
    updateUndoButton();
    return;
  }

  state.suppressHistory = true;
  restoreSnapshot(JSON.parse(previous));
  state.suppressHistory = false;
  updateUndoButton();
}

function restoreSnapshot(snapshot) {
  state.suppressSave = true;

  formationLeft.value = snapshot.formations?.left || defaultFormation;
  formationRight.value = snapshot.formations?.right || defaultFormation;
  applyFormation("left", formationLeft.value);
  applyFormation("right", formationRight.value);

  snapshot.pieces?.forEach((piece) => {
    if (pieces.has(piece.id)) {
      setPiecePosition(piece.id, piece.x, piece.y);
    }
  });

  clearDrawnLines();
  snapshot.lines?.forEach((lineData) => {
    const line = createSvgLine(
      { x: lineData.x1, y: lineData.y1 },
      { x: lineData.x2, y: lineData.y2 },
      "drawn-line"
    );
    drawLayer.appendChild(line);
  });

  state.suppressSave = false;
  saveBoard();
}

function hasPieceMoved(before, after) {
  if (!before || !after || before.length !== after.length) {
    return false;
  }

  return before.some((piece, index) => {
    const next = after[index];
    return piece.id !== next.id || piece.x !== next.x || piece.y !== next.y;
  });
}

function updateUndoButton() {
  undoButton.disabled = state.history.length === 0;
}
