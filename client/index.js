const {drawPlayer, drawGame} = require("../config/draw.js");

import io from "socket.io-client";

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
ctx.width = canvas.width;
ctx.height = canvas.height;

const keysDown = {};
let keysPressed = {};

let showRestartMessage = true;

const SOUNDS = {};

const renderer = {
    gameUpdate: null,
    currentInterval: null,
    ping: null,

    start() {
        this.currentInterval = setInterval(this.render.bind(this), 1000/60);
    },

    render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const update = this.gameUpdate;
        if (!update) return;
        const player = update.players[sockets.socket.id];
        if (!player) {
            if (!document.getElementById("restart-note") && showRestartMessage) {
                let p = document.createElement("p");
                p.appendChild(document.createTextNode(
                    "Seems like you've been disconnected. Please reload the page."
                ));
                p.id = "restart-note";
                document.body.appendChild(p);
                alert(
                    "Seems like you've been disconnected. Please reload the page."
                );
            }
            return;
        }
        player.ping = this.ping;
        drawGame(ctx, player, update.players);
        Object.values(update.players).forEach(p => {
            drawPlayer(ctx, player, p, update.players);
        });
    },
};

const sockets = {
    sockets: null,

    init() {
        const socketProtocol = (window.location.protocol.includes("https")) ? "wss" : "ws";
        this.socket = io(`${socketProtocol}://${window.location.host}`, { reconnection: false });
        this.registerConnection();
    },

    registerConnection() {
        const connectedPromise = new Promise(resolve => {
            this.socket.on("connect", () => {
                console.log("client connected to server");
                resolve();
            });
        });

        connectedPromise.then(() => {
            const syncUpdate = (update) => renderer.gameUpdate = update;
            this.socket.on("gameUpdate", syncUpdate);
            this.socket.on("prompt", (text, callback) => {
                callback(prompt(text) ?? "");
            });
            this.socket.on("confirm", (text, callback) => {
                callback(confirm(text))
            });
            this.socket.on("alert", text => alert(text));
            this.socket.on("kick", () => {
                showRestartMessage = false;
                alert("You have been kicked!");
            });
            this.socket.on("toast", toast => {
                Toastify(toast).showToast();
                if (toast.sound) {
                    let toastSound = SOUNDS[toast.sound];
                    if (!toastSound) {
                        toastSound = SOUNDS[toast.sound] =
                            new Audio("sounds/" + toast.sound);
                    }
                    toastSound.load();
                    toastSound.play();                    
                }
            });
        });
    },
};

sockets.init();
document.addEventListener("keydown", e => {
    if (e.ctrlKey && e.key.toLowerCase() === "v") {
        navigator.clipboard.readText().then(x => {keysPressed.Paste = x;});
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^F\d+$/.test(e.key)) return;
    keysDown[e.key] = true;
    keysPressed[e.key] = true;
    e.preventDefault();
}, false);
document.addEventListener("keyup", e => {
    keysDown[e.key] = undefined;
    if (e.key.toUpperCase() != e.key.toLowerCase()) {
        keysDown[e.key.toUpperCase()] = undefined;
        keysDown[e.key.toLowerCase()] = undefined;
    }
}, false);
setInterval(() => {
    sockets.socket.emit("keys", keysDown, keysPressed);
    keysPressed = {};
}, 1);
setInterval(() => {
    let start = Date.now();
    sockets.socket.emit("ping", () => {
        renderer.ping = Date.now() - start;
    });
}, 1000);

canvas.addEventListener("click", event => {
    const rect = canvas.getBoundingClientRect();
    sockets.socket.emit("click", {
        button: event.button,
        x: event.clientX - rect.left - canvas.width / 2,
        y: canvas.height / 2 - (event.clientY - rect.top)
    });
});

sockets.socket.emit("init", {
    width: canvas.width, height: canvas.height
});

renderer.start();