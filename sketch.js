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
  heatingRate: 1500,
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
let player = null;
let upgrades = null; // Upgrades instance
let shop = null;
let playerState = null;
let lastMoneyPerSecond = 0;
let paused = false;
var renderTime = 0;

const glShit = {
  waterGL: null,
  waterCanvas: null,
  simGL: null,
  simCanvas: null,
  coreGL: null,
  coreCanvas: null,
  simProgram: null,
  renderProgram: null,
  explosionProgram: null,
  readTex: null,
  writeTex: null,
  readFBO: null,
  writeFBO: null,
  quadVao: null,
  uNeutronsLoc: null,
  uRenderResLoc: null,
  uRenderTexSizeLoc: null,
  uRenderSimSizeLoc: null,
  uRenderNeutronSizeLoc: null,
  uRenderNeutronsLoc: null,
  reportTex: null,
  reportFBO: null,
  reportVao: null,
  reportData: null,
  useGpuSteam: false,
  waterClearFrame: -1,
  coreClearFrame: -1,
  simClearFrame: -1,

  shaderCodes: {
    simVertSrc: null,
    simFragSrc: null,
    rendVertSrc: null,
    rendFragSrc: null,
    reportVertSrc: null,
    reportFragSrc: null,
    atomsVertSrc: null,
    atomsFragSrc: null,
    steamVertSrc: null,
    steamFragSrc: null,
    waterVertSrc: null,
    waterFragSrc: null,
    explosionVertSrc: null,
    explosionFragSrc: null,
    simVertCode: null,
    simFragCode: null,
    rendVertCode: null,
    rendFragCode: null,
    reportVertCode: null,
    reportFragCode: null,
    atomsVertCode: null,
    atomsFragCode: null,
    steamVertCode: null,
    steamFragCode: null,
    waterVertCode: null,
    waterFragCode: null,
    explosionVertCode: null,
    explosionFragCode: null,
    atomsCoreFragCode: null,
    atomsCoreFragSrc: null
  }
};

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
  // threshold in physical kW (5 MW = 5000 kW)
  boomValue: 5000000
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


function preload() {
  glShit.shaderCodes.simVertSrc = loadStrings('shaders/sim.vert');
  glShit.shaderCodes.simFragSrc = loadStrings('shaders/sim.frag');
  glShit.shaderCodes.rendVertSrc = loadStrings('shaders/render.vert');
  glShit.shaderCodes.rendFragSrc = loadStrings('shaders/render.frag');
  glShit.shaderCodes.reportVertSrc = loadStrings('shaders/report.vert');
  glShit.shaderCodes.reportFragSrc = loadStrings('shaders/report.frag');
  glShit.shaderCodes.atomsVertSrc = loadStrings('shaders/atoms.vert');
  glShit.shaderCodes.atomsFragSrc = loadStrings('shaders/atoms.frag');
  glShit.shaderCodes.atomsCoreFragSrc = loadStrings('shaders/atoms_core.frag');
  glShit.shaderCodes.steamVertSrc = loadStrings('shaders/steam.vert');
  glShit.shaderCodes.steamFragSrc = loadStrings('shaders/steam.frag');
  glShit.shaderCodes.bubblesVertSrc = loadStrings('shaders/bubbles.vert');
  glShit.shaderCodes.bubblesFragSrc = loadStrings('shaders/bubbles.frag');
  glShit.shaderCodes.waterVertSrc = loadStrings('shaders/water.vert');
  glShit.shaderCodes.waterFragSrc = loadStrings('shaders/water.frag');
  glShit.shaderCodes.explosionVertSrc = loadStrings('shaders/explosion.vert');
  glShit.shaderCodes.explosionFragSrc = loadStrings('shaders/explosion.frag');
}

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

function windowResized() {
  // Automatic resizing on window events is disabled. Use manual resizing
  // (call updateDimensions() after changing `screenWidth`/`screenHeight`).
  return;
}

function setup() {
  updateDimensions();

  //debug(); //DO NOT REMOVE THIS LINE
  // We use a manual HTML canvas "gameCanvas" for drawing.
  // We use p5 just for the loop and events.
  // We create a tiny or hidden canvas to keep P5 happy, or just use noCanvas()?
  // noCanvas() is usually best if we don't want the default canvas.
  noCanvas();
  
  // However, we need to ensure our 'gameCanvas' is sized correctly.
  const gameCnv = document.getElementById('gameCanvas');
  if (gameCnv) {
     gameCnv.width = screenRenderWidth;
     gameCnv.height = screenHeight;
  }

  // glShit.shaderCodes... initialization matches existing logic
  glShit.shaderCodes.simVertCode = glShit.shaderCodes.simVertSrc.join('\n');
  glShit.shaderCodes.simFragCode = glShit.shaderCodes.simFragSrc.join('\n');
  glShit.shaderCodes.rendVertCode = glShit.shaderCodes.rendVertSrc.join('\n');
  glShit.shaderCodes.rendFragCode = glShit.shaderCodes.rendFragSrc.join('\n');
  glShit.shaderCodes.reportVertCode = glShit.shaderCodes.reportVertSrc.join('\n');
  glShit.shaderCodes.reportFragCode = glShit.shaderCodes.reportFragSrc.join('\n');
  glShit.shaderCodes.atomsVertCode = glShit.shaderCodes.atomsVertSrc.join('\n');
  glShit.shaderCodes.atomsFragCode = glShit.shaderCodes.atomsFragSrc.join('\n');
  glShit.shaderCodes.atomsCoreFragCode = glShit.shaderCodes.atomsCoreFragSrc.join('\n');
  glShit.shaderCodes.steamVertCode = glShit.shaderCodes.steamVertSrc.join('\n');
  glShit.shaderCodes.steamFragCode = glShit.shaderCodes.steamFragSrc.join('\n');
  glShit.shaderCodes.bubblesVertCode = glShit.shaderCodes.bubblesVertSrc.join('\n');
  glShit.shaderCodes.bubblesFragCode = glShit.shaderCodes.bubblesFragSrc.join('\n');
  glShit.shaderCodes.waterVertCode = glShit.shaderCodes.waterVertSrc.join('\n');
  glShit.shaderCodes.waterFragCode = glShit.shaderCodes.waterFragSrc.join('\n');
  glShit.shaderCodes.explosionVertCode = glShit.shaderCodes.explosionVertSrc.join('\n');
  glShit.shaderCodes.explosionFragCode = glShit.shaderCodes.explosionFragSrc.join('\n');
  // Delegate initialization to helpers
  initShadersAndGL();
  initSimulationObjects();

  // Economy objects: instantiate here so UI and per-second hooks can use them
  if (typeof Upgrades !== 'undefined') upgrades = new Upgrades();
  if (typeof Player !== 'undefined') player = new Player();
  if (typeof Shop !== 'undefined') shop = new Shop();
  if (typeof PlayerState !== 'undefined') playerState = new PlayerState();

  initUiObjects();
  eventListeners();

}

function draw() {
  if (!paused) {
    if (typeof deltaTime !== 'undefined') renderTime += deltaTime / 1000.0;
    
    // Update CPU-side state
    updateScene();
    
    if (boom && boomStartTime == 0) boomStartTime = renderTime;
    
    energyThisFrame = 0; // Reset accumulator for next frame
  }

  // Core layer (steam + atom cores) on coreCanvas
  // This draws the scene using 'renderTime' (if updated in sceneHelpers)
  // and draws the UI/Pause Menu on top
  drawScene();
}
function mousePressed() {
  if (ui && ui.canvas && typeof ui.canvas.handleMouseClick === 'function') {
    ui.canvas.handleMouseClick(mouseX, mouseY);
  }
}

function mouseDragged() {
  if (ui && ui.canvas && typeof ui.canvas.handleMouseDrag === 'function') {
    ui.canvas.handleMouseDrag(mouseX, mouseY);
  }
}

function mouseReleased() {
  if (ui && ui.canvas && typeof ui.canvas.handleMouseRelease === 'function') {
    ui.canvas.handleMouseRelease();
  }
}

function keyPressed() {
  if (key === 'p' || key === 'P' || keyCode === ESCAPE) {
    paused = !paused;
    if (!paused) {
        if (typeof ui !== 'undefined') ui.lastUpdateTime = performance.now();
    }
  }

  if (settings.cheatMode) {
    if (key === 'm' || key === 'M') {
      if (player) player.addMoney(player.getBalance() * 0.1 + 10000);
      console.log("Cheat: Added money");
    }
    // 'C' to clear/cool reactor for testing?
    if (key === 'c' || key === 'C') {
        uraniumAtoms.forEach(u => u.temperature = 0);
        console.log("Cheat: Temperature reset");
    }
  }
}
