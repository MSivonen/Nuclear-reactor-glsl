class Meter {
    constructor(x, y) {
        this.pos = createVector(x, y);
        this.power = 0;
        this.needleAngle = 0;
        this.warning = false;
    }

    show() {
        push();
        translate(this.pos.x, this.pos.y);
        noStroke();
        fill(150);
        circle(0, 0, 110);
        fill(222);
        circle(0, 0, 100);
        fill(50);
        //add ten lines at angles 0.5...TWO_PI-0.5 at equal intervals
        for (let i = 0; i < 11; i++) {
            let angle = map(i, 0, 10, 0.5, TWO_PI - 0.5);
            push();
            rotate(angle);
            if(i==9)fill("orange");
            if(i==10)fill("red");
            rect(0, 47, 3, -8);
            pop();
        }

        push();
        rotate(this.needleAngle);
        const needleWidth = 3;
        rectMode(CORNER)
        rect(-needleWidth/2, 0, needleWidth, 50,needleWidth/2,needleWidth/2,needleWidth/2,needleWidth/2);
        pop();
        pop();
    }

    update() {
        this.power = max(0, energyThisFrame);
        // Smooth transition using easing functions
        const targetAngle = map(this.power, 0, 1000, 0.5, TWO_PI - 0.5);
        const delta = targetAngle - this.needleAngle;
        this.needleAngle += delta * 0.1;
    }
}