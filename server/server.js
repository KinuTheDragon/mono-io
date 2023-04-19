const {newPlayer, updatePlayer, setUpPlayers} = require("../config/player.js");
const {gameUpdate} = require("../config/game.js");

const express = require("express");
const socketio = require("socket.io");
const fs = require("fs");

const app = express();
app.use(express.static("dist"));

const port = process.env.PORT || 3000;
const server = app.listen(port);
console.log(`server listening on port ${port}`);

const gameLogic = {
    sockets: {},
    players: {},

    start () {
        setInterval(this.update.bind(this), 1000 / 60);
    },

    joinGame(socket) {
        this.sockets[socket.id] = socket;
        this.players[socket.id] = newPlayer();
        this.players[socket.id].socketId = socket.id;
        this.players[socket.id].click = null;
    },

    updatePlayer(keysDown, keysPressed, socketId) {
        const player = this.players[socketId];
        updatePlayer(player, this.players, this.sockets, keysDown, keysPressed);
        player.click = null;
    },

    removePlayer(socketId) {
        delete this.sockets[socketId];
        delete this.players[socketId];
    },

    update() {
        Object.values(this.sockets).forEach(socket => {
            socket.emit("gameUpdate", this.currentState());
        });
        gameUpdate(this.sockets, this.players);
    },

    currentState() {
        return {
            players: this.players,
        };
    },

    click(data, socketId) {
        const player = this.players[socketId];
        player.click = data;
    },

    init(socketId, data) {
        this.players[socketId].ctc = data;
        if (!this.ctc) {
            this.ctc = data;
            this.players = setUpPlayers(this.players, data);
        }
    },
};

const io = socketio(server);
io.on("connection", socket => {
    console.log("player connected", socket.id);
    socket.on("disconnect", reason => {
        console.log("player disconnected", socket.id);
        gameLogic.removePlayer(socket.id);
    });
    gameLogic.joinGame(socket);
    socket.on("keys", (keysDown, keysPressed) => {
        gameLogic.updatePlayer(keysDown, keysPressed, socket.id);
    });
    socket.on("click", data => {
        gameLogic.click(data, socket.id);
    });
    socket.on("init", data => {
        gameLogic.init(socket.id, data);
    });
    socket.on("ping", callback => callback());
});

gameLogic.start();