let uraniumAtoms = [];
let neutrons = [];
let controlRods = [];
let waterCells = [];
let grid;
let steamImage;
let neutronShader; // Declare shaders variable
let boom = false;
let meter;
let neutronSystem;
let collisionReport;
let currentNeutronIndex = 0;

let neutronSpeed = 5;
let collisionProbability = 0.08;
let decayProbability = 0.0001;
let controlRodAbsorptionProbability = 0.05;
let heatTransferCoefficient = 0.04;
let waterFlowSpeed = 0.3; // Speed of water flow (interpolation factor)
let fpstext = 0;
let avgfps = 0;
let prevTime = 0;
let framesCounted = 0;
let font;
let energyOutput = 0;
let energyThisFrame = 0;
let energyOutputCounter = 0;
let controlSlider;
let simProgram;
let uNeutronsLoc;
let readTex, writeTex;
let readFBO, writeFBO;
let quadVao = null;
let simCanvas, simGL;
let renderProgram;
let uRenderResLoc, uRenderTexSizeLoc;
let simVertCode, simFragCode;
let rendVertCode, rendFragCode, rendVertSrc, rendFragSrc;
let reportVertCode, reportFragCode, reportVertSrc, reportFragSrc;
let gl;
let reportFBO, reportTex;
let reportProgram;

const screenDrawWidth = 800;
const screenDrawHeight = 600;
const screenRenderWidth = 1324;
const screenRenderHeight = 768;
const uraniumAtomsCountX = 41;
const uraniumAtomsCountY = 30;
const uraniumAtomsSpacingX = screenDrawWidth / uraniumAtomsCountX;
const uraniumAtomsSpacingY = screenDrawHeight / uraniumAtomsCountY;
const uraniumSize = 2;
const neutronSize = 1.5;
const controlRodCount = 5;
const controlRodWidth = 10;
const controlRodHeight = 600;
const heatingRate = 1500;
const uraniumToWaterHeatTransfer = 0.1;
const NEUTRON_STRIDE = 4;
const controlRodsStartPos = screenDrawHeight * .1;
const MAX_NEUTRONS = 256;
const MAX_NEUTRONS_SQUARED = MAX_NEUTRONS * MAX_NEUTRONS;

let reportData;// = new Float32Array(MAX_NEUTRONS_SQUARED * 4);

window.simulation = {
  collisionProbability: collisionProbability,
  neutronSpeed: neutronSpeed,
};

function preload() {
  //neutronShader = loadShader('basic.vert', 'circle.frag');
  font = loadFont("HARRYP_.TTF");
  simVertSrc = loadStrings('shaders/sim.vert');
  simFragSrc = loadStrings('shaders/sim.frag');
  rendVertSrc = loadStrings('shaders/render.vert');
  rendFragSrc = loadStrings('shaders/render.frag');
  reportVertSrc = loadStrings('shaders/report.vert');
  reportFragSrc = loadStrings('shaders/report.frag');
}

function setup() {
  simVertCode = simVertSrc.join('\n');
  simFragCode = simFragSrc.join('\n');
  rendVertCode = rendVertSrc.join('\n');
  rendFragCode = rendFragSrc.join('\n');
  reportVertCode = reportVertSrc.join('\n');
  reportFragCode = reportFragSrc.join('\n');

  createCanvas(screenRenderWidth, screenRenderHeight, WEBGL);
  gl = drawingContext;
  collisionReport = new CollisionReport();
  neutronSystem = new NeutronSystem(MAX_NEUTRONS_SQUARED);

  simCanvas = document.getElementById("simCanvas");
  simCanvas.width = screenRenderWidth; // 1324
  simCanvas.height = screenRenderHeight; // 768

  simGL = simCanvas.getContext("webgl2", {
    alpha: true,
    depth: false,
    antialias: false,
    preserveDrawingBuffer: true
  });

  const ext = simGL.getExtension("EXT_color_buffer_float");
  if (!ext) {
    throw new Error("EXT_color_buffer_float not supported");
  }

  if (!simGL) {
    throw "WebGL2 not supported";
  }

  simProgram = createProgram(simGL, simVertCode, simFragCode);
  reportProgram = createProgram(simGL, reportVertCode, reportFragCode);
  uNeutronsLoc = simGL.getUniformLocation(simProgram, "u_neutrons");

  readTex = createNeutronTexture(simGL, neutronSystem.buffer);
  writeTex = createNeutronTexture(simGL, null);

  readFBO = createFBO(simGL, readTex);
  writeFBO = createFBO(simGL, writeTex);

  initRenderShader(simGL, rendVertCode, rendFragCode);
  initReportSystem(simGL);



  for (let y = 0; y < uraniumAtomsCountY; y++) {
    for (let x = 0; x < uraniumAtomsCountX; x++) {
      let waterCellX = x * uraniumAtomsSpacingX;
      let waterCellY = y * uraniumAtomsSpacingY;
      waterCells.push(new Water(waterCellX + uraniumAtomsSpacingX / 2, waterCellY + uraniumAtomsSpacingY / 2));
    }
  }

  for (let x = 0; x < uraniumAtomsCountX; x++) {
    if ((x + 1) % 7 === 0) {
      controlRods.push(new ControlRod(x * uraniumAtomsSpacingX + controlRodWidth / 2, -screenDrawHeight / 2));
    } else {
      for (let y = 0; y < uraniumAtomsCountY; y++) {
        let waterCellIndex = x + y * uraniumAtomsCountX;
        let waterCell = waterCells[waterCellIndex];
        let uraniumX = x * uraniumAtomsSpacingX + uraniumAtomsSpacingX / 2;
        let uraniumY = y * uraniumAtomsSpacingY + uraniumAtomsSpacingY / 2;
        uraniumAtoms.push(new UraniumAtom(uraniumX, uraniumY, waterCell));
      }
    }
  }
  uraniumAtoms.forEach((atom, i) => atom.index = i);


  grid = new Grid(uraniumAtomsSpacingX);
  for (let atom of uraniumAtoms) {
    grid.addAtom(atom);
  }
  initializeControls();
  textFont(font);
  steamImage = createGraphics(screenDrawWidth, screenDrawHeight);
  meter = new Meter(700, 500);
  controlSlider = new ControlRodsSlider();
}

function draw() {
  // 1. GPU LASKENTA
  gpuUpdateNeutrons(simGL);

  // 2. TÖRMÄYSTEN KÄSITTELY (Lue GPU:lta -> Päivitä atomit)
  processCollisions(simGL);

  // 3. p5.js PIIRTO (Tausta ja kiinteät elementit)
  translate(-screenDrawWidth / 2, -screenDrawHeight / 2);
  background(22, 88, 90);

  updateShit(uraniumAtoms);
  updateShit(controlRods);
  updateWaterCells();
  interpolateWaterCellsUpwards();

  energyThisFrame /= 70;
  energyOutputCounter += energyThisFrame;
  meter.update();
  updateCounters();
  oncePerSecond();
  if (energyOutput > 1000) boom = true;

  push();
  translate(screenDrawWidth / 2, screenDrawHeight / 2);
  scale(screenRenderHeight / screenDrawHeight);
  translate(-screenDrawWidth / 2, -screenDrawHeight / 2);

  drawShit(uraniumAtoms);
  drawShit(controlRods);
  meter.show();
  controlSlider.slider();
  gameOver();
  drawFPS();
  drawBorders();

  // 4. GPU RENDERÖINTI (Piirretään neutronit kerralla)
  gpuDrawNeutrons(simGL);

  pop();
  energyThisFrame = 0;
}

class Grid {
  constructor(cellSize) {
    this.cellSize = cellSize;
    this.grid = [];
  }

  addAtom(atom) {
    let gridX = Math.floor(atom.position.x / this.cellSize);
    let gridY = Math.floor(atom.position.y / this.cellSize);

    if (!this.grid[gridX]) this.grid[gridX] = [];
    if (!this.grid[gridX][gridY]) this.grid[gridX][gridY] = [];

    this.grid[gridX][gridY].push(atom);
  }

  getAtomsInArea(x, y) {
    let atoms = [];
    let gridX = Math.floor(x / this.cellSize);
    let gridY = Math.floor(y / this.cellSize);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (this.grid[gridX + dx] && this.grid[gridX + dx][gridY + dy]) {
          atoms = atoms.concat(this.grid[gridX + dx][gridY + dy]);
        }
      }
    }

    return atoms;
  }
}


class CollisionReport {
  constructor() {
    this.count = 0;
    this.atomIndices = new Uint32Array(MAX_NEUTRONS_SQUARED);
  }

  reset() {
    this.count = 0;
  }

  add(atomIndex) {
    if (this.count >= MAX_NEUTRONS_SQUARED) return;
    this.atomIndices[this.count++] = atomIndex;
  }
}