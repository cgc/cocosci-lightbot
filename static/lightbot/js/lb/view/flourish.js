import { parseHTML } from "../../../../optdisco/js/utils";

const length = 30;

export class Flourish {
    constructor() {
    }

    activate() {
        const rect = (document.querySelector('canvas') || document.body).getBoundingClientRect();

        for (let i = 0; i < 25; i++) {
            const left = rect.left + rect.width / 2 + rect.width * .1 * (Math.random() - 0.5);
            const top = rect.top + rect.height / 2 + rect.height * .1 * (Math.random() - 0.5);
            const el = parseHTML(`
                <span class="Flourish" style="left: ${left}px; top: ${top}px;">🎉</span>`);
            const theta = Math.PI * Math.random();
            el.addEventListener('animationend', (e) => {
                e.target.remove();
            });
            const len = 200 + 50 * Math.random() 
            el.style.setProperty('--flourish-dx', Math.cos(theta) * len + "px");
            el.style.setProperty('--flourish-dy', -Math.sin(theta) * len + "px");
            el.style.setProperty('--flourish-duration', (Math.random() * 0.5 + 1) + 's');
            setTimeout(() => {
                i; // ... we need this for weird scoping reasons, otherwise the `const el` seems to become a `var el`
                document.body.append(el);
            }, Math.random() * 200)
        }
    }

    step() { }

    draw(ctx, projection) { }
}

export class FlourishCanvas {
    constructor() {
        this.active = false;
        this.counter = null;
    }

    activate() {
        this.active = true;
        this.counter = 0;
        this.positions = [];
        for (let i = 0; i < 10; i++) {
            this.positions.push({
                x: Math.random(), y: Math.random(),
                dx: Math.random() - .5, dy: -1,//Math.random() - .5,
                size: Math.random() * 25 + 15,
            });
        }
    }

    step() {
        if (!this.active) {
            return;
        }
        if (this.counter > length) {
            this.active = false;
            this.counter = null;
            return;
        }
        this.counter++;

        const alpha = 1 / 100;
        for (const pos of this.positions) {
            pos.x += alpha * pos.dx;
            pos.y += alpha * pos.dy;
        }
    }

    draw(ctx, projection) {
        if (!this.active) {
            return;
        }
        for (const pos of this.positions) {
            ctx.font = `${pos.size}px serif`;
            ctx.fillText('🎉', pos.x * ctx.canvas.width, pos.y * ctx.canvas.height);
        }
    }
}
