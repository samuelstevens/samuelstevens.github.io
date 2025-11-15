'use strict';

window.addEventListener("load", function() {
  // Initialize a canvas
  const height = 280;

  const ui = new RoughCanvas("indcpa-canvas-1-ui", height);
  const anim = new RoughCanvas("indcpa-canvas-1-anim", height);
  const world = {}

  // if canvas.width < 600 then this animation doesn't work.
  if (ui.width < 600) {
    ui.centeredText("This demo requires a", ui.center.x, 10);
    ui.centeredText("wider view. Try on a", ui.center.x, 40);
    ui.centeredText("larger device, or rotate", ui.center.x, 70);
    ui.centeredText("your phone, then refresh", ui.center.x, 100);
    ui.centeredText("the page.", ui.center.x, 130);
    return
  }
   
  ui.ctx.fillText("Alice", ui.center.x - 95, 35);
  ui.centeredRect(
    ui.center.x, 105, 200, 200, 
    { strokeLineDash: [10, 10] , fill: "green", fillWeight: 0.1, hachureAngle: 30 },
  );

  const input = document.createElement('input');
  input.type = "text";
  input.placeholder = "your msg";
  input.style.position = "absolute";
  input.style.font = "25px xkcd";
  anim.canvas.parentElement.appendChild(input);

  function send() {
    console.log(world);
    if (input.value.length === 0) {
      return
    }
    world.message.text = input.value;
    input.value = ""
    world.cipher.text = caesarCipher(world.message.text, indcpa1key);
    // Remove input
    input.style.display = "none";
    part1();
  }

  const sendButton = new Button(
    { x: 75, y: 50 },
    { x: 100, y: 50 },
    { fill: "orange", text: "Send" },
    send,
  );
  sendButton.register(ui);
  sendButton.draw(ui);

  input.addEventListener("keydown", function(event) {
    if (event.key == "Enter") { send(); }
  });
  input.addEventListener("input", function(event) {
    input.value = input.value.replace(/[^a-z]/g, "");
  });

  const table = document.getElementById("indcpa-table-body");

  function appendToTable(message, cipher) {
    const tr = document.createElement('tr');

    const tdMsg = document.createElement('td');
    tdMsg.innerText = message;
    tr.appendChild(tdMsg);

    const tdCipher = document.createElement('td');
    tdCipher.innerText = cipher;
    tr.appendChild(tdCipher);

    table.insertBefore(tr, table.firstElementChild);
  }

  function part1() {
    // Animate message and k moving into e
    let start = 0;
    const total = 600;

    const initMessagePos = world.message.pos;
    const finalMessagePos = { x: world.e.left - world.message.width / 2, y: world.e.pos.y };

    const initKeyPos = world.k.pos;
    const finalKeyPos = { x: world.e.pos.x, y: world.e.top - world.k.height / 2 };

    function update(t) {
      if (start === 0) {
        start = t;
      }
      const x = (t - start) / total;
      const y = hermite(x);
      
      world.message.pos = { 
        // This y is the eased value of the time elapsed
        x: Math.floor(initMessagePos.x + y * (finalMessagePos.x - initMessagePos.x)),
        y: Math.floor(initMessagePos.y + y * (finalMessagePos.y - initMessagePos.y)),
      }
      world.k.pos = { 
        // This y is the eased value of the time elapsed
        x: Math.floor(initKeyPos.x + y * (finalKeyPos.x - initKeyPos.x)),
        y: Math.floor(initKeyPos.y + y * (finalKeyPos.y - initKeyPos.y)),
      }
      if (t - start >= total) {
        // Needs to be back here
        world.message.pos = initMessagePos;
        world.message.hidden = true;

        world.k.pos = finalKeyPos;
        world.k.hidden = true;

        part2();
      } else {
        render();
        world.message.arrowLeft(anim, world.e); 
        world.k.arrowDown(anim, world.e); 

        window.requestAnimationFrame(update);
      }
    }
    window.requestAnimationFrame(update);
  }

  function part2() {
    // Makes the encryption box scale up and down a couple times (like it's thinking)
    let start = 0;
    const total = 1000;

    function curve(x) {
      return Math.cos(6 * Math.PI * x) / 20 + 0.95;
    }

    function update(t) {
      if (start === 0) {
        start = t;
      }
      const x = (t - start) / total;
      const y = curve(x);
      
      world.e.scale = y;
      if (t - start >= total) {
        world.e.scale = 1.0;
        part3();
      } else {
        render();
        window.requestAnimationFrame(update);
      }
    }
    window.requestAnimationFrame(update);
  }

  function part3() {
    // Animate cipher moving out of e
    let start = 0;
    const total = 600;

    const { e, cipher } = world;

    const initCipherPos = { x: e.right + cipher.width / 2, y: e.pos.y };
    const finalCipherPos = cipher.pos;

    cipher.hidden = false;

    function update(t) {
      if (start === 0) {
        start = t;
      }
      const x = (t - start) / total;
      const y = hermite(x);
      
      cipher.pos = { 
        // This y is the eased value of the time elapsed
        x: Math.floor(initCipherPos.x + y * (finalCipherPos.x - initCipherPos.x)),
        y: Math.floor(initCipherPos.y + y * (finalCipherPos.y - initCipherPos.y)),
      }
      if (t - start >= total) {
        cipher.pos = finalCipherPos;
        part4();
      } else {
        render();
        e.arrowLeft(anim, cipher); 

        window.requestAnimationFrame(update);
      }
    }
    window.requestAnimationFrame(update);
  }

  function part4() {
    // Animate message and cipher moving down to the bottom of the screen in a curve
    let start = 0;
    const total = 800;

    const { cipher, message } = world;
    
    const initCipherPos = cipher.pos;
    const finalCipherPos = { x: anim.center.x + cipher.width / 2 + 20, y: anim.height - cipher.height / 2 - 10 };
    const initMessagePos = message.pos;
    const finalMessagePos = { x: anim.center.x - message.width / 2 - 20, y: anim.height - message.height / 2 - 10 };

    world.cipher.hidden = false;
    world.message.hidden = false;

    function posCurve(x) {
      return 0.5 * Math.pow((x * 2 - 1), 3) + 0.5;
    }

    function update(timestamp) {
      if (start === 0) {
        start = timestamp;
      }
      const eased = hermite((timestamp - start) / total);

      cipher.pos = { 
        // This y is the eased value of the time elapsed
        x: Math.floor(initCipherPos.x + hermite(eased) * (finalCipherPos.x - initCipherPos.x)),
        y: Math.floor(initCipherPos.y + eased * (finalCipherPos.y - initCipherPos.y)),
      }
      message.pos = { 
        // This y is the eased value of the time elapsed
        x: Math.floor(initMessagePos.x + hermite(eased) * (finalMessagePos.x - initMessagePos.x)),
        y: Math.floor(initMessagePos.y + eased * (finalMessagePos.y - initMessagePos.y)),
      }

      if (timestamp - start >= total) {
        cipher.pos = initCipherPos;
        message.pos = initMessagePos;

        message.hidden = true;
        cipher.hidden = true;

        reset();
        appendToTable(message.text, cipher.text);
        input.focus();
        return
      } else {
        render();
        window.requestAnimationFrame(update);
      }
    }
    window.requestAnimationFrame(update);
  }

  function reset() {
    const roughness = 0.8;
    const e = new Thing(
      { x: anim.center.x, y: 150 },
      { x: 100, y: 100 },
      { text: "E", roughness, fill: "green" },
    )

    const k = new Thing(
      { x: anim.center.x, y: 30 },
      { x: 40, y: 40 },
      { text: "K", roughness, fill: "red" },
    );

    const message = new Thing(
      { x: 95, y: 150 },
      { x: 150, y: 40 },
      { roughness, fill: "blue" },
    );

    const cipher = new Thing(
      { x: anim.width - 100, y: 150 },
      { x: 150, y: 40 },
      { roughness, hidden: true, fill: "purple" },
    );

    input.style.top = `${message.top + 3}px`;
    input.style.left = `${message.left + 3}px`;
    input.style.width = `${message.width - 6}px`;
    input.style.height = `${message.height - 6}px`;
    input.value = "";
    input.style.display = "";
    
    world.e = e;
    world.k = k;
    world.message = message;
    world.cipher = cipher;

    render();
    // Initial arrows
    message.arrowLeft(anim, world.e); 
    k.arrowDown(anim, world.e); 
  }

  function render() {
    anim.clear();
    
    world.e.draw(anim);
    world.k.draw(anim);
    world.message.draw(anim);
    world.cipher.draw(anim);
  }

  reset();
});
