let currentNeutronIndex = 0;

function spawnNeutron(x, y, atomRadius) {
    // Ring-buffer logiikka
    currentNeutronIndex = (currentNeutronIndex + 1) % MAX_NEUTRONS_SQUARED;

    const angle = Math.random() * Math.PI * 2;
    const vx = Math.cos(angle) * neutronSpeed;
    const vy = Math.sin(angle) * neutronSpeed;

    // Siirto atomin ulkopuolelle
    const spawnOffset = atomRadius * 2;
    const finalX = x + Math.cos(angle) * spawnOffset;
    const finalY = y + Math.sin(angle) * spawnOffset;

    // Päivitetään vain tekstuurin tiettyä kohtaa (yksi pikseli)
    updateNeutronInTexture(simGL, currentNeutronIndex, finalX, finalY, vx, vy);
}