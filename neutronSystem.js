class NeutronSystem {
    constructor(maxNeutrons) {
        this.maxNeutrons = maxNeutrons;
        this.index = 0;
        this.buffer = new Float32Array(maxNeutrons * NEUTRON_STRIDE);
        this.report = collisionReport;
    }

    addNeutron(x, y, atomRadius) {
        this.index++;
        this.index %= MAX_NEUTRONS_SQUARED;
        // satunnainen suunta
        const angle = Math.random() * Math.PI * 2;
        const vx = Math.cos(angle) * neutronSpeed;
        const vy = Math.sin(angle) * neutronSpeed;

        // siirrä syntypistettä atomin ulkopuolelle
        const spawnOffset = atomRadius * 2;

        x = x + Math.cos(angle) * spawnOffset;
        y = y + Math.sin(angle) * spawnOffset;


        const i = this.index * NEUTRON_STRIDE;
        this.buffer[i + 0] = x;
        this.buffer[i + 1] = y;
        this.buffer[i + 2] = vx;
        this.buffer[i + 3] = vy;

        updateNeutronInTexture(simGL, this.index, x, y, vx, vy);
    }

    update() {
        for (let i = 0; i < MAX_NEUTRONS_SQUARED; i++) {

            const base = i * NEUTRON_STRIDE;

            let x = this.buffer[base + 0];
            let y = this.buffer[base + 1];
            let vx = this.buffer[base + 2];
            let vy = this.buffer[base + 3];

            // nopeus nolla = kuollut neutroni
            if (Math.abs(vx) + Math.abs(vy) < 0.0001) continue;

            const speed = Math.abs(vx) + Math.abs(vy); //suunnilleen...

            if (Math.abs(vx) + Math.abs(vy) < 0.0001) [x, y] = [0, 0];

            x += vx;
            y += vy;

            if (this.collisionToWalls(x, y)) {
                vx = 0;
                vy = 0;
            }


            if (this.collisionToAtoms(speed, x, y)) {
                vx = 0;
                vy = 0;
            }

            const colRod = this.collisionToRods(speed, x, y);
            if (colRod < .99) {
                if (colRod < .49) {
                    vx = 0;
                    vy = 0;
                } else {
                    vx *= colRod;
                    vy *= colRod;
                }
            }

            this.buffer[base + 0] = x;
            this.buffer[base + 1] = y;
            this.buffer[base + 2] = vx;
            this.buffer[base + 3] = vy;
        }
    }

    collisionToWalls(_x, _y) {
        return (
            _x < 0 || _x > screenDrawWidth ||
            _y < 0 || _y > screenDrawHeight
        );
    }

    collisionToRods(_speed, _x, _y) {
        for (let rod of controlRods) {
            if (
                _x > rod.x &&
                _x < rod.x + controlRodWidth &&
                _y < rod.y + controlRodHeight
            ) {
                const r = pseudoRandom01(_x, _y);

                if (r < controlRodAbsorptionProbability) {
                    return 0;
                } else if (_speed > neutronSpeed - 1) {
                    return 0.5;
                }

            }
        }
        return 1;
    }

    collisionToAtoms(_speed, _x, _y) {
        const nearbyAtoms = grid.getAtomsInArea(_x, _y);

        for (let atom of nearbyAtoms) {
            const dx = _x - atom.position.x;
            const dy = _y - atom.position.y;
            const adaptedRadius = atom.radius * (collisionProbability * 40 / _speed); //pienennetään törmäystodennäköisyyttä

            if (dx * dx + dy * dy < adaptedRadius * adaptedRadius) {
                this.report.add(atom.index);
                return true;
            }
        }
        return false;
    }


    draw() {
        fill(255, 255, 0.8);

        for (let i = 0; i < MAX_NEUTRONS_SQUARED; i++) {
            const base = i * NEUTRON_STRIDE;

            const vx = this.buffer[base + 2];
            const vy = this.buffer[base + 3];
            if (vx * vx + vy * vy < 0.0001) continue;

            const x = this.buffer[base + 0];
            const y = this.buffer[base + 1];

            push();
            rectMode(CENTER);
            rect(x, y, 2, 2);
            pop();
        }
    }
}


function pseudoRandom01(x, y) {
    return fract(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453);
}
