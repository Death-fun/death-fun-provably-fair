// Main Verifier - Orchestrates the verification process

// Game registry - add new games here
const GAMES = {
  deathFun: deathFunGame,
  death_race: deathFunGame, // Alias for deathFun
  laser_party: laserPartyGame,
};

// Get the current game (default to deathFun for backward compatibility)
function getCurrentGame() {
  const urlGameType = getParam("game");
  const selectorGameType = document.getElementById("game-selector")?.value;

  // Use selector value if it exists (user selection), otherwise URL param, otherwise default
  const gameType = selectorGameType || urlGameType || "deathFun";

  console.log(
    "getCurrentGame - URL:",
    urlGameType,
    "Selector:",
    selectorGameType,
    "Final:",
    gameType
  );

  const game = GAMES[gameType];

  if (!game) {
    throw new Error(`Unknown game type: ${gameType}`);
  }

  return game;
}

// Generate dynamic form fields based on current game
function generateFormFields() {
  const game = getCurrentGame();
  console.log("Generating form fields for game:", game.getGameName());

  const formContainer = document.getElementById("dynamic-form-fields");

  if (formContainer) {
    const formHTML = game.getFormFieldsHTML();
    console.log("Form HTML being set:", formHTML.substring(0, 100) + "...");
    formContainer.innerHTML = formHTML;
  }

  // Update page title based on game
  const titleElement = document.getElementById("page-title");
  if (titleElement) {
    const gameDisplayName = game.getDisplayName
      ? game.getDisplayName()
      : game.getGameName();
    const newTitle = `${gameDisplayName} Hash Verifier`;
    console.log("Setting page title to:", newTitle);
    titleElement.textContent = newTitle;
  }
}

// Main verification function
async function verify(event) {
  if (event) event.preventDefault();

  try {
    const game = getCurrentGame();

    // Parse game data from URL parameters
    const gameData = await game.parseGameData();

    // Reconstruct game state
    const gameState = await game.reconstructGameState(gameData);

    // Generate hash from game state
    const computedHash = await game.generateGameHash(gameState);

    // Compare hashes
    const hashMatches = computedHash === gameData.expectedHash;

    // Show result
    showResult(
      hashMatches ? "Hash matches!" : `Hash does not match!`,
      hashMatches
    );

    // Show raw JSON
    const rawConfigElement = document.getElementById("rows-config");
    if (rawConfigElement) {
      rawConfigElement.textContent = JSON.stringify(gameState.rows, null, 2);
    }

    // Render the game
    game.renderGame(gameState);

    // Set up initial view state
    const visualView = document.getElementById("visual-view");
    const rawView = document.getElementById("rows-config");
    const toggleBtn = document.getElementById("toggle-view");

    if (visualView && rawView && toggleBtn) {
      visualView.style.display = "";
      rawView.style.display = "none";
      toggleBtn.textContent = "Show Raw JSON";
      toggleBtn.style.display = ""; // Show the toggle button when we have results
    }
  } catch (error) {
    showResult(error.message, false);

    // Clear displays on error
    const rawConfigElement = document.getElementById("rows-config");
    if (rawConfigElement) {
      rawConfigElement.textContent = "";
    }

    const visualView = document.getElementById("visual-view");
    if (visualView) {
      visualView.innerHTML = "";
    }

    const toggleBtn = document.getElementById("toggle-view");
    if (toggleBtn) {
      toggleBtn.style.display = "none";
    }
  }
}

// Initialize the game selector
function initializeGameSelector() {
  const gameSelector = document.getElementById("game-selector");
  if (!gameSelector) return;

  // Set initial value based on URL param or default to deathFun
  const urlGameType = getParam("game");
  if (urlGameType && GAMES[urlGameType]) {
    gameSelector.value = urlGameType;
  } else {
    gameSelector.value = "deathFun";
  }

  // Handle game selector changes
  gameSelector.addEventListener("change", () => {
    console.log("Game selector changed to:", gameSelector.value);

    // Clear existing results and form
    const resultElement = document.getElementById("result");
    const visualView = document.getElementById("visual-view");
    const rawConfig = document.getElementById("rows-config");
    const toggleBtn = document.getElementById("toggle-view");

    if (resultElement) {
      resultElement.textContent = "";
      resultElement.className = "result"; // Remove match/no-match classes
      resultElement.style.display = "none"; // Hide the result element
    }
    if (visualView) visualView.innerHTML = "";
    if (rawConfig) rawConfig.textContent = "";
    if (toggleBtn) toggleBtn.style.display = "none";

    // Regenerate form fields for new game (this will update field labels and title)
    generateFormFields();

    // Auto-fill from URL if params exist
    const game = getCurrentGame();
    const allParams = [
      ...game.getRequiredParams(),
      ...game.getOptionalParams(),
    ];
    autofillFromParams(allParams);

    console.log("Form regenerated for game:", game.getGameName());
  });
}

// Initialize the application
function initializeApp() {
  // Initialize game selector first
  initializeGameSelector();

  // Generate form fields for current game
  generateFormFields();

  // Set up form submission
  const form = document.getElementById("verifier-form");
  if (form) {
    form.addEventListener("submit", verify);
  }

  // Auto-fill form fields from URL parameters
  const game = getCurrentGame();
  const allParams = [...game.getRequiredParams(), ...game.getOptionalParams()];
  autofillFromParams(allParams);

  // Auto-submit if all required fields are filled from URL
  const allRequiredFilled = game
    .getRequiredParams()
    .every((param) => getParam(param) !== null);

  if (allRequiredFilled) {
    verify();
  }
}

// Start the app when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}
