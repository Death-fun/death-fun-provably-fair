// Shared utilities for all games

// Minimal SHA-256 using Web Crypto API
async function sha256Hex(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Get URL parameter by name
function getParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

// Auto-fill form fields from URL parameters
function autofillFromParams(fieldIds) {
  fieldIds.forEach((id) => {
    const val = getParam(id);
    if (val !== null) {
      const element = document.getElementById(id);
      if (element) element.value = val;
    }
  });
}

// Show verification result
function showResult(msg, match) {
  const el = document.getElementById("result");
  if (el) {
    el.textContent = msg;
    el.className = "result " + (match ? "match" : "no-match");
    el.style.display = ""; // Show the result element when displaying results
  }
}

// Base Game Interface - all games should implement these methods
class BaseGame {
  constructor() {
    if (this.constructor === BaseGame) {
      throw new Error(
        "BaseGame is abstract and cannot be instantiated directly"
      );
    }
  }

  // Required methods that each game must implement
  getGameName() {
    throw new Error("getGameName() must be implemented");
  }

  getRequiredParams() {
    throw new Error("getRequiredParams() must be implemented");
  }

  getOptionalParams() {
    return []; // Default: no optional params
  }

  // New method: Generate form fields HTML for this game
  getFormFieldsHTML() {
    throw new Error("getFormFieldsHTML() must be implemented");
  }

  async parseGameData(params) {
    throw new Error("parseGameData() must be implemented");
  }

  async reconstructGameState(gameData) {
    throw new Error("reconstructGameState() must be implemented");
  }

  async generateGameHash(gameState) {
    throw new Error("generateGameHash() must be implemented");
  }

  renderGame(gameState, container) {
    throw new Error("renderGame() must be implemented");
  }
}

// Export for use in other files
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    sha256Hex,
    getParam,
    autofillFromParams,
    showResult,
    BaseGame,
  };
}
