/////////////////////////////////////////////////////////////////
//    Verkefni 1: Skotveiði
//     Einfaldur leikur sem fjallar um að skjóta fugla
//     
//
//    Abel Haukur Guðmundsson, September 2024
/////////////////////////////////////////////////////////////////
// Globals
var canvas;
var gl;

let mouseX = 0;
let xMove;
let yMove;
let maxX = 1.0;

// points
let points = [];

// Gun
let gun = {
    index: 4,
    pointer: [0.0, -0.85],
    lBottom: vec2(- 0.05, -0.98),
    rBottom: vec2(0.05, - 0.98),
    top: vec2(0, -0.85),
    speed: 0.0,
}

// shots
let firing = false;
let fire;
let shot = {
    lBottom: vec2(gun.pointer[0] - 0.025, gun.pointer[1] + 0.025),
    lTop: vec2(gun.pointer[0] - 0.025, gun.pointer[1] + 0.075),
    rTop: vec2(gun.pointer[0] + 0.025, gun.pointer[1] + 0.075),
    rBottom: vec2(gun.pointer[0] + 0.025, gun.pointer[1] + 0.025),
    position: {
        x: 0.0,
        y: gun.pointer[1] + 0.025,
        size: 0.05,
        speed: 0.01
    }
};


// bird
let birds = [];


window.onload = function init() {
    canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.7, 1.0, 1.0, 1.0);

    //
    //  Load shaders and initialize attribute buffers
    //
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Create models
    createGun(gun.lBottom, gun.rBottom, gun.top);
    square(shot.lBottom, shot.lTop, shot.rTop, shot.rBottom);
    let spacing = 0;
    for (i = 0; i < 3; i++) {
        let bird = new Bird(i, 0.88 - spacing);
        birds.push(bird);
        square(birds[i].lBottom, birds[i].lTop, birds[i].rTop, birds[i].rBottom);
        spacing += 0.3;
    }

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.DYNAMIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    xMove = gl.getUniformLocation(program, "xMove");
    yMove = gl.getUniformLocation(program, "yMove");
    fire = gl.getUniformLocation(program, "firing");

    gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(points))

    canvas.addEventListener("mousemove", function (e) {
        mouseX = 2 * e.offsetX / canvas.width - 1;
    })
    canvas.addEventListener("mousedown", function (e) {
        if (!firing) {
            resetShots();
            firing = true;
            shot.position.x = mouseX;
        }
    });

    render();
}

function createGun(a, b, c) {
    points.push(a, b, c);
}

function collision(shot, bird) {
    return (
        shot.x < bird.mid + bird.size &&
        shot.x + shot.size > bird.mid &&
        shot.y / 2 < bird.y + bird.size &&
        shot.y / 2 + shot.size > bird.y
    );
}

function Bird(i, y) {
    this.index = i;
    this.alive = true;
    this.lBottom = vec2(-0.05, y);
    this.rBottom = vec2(0.05, y);
    this.lTop = vec2(-0.05, y + 0.1);
    this.rTop = vec2(0.05, y + 0.1);
    this.position = {
        y: y,
        size: 0.1,
        mid: 0.0
    }
    this.radius = 0.05;
    this.speed = Math.random() / 100;
}

function resetShots() {
    shot.position.y = gun.pointer[1] + 0.025;
    shot.position.speed = 0.01;
}

function square(a, b, c, d) {
    points.push(a, b, c);
    points.push(a, c, d);
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.uniform1f(xMove, mouseX);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (firing) {
        gl.uniform1f(xMove, shot.position.x);
        gl.uniform1f(fire, true);
        gl.uniform1f(yMove, shot.position.speed);
        shot.position.speed += 0.01;
        shot.position.y = shot.position.speed;
        if (shot.position.y > 2) {
            firing = !firing;
        }
    }
    gl.drawArrays(gl.TRIANGLES, 3, 6);
    gl.uniform1f(fire, false);

    for (i = 0; i < birds.length; i++) {
        if (collision(shot.position, birds[i].position)) birds[i].alive = false;
        birds[i].position.mid += birds[i].speed;
        if (Math.abs(birds[i].position.mid + birds[i].speed) > maxX - birds[i].radius) {
            birds[i].speed = -birds[i].speed;
        }
        gl.uniform1f(xMove, birds[i].position.mid);
        if (birds[i].alive) gl.drawArrays(gl.TRIANGLES, 9 + (i * 6), 6);
    }

    window.requestAnimFrame(render);
}