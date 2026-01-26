let neutronBuffer = new Float32Array(MAX_NEUTRONS_SQUARED * NEUTRON_STRIDE);

function addNeutron(x, y, atomRadius) {
    currentNeutronIndex = (currentNeutronIndex + 1) % MAX_NEUTRONS_SQUARED;

    const angle = Math.random() * Math.PI * 2;
    const vx = Math.cos(angle) * settings.neutronSpeed;
    const vy = Math.sin(angle) * settings.neutronSpeed;

    // spawn just outside the atom so it won't collide immediately
    const spawnOffset = atomRadius * 2;
    const finalX = x + Math.cos(angle) * spawnOffset;
    const finalY = y + Math.sin(angle) * spawnOffset;

    const i = currentNeutronIndex * NEUTRON_STRIDE;
    neutronBuffer[i + 0] = finalX;
    neutronBuffer[i + 1] = finalY;
    neutronBuffer[i + 2] = vx;
    neutronBuffer[i + 3] = vy;

    // push update to GPU texture
    updateNeutronInTexture(glShit.simGL, currentNeutronIndex, finalX, finalY, vx, vy);
}
