function gameUpdate(sockets, players) {
    if (players.bob)
        doBob(players.bob);
    if (players.copy)
        doCopier(players.copy, players);
}

function doBob(bob) {
    let [dx, dy] = bob.direction;
    if (bob.timer <= 0) {
        [dx, dy] = bob.direction = [0, 0].map(()=>Math.random() * 2 - 1);
        bob.timer = Math.random() * 10 + 10;
    }
    bob.x += dx * bob.speed;
    bob.y += dy * bob.speed;
    if (Math.random() <= 0.05) {
        let randType = Math.random();
        if (randType <= 0.1) {
            bob.text = "";
        } else if (randType <= 0.2 && bob.text) {
            bob.text = bob.text.slice(0, -1);
        } else if (bob.text.length < 100) {
            let cc = Math.floor(95 * Math.random() + 32);
            bob.text += String.fromCharCode(cc);
        }
    }
    bob.timer--;
}

function doCopier(copier, players) {
    if (Date.now() - copier.lastCopied < 2000)
        return;
    copier.lastCopied = Date.now();
    let textList = Object.values(players).map(x => x.text).filter(x => x);
    if (!textList.length)
        return;
    let chosenIndex = Math.floor(Math.random() * textList.length);
    copier.text = textList[chosenIndex];
}

module.exports = {
    gameUpdate
};