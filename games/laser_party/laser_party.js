// Laser Party Game - Complete Implementation

class LaserPartyGame extends BaseGame {
  getGameName() {
    return "laser_party";
  }

  getDisplayName() {
    return "Laser Party";
  }

  getRequiredParams() {
    return ["version", "rows", "seed", "hash"];
  }

  getOptionalParams() {
    return ["selectedTiles"];
  }

  // Parse selected tiles from URL parameter - Laser Party uses [row,col] pairs
  getSelectedTiles() {
    const selectedTilesParam = getParam("selectedTiles");
    if (!selectedTilesParam) return [];

    try {
      // Decode URL-encoded string and split by semicolon for pairs
      const decoded = decodeURIComponent(selectedTilesParam);
      return decoded
        .split(";")
        .map((pair) => {
          const coords = pair.split(",").map((s) => parseInt(s.trim(), 10));
          return coords.length === 2 ? coords : null;
        })
        .filter((coord) => coord !== null);
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

  // Reconstruct rows from tile counts and seed - with dimension field for laser_party
  async reconstructRows(tileCounts, seed) {
    const multipliers = this.calculateRowMultipliers(tileCounts);
    const rows = [];
    for (let i = 0; i < tileCounts.length; i++) {
      const tiles = tileCounts[i];
      const multiplier = multipliers[i];
      const deathTileIndex = await this.getDeathTileIndex(seed, i, tiles);

      // Construct row object with correct field order for laser_party
      const row = {
        tiles,
        dimension: i % 2 === 0 ? "col" : "row",
        deathTileIndex,
        multiplier,
      };

      rows.push(row);
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

  // Generate hash from game state
  async generateGameHash(gameState) {
    const gameData = JSON.stringify({
      version: gameState.version,
      rows: gameState.rows,
      seed: gameState.seed,
    });
    console.log("GAME DATA", gameData);
    return "0x" + (await sha256Hex(gameData));
  }

  // Render the game - grid-based visualization for laser party
  renderGame(gameState, containerId = "visual-view") {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container with id '${containerId}' not found`);
      return;
    }

    container.innerHTML = "";
    if (!Array.isArray(gameState.rows)) return;

    const { rows, selectedTiles = [] } = gameState;

    // Create the grid visualization container
    const gridContainer = document.createElement("div");
    gridContainer.className = "laser-party-container";

    // Create grid display
    const gridDisplay = document.createElement("div");
    gridDisplay.className = "grid-display";
    gridDisplay.id = "grid-display";

    // Create navigation controls
    const navControls = document.createElement("div");
    navControls.className = "nav-controls";

    const prevBtn = document.createElement("button");
    prevBtn.innerHTML = "← Prev";
    prevBtn.className = "nav-btn";
    prevBtn.id = "prev-btn";
    prevBtn.disabled = true;

    const nextBtn = document.createElement("button");
    nextBtn.innerHTML = "Next →";
    nextBtn.className = "nav-btn";
    nextBtn.id = "next-btn";

    navControls.appendChild(prevBtn);
    navControls.appendChild(nextBtn);

    // Assemble the container
    gridContainer.appendChild(gridDisplay);
    gridContainer.appendChild(navControls);
    container.appendChild(gridContainer);

    // Initialize the grid visualization
    this.initializeGridVisualization(rows, selectedTiles);
  }

  // Initialize the interactive grid visualization
  initializeGridVisualization(rows, selectedTiles) {
    let currentStep = 0;
    const maxGridSize = Math.max(...rows.map((r) => r.tiles));

    // Calculate the progression of eliminated rows/columns
    const gridStates = this.calculateGridStates(rows, maxGridSize);

    const renderStep = (step) => {
      const gridDisplay = document.getElementById("grid-display");
      const prevBtn = document.getElementById("prev-btn");
      const nextBtn = document.getElementById("next-btn");

      if (!gridDisplay) return;

      const state = gridStates[step];
      gridDisplay.innerHTML = "";

      // Create grid
      const grid = document.createElement("div");
      grid.className = "laser-grid";
      grid.style.gridTemplateColumns = `repeat(${state.gridCols}, 1fr)`;
      grid.style.gridTemplateRows = `repeat(${state.gridRows}, 1fr)`;

      // Create cells
      for (let r = 0; r < state.gridRows; r++) {
        for (let c = 0; c < state.gridCols; c++) {
          const cell = document.createElement("div");
          cell.className = "grid-cell";

          // Check if this cell should be highlighted as the next death location
          let isDeathLocation = false;
          let isSelected = false;

          if (step < rows.length) {
            const currentRow = rows[step];
            isDeathLocation =
              (currentRow.dimension === "row" &&
                r === currentRow.deathTileIndex) ||
              (currentRow.dimension === "col" &&
                c === currentRow.deathTileIndex);

            if (isDeathLocation) {
              cell.classList.add("death-highlight");
            }
          }

          // Check if this cell was selected by the player
          if (step < selectedTiles.length && selectedTiles[step]) {
            const selectedCoords = selectedTiles[step]; // [row, col]
            isSelected = r === selectedCoords[0] && c === selectedCoords[1];

            if (isSelected) {
              cell.classList.add("selected-highlight");
            }
          }

          // Only show skull if both death location AND selected by player
          if (isDeathLocation && isSelected) {
            cell.innerHTML = "💀";
          }

          grid.appendChild(cell);
        }
      }

      gridDisplay.appendChild(grid);

      // Update navigation buttons
      prevBtn.disabled = step === 0;
      nextBtn.disabled = step === rows.length - 1;
    };

    // Navigation event handlers
    document.getElementById("prev-btn").onclick = () => {
      if (currentStep > 0) {
        currentStep--;
        renderStep(currentStep);
      }
    };

    document.getElementById("next-btn").onclick = () => {
      if (currentStep < rows.length - 1) {
        currentStep++;
        renderStep(currentStep);
      }
    };

    // Render initial step
    renderStep(currentStep);
  }

  // Calculate the grid states for each step
  calculateGridStates(rows, maxGridSize) {
    const states = [];
    let currentCols = maxGridSize;
    let currentRows = maxGridSize;

    // Initial state - show the starting grid
    states.push({ gridCols: currentCols, gridRows: currentRows });

    // Each step shows the grid after the previous elimination
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      // Remove either a column or row based on the dimension
      if (row.dimension === "col") {
        currentCols = currentCols - 1;
      } else if (row.dimension === "row") {
        currentRows = currentRows - 1;
      }

      states.push({ gridCols: currentCols, gridRows: currentRows });
    }

    return states;
  }

  // Generate form fields HTML specific to Laser Party game
  getFormFieldsHTML() {
    const versions = ["v1"];
    const versionField =
      versions.length > 1
        ? `
      <label>
        Algorithm Version
        <select id="version" name="version" required>
          ${versions.map((v) => `<option value="${v}">${v}</option>`).join("")}
        </select>
      </label>`
        : `<input type="hidden" id="version" name="version" value="${versions[0]}" />`;

    return `
      ${versionField}
      <label>
        Grid Size
        <textarea id="rows" name="rows" rows="3" required placeholder="Enter comma-separated tile counts for each row"></textarea>
      </label>
      <label>
        Seed
        <input type="text" id="seed" name="seed" required placeholder="Game seed" />
      </label>
      <label>
        Hash
        <input type="text" id="hash" name="hash" required placeholder="Expected hash" />
      </label>
    `;
  }
}

// Create and export the game instance
const laserPartyGame = new LaserPartyGame();
