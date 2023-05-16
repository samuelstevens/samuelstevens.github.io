'use strict';

window.addEventListener("load", function() {
  // Initialize a canvas
  const height = 360;

  const ui = new RoughCanvas("indcpa-canvas-2-ui", height);
  const anim = new RoughCanvas("indcpa-canvas-2-anim", height);
  
  // if canvas.width < 600 then this animation doesn't work.
  if (ui.width < 600) {
    ui.centeredText("This demo requires a", ui.center.x, 10);
    ui.centeredText("wider view. Try on a", ui.center.x, 40);
    ui.centeredText("larger device, or rotate", ui.center.x, 70);
    ui.centeredText("your phone, then refresh", ui.center.x, 100);
    ui.centeredText("the page.", ui.center.x, 130);
    return
  }

  const roughness = 0.5;

  function newInput(rc, placeholder) {
    const input = document.createElement("input");
    input.type = "text";
    input.addEventListener("input", function(event) {
      input.value = input.value.replace(/[^a-z]/g, "");
    });
    if (placeholder !== undefined) { input.placeholder = placeholder; }
    input.style.position = "absolute";
    input.style.font = "25px xkcd";
    rc.canvas.parentElement.appendChild(input);

    return input
  }

  function choose(message) {
    if (world.choice === 0) {
      console.log("Haven't sent two messages yet."); 
    }
    if (message === world.choice) {
      world.wins += 1;
    } else {
      world.losses += 1;
    }
    world.reset();
    render();
  }

  const input1 = newInput(ui, "message 1");
  const input2 = newInput(ui, "message 2");

  const button1 = new Button(
    { x: ui.center.x - 90, y: 250},
    { x: 150, y: 50 },
    { fill: "lightblue", text: "Message 1" },
    function() { choose(1) },
  );
  const button2 = new Button(
    { x: ui.center.x + 90, y: 250},
    { x: 150, y: 50 },
    { fill: "lightblue", text: "Message 2" },
    function() { choose(2) },
  );

  function part1() {
    let start = 0;
    const total = 600;

    const init1 = world.m1.pos;
    const final1 = { x: world.alice.left - world.m1.width / 2, y: world.m1.pos.y };

    const init2 = world.m2.pos;
    const final2 = { x: world.alice.left - world.m2.width / 2, y: world.m2.pos.y };

    function update(timestamp) {
      if (start === 0) {
        start = timestamp;
      }
      const eased = hermite((timestamp - start) / total);
      
      world.m1.pos = { 
        x: Math.floor(init1.x + eased * (final1.x - init1.x)),
        y: Math.floor(init1.y + eased * (final1.y - init1.y)),
      }
      world.m2.pos = { 
        x: Math.floor(init2.x + eased * (final2.x - init2.x)),
        y: Math.floor(init2.y + eased * (final2.y - init2.y)),
      }

      if (timestamp - start >= total) {
        world.m1.pos = init1;
        world.m1.hidden = true;

        world.m2.pos = init2;
        world.m2.hidden = true;

        part2();
      }
      render();

      world.m1.arrowLeft(anim, world.alice); 
      world.m2.arrowLeft(anim, world.alice); 

      if (timestamp - start < total) {
        window.requestAnimationFrame(update);
      }
    }
    update(0);
  }
  function part2() {
    // Makes Alice scale up and down a couple times (like she's thinking)
    let start = 0;
    const total = 1000;

    function curve(x) {
      return Math.cos(6 * Math.PI * x) / 50 + 0.98;
    }

    function update(t) {
      if (start === 0) {
        start = t;
      }
      const x = (t - start) / total;
      const y = curve(x);
      
      world.alice.scale = y;
      if (t - start >= total) {
        world.alice.scale = 1.0;
        part3();
      }
      render();
      
      // Do another frame
      if (t - start < total) {
        window.requestAnimationFrame(update);
      }
    }
    update(0);
  }

  function part3() {
    // Animate cipher moving out of alice
    let start = 0;
    const total = 600;

    const { alice, c } = world;

    const init = { x: alice.right + c.width / 2, y: alice.pos.y };
    const last = c.pos;

    c.hidden = false;

    function update(timestamp) {
      if (start === 0) {
        start = timestamp;
      }
      const eased = hermite((timestamp - start) / total);
      
      c.pos = { 
        x: Math.floor(init.x + eased * (last.x - init.x)),
        y: Math.floor(init.y + eased * (last.y - init.y)),
      }
      if (timestamp - start >= total) {
        c.pos = last;
        world.m1.hidden = false;
        world.m2.hidden = false;
      }
      render();

      if (timestamp - start < total) {
        window.requestAnimationFrame(update);
      }
    }
    update(0);
  }
  
  function World() {
    this.m1 = new Thing(
      { x: anim.center.x - 240, y: 65},
      { x: 150, y: 40 },
      { roughness, fill: "blue", input: input1 },
    );
    this.m2 = new Thing(
      { x: anim.center.x - 240, y: 145},
      { x: 150, y: 40 },
      { roughness, fill: "blue", input: input2 },
    );
    this.c = new Thing(
      { x: anim.center.x + 240, y: 105},
      { x: 150, y: 40 },
      { roughness, fill: "purple", hidden: true },
    );
    this.alice = new Thing(
      { x: anim.center.x, y: 105},
      { x: 200, y: 200 },
      { roughness, fill: "green", text: "Alice" },
    );
    this.choice = 0;
    this.wins = 0;
    this.losses = 0;

    this.reset();
  }

  World.prototype.reset = function() {
    this.m1.hidden = false;
    this.m1.input.value = ""
    this.m1.input.style.display = "";

    this.m2.hidden = false;
    this.m2.input.value = ""
    this.m2.input.style.display = "";

    this.c.hidden = true;
    this.alice.hidden = false;

    this.choice = 0;
  }

  World.prototype.send = function() {
    this.m1.text = this.m1.input.value;
    this.m1.input.style.display = "none";

    this.m2.text = this.m2.input.value;
    this.m2.input.style.display = "none";
    
    let message = this.m1.text, choice = 1;
    if (Math.random() > 0.5) {
      message = this.m2.text;
      choice = 2;
    }
    const cipher = caesarCipher(message, indcpa1key);
    this.c.text = cipher;
    this.choice = choice;

    part1();
  }

  const world = new World();

  const buttonSend = new Button(
    { x: ui.center.x - 265, y: 250 },
    { x: 100, y: 50 },
    { fill: "orange", text: "Send" },
    function() { world.send(); },
  );

  const buttonReset = new Button(
    { x: ui.center.x + 265, y: 250 },
    { x: 100, y: 50 },
    { fill: "orange", text: "Reset" },
    function() { 
      world.reset();
      render();
    },
  );

  function render() {
    const { m1, m2, c, alice } = world;
    anim.clear();
    m1.draw(anim);
    m2.draw(anim);
    alice.draw(anim);
    c.draw(anim);
    m1.arrowLeft(anim, alice);
    m2.arrowLeft(anim, alice);
    alice.arrowLeft(anim, c);
    
    ui.ctx.clearRect(0, 280, ui.width, ui.height - 280);
    ui.ctx.fillText(`Wins: ${world.wins}`, 5, 320);
    ui.ctx.fillText(`Losses: ${world.losses}`, 5, 350);
  }

  render();

  button1.register(ui);
  button1.draw(ui);

  button2.register(ui);
  button2.draw(ui);

  buttonSend.register(ui);
  buttonSend.draw(ui);

  buttonReset.register(ui);
  buttonReset.draw(ui);

});
