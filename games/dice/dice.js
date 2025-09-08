// Dice Game - Complete Implementation

class DiceGame extends BaseGame {
  getGameName() {
    return "dice";
  }

  getDisplayName() {
    return "Degen Dice";
  }

  getRequiredParams() {
    return ["version", "seed", "hash"];
  }

  getOptionalParams() {
    return [];
  }

  getDescription() {
    return "This tool verifies the hash of your game to prove all dice rolls were chosen before the game began.";
  }

  // Generate provably fair dice roll
  async generateDiceRoll(gameSeed, rollIndex) {
    const hashSource1 = `${gameSeed}-roll-${rollIndex}-die-1`;
    const hashSource2 = `${gameSeed}-roll-${rollIndex}-die-2`;

    const hash1 = await sha256Hex(hashSource1);
    const hash2 = await sha256Hex(hashSource2);

    const numericHash1 = parseInt(hash1.slice(0, 8), 16);
    const numericHash2 = parseInt(hash2.slice(0, 8), 16);

    const die1 = (numericHash1 % 6) + 1;
    const die2 = (numericHash2 % 6) + 1;

    return [die1, die2];
  }

  // Parse game data from URL parameters
  async parseGameData() {
    const version = getParam("version") || "v1";
    const seed = getParam("seed");
    const expectedHash = getParam("hash");

    if (!seed || !expectedHash) {
      throw new Error("Missing required parameters: seed and hash");
    }

    return {
      version,
      seed: seed.trim(),
      expectedHash: expectedHash.trim().toLowerCase(),
    };
  }

  // Reconstruct game state from parsed data
  async reconstructGameState(gameData) {
    // Generate the first roll for hash verification
    const firstRoll = await this.generateDiceRoll(gameData.seed, 0);

    return {
      version: gameData.version,
      seed: gameData.seed,
      rollIndex: 0, // Always start at roll 0
      firstRoll,
    };
  }

  // Render the dice game
  renderGame(gameState, containerId = "visual-view") {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container with id '${containerId}' not found`);
      return;
    }

    container.innerHTML = "";

    // Create dice container
    const diceContainer = document.createElement("div");
    diceContainer.className = "dice-container";

    // Create roll info display
    const rollInfo = document.createElement("div");
    rollInfo.className = "roll-info";
    // Will be updated when dice are displayed

    // Create dice display
    const diceDisplay = document.createElement("div");
    diceDisplay.className = "dice-display";
    diceDisplay.id = "dice-display";

    // Create navigation controls
    const navControls = document.createElement("div");
    navControls.className = "nav-controls";

    const prevBtn = document.createElement("button");
    prevBtn.className = "nav-btn";
    prevBtn.textContent = "← Prev";
    prevBtn.id = "prev-roll";

    const nextBtn = document.createElement("button");
    nextBtn.className = "nav-btn";
    nextBtn.textContent = "Next →";
    nextBtn.id = "next-roll";

    navControls.appendChild(prevBtn);
    navControls.appendChild(nextBtn);

    // Assemble the container
    diceContainer.appendChild(rollInfo);
    diceContainer.appendChild(diceDisplay);
    diceContainer.appendChild(navControls);
    container.appendChild(diceContainer);

    // Set up dice navigation
    this.setupDiceNavigation(gameState);

    // Display initial roll and update roll info
    this.updateRollDisplay(gameState.rollIndex, gameState);
  }

  // Setup navigation for dice rolls
  setupDiceNavigation(gameState) {
    const prevBtn = document.getElementById("prev-roll");
    const nextBtn = document.getElementById("next-roll");
    const rollInfo = document.querySelector(".roll-info");

    if (!prevBtn || !nextBtn || !rollInfo) return;

    let currentRollIndex = gameState.rollIndex;

    const updateDisplay = async () => {
      // Update button states
      prevBtn.disabled = currentRollIndex <= 0;

      // Update display and roll info
      await this.updateRollDisplay(currentRollIndex, gameState);
    };

    prevBtn.addEventListener("click", async () => {
      if (currentRollIndex > 0) {
        currentRollIndex--;
        await updateDisplay();
      }
    });

    nextBtn.addEventListener("click", async () => {
      currentRollIndex++;
      await updateDisplay();
    });

    // Initial button state
    prevBtn.disabled = currentRollIndex <= 0;
  }

  // Update both dice display and roll info
  async updateRollDisplay(rollIndex, gameState) {
    const rollInfo = document.querySelector(".roll-info");
    const [die1, die2] = await this.generateDiceRoll(gameState.seed, rollIndex);
    const total = die1 + die2;

    // Update roll info with total
    if (rollInfo) {
      rollInfo.textContent = `Roll ${rollIndex + 1} - Total: ${total}`;
    }

    // Display dice
    await this.displayDiceRoll(rollIndex, gameState);
  }

  // Display dice for a specific roll
  async displayDiceRoll(rollIndex, gameState) {
    const diceDisplay = document.getElementById("dice-display");
    if (!diceDisplay) return;

    const [die1, die2] = await this.generateDiceRoll(gameState.seed, rollIndex);

    diceDisplay.innerHTML = "";

    // Create dice elements
    const die1Element = this.createDiceElement(die1);
    const die2Element = this.createDiceElement(die2);

    diceDisplay.appendChild(die1Element);
    diceDisplay.appendChild(die2Element);
  }

  // Create a visual dice element
  createDiceElement(value) {
    const dice = document.createElement("div");
    dice.className = "dice";
    dice.setAttribute("data-value", value);

    // Create dots based on dice value
    const dots = this.getDiceDotsHTML(value);
    dice.innerHTML = dots;

    return dice;
  }

  // Get HTML for dice dots based on value
  getDiceDotsHTML(value) {
    const dotPatterns = {
      1: '<div class="dot center"></div>',
      2: '<div class="dot top-left"></div><div class="dot bottom-right"></div>',
      3: '<div class="dot top-left"></div><div class="dot center"></div><div class="dot bottom-right"></div>',
      4: '<div class="dot top-left"></div><div class="dot top-right"></div><div class="dot bottom-left"></div><div class="dot bottom-right"></div>',
      5: '<div class="dot top-left"></div><div class="dot top-right"></div><div class="dot center"></div><div class="dot bottom-left"></div><div class="dot bottom-right"></div>',
      6: '<div class="dot top-left"></div><div class="dot top-right"></div><div class="dot middle-left"></div><div class="dot middle-right"></div><div class="dot bottom-left"></div><div class="dot bottom-right"></div>',
    };

    return dotPatterns[value] || "";
  }

  // Generate form fields HTML specific to Dice game
  getFormFieldsHTML() {
    // Always use v1 only (no algorithm version selector)
    const versionField = `<input type="hidden" id="version" name="version" value="v1" />`;

    return `
      ${versionField}
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

// Create global instance
const diceGame = new DiceGame();
