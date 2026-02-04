// === Screen constants ===
let screenHeight = 600;
let screenWidth = Math.floor(screenHeight * 1.7778);
let screenSimWidth = Math.floor(screenHeight * (4 / 3));
let SHOP_WIDTH = screenWidth - screenSimWidth;
let controlRodsStartPos = -screenHeight * .9;

const waterColor = [52, 95, 120];

// Global scale factor (1.0 when height == 600)
let globalScale = 1.0;

const defaultSettings = {
  neutronSpeed: 5, // Restored to original speed now that simulation is fixed
  collisionProbability: 0.055,
  decayProbability: 0.0001,
  controlRodAbsorptionProbability: 0.1,
  controlRodHitProbability: 0.325,
  waterFlowSpeed: 0.3,
  heatingRate: 500,
  uraniumToWaterHeatTransfer: 0.1,
  heatTransferCoefficient: 0.04,
  inletTemperature: 15,
  moneyExponent: 1.5,
  uraniumSize: 10,
  neutronSize: 80,
  linkRods: false,
  cheatMode: false
};
let settings = { ...defaultSettings };

// === Runtime state ===
let uraniumAtoms = [];
let controlRods = [];
let waterCells = [];
let grid;
var boom = false;
var boomStartTime = 0;
let font;
var energyOutput = 0;
let energyThisFrame = 0;
var energyOutputCounter = 0; // accumulator: sum(power_kW * dt) over the second
let lastMoneyPerSecond = 0;
let paused = false;
var renderTime = 0;

// Loading screen variables
let loading = true;


const ui = {
  totalNeutrons: 0,
  decayNeutrons: 0,
  collisionNeutrons: 0,
  lastUpdateTime: performance.now(),
  collisionsThisSecond: 0,
  fpsText: 0,
  avgFps: 0,
  prevTime: 0,
  framesCounted: 0,
  accumulatedTime: 0,
  meter: null,
  controlSlider: null
};

//game variables
const game = {
  // threshold in physical kW (1 MW = 1000 kW)
  boomValue: 1000
}

//scene variables
const uraniumAtomsCountX = 41;
const uraniumAtomsCountY = 30;
let uraniumAtomsSpacingX;
let uraniumAtomsSpacingY;
const controlRodCount = 5;
let controlRodWidth;
let controlRodHeight;
const NEUTRON_STRIDE = 4;
const MAX_NEUTRONS = 512;
const MAX_NEUTRONS_SQUARED = MAX_NEUTRONS * MAX_NEUTRONS;
// let neutron;


function updateDimensions() {
  // Use manual `screenWidth` and `screenHeight` values set at top of file.
  screenWidth = Math.floor(screenHeight * 1.7778);
  screenSimWidth = Math.floor(screenHeight * (4 / 3));
  SHOP_WIDTH = screenWidth - screenSimWidth;
  screenRenderWidth = screenWidth;

  // update the single global scale value (base height = 600 => scale 1)
  globalScale = screenHeight / 600;

  uraniumAtomsSpacingX = screenSimWidth / uraniumAtomsCountX;
  uraniumAtomsSpacingY = screenHeight / uraniumAtomsCountY;

  controlRodWidth = 10 * globalScale;
  controlRodHeight = 600 * globalScale;
  controlRodsStartPos = -screenHeight * 0.9;

  settings.uraniumSize = settings.uraniumSize * globalScale;
  settings.neutronSize = settings.neutronSize * globalScale;
  settings.neutronSpeed = settings.neutronSpeed * globalScale;
}

function setup() {
  updateDimensions();
  // neutron = new Neutron(); // Now handled in loadingTasks.js to ensure it exists for GL init
  
  //debug(); //DO NOT REMOVE THIS LINE
  // We use a manual HTML canvas "gameCanvas" for drawing.
  // We use p5 just for the loop and events.
  noCanvas();

  // However, we need to ensure our 'gameCanvas' is sized correctly.
  const gameCnv = document.getElementById('gameCanvas');
  if (gameCnv) {
    gameCnv.width = screenRenderWidth;
    gameCnv.height = screenHeight;
  }

  // Loading is now handled asynchronously before setup
}

// Asynchronous loading
(async () => {
  await loader.startLoading(loadingTasks, () => {
    loading = false;
    document.getElementById('loading-screen').style.display = 'none';
    if (typeof audioManager !== 'undefined') audioManager.startAmbience();
  });
})();

function draw() {
  if (loading) {

    return;
  }
  
  if (typeof audioManager !== 'undefined') {
      // Pass settings and energy metric to audio mixer
      // Use energyOutput (last second average) for smoother audio level than the accumulating counter
      audioManager.update(deltaTime, settings, energyOutput, paused, game.boomValue);
  }

  if (!paused) {
    if (typeof deltaTime !== 'undefined') renderTime += deltaTime / 1000.0;

    // Update CPU-side state
    updateScene();

    if (boom && boomStartTime == 0) {
        boomStartTime = renderTime;
        if (typeof audioManager !== 'undefined') audioManager.playSfx('boom');
    }
  }

  // Core layer (steam + atom cores) on coreCanvas
  // This draws the scene using 'renderTime' (if updated in sceneHelpers)
  // and draws the UI/Pause Menu on top
  drawScene();
}
