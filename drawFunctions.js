function drawSteam() {
    steamImage.clear();
    steamImage.push();
    //steamImage.translate(-screenDrawWidth / 2, -screenDrawHeight / 2);
    drawShit(waterCells, steamImage);
    steamImage.filter(BLUR, 13);
    steamImage.pop();
    image(steamImage, 0, 0, screenDrawWidth, screenDrawHeight);
}

function drawNeutrons() {
    noStroke();
    neutronShader.setUniform('myColor', [0, 0.7, 0, 0.01]);
    shader(neutronShader);
    neutrons.forEach(neutron => {
        rect(neutron.position.x, neutron.position.y, neutron.radius * 1.2);
    });
    resetShader();
}

function drawShit(shit, target) {
    shit.forEach(s => s.draw(target));
}

function drawBorders() {
    fill(0);
    noStroke();
    rectMode(CORNERS);
    rect(0, 0, -200, screenDrawHeight);
    rect(screenDrawWidth, 0, screenDrawWidth+200, screenDrawHeight);

}

function drawFPS() {
    fpstext = Math.floor(avgfps); // Calculate current fps as integer
    textSize(20); // Set text size to 16 pixels
    textStyle(BOLD); // Set text style to bold
    fill(0, 0, 0);
    text(fpstext, 11, 27); // Draw fps text at position (10, 20)
    fill(0, 255, 0);
    text(fpstext, 10, 26); // Draw fps text at position (10, 20)
}