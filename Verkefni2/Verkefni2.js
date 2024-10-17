/////////////////////////////////////////////////////////////////
//    Verkefni 2
//     Game of Life
//
//    Abel Haukur Guðmundsson, Október 2024
/////////////////////////////////////////////////////////////////
let canvas;
let gl;

let numVertices = 36;

let points = [];
let colors = [];
let nodes = [], updatedNodes = [], switchNodes = false;

let movement = false;
let spinX = 0, spinY = 0;
let origX, origY;
let zDist = -25.0;
let projectionMatrix, modelViewMatrix, dyingNodeMatrix, resurrectionMatrix;
let modelViewMatrixLoc;
let deadScale = 0.99, resScale = 0.01;


//
//  Cube creation and coloring
//
function colorCube() {
    quad(1, 0, 3, 2);
    quad(2, 3, 7, 6);
    quad(3, 0, 4, 7);
    quad(6, 5, 1, 2);
    quad(4, 5, 6, 7);
    quad(5, 4, 0, 1);
}

function quad(a, b, c, d) {
    var vertices = [
        vec3(-0.5, -0.5, 0.5),
        vec3(-0.5, 0.5, 0.5),
        vec3(0.5, 0.5, 0.5),
        vec3(0.5, -0.5, 0.5),
        vec3(-0.5, -0.5, -0.5),
        vec3(-0.5, 0.5, -0.5),
        vec3(0.5, 0.5, -0.5),
        vec3(0.5, -0.5, -0.5)
    ];

    var vertexColors = [
        [0.0, 0.0, 0.0, 1.0],  // black
        [1.0, 0.0, 0.0, 1.0],  // red
        [1.0, 1.0, 0.0, 1.0],  // yellow
        [0.0, 1.0, 0.0, 1.0],  // green
        [0.0, 0.0, 1.0, 1.0],  // blue
        [1.0, 0.0, 1.0, 1.0],  // magenta
        [0.0, 1.0, 1.0, 1.0],  // cyan
        [1.0, 1.0, 1.0, 1.0]   // white
    ];

    //vertex color assigned by the index of the vertex
    var indices = [a, b, c, a, c, d];

    for (var i = 0; i < indices.length; ++i) {
        points.push(vertices[indices[i]]);
        colors.push(vertexColors[a]);
    }
}

//
//  Initialization
//
window.onload = function init() {
    canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }

    colorCube();
    initNodes();
    updatedNodes = updateLife(nodes);

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.9, 1.0, 1.0, 1.0);

    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    projectionMatrix = perspective(50.0, 1.0, 0.01, 100.0);
    modelViewMatrix = mat4();
    dyingNodeMatrix = mat4();
    resurecctionMatrix = mat4();

    gl.uniformMatrix4fv(gl.getUniformLocation(program, "modelViewMatrix"), false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "projectionMatrix"), false, flatten(projectionMatrix));
    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");

    var cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

    var vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // Scroll function
    window.addEventListener("mousewheel", (e) => {
        if (e.wheelDelta > 0.0) zDist += 1.5;
        else zDist -= 1.5;
    });

    //event listeners for mouse
    canvas.addEventListener("mouseup", () => movement = false);
    canvas.addEventListener("mousedown", (e) => {
        movement = true;
        origX = e.offsetX, origY = e.offsetY;
        e.preventDefault(); // Disable drag and drop
    });

    canvas.addEventListener("mousemove", (e) => {
        if (movement) {
            spinY = (spinY + (e.clientX - origX)) % 360;
            spinX = (spinX + (origY - e.clientY)) % 360;
            origX = e.clientX, origY = e.clientY;
        }
    });

    // Switching rendering nodes
    setInterval(() => {
        nodes = updatedNodes;
        updatedNodes = updateLife(nodes);
        deadScale = 0.99, resScale = 0.01;
    }, 5000);
    render();
}

//
//  Nodes
//
function createNode(position, isAlive, render, neighbours) {
    return { position, isAlive, render, neighbours };
}

function initNodes(N = 10) {
    let start = N / 2, idx = 0;
    for (let i = 0; i < N; i++) {
        let y = -start + i * 1.01;
        for (let j = 0; j < N; j++) {
            let x = -start + j * 1.01;
            for (let k = 0; k < N; k++) {
                let z = -start + k * 1.01;

                // 3x3x3 grid of possible neighbours
                let neighbours = [];
                for (let offsetY = -1; offsetY <= 1; offsetY++) {
                    for (let offsetX = -1; offsetX <= 1; offsetX++) {
                        for (let offsetZ = -1; offsetZ <= 1; offsetZ++) {
                            // Current node = 0.0.0
                            if (offsetY == 0 && offsetX == 0 && offsetZ == 0) continue;

                            // Neighbouring node idx
                            let idxY = i + offsetY;
                            let idxX = j + offsetX;
                            let idxZ = k + offsetZ;

                            // Check if neighbour
                            if (idxY >= 0 && idxY < N && idxX >= 0 && idxX < N && idxZ >= 0 && idxZ < N) {
                                let neighbour = (idxY * N * N) + (idxX * N) + idxZ;
                                neighbours.push(neighbour);
                            }
                        }
                    }
                }

                let isAlive = Math.random() < 0.2;
                nodes[idx++] = createNode(
                    { x, y, z },
                    isAlive,
                    isAlive ? renderNode : null,
                    neighbours
                );
            }
        }
    }
}

function updateLife(nodes) {
    let updatedNodes = [];

    nodes.forEach(node => {
        let neighboursAlive = 0;
        node.neighbours.forEach(neighbour => {
            if (nodes[neighbour].isAlive) neighboursAlive++;
        });

        let newNode = {
            position: node.position,
            isAlive: node.isAlive,
            render: node.render,
            neighbours: node.neighbours
        };

        if (!node.isAlive && node.render != null) newNode.render = null;
        if (node.isAlive && node.render == renderResurrectedNode) newNode.render = renderNode;

        if (node.isAlive && (neighboursAlive < 5 || neighboursAlive > 7)) {
            newNode.isAlive = false;
            newNode.render = renderDeadNode;
        }

        if (!node.isAlive && neighboursAlive == 6) {
            newNode.isAlive = true;
            newNode.render = renderResurrectedNode;
        }

        updatedNodes.push(newNode);
    })
    return updatedNodes;
}

//
//  Rendering
//
function renderNode({ x, y, z }) {
    let translateMatrix = mult(modelViewMatrix, translate(x, y, z));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(translateMatrix));
    gl.drawArrays(gl.TRIANGLES, 0, numVertices);
}

function renderDeadNode({ x, y, z }) {
    dyingNodeMatrix = mult(modelViewMatrix, translate(x, y, z));
    dyingNodeMatrix = mult(dyingNodeMatrix, scalem(deadScale, deadScale, deadScale));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(dyingNodeMatrix));
    gl.drawArrays(gl.TRIANGLES, 0, numVertices);
}

function renderResurrectedNode({ x, y, z }) {
    resurrectionMatrix = mult(modelViewMatrix, translate(x, y, z));
    resurrectionMatrix = mult(resurrectionMatrix, scalem(resScale, resScale, resScale));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(resurrectionMatrix));
    gl.drawArrays(gl.TRIANGLES, 0, numVertices);
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // Global transformations
    let mv = lookAt(vec3(0.0, 0.0, zDist), vec3(0.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0));
    mv = mult(mv, rotateX(spinX));
    mv = mult(mv, rotateY(spinY));
    modelViewMatrix = mv;

    nodes.forEach(node => {
        if (node.render != null) {
            node.render(node.position);
        }
    })

    if (deadScale > 0) deadScale -= 0.005;
    else if (resScale < 1) resScale += 0.005;

    requestAnimFrame(render);
}
