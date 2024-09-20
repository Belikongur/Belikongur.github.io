"use strict";

var gl;
var points;

var NumPoints = 5000;


let movement = false;
let origX, origY;
let moveY = 0;
let moveX = 0;
let t, s, matrixLoc;
let zoom = 1;
let color, colorLoc;

window.onload = function init() {
    var canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }

    //
    //  Initialize our data for the Sierpinski Gasket
    //

    // First, initialize the corners of our gasket with three points.

    var vertices = [
        vec2(-1, -1),
        vec2(0, 1),
        vec2(1, -1)
    ];

    // Specify a starting point p for our iterations
    // p must lie inside any set of three vertices

    var u = add(vertices[0], vertices[1]);
    var v = add(vertices[0], vertices[2]);
    var p = scale(0.25, add(u, v));

    // And, add our initial point into our array of points

    points = [p];

    // Compute new points
    // Each new point is located midway between
    // last point and a randomly chosen vertex

    for (var i = 0; points.length < NumPoints; ++i) {
        var j = Math.floor(Math.random() * 3);
        p = add(points[i], vertices[j]);
        p = scale(0.5, p);
        points.push(p);
    }

    //
    //  Configure WebGL
    //
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    randomColor();

    //  Load shaders and initialize attribute buffers

    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Load the data into the GPU

    var bufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

    // Associate out shader variables with our data buffer

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    matrixLoc = gl.getUniformLocation(program, "transform");
    colorLoc = gl.getUniformLocation(program, "rColor");



    canvas.addEventListener("mousedown", function (e) {
        movement = true;
        origX = e.offsetX;
        origY = e.offsetY;
        e.preventDefault();
    })

    canvas.addEventListener("mouseup", function (e) {
        movement = false;
    })

    canvas.addEventListener("mousemove", function (e) {
        if (movement) {
            moveX = 2 * e.offsetX / canvas.width - 1;
            moveY = 2 * (canvas.height - e.offsetY) / canvas.height - 1;
            origX = e.offsetX;
            origY = e.offsetY;
            render();
        }
    })

    canvas.addEventListener("wheel", function (e) {
        if (e.deltaY > 0) zoom /= 2;
        else zoom *= 2;
        render();
    })

    window.addEventListener("keydown", function (e) {
        if (e.code === 'Space') {
            randomColor();
        }
        render();
    })


    render();
};

function randomColor() {
    color = vec4();
    for (let i = 0; i < 3; i++) {
        if (Math.random() > 0.5) color[i] = 1;
        else color[i] = 0;
    }
}


function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    s = scalem(zoom, zoom, 0.0);
    t = translate(moveX, moveY, 0.0);
    let mv = mat4();
    mv = add(mv, t);
    mv = mult(mv, s);

    gl.uniformMatrix4fv(matrixLoc, false, flatten(mv));
    gl.uniform4fv(colorLoc, flatten(color));

    gl.drawArrays(gl.POINTS, 0, points.length);
}