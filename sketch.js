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


window.simulation = {
  collisionProbability: collisionProbability,
  neutronSpeed: neutronSpeed,
};

function preload() {
  neutronShader = loadShader('basic.vert', 'circle.frag');
  console.log('Shaders loaded:', neutronShader);
  font = loadFont("HARRYP_.TTF");
}

function setup() {
  createCanvas(screenRenderWidth, screenRenderHeight, WEBGL);

  neutronSystem = new NeutronSystem(65536);

  for (let y = 0; y < uraniumAtomsCountY; y++) {
    for (let x = 0; x < uraniumAtomsCountX; x++) {
      let waterCellX = x * uraniumAtomsSpacingX;
      let waterCellY = y * uraniumAtomsSpacingY;
      waterCells.push(new Water(waterCellX + uraniumAtomsSpacingX / 2, waterCellY + uraniumAtomsSpacingY / 2));
    }
  }

  for (let x = 0; x < uraniumAtomsCountX; x++) {
    if ((x + 1) % 7 === 0) {
      controlRods.push(new ControlRod(x * uraniumAtomsSpacingX + controlRodWidth / 2, 0));
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
  translate(-screenDrawWidth / 2, -screenDrawHeight / 2);
  background(22, 88, 90);

  updateShit(uraniumAtoms);
  updateShit(controlRods);
  neutronSystem.update();

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
  scale((screenRenderHeight / screenDrawHeight));
  //scale(0.9);
  translate(-screenDrawWidth / 2, -screenDrawHeight / 2);
  drawShit(uraniumAtoms);
  drawShit(controlRods);
  neutronSystem.draw(drawingContext);
  drawSteam();

  meter.show();
  controlSlider.slider();
  gameOver();
  drawFPS();
  drawBorders();

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