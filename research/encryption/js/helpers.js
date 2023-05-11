function hermite(x) {
  return 3 * Math.pow(x, 2) - 2 * Math.pow(x, 3);
}

class RoughCanvas {
  constructor(id, height) {
    const canvas = document.getElementById(id);
    // Likely 800, but could be less for mobile devices
    canvas.width = document.querySelector("main").clientWidth;
    canvas.height = height;
    this.canvas = canvas

    const ctx = canvas.getContext("2d");
    ctx.font = "30px xkcd";
    this.ctx = ctx

    const rc = rough.canvas(canvas);
    this.rc = rc;
  }

  centeredText(text, x, y, params) {
    const width = this.ctx.measureText(text).width;
    this.text(text, x - width / 2, y + 12, params);
  }

  centeredRect(x, y, width, height, params) {
    this.rc.rectangle(x - width / 2, y - height / 2, width, height, params);
  }

  get center() {
    return { 
      x: Math.floor(this.canvas.width / 2), 
      y: Math.floor(this.canvas.height / 2),
    };
  }

  get height() {
    return this.canvas.height;
  }

  get width() {
    return this.canvas.width;
  }

  arrow(x1, y1, x2, y2, params) {
    if (x1 === undefined) {
      throw Exception("x1 undefined");
    } else if (y1 === undefined) {
      throw Exception("y1 undefined");
    } else if (x2 === undefined) {
      throw Exception("x2 undefined");
    } else if (y2 === undefined) {
      throw Exception("y2 undefined");
    }

    drawArrow(this.rc, x1, y1, x2, y2, params)
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  text(text, x, y, params) {
    if (params && params.jitter) {
      let jitter = Math.floor(Math.random() * 2) - 1;
      x += jitter;
      jitter = Math.floor(Math.random() * 2) - 1;
      y += jitter;
    }
    this.ctx.fillText(text, x, y);
  }
}

class Thing {
  constructor(pos, size, params) {
    this.pos = pos;
    this._size = size;

    this.scale = 1.0;
    if (params && params.scale !== undefined) { this.scale = params.scale };

    this.text = "";
    if (params && params.text !== undefined) { this.text = params.text };

    this.hidden = false;
    if (params && params.hidden !== undefined) { this.hidden = params.hidden };

    this.roughness = 1.0;
    if (params && params.roughness !== undefined) { this.roughness = params.roughness };

    this.fill = "";
    if (params && params.fill !== undefined) { this.fill = params.fill };

    this.input = null;
    if (params && params.input !== undefined) { this.input = params.input }
  }

  draw(rc) {
    if (this.hidden) {
      return
    }

    const { roughness, fill } = this;
    rc.centeredRect(
      this.pos.x, this.pos.y, this.width, this.height, 
      { roughness, fill }
    );
    
    if (this.input) {
      this.input.style.top = `${this.top + 3}px`;
      this.input.style.left = `${this.left + 3}px`;
      this.input.style.width = `${this.width - 6}px`;
      this.input.style.height = `${this.height - 6}px`;

      if (this.input.style.display === "none" && this.text.length > 0) {
        rc.centeredText(this.text, this.pos.x, this.pos.y);
      }
    } 

    if (this.input === null && this.text.length > 0) {
      rc.centeredText(this.text, this.pos.x, this.pos.y);
    }
  }

  get left() {
    return this.pos.x - this.width / 2;
  }

  get right() {
    return this.pos.x + this.width / 2;
  }

  get top() {
    return this.pos.y - this.height / 2;
  }

  get bottom() {
    return this.pos.y + this.height / 2;
  }

  get width() {
    return this._size.x * this.scale;
  }

  get height() {
    return this._size.y * this.scale;
  }

  arrowLeft(rc, other, params) {
    if (other.hidden) { return }
    this._arrow(rc, this.right + 5, this.pos.y, other.left - 5, this.pos.y, params);
  }
  arrowDown(rc, other, params) {
    if (other.hidden) { return }
    this._arrow(rc, this.pos.x, this.bottom + 5, other.pos.x, other.top - 5, params);
  }

  _arrow(rc, x1, y1, x2, y2, params) {
    const margin = 20;
    if (Math.abs(x2 - x1) < margin && Math.abs(y2 - y1) < margin) { return }
    if (this.hidden) { return }

    if (params === undefined) {
      params = {};
    }
    params.roughness = this.roughness

    rc.arrow(x1, y1, x2, y2, params);
  }
}

class Button extends Thing {
  constructor(pos, size, params, onClick) {
    super(pos, size, params);
    this.onClick = onClick
    this.state = "normal";
  }

  animate(rc) {
    if (this.state !== "excited") {
      return
    }

    setTimeout(() => {
      this.draw(rc);
      window.requestAnimationFrame(t => this.animate(rc));
    }, 100);
  }

  draw(rc) {
    if (this.hidden) {
      return
    }

    const margin = 15;
    const x = Math.max(0, this.left - margin);
    const y = Math.max(0, this.top - margin);

    rc.ctx.clearRect(x, y, this.width + 2 * margin, this.height + 2 * margin);

    switch(this.state) {
      case "normal":
        this.scale = 1.0;
        break;
      case "excited":
        this.scale = 1.04;
        break;
      case "pressed":
        this.scale = 0.96;
        break;
    }

    rc.ctx.clearRect(x, y, this.width + margin, this.height + margin);

    super.draw(rc)
  }

  register(rc) {
    rc.canvas.addEventListener("mousemove", (event) => {
      const { left, top } = rc.canvas.getBoundingClientRect();
      const x = event.clientX - left;
      const y = event.clientY - top;
      const inBox = x < this.right && x > this.left && y > this.top && y < this.bottom;

      if (this.state === "normal") {
        if (inBox) {
          this.state = "excited";
          window.requestAnimationFrame(t => this.animate(rc));
        }
      } else if (this.state === "excited") {
        if (!inBox) {
          this.state = "normal"; 
        }
      }
    });

    rc.canvas.addEventListener("mousedown", event => {
      const { left, top } = rc.canvas.getBoundingClientRect();
      const x = event.clientX - left;
      const y = event.clientY - top;
      const inBox = x < this.right && x > this.left && y > this.top && y < this.bottom;
      
      if (inBox && this.state === "excited") {
        this.state = "pressed";
        this.draw(rc);
      } if (inBox && this.state === "normal") {
        this.state = "pressed";
        this.draw(rc);
      }
    });

    rc.canvas.addEventListener("mouseup", event => {
      if (this.state === "pressed") {
        this.state = "normal";
        this.draw(rc);
        this.onClick();
      }
    });
  }
} 
