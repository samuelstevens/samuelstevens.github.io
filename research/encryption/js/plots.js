class ThreeDimensionalSurface {
  constructor() {
    this._data = []; 
    this._x = 0;
    this._y = 0;
    this._x_shift = 0;
    this._y_shift = 0;
  }

  set(x, y, z) {
    if (x + this._x_shift < 0) {
      // Need to shift all elements on x-axis
      const shift = Math.abs(x + this._x_shift);
      for (let i = 0; i < shift; i++) {
        this._data.splice(0, 0, Array(this._y).fill(0));
      }
      this._x_shift += shift;
      this._x += shift;
    } else if (x + this._x_shift >= this._x) {
      // Need to append new rows
      const shift = x + this._x_shift + 1 - this._x;
      for (let i = 0; i < shift; i++) {
        this._data.push(Array(this._y).fill(0));
      }
      this._x += shift;
    }

    if (y + this._y_shift < 0) {
      // Need to shift all elements on y-axis
      const shift = Math.abs(y + this._y_shift);
      for (let i = 0; i < this._x; i++) {
        for (let j = 0; j < shift; j++) {
          this._data[i].splice(0, 0, 0);
        }
      }
      this._y_shift += shift;
      this._y += shift;
    } else if (y + this._y_shift > this._y) {
      // Need to append new empty columns to all the data
      const shift = y + this._y_shift + 1 - this._y;
      for (let i = 0; i < this._x; i++) {
        for (let j = 0; j < shift; j++) {
          this._data[i].push(0);
        }
      }
      this._y += shift;
    }

    this._data[x + this._x_shift][y + this._y_shift] = z;
  }

  get data() {
    return JSON.parse(JSON.stringify(this._data));
  }

  get transpose() {
    const arr = [];
    for (let y = 0; y < this._y; y++) {
      arr.push(Array(this._x).fill(0));
      for (let x = 0; x < this._x; x++) {
        arr[y][x] = this._data[x][y]; 
      }
    }
    return arr;
  }
}

function seededrng(seed) {
  return function () {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
  }
}

(function() {
  const mathElem = document.getElementById("sidebar-3d");
  const plotElem = document.getElementById("plot-3d");

  const model = {
    // Immediately regenerated
    key: 0,
    // Default thetad
    thetad: [1, 2],
    // derived from key
    P: null,
    // derived from key and thetad
    thetaD: null,
  };

  function update(model, msg, data) {
    switch (msg) {
      case "key":
        model.key = data;
        model.P = generateP(model.key);
        model.thetaD = math.multiply(model.P, model.thetad);
        break;
      case "thetad":
        model.thetad = data;
        model.thetaD = math.multiply(model.P, model.thetad);
        break;
      default:
        throw new Error(`${msg} not caught!`);
    }

    // console.log(msg, data, model);
    render(model);
  }

  function generateP(seed) {
    const prng = seededrng(seed);
    const P = [
      [prng(), prng()],
      [prng(), prng()],
      [prng(), prng()],
    ];

    for (let i = 0; i < 3; i++) {
      P[i] = math.divide(P[i], math.norm(P[i]));
    }

    return P;
  }

  function renderMath(model) {
    const { P, key, thetad, thetaD } = model;

    MathJax.typesetClear([mathElem]);
    mathElem.innerHTML = `
      \\(k = ${key}\\)
      \\(P = \\begin{pmatrix} 
      ${P[0][0].toFixed(2)} & ${P[0][1].toFixed(2)} \\\\
      ${P[1][0].toFixed(2)} & ${P[1][1].toFixed(2)} \\\\
      ${P[2][0].toFixed(2)} & ${P[2][1].toFixed(2)}
      \\end{pmatrix}\\)
      <div id="matrix-input-container">
        \\(\\theta^d = \\bigg(\\)
        <div id="matrix-input">
          <input class="matrix-input" value="${thetad[0]}" />
          <input class="matrix-input" value="${thetad[1]}" />
        </div>
        \\(\\bigg)\\)
      </div>
      \\(\\theta^D = \\begin{pmatrix} 
      ${thetaD[0].toFixed(2)} \\\\ 
      ${thetaD[1].toFixed(2)} \\\\ 
      ${thetaD[2].toFixed(2)} 
      \\end{pmatrix}\\)
      <button id="regen-key-button">Re-generate key</button>
    `
    MathJax.typeset([mathElem]); 

    document.getElementById("regen-key-button").addEventListener("click", regenKey);
  }

  const bound = 5;

  function makeSurface(P) {
    const surface = new ThreeDimensionalSurface();
    const text = new ThreeDimensionalSurface();
    const Psquare = P.slice(0, 2)

    for (let x = -bound; x <= bound; x++) {
      for (let y = -bound; y <= bound; y++) {
        const [ [x2], [y2] ] = math.lusolve(Psquare, [x, y]);
        // x_ and y_ are nearly exactly x and y, but with floating point errors
        const [ x_, y_, z ] = math.squeeze(math.multiply(P, [x2, y2]));
        surface.set(x, y, z);
        text.set(x, y, `(${x}, ${y}, ${z.toFixed(2)})`);
      }
    }

    return {
      z: surface.transpose,
      // not sure why this one isn't transposed, but it works
      text: text.data,
    };
  }

  function makeScatter3d(thetaD) {
    const x = [ bound, thetaD[0] + bound ];
    const y = [ bound, thetaD[1] + bound ];
    const z = [ 0, thetaD[2] ];
    const text = [ "(0, 0, 0)", `(${thetaD[0].toFixed(2)}, ${thetaD[1].toFixed(2)}, ${thetaD[2].toFixed(2)})` ];

    return { x, y, z, text };
  }
  
  function makeKey() {
    const key = Math.floor(Math.random() * Math.pow(2, 30));
    return key;
  }

  function render(model) {
    renderMath(model);

    const inputParent = document.getElementById("matrix-input");
    for (let i = 0; i < inputParent.children.length; i++) {
      inputParent.children[i].addEventListener("input", function(event) {
        // Check if both children have integer values. If they do, re-render.
        let newThetad = [];
        for (let i = 0; i < inputParent.children.length; i++) {
          const value = parseInt(inputParent.children[i].value, 10);
          if (!isNaN(value)) {
            newThetad.push(value);
          }
        }

        if (newThetad.length == 2) { 
          update(model, "thetad", newThetad);
        }
      });
    }

    const surface = makeSurface(model.P);

    Plotly.react(plotElem, 
      [
        { 
          type: "surface", 
          showscale: false,
          z: surface.z,
          text: surface.text,
          hovertemplate: "%{text}<extra></extra>",
          colorscale: "Hot",
        },
        { 
          type: "scatter3d", 
          opacity: 1, 
          line: { 
            width: 6,
            color: "black",
          }, 
          marker: {
            size: 6,
          },
          hovertemplate: "%{text}<extra></extra>",
          ...makeScatter3d(model.thetaD),
        },
      ],
      { 
        margin: { t: 0 },
        showlegend: false,
        autosize: true,
        scene: {
          xaxis: {
            tickvals: [0, 2, 4, 6, 8, 10], // hardcoded against bound
            ticktext: [-5, -3, -1, 1, 3, 5 ],
          },
          yaxis: {
            tickvals: [0, 2, 4, 6, 8, 10], // hardcoded against bound
            ticktext: [-5, -3, -1, 1, 3, 5 ],
          },
        },
      },
      { 
        displaylogo: false,
        hovermode:"closest",
      },
    );
  }

  function regenKey() {
    update(model, "key", makeKey());
  }

  update(model, "key", makeKey());
})();
