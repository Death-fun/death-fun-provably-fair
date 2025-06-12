// Minimal SHA-256 using Web Crypto API
async function sha256Hex(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

function autofillFromParams() {
  ["version", "rows", "seed", "hash"].forEach((id) => {
    const val = getParam(id);
    if (val !== null) document.getElementById(id).value = val;
  });
}

// Parse selected tiles from URL parameter
function getSelectedTiles() {
  const selectedTilesParam = getParam("selectedTiles");
  if (!selectedTilesParam) return [];

  try {
    // Decode URL-encoded string and split by comma
    const decoded = decodeURIComponent(selectedTilesParam);
    return decoded.split(",").map((s) => parseInt(s.trim(), 10));
  } catch {
    return [];
  }
}

// Deterministically generates a death tile index for a row
async function getDeathTileIndex(seed, rowIndex, totalTiles) {
  const hashSource = `${seed}-row${rowIndex}`;
  const hash = await sha256Hex(hashSource);
  const numericHash = parseInt(hash.slice(0, 8), 16);
  return numericHash % totalTiles;
}

// Calculates multipliers for each row
function calculateRowMultipliers(tileCounts) {
  const multipliers = [];
  let currentMultiplier = 1;
  const HOUSE_EDGE = 0.05;
  for (let i = 0; i < tileCounts.length; i++) {
    const tiles = tileCounts[i];
    const baseMultiplier = 1 / (1 - 1 / tiles);
    currentMultiplier *= baseMultiplier;
    const multiplierWithEdge = currentMultiplier * (1 - HOUSE_EDGE);
    multipliers.push(multiplierWithEdge);
  }
  return multipliers;
}

async function reconstructRows(tileCounts, seed) {
  const multipliers = calculateRowMultipliers(tileCounts);
  const rows = [];
  for (let i = 0; i < tileCounts.length; i++) {
    const tiles = tileCounts[i];
    const multiplier = multipliers[i];
    const deathTileIndex = await getDeathTileIndex(seed, i, tiles);
    rows.push({ tiles, deathTileIndex, multiplier });
  }
  return rows;
}

async function verify(event) {
  if (event) event.preventDefault();
  const version = document.getElementById("version").value;
  const rowsInput = document.getElementById("rows").value;
  const seed = document.getElementById("seed").value;
  const expectedHash = document
    .getElementById("hash")
    .value.trim()
    .toLowerCase();

  // Parse comma-separated tile counts
  let tileCounts;
  try {
    tileCounts = rowsInput.split(",").map((s) => parseInt(s.trim(), 10));
    if (tileCounts.some(isNaN)) throw new Error();
  } catch {
    showResult("Invalid tile counts (must be comma-separated numbers)", false);
    return;
  }

  // Reconstruct full rows array
  let rows;
  try {
    rows = await reconstructRows(tileCounts, seed);
  } catch {
    showResult("Error reconstructing rows", false);
    document.getElementById("rows-config").textContent = "";
    return;
  }

  const gameData = JSON.stringify({ version, rows, seed });
  const hash = "0x" + (await sha256Hex(gameData));

  showResult(
    hash === expectedHash
      ? "Hash matches!"
      : `Hash does not match.\nExpected: ${expectedHash}\nComputed: ${hash}`,
    hash === expectedHash
  );

  // Show the generated rowsConfig object
  document.getElementById("rows-config").textContent = JSON.stringify(
    rows,
    null,
    2
  );

  // Get selected tiles and render visual
  const selectedTiles = getSelectedTiles();
  renderVisual(rows, selectedTiles);
  visualView.style.display = "";
  rawView.style.display = "none";
  toggleBtn.textContent = "Show Raw JSON";
  showingVisual = true;
}

function showResult(msg, match) {
  const el = document.getElementById("result");
  el.textContent = msg;
  el.className = "result " + (match ? "match" : "no-match");
}

document.getElementById("verifier-form").addEventListener("submit", verify);
autofillFromParams();

// Auto-submit if all fields are filled from URL
window.addEventListener("DOMContentLoaded", () => {
  const allFilled = ["version", "rows", "seed", "hash"].every(
    (id) => document.getElementById(id).value
  );
  if (allFilled) verify();
});

function renderVisual(rows, selectedTiles = []) {
  const container = document.getElementById("visual-view");
  container.innerHTML = "";
  if (!Array.isArray(rows)) return;

  rows.forEach((row, i) => {
    // Create row container to hold label and tiles
    const rowContainer = document.createElement("div");
    rowContainer.className = "row-container";

    // Create row label (row numbers start from 1)
    const rowLabel = document.createElement("div");
    rowLabel.className = "row-label";
    rowLabel.textContent = (i + 1).toString();

    // Create row div for tiles
    const rowDiv = document.createElement("div");
    rowDiv.className = "row";

    for (let t = 0; t < row.tiles; t++) {
      const tile = document.createElement("div");
      const isDeath = t === row.deathTileIndex;
      const isSelected = selectedTiles[i] === t;

      // Set tile classes
      let tileClass = "tile";
      if (isDeath) tileClass += " death";
      if (isSelected) tileClass += " selected";

      tile.className = tileClass;

      // Set title
      let title = "";
      if (isDeath && isSelected) {
        title = "Selected Death Tile";
        // Add skull icon
        tile.innerHTML = "💀";
      } else if (isDeath) {
        title = "Death Tile";
      } else if (isSelected) {
        title = "Selected Tile";
      }
      tile.title = title;

      rowDiv.appendChild(tile);
    }

    // Add label and row to container
    rowContainer.appendChild(rowLabel);
    rowContainer.appendChild(rowDiv);
    container.appendChild(rowContainer);
  });
}

// Toggle logic
const toggleBtn = document.getElementById("toggle-view");
const visualView = document.getElementById("visual-view");
const rawView = document.getElementById("rows-config");
let showingVisual = true;
toggleBtn.onclick = function () {
  showingVisual = !showingVisual;
  if (showingVisual) {
    visualView.style.display = "";
    rawView.style.display = "none";
    toggleBtn.textContent = "Show Raw JSON";
  } else {
    visualView.style.display = "none";
    rawView.style.display = "";
    toggleBtn.textContent = "Show Visual";
  }
};
