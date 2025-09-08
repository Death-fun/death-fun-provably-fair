// Death Fun Game - Complete Implementation

class DeathFunGame extends BaseGame {
  getGameName() {
    return "deathFun";
  }

  getDisplayName() {
    return "Death.fun";
  }

  getRequiredParams() {
    return ["version", "rows", "seed", "hash"];
  }

  getOptionalParams() {
    return ["selectedTiles"];
  }

  getDescription() {
    return "This tool verifies the hash of your game to prove death tiles were chosen before the game began.";
  }

  // Parse selected tiles from URL parameter
  getSelectedTiles() {
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
  async getDeathTileIndex(seed, rowIndex, totalTiles) {
    const hashSource = `${seed}-row${rowIndex}`;
    const hash = await sha256Hex(hashSource);
    const numericHash = parseInt(hash.slice(0, 8), 16);
    return numericHash % totalTiles;
  }

  // Calculates multipliers for each row
  calculateRowMultipliers(tileCounts) {
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

  // Reconstruct rows from tile counts and seed
  async reconstructRows(tileCounts, seed) {
    const multipliers = this.calculateRowMultipliers(tileCounts);
    const rows = [];
    for (let i = 0; i < tileCounts.length; i++) {
      const tiles = tileCounts[i];
      const multiplier = multipliers[i];
      const deathTileIndex = await this.getDeathTileIndex(seed, i, tiles);
      rows.push({ tiles, deathTileIndex, multiplier });
    }
    return rows;
  }

  // Parse game data from URL parameters
  async parseGameData() {
    const version = getParam("version") || "v1";
    const rowsInput = getParam("rows");
    const seed = getParam("seed");
    const expectedHash = getParam("hash");

    if (!rowsInput || !seed || !expectedHash) {
      throw new Error("Missing required parameters");
    }

    // Parse comma-separated tile counts
    let tileCounts;
    try {
      tileCounts = rowsInput.split(",").map((s) => parseInt(s.trim(), 10));
      if (tileCounts.some(isNaN)) throw new Error();
    } catch {
      throw new Error("Invalid tile counts (must be comma-separated numbers)");
    }

    return {
      version,
      tileCounts,
      seed,
      expectedHash: expectedHash.trim().toLowerCase(),
      selectedTiles: this.getSelectedTiles(),
    };
  }

  // Reconstruct game state from parsed data
  async reconstructGameState(gameData) {
    const rows = await this.reconstructRows(gameData.tileCounts, gameData.seed);
    return {
      version: gameData.version,
      rows,
      seed: gameData.seed,
      selectedTiles: gameData.selectedTiles,
    };
  }

  // Render the game
  renderGame(gameState, containerId = "visual-view") {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container with id '${containerId}' not found`);
      return;
    }

    container.innerHTML = "";
    if (!Array.isArray(gameState.rows)) return;

    const { rows, selectedTiles = [] } = gameState;

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

  // Generate form fields HTML specific to Death Fun game
  getFormFieldsHTML() {
    // Always use v1 only (no algorithm version selector)
    const versionField = `<input type="hidden" id="version" name="version" value="v1" />`;

    return `
      ${versionField}
      <label>
        Row Tile Counts
        <textarea id="rows" name="rows" rows="3" required></textarea>
      </label>
      <label>
        Seed
        <input type="text" id="seed" name="seed" required />
      </label>
      <label>
        Hash
        <input type="text" id="hash" name="hash" required />
      </label>
    `;
  }
}

// Toggle between visual and raw JSON views
function setupDeathFunToggle() {
  const toggleBtn = document.getElementById("toggle-view");
  const visualView = document.getElementById("visual-view");
  const rawView = document.getElementById("rows-config");

  if (!toggleBtn || !visualView || !rawView) return;

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
}

// Initialize toggle functionality when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupDeathFunToggle);
} else {
  setupDeathFunToggle();
}

// Create global instance
const deathFunGame = new DeathFunGame();
