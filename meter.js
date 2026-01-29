class Meter {
    constructor(x, y) {
        this.pos = createVector(x, y);
        this.power = 0;
        this.needleAngle = 0;
        this.warning = false;
        this.meterImage = this.createMeterImg();
    }

    createMeterImg() {
        let d = 220;
        let meterImage = createGraphics(d, d);
        meterImage.translate(d/2, d/2);
        meterImage.noStroke();
        meterImage.fill(150);
        meterImage.circle(0, 0, d);
        meterImage.fill(222);
        meterImage.circle(0, 0, d * .9);
        meterImage.fill(50);
        //add ten lines at angles 0.5...TWO_PI-0.5 at equal intervals
        for (let i = 0; i < 11; i++) {
            let angle = map(i, 0, 10, 0.5, TWO_PI - 0.5);
            meterImage.push();
            meterImage.rotate(angle);
            if (i == 9) meterImage.fill("orange");
            if (i == 10) meterImage.fill("red");
            meterImage.rect(0, d * .47, d*0.025, d*-0.08);
            meterImage.pop();
        }
        return (meterImage);
    }

    show() {
        push();
        translate(this.pos.x, this.pos.y);
        noStroke();
        image(this.meterImage, -this.meterImage.width / 4, -this.meterImage.height / 4, 110, 110);
        push();
        rotate(this.needleAngle);
        const needleWidth = 3;
        rectMode(CORNER)
        rect(-needleWidth / 2, 0, needleWidth, 50, needleWidth / 2, needleWidth / 2, needleWidth / 2, needleWidth / 2);
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