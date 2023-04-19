function rainbow() {
    let t = new Date().getTime() / 2000 % 1 * Math.PI * 2;
    let r = 255 * (Math.sin(-t) + 0.75);
    let g = 255 * (Math.sin(2 * Math.PI / 3 - t) + 0.75);
    let b = 255 * (Math.sin(4 * Math.PI / 3 - t) + 0.75);
    return `rgba(${r}, ${g}, ${b}, 1)`;
}

function determineTag(player) {
    if (player.bot) {
        return ["BOT", "#00ffff"];
    } else if (player.admin) {
        return ["ADMIN", rainbow()];
    } else {
        return null;
    }
}

function drawPlayer(ctx, me, player, players) {
    let isMe = me.socketId === player.socketId;
    let isVisible = isMe || !player.invis || me.admin;
    let size = 15 * player.size;
    ctx.setTransform(1, 0, 0, 1,
                     player.x - me.x + ctx.width / 2,
                     player.y - me.y + ctx.height / 2);
    if (/^[0-9A-Fa-f]{6}$/.test(player.color))
        ctx.fillStyle = "#" + player.color;
    else {
        switch (player.color) {
            case "rainbow":
                ctx.fillStyle = rainbow();
                break;
        }
    }
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    if (player.admin) {
        ctx.strokeStyle = rainbow().replace("1)", player.invis ? "0.5)" : "1)");
    }
    if (player.invis) {
        ctx.fillStyle += "88";
        if (ctx.strokeStyle.startsWith("#")) ctx.strokeStyle += "88";
    }
    if (isVisible) {
        switch (player.shape.type) {
            case "shape":
                drawShape(ctx, player.shape.value, size);
                break;
            case "user":
                let pointed = Object.values(players)
                    .find(p => p.username === player.shape.value);
                pointed = pointed ?? {x: player.x + 1, y: player.y};
                drawArrow(ctx,
                          [player.x, player.y],
                          [pointed.x, pointed.y],
                          size);
                break;
            case "coords":
                drawArrow(ctx, [player.x, player.y],
                          [player.shape.value[0] * ctx.width / 2,
                           -player.shape.value[1] * ctx.height / 2], size);
                break;
        }
    }
    ctx.fillStyle = "#ffffff";
    ctx.font = "12px Courier New";
    ctx.textAlign = "center";
    let ty = 15 * (Math.abs(player.size) + 1);
    ctx.fillText(player.text, 0, -ty);
    if (isVisible) {
        let tag = determineTag(player);
        if (tag) {
            let [tagText, tagFill] = tag;
            ctx.fillText(player.username + " ".repeat(tagText.length + 3), 0, ty);
            ctx.fillStyle = tagFill;
            ctx.fillText(" ".repeat(player.username.length) + ` [${tagText}]`,
                         0, ty);
        } else {
            ctx.fillText(player.username, 0, ty);
        }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function drawArrow(ctx, [px, py], [dx, dy], size) {
    let theta = Math.atan2(py - dy,
                           px - dx) + Math.PI;
    let phase = [0, 1/2, 1/2, 5/6, 7/6, 3/2, 3/2, 0].map(x => x * Math.PI);
    let amp = [1, 1, 1/2, 1, 1, 1/2, 1, 1];
    let xs = phase.map((x, i) => Math.cos(theta + x) * amp[i] * size);
    let ys = phase.map((x, i) => Math.sin(theta + x) * amp[i] * size);
    ctx.beginPath();
    ctx.moveTo(xs[0], ys[0]);
    for (let i = 1; i <= xs.length; i++) {
        ctx.lineTo(xs[i % xs.length], ys[i % ys.length]);
    }
    ctx.fill();
    ctx.stroke();
}

function drawGame(ctx, player, players) {
    ctx.setTransform(1, 0, 0, 1,
                     ctx.width / 2 - player.x,
                     ctx.height / 2 - player.y);
    ctx.strokeStyle = "#444444";
    ctx.lineWidth = 5;
    let gx = Math.round(player.x / ctx.width) * ctx.width;
    let gy = Math.round(player.y / ctx.height) * ctx.height;
    let gxl = gx - ctx.width / 2;
    let gxh = gx + ctx.width / 2;
    let gyl = gy - ctx.height / 2;
    let gyh = gy + ctx.height / 2;
    for (let y of [gyl, gy, gyh]) {
        ctx.beginPath();
        ctx.moveTo(gx - ctx.width, y);
        ctx.lineTo(gx + ctx.width, y);
        ctx.stroke();
    }
    for (let x of [gxl, gx, gxh]) {
        ctx.beginPath();
        ctx.moveTo(x, gy - ctx.height);
        ctx.lineTo(x, gy + ctx.height);
        ctx.stroke();
    }
    ctx.fillStyle = "#ffffff";
    ctx.font = "12px Courier New";
    ctx.textAlign = "center";
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.textAlign = "left";
    let dx = Math.round(player.x / (ctx.width / 2) * 1000) / 1000;
    dx = dx.toString();
    if (!dx.includes(".")) dx += ".";
    while (dx.indexOf(".") + 4 > dx.length) dx += "0";
    let dy = -Math.round(player.y / (ctx.height / 2) * 1000) / 1000;
    dy = dy.toString();
    if (!dy.includes(".")) dy += ".";
    while (dy.indexOf(".") + 4 > dy.length) dy += "0";
    ctx.fillText(`X: ${dx}, Y: ${dy}`, 10, 10);
    let numPlayers = Object.values(players).filter(p => !p.bot).length;
    ctx.fillText(`Ping: ${player.ping}`, 10, 30);
    ctx.fillText(`Players: ${numPlayers}`, 10, 50);
    if (player.showPlayerList) {
        for (let [p, i] of Object.values(players).map((p,i)=>[p,i])) {
            ctx.fillText(p.username, 30, i * 20 + 70);
            let tag = determineTag(p);
            if (tag) {
                ctx.fillStyle = tag[1];
                ctx.fillText(" ".repeat(p.username.length) + ` [${tag[0]}]`,
                             30, i * 20 + 70);
                ctx.fillStyle = "#ffffff";
            }
        }
    }
}

function drawShape(ctx, shape, size) {
    switch (shape) {
        case "square":
            ctx.fillRect(-size, -size, size * 2, size * 2);
            ctx.strokeRect(-size, -size, size * 2, size * 2);
            break;
        case "circle":
            ctx.beginPath();
            ctx.arc(0, 0, Math.abs(size), 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.stroke();
            break;
        case "triangle":
            ctx.beginPath();
            ctx.moveTo(0, -size);
            ctx.lineTo(-size, size);
            ctx.lineTo(size, size);
            ctx.lineTo(0, -size);
            ctx.fill();
            ctx.stroke();
            break;
        case "hexagon":
            let w = size * Math.sqrt(3) / 2;
            ctx.beginPath();
            ctx.moveTo(size, 0);
            ctx.lineTo(size / 2, w);
            ctx.lineTo(-size / 2, w);
            ctx.lineTo(-size, 0);
            ctx.lineTo(-size / 2, -w);
            ctx.lineTo(size / 2, -w);
            ctx.lineTo(size, 0);
            ctx.fill();
            ctx.stroke();
            break;
        case "bowtie":
            ctx.beginPath();
            ctx.moveTo(-size, -size);
            ctx.lineTo(size, size);
            ctx.lineTo(size, -size);
            ctx.lineTo(-size, size);
            ctx.lineTo(-size, -size);
            ctx.fill();
            ctx.stroke();
            break;
        case "sus":
            var [s1, s2, s3, s4, s5] = [-size, -size / 2, 0, size / 2, size];
            ctx.beginPath();
            ctx.moveTo(s2, s1);
            ctx.lineTo(s5, s1);
            ctx.lineTo(s5, s2);
            ctx.lineTo(s3, s2);
            ctx.lineTo(s3, s3);
            ctx.lineTo(s5, s3);
            ctx.lineTo(s5, s5);
            ctx.lineTo(s4, s5);
            ctx.lineTo(s4, s4);
            ctx.lineTo(s3, s4);
            ctx.lineTo(s3, s5);
            ctx.lineTo(s2, s5);
            ctx.lineTo(s2, s4);
            ctx.lineTo(s1, s4);
            ctx.lineTo(s1, s2);
            ctx.lineTo(s2, s2);
            ctx.lineTo(s2, s1);
            ctx.fill();
            ctx.stroke();
            break;
        case "cross":
            var [s1, s2, s3, s4, s5] = [-size, -size / 2, 0, size / 2, size];
            ctx.beginPath();
            ctx.moveTo(s2, s1);
            ctx.lineTo(s3, s2);
            ctx.lineTo(s4, s1);
            ctx.lineTo(s5, s2);
            ctx.lineTo(s4, s3);
            ctx.lineTo(s5, s4);
            ctx.lineTo(s4, s5);
            ctx.lineTo(s3, s4);
            ctx.lineTo(s2, s5);
            ctx.lineTo(s1, s4);
            ctx.lineTo(s2, s3);
            ctx.lineTo(s1, s2);
            ctx.lineTo(s2, s1);
            ctx.fill();
            ctx.stroke();
            break;
        case "sine":
            var cp1y = 2 * Math.sqrt(3) * size;
            var cp2y = -cp1y;
            ctx.beginPath();
            ctx.moveTo(-size, 0);
            ctx.bezierCurveTo(0, cp1y, 0, cp2y, size, 0);
            ctx.lineTo(-size, 0);
            ctx.fill();
            ctx.stroke();
            break;
        case "checker":
            var [s1, s2, s3, s4, s5] = [-size, -size / 2, 0, size / 2, size];
            ctx.beginPath();
            ctx.moveTo(s1, s1);
            ctx.lineTo(s2, s1);
            ctx.lineTo(s2, s5);
            ctx.lineTo(s3, s5);
            ctx.lineTo(s3, s1);
            ctx.lineTo(s4, s1);
            ctx.lineTo(s4, s5);
            ctx.lineTo(s5, s5);
            ctx.lineTo(s5, s4);
            ctx.lineTo(s1, s4);
            ctx.lineTo(s1, s3);
            ctx.lineTo(s5, s3);
            ctx.lineTo(s5, s2);
            ctx.lineTo(s1, s2);
            ctx.lineTo(s1, s1);
            ctx.fill();
            ctx.stroke();
            break;
        case "check":
            var [x1, x2, x3, x4, x5, y1, y2, y3, y4, y5] =
                [-size, -0.6 * size, -0.4 * size, 0.6 * size, size,
                 -size, -0.6 * size, -0.2 * size, 0.2 * size, size];
            ctx.beginPath();
            ctx.moveTo(x4, y1);
            ctx.lineTo(x5, y2);
            ctx.lineTo(x3, y5);
            ctx.lineTo(x1, y4);
            ctx.lineTo(x2, y3);
            ctx.lineTo(x3, y4);
            ctx.lineTo(x4, y1);
            ctx.fill();
            ctx.stroke();
            break;
        case "plus":
            var [s1, s2, s3, s4] = [-size, -size / 3, size / 3, size];
            ctx.beginPath();
            ctx.moveTo(s1, s2);
            ctx.lineTo(s1, s3);
            ctx.lineTo(s2, s3);
            ctx.lineTo(s2, s4);
            ctx.lineTo(s3, s4);
            ctx.lineTo(s3, s3);
            ctx.lineTo(s4, s3);
            ctx.lineTo(s4, s2);
            ctx.lineTo(s3, s2);
            ctx.lineTo(s3, s1);
            ctx.lineTo(s2, s1);
            ctx.lineTo(s2, s2);
            ctx.lineTo(s1, s2);
            ctx.fill();
            ctx.stroke();
            break;
        case "mover":
            var [x1, x2, x3, x4] = [-size, -size / 3, size / 3, size];
            var [y1, y2, y3, y4, y5] = [-size, -size / 2, 0, size / 2, size];
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x1, y5);
            ctx.lineTo(x4, y5);
            ctx.lineTo(x4, y1);
            ctx.closePath();
            ctx.moveTo(x2, y2);
            ctx.lineTo(x3, y3);
            ctx.lineTo(x2, y4);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
        case "generator":
            var [x1, x2, x3, x4, x5, x6, x7, x8] =
                [-1, -0.9, -0.7, -0.3, -0.1, 0.5, 0.9, 1].map(x => x * size);
            var [y1, y2, y3, y4, y5, y6, y7] =
                [-1, -0.4, -0.2, 0, 0.2, 0.4, 1].map(x => x * size);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x1, y7);
            ctx.lineTo(x8, y7);
            ctx.lineTo(x8, y1);
            ctx.closePath();
            ctx.moveTo(x2, y2);
            ctx.lineTo(x5, y2);
            ctx.lineTo(x5, y3);
            ctx.lineTo(x6, y3);
            ctx.lineTo(x6, y2);
            ctx.lineTo(x7, y4);
            ctx.lineTo(x6, y6);
            ctx.lineTo(x6, y5);
            ctx.lineTo(x5, y5);
            ctx.lineTo(x5, y6);
            ctx.lineTo(x2, y6);
            ctx.closePath();
            ctx.moveTo(x3, y3);
            ctx.lineTo(x3, y5);
            ctx.lineTo(x4, y5);
            ctx.lineTo(x4, y3);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
        case "push":
            var [s1, s2, s3, s4, s5, s6, s7, s8] =
                [-1, -5/7, -3/7, -1/7, 1/7, 3/7, 5/7, 1].map(x => x * size);
            ctx.beginPath();
            ctx.moveTo(s1, s1);
            ctx.lineTo(s1, s8);
            ctx.lineTo(s8, s8);
            ctx.lineTo(s8, s1);
            ctx.closePath();
            ctx.moveTo(s3, s2);
            ctx.lineTo(s4, s2);
            ctx.lineTo(s4, s3);
            ctx.lineTo(s5, s3);
            ctx.lineTo(s5, s2);
            ctx.lineTo(s6, s2);
            ctx.lineTo(s6, s3);
            ctx.lineTo(s7, s3);
            ctx.lineTo(s7, s4);
            ctx.lineTo(s6, s4);
            ctx.lineTo(s6, s5);
            ctx.lineTo(s7, s5);
            ctx.lineTo(s7, s6);
            ctx.lineTo(s6, s6);
            ctx.lineTo(s6, s7);
            ctx.lineTo(s5, s7);
            ctx.lineTo(s5, s6);
            ctx.lineTo(s4, s6);
            ctx.lineTo(s4, s7);
            ctx.lineTo(s3, s7);
            ctx.lineTo(s3, s6);
            ctx.lineTo(s2, s6);
            ctx.lineTo(s2, s5);
            ctx.lineTo(s3, s5);
            ctx.lineTo(s3, s4);
            ctx.lineTo(s2, s4);
            ctx.lineTo(s2, s3);
            ctx.lineTo(s3, s3);
            ctx.closePath();
            ctx.moveTo(s4, s4);
            ctx.lineTo(s4, s5);
            ctx.lineTo(s5, s5);
            ctx.lineTo(s5, s4);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
        case "slide":
            var [s1, s2, s3, s4, s5, s6, s7, s8] =
                [-1, -5/7, -3/7, -1/7, 1/7, 3/7, 5/7, 1].map(x => x * size);
            ctx.beginPath();
            ctx.moveTo(s1, s1);
            ctx.lineTo(s1, s8);
            ctx.lineTo(s8, s8);
            ctx.lineTo(s8, s1);
            ctx.closePath();
            ctx.moveTo(s2, s3);
            ctx.lineTo(s7, s3);
            ctx.lineTo(s7, s4);
            ctx.lineTo(s2, s4);
            ctx.closePath();
            ctx.moveTo(s2, s5);
            ctx.lineTo(s7, s5);
            ctx.lineTo(s7, s6);
            ctx.lineTo(s2, s6);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
        case "pentagon":
            var n = [-0.5, -0.1, 0.3, 0.7, 1.1];
            var x = n.map(i => Math.cos(i * Math.PI) / Math.cos(0.1 * Math.PI));
            var y = n.map(i => (2 * Math.sin(i * Math.PI) + Math.cos(0.2 * Math.PI) - 1) / (Math.cos(0.2 * Math.PI) + 1));
            ctx.beginPath();
            ctx.moveTo(x[0] * size, y[0] * size);
            for (let i = 1; i < 6; i++) {
                ctx.lineTo(x[i % 5] * size, y[i % 5] * size);
            }
            ctx.fill();
            ctx.stroke();
            break;
        case "star":
            var n = [-0.5, -0.1, 0.3, 0.7, 1.1];
            var px = n.map(i => Math.cos(i * Math.PI) / Math.cos(0.1 * Math.PI));
            var py = n.map(i => (2 * Math.sin(i * Math.PI) + Math.cos(0.2 * Math.PI) - 1) / (Math.cos(0.2 * Math.PI) + 1));
            var x = [];
            var y = [];
            for (let i = 0; i < 5; i++) {
                x.push(px[i]);
                y.push(py[i]);
                let a = px[i]; let u = py[i];
                let b = px[(i + 2) % 5]; let v = py[(i + 2) % 5];
                let c = px[(i + 1) % 5]; let w = py[(i + 1) % 5];
                let d = px[(i + 4) % 5]; let k = py[(i + 4) % 5];
                let m1 = (v-u) / (b-a);
                let m2 = (k-w) / (d-c);
                let tx = (m1 * a - u - m2 * c + w) / (m1 - m2);
                let ty = m1 * (tx - a) + u;
                x.push(tx);
                y.push(ty);
            }
            ctx.beginPath();
            ctx.moveTo(x[0] * size, y[0] * size);
            for (let i = 0; i < 11; i++) {
                ctx.lineTo(x[i % 10] * size, y[i % 10] * size);
            }
            ctx.fill();
            ctx.stroke();
            break;
        case "heart":
            ctx.beginPath();
            var arcDir = Math.sign(size) === -1;
            var t1 = arcDir ? 0 : Math.PI;
            var t2 = arcDir ? Math.PI : 0;
            ctx.arc(-size / 2, -size / 2, Math.abs(size) / 2, t1, t2);
            ctx.arc(size / 2, -size / 2, Math.abs(size) / 2, t1, t2);
            ctx.bezierCurveTo(size, size / 2, 0, 0, 0, size);
            ctx.bezierCurveTo(0, 0, -size, size / 2, -size, -size / 2);
            ctx.fill();
            ctx.stroke();
            break;
        case "diamond":
            ctx.beginPath();
            ctx.moveTo(0, size);
            ctx.lineTo(size, 0);
            ctx.lineTo(0, -size);
            ctx.lineTo(-size, 0);
            ctx.lineTo(0, size);
            ctx.fill();
            ctx.stroke();
            break;
        case "arrow":
            ctx.beginPath();
            ctx.moveTo(size, 0);
            ctx.lineTo(0, -size);
            ctx.lineTo(0, -size / 2);
            ctx.lineTo(-size, -size / 2);
            ctx.lineTo(-size, size / 2);
            ctx.lineTo(0, size / 2);
            ctx.lineTo(0, size);
            ctx.lineTo(size, 0);
            ctx.fill();
            ctx.stroke();
            break;
        case "crescent":
            var arcDir = Math.sign(size) === -1;
            var t1 = Math.tan(Math.sqrt(7) / 3);
            var t2 = Math.tan(Math.sqrt(7));
            if (arcDir) {
                t1 = Math.PI - t1;
                t2 = Math.PI - t2;
            }
            ctx.beginPath();
            ctx.arc(0, 0, Math.abs(size), t2, -t2, !arcDir);
            ctx.arc(size / 2, 0,
                    1 / Math.sqrt(2) * Math.abs(size), t1, -t1, arcDir);
            ctx.fill();
            ctx.stroke();
            break;
        case "bolt":
            ctx.beginPath();
            ctx.moveTo(0, -size);
            ctx.lineTo(-0.2 * size, -0.2 * size);
            ctx.lineTo(size, 0);
            ctx.lineTo(0, size);
            ctx.lineTo(0.2 * size, 0.2 * size);
            ctx.lineTo(-size, 0);
            ctx.lineTo(0, -size);
            ctx.fill();
            ctx.stroke();
            break;
        case "shield":
            ctx.beginPath();
            ctx.moveTo(-size, -0.7 * size);
            ctx.bezierCurveTo(-0.5 * size, -0.7 * size,
                              -0.1 * size, -0.9 * size,
                              0, -size);
            ctx.bezierCurveTo(0.1 * size, -0.9 * size,
                              0.5 * size, -0.7 * size,
                              size, -0.7 * size);
            ctx.bezierCurveTo(size, 0,
                              0.8 * size, 0.6 * size,
                              0, size);
            ctx.bezierCurveTo(-0.8 * size, 0.6 * size,
                              -size, 0,
                              -size, -0.7 * size);
            ctx.fill();
            ctx.stroke();
            break;
        case "gear":
            var p16 = Math.PI / 16;
            var r1 = Math.abs(size);
            var r2 = 0.75 * r1;
            ctx.beginPath();
            for (let tm = -1; tm < 31; tm += 4) {
                ctx.arc(0, 0, r1, tm * p16, (tm + 2) * p16);
                ctx.arc(0, 0, r2, (tm + 2) * p16, (tm + 4) * p16);
            }
            ctx.closePath();
            ctx.moveTo(Math.abs(size) / 4, 0);
            ctx.arc(0, 0, 0.25 * r1, 0, 2 * Math.PI, true);
            ctx.fill();
            ctx.stroke();
            break;
        case "octagon":
            var n = 1 / (1 + Math.sqrt(2));
            var xs = [1, 1, n, -n, -1, -1, -n, n].map(x => x * size);
            var ys = [-n, n, 1, 1, n, -n, -1, -1].map(x => x * size);
            ctx.beginPath();
            ctx.moveTo(xs[0], ys[0]);
            for (let i = 1; i <= 8; i++) {
                ctx.lineTo(xs[i % 8], ys[i % 8]);
            }
            ctx.fill();
            ctx.stroke();
            break;
        case "tree":
            var [s1, s2, s3, s4, s5, s6, s7] =
                [-1, -1/2, -1/3, 0, 1/3, 1/2, 1].map(x => x * size);
            ctx.beginPath();
            ctx.moveTo(s4, s1);
            ctx.lineTo(s7, s3);
            ctx.lineTo(s6, s3);
            ctx.lineTo(s7, s4);
            ctx.lineTo(s6, s4);
            ctx.lineTo(s7, s5);
            ctx.lineTo(s5, s5);
            ctx.lineTo(s5, s7);
            ctx.lineTo(s3, s7);
            ctx.lineTo(s3, s5);
            ctx.lineTo(s1, s5);
            ctx.lineTo(s2, s4);
            ctx.lineTo(s1, s4);
            ctx.lineTo(s2, s3);
            ctx.lineTo(s1, s3);
            ctx.lineTo(s4, s1);
            ctx.fill();
            ctx.stroke();
            break;
        case "creeper":
            var [s1, s2, s3, s4, s5, s6, s7] =
                [-1, -2/3, -1/3, 0, 1/3, 2/3, 1].map(x => x * size);
            ctx.beginPath();
            ctx.moveTo(s1, s1);
            ctx.lineTo(s3, s1);
            ctx.lineTo(s3, s4);
            ctx.lineTo(s2, s4);
            ctx.lineTo(s2, s7);
            ctx.lineTo(s3, s7);
            ctx.lineTo(s3, s6);
            ctx.lineTo(s5, s6);
            ctx.lineTo(s5, s7);
            ctx.lineTo(s6, s7);
            ctx.lineTo(s6, s4);
            ctx.lineTo(s5, s4);
            ctx.lineTo(s5, s1);
            ctx.lineTo(s7, s1);
            ctx.lineTo(s7, s3);
            ctx.lineTo(s1, s3);
            ctx.lineTo(s1, s1);
            ctx.fill();
            ctx.stroke();
            break;
        case "bob":
            var [x1, x2, x3, x4, x5, x6, x7, x8] =
                [-1, -2/3, -5/8, -3/8, 3/8, 5/8, 2/3, 1].map(x => x * size);
            var [y1, y2, y3, y4, y5, y6] =
                [-1, -7/12, -1/12, 0.4, 0.6, 1].map(x => x * size);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x1, y6);
            ctx.lineTo(x8, y6);
            ctx.lineTo(x8, y1);
            ctx.closePath();
            ctx.moveTo(x2, y4);
            ctx.lineTo(x7, y4);
            ctx.lineTo(x7, y5);
            ctx.lineTo(x2, y5);
            ctx.closePath();
            ctx.moveTo(x3, y2);
            ctx.lineTo(x4, y2);
            ctx.lineTo(x4, y3);
            ctx.lineTo(x3, y3);
            ctx.closePath();
            ctx.moveTo(x5, y2);
            ctx.lineTo(x6, y2);
            ctx.lineTo(x6, y3);
            ctx.lineTo(x5, y3);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
    }
}

module.exports = {
    drawPlayer,
    drawGame
};