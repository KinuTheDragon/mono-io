const crypto = require("node:crypto");

function newPlayer() {
    return {
        x: 0, y: 0, text: "",
        color: "000000", shape: {type: "shape", value: "square"},
        username: "guest" + Math.random().toString().slice(2),
        size: 1, speed: 1,
    };
}

function setUpPlayers(players, ctc) {
    return {...players, 
        origin: {
            x: 0, y: 0, text: "",
            color: "000000", shape: {type: "shape", value: "cross"},
            username: "Origin",
            size: 0.5, speed: 0,
            bot: true
        },
        noice: {
            x: 69 * ctc.width / 2, y: -69 * ctc.height / 2, text: "",
            color: "00ffff", shape: {type: "shape", value: "circle"},
            username: "Noice land",
            size: 1, speed: 0,
            bot: true
        },
        bob: {
            x: 0, y: 0, text: "",
            color: "000000", shape: {type: "shape", value: "bob"},
            username: "Bob",
            size: 1, speed: 1,
            bot: true,
            timer: 0, direction: [0, 1]
        },
        farlands: {
            x: 67108864, y: 0, text: "Welcome to the Far Lands!",
            color: "888888", shape: {type: "shape", value: "star"},
            username: "Far Lands",
            size: 1, speed: 0,
            bot: true
        },
        copy: {
            x: ctc.width / 2, y: -ctc.height / 2, text: "",
            color: "0000ff", shape: {type: "shape", value: "gear"},
            username: "Copier",
            size: 1, speed: 0,
            bot: true,
            lastCopied: 0
        }
    }
}

function sha512(x) {
    return crypto.createHash("sha512").update(x).digest("hex");
}

const SHAPES = [
    "square", "circle", "triangle", "hexagon",
    "bowtie", "sus", "cross", "sine", "checker", "check",
    "plus", "mover", "generator", "push", "slide",
    "pentagon", "star", "heart", "diamond", "arrow", "crescent",
    "bolt", "shield", "gear", "octagon", "tree", "creeper", "bob"
];

const SPECIAL_COLORS = [
    "rainbow"
];

const BAD_WORDS = require("../bad_words.json");

const COMMANDS = {
    color: (player, players, sockets, args) => {
        if (/^[0-9A-Fa-f]{6}$/.test(args[0]) ||
            SPECIAL_COLORS.includes(args[0])) {
            player.color = args[0];
        }
    },
    shape: (player, players, sockets, args) => {
        if (SHAPES.includes(args.text)) {
            player.shape = {
                type: "shape",
                value: args.text.toLowerCase()
            };
        } else if (Object.values(players).some(p => p.username === args.text)) {
            player.shape = {
                type: "user",
                value: args.text
            };
        } else if (!isNaN(parseFloat(args[0])) && !isNaN(parseFloat(args[1]))) {
            player.shape = {
                type: "coords",
                value: [parseFloat(args[0]), parseFloat(args[1])]
            };
        }
    },
    admin: (player, players, sockets, args) => {
        if (player.admin) {
            player.admin = false;
            return;
        }
        sockets[player.socketId].emit("prompt", "Enter password:", value => {
            let enteredHash = sha512(value);
            if (enteredHash === "9494fbbd7830db55f44a4799b174d9b29655d7a5eb3f03db0e26626a14fd4bfcc67d66af82cdc138ba3870ed099bb48a4cd8d40d16329d17866b6e772ad7317c") {
                player.admin = true;
                sockets[player.socketId].emit("alert", "Admin mode enabled!");
            } else {
                sockets[player.socketId].emit("alert", "Nice try.");
            }
        });
    },
    bc: (player, players, sockets, args) => {
        if (!player.admin) return;
        let rgb = parseInt(player.color, 16);
        let r = rgb >> 16;
        let g = rgb >> 8 & 0xFF;
        let b = rgb & 0xFF;
        let newR = r / 2;
        let newG = g / 2;
        let newB = b / 2;
        let newRgb = newR << 16 | newG << 8 | newB;
        let endColor = newRgb.toString(16);
        let toast = {
            text: args.text,
            duration: 5000,
            style: {
                background:
                    `linear-gradient(to right, ` +
                    `#${player.color}, #${endColor}`
            },
            sound: "broadcast.wav"
        };
        for (let socket of Object.values(sockets)) {
            socket.emit("toast", toast);
        }
    },
    goto: (player, players, sockets, args) => {
        let x = parseFloat(args[0]);
        let y = parseFloat(args[1]);
        if (isNaN(x) || isNaN(y)) return;
        player.x = x * player.ctc.width / 2;
        player.y = -y * player.ctc.height / 2;
    },
    username: (player, players, sockets, args) => {
        player.username = args.text;
    },
    invis: (player, players, sockets, args) => {
        if (!player.admin) return;
        player.invis = !player.invis;
    },
    size: (player, players, sockets, args) => {
        let newSize = parseFloat(args[0]);
        if (isNaN(newSize) || newSize === 0) return;
        if (!player.admin)
            newSize = Math.min(Math.max(newSize, 0.5), 2);
        player.size = newSize;
    },
    tp: (player, players, sockets, args) => {
        for (let p of Object.values(players)) {
            if (p.username === args.text) {
                player.x = p.x;
                player.y = p.y;
                break;
            }
        }
    },
    speed: (player, players, sockets, args) => {
        let newSpeed = parseFloat(args[0]);
        if (isNaN(newSpeed)) return;
        if (!player.admin)
            newSpeed = Math.min(Math.max(newSpeed, -3), 3);
        player.speed = newSpeed;
    },
    players: (player, players, sockets, args) => {
        player.showPlayerList = !player.showPlayerList;
    },
    sudo: (player, players, sockets, args) => {
        if (!player.admin) return;
        for (let p of Object.values(players)) {
            if (args.text.startsWith(p.username + " ")) {
                runCommand(p, players, sockets,
                           args.text.slice(p.username.length + 1), true);
                break;
            }
        }
    },
};

function runCommand(player, players, sockets, commandText, allowAdmin) {
    let [command, ...args] = commandText.split(" ");
    args.text = commandText.slice(command.length + 1);
    if (allowAdmin) player.admin = true;
    (COMMANDS[command] ?? ((p,ps,s,a)=>0))(player, players, sockets, args);
    if (allowAdmin) player.admin = false;
}

function updatePlayer(player, players, sockets, keysDown, keysPressed) {
    if (keysDown.ArrowLeft) player.x -= player.speed;
    if (keysDown.ArrowRight) player.x += player.speed;
    if (keysDown.ArrowUp) player.y -= player.speed;
    if (keysDown.ArrowDown) player.y += player.speed;
    if (keysPressed.Backspace && player.text)
        player.text = player.text.slice(0, -1);
    if (keysPressed.Enter) {
        if (player.text.startsWith("/")) {
            runCommand(player, players, sockets, player.text.slice(1));
        }
        player.text = "";
    }
    if (keysPressed.Paste !== undefined) {
        player.text += keysPressed.Paste;
        player.text = player.text.slice(0, 100);
    }
    for (let [key, value] of Object.entries(keysPressed)) {
        if (!value) continue;
        if (key.length !== 1) continue;
        if (player.text.length < 100)
            player.text += key;
    }
    for (let badword of BAD_WORDS) {
        if (player.text.toLowerCase().endsWith(badword)) {
            player.text = "";
            break;
        }
    }
    if (player.click && player.admin) {
        let clickX = player.click.x + player.x;
        let clickY = -player.click.y + player.y;
        for (let clicked of Object.values(players)) {
            if (clicked.bot) continue;
            if (Math.abs(clickX - clicked.x) < (15 * clicked.size) &&
                Math.abs(clickY - clicked.y) < (15 * clicked.size)) {
                sockets[player.socketId].emit(
                    "confirm", `Kick player: ${clicked.username}?`, result => {
                        if (result) {
                            sockets[clicked.socketId].emit("kick");
                            sockets[clicked.socketId].disconnect();
                            let toast = {
                                text: `${clicked.username} has been kicked!`,
                                duration: 5000,
                                style: {
                                    background:
                                        `linear-gradient(to right, ` +
                                        `#ff0000, #ff8800`
                                },
                                sound: "kick.wav"
                            };
                            for (let socket of Object.values(sockets)) {
                                socket.emit("toast", toast);
                            }
                        }
                });
                break;
            }
        }
    }
}

module.exports = {
    newPlayer,
    updatePlayer,
    setUpPlayers
};