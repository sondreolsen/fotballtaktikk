const pitch = document.getElementById("pitch");
const piecesLayer = document.getElementById("pieces-layer");
const drawLayer = document.getElementById("draw-layer");
const formationLeft = document.getElementById("formation-left");
const formationRight = document.getElementById("formation-right");
const toolButtons = document.querySelectorAll("[data-tool]");
const clearLinesButton = document.querySelector("[data-action='clear-lines']");

const pitchSize = { width: 1000, height: 680 };

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
  previewLine: null
};

const pieces = new Map();

createPiece({ id: "ball", label: "", color: "ball", x: 500, y: 340, role: "ball" });
applyFormation("left", formationLeft.value);
applyFormation("right", formationRight.value);
setTool("move");

formationLeft.addEventListener("change", () => applyFormation("left", formationLeft.value));
formationRight.addEventListener("change", () => applyFormation("right", formationRight.value));

toolButtons.forEach((button) => {
  button.addEventListener("click", () => setTool(button.dataset.tool));
});

clearLinesButton.addEventListener("click", () => {
  drawLayer.querySelectorAll(".drawn-line").forEach((line) => line.remove());
});

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
      state.previewLine.classList.remove("line-preview");
      state.previewLine.classList.add("drawn-line");
    } else {
      state.previewLine.remove();
    }
  }

  if (state.activePieceId) {
    const piece = pieces.get(state.activePieceId);
    if (piece) {
      piece.element.classList.remove("dragging");
    }
  }

  state.activePointerId = null;
  state.activePieceId = null;
  state.drawStart = null;
  state.previewLine = null;

  if (pitch.hasPointerCapture(event.pointerId)) {
    pitch.releasePointerCapture(event.pointerId);
  }
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
