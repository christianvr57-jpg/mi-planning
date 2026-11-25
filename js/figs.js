// Monigotes animados (SVG) para los ejercicios de movilidad sin foto.
// Cada pose es un conjunto de articulaciones; la animación interpola entre poses en bucle.
// Prefijo n = lado cercano, f = lado lejano (más claro). E codo, W muñeca, K rodilla, A tobillo, T punta del pie.
// hl: segmentos resaltados (músculo que se estira) [desde, hasta] o un punto de articulación con radio.
const Figs = (() => {
  const P = (o) => o;
  const FIGS = {
    // Sentado sobre los dedos (dedos flexionados)
    toe_sit: { dur: 3600, hl: [["nA", "nT"], ["fA", "fT"]], poses: [
      P({ H: [90, 44], N: [88, 57], P: [84, 100], nE: [92, 80], nW: [104, 103], fE: [95, 79], fW: [107, 102], nK: [112, 125], nA: [82, 112], nT: [74, 127], fK: [115, 123], fA: [85, 110], fT: [77, 125] }),
      P({ H: [84, 46], N: [83, 59], P: [83, 101], nE: [89, 81], nW: [103, 104], fE: [92, 80], fW: [106, 103], nK: [112, 125], nA: [82, 112], nT: [74, 127], fK: [115, 123], fA: [85, 110], fT: [77, 125] })] },
    // Sentado sobre los tobillos (empeines en el suelo)
    ankle_sit: { dur: 3600, hl: [["nK", "nA"], ["fK", "fA"]], poses: [
      P({ H: [90, 52], N: [88, 65], P: [84, 108], nE: [92, 88], nW: [104, 110], fE: [95, 87], fW: [107, 109], nK: [114, 125], nA: [82, 123], nT: [66, 127], fK: [117, 123], fA: [85, 121], fT: [69, 125] }),
      P({ H: [84, 54], N: [83, 67], P: [83, 109], nE: [89, 89], nW: [103, 111], fE: [92, 88], fW: [106, 110], nK: [114, 125], nA: [82, 123], nT: [66, 127], fK: [117, 123], fA: [85, 121], fT: [69, 125] })] },
    // Cadera 90/90 (vista frontal): las rodillas caen a un lado y al otro
    hip9090: { dur: 4200, front: true, hl: [{ pt: "P", r: 13 }], poses: [
      P({ H: [100, 56], N: [100, 69], P: [100, 116], nH: [92, 118], fH: [108, 118], nE: [84, 88], nW: [100, 84], fE: [116, 88], fW: [100, 84], nK: [66, 121], nA: [86, 128], fK: [100, 126], fA: [132, 124] }),
      P({ H: [100, 56], N: [100, 69], P: [100, 116], nH: [92, 118], fH: [108, 118], nE: [84, 88], nW: [100, 84], fE: [116, 88], fW: [100, 84], nK: [80, 92], nA: [72, 127], fK: [120, 92], fA: [128, 127] }),
      P({ H: [100, 56], N: [100, 69], P: [100, 116], nH: [92, 118], fH: [108, 118], nE: [84, 88], nW: [100, 84], fE: [116, 88], fW: [100, 84], nK: [100, 126], nA: [68, 124], fK: [134, 121], fA: [114, 128] }),
      P({ H: [100, 56], N: [100, 69], P: [100, 116], nH: [92, 118], fH: [108, 118], nE: [84, 88], nW: [100, 84], fE: [116, 88], fW: [100, 84], nK: [80, 92], nA: [72, 127], fK: [120, 92], fA: [128, 127] })] },
    // Extensión en cangrejo: sube la cadera y lleva un brazo por encima
    crab: { dur: 3400, hl: [["P", "nK"]], poses: [
      P({ H: [82, 70], N: [80, 83], P: [92, 121], nE: [70, 105], nW: [60, 127], fE: [73, 104], fW: [63, 126], nK: [120, 95], nA: [136, 125], nT: [147, 128], fK: [123, 97], fA: [139, 124], fT: [150, 127] }),
      P({ H: [64, 82], N: [74, 94], P: [104, 98], nE: [88, 74], nW: [110, 62], fE: [66, 111], fW: [60, 127], nK: [132, 100], nA: [136, 125], nT: [147, 128], fK: [135, 101], fA: [139, 124], fT: [150, 127] })] },
    // Sentadilla profunda a estiramiento de isquios (manos en la punta de los pies)
    squat_ham: { dur: 3600, hl: [["P", "nK"], ["P", "fK"]], poses: [
      P({ H: [122, 64], N: [114, 76], P: [96, 112], nE: [117, 100], nW: [121, 123], fE: [120, 99], fW: [124, 122], nK: [124, 99], nA: [110, 124], nT: [124, 128], fK: [127, 98], fA: [113, 123], fT: [127, 127] }),
      P({ H: [140, 107], N: [132, 95], P: [104, 64], nE: [128, 111], nW: [121, 123], fE: [131, 110], fW: [124, 122], nK: [107, 95], nA: [110, 124], nT: [124, 128], fK: [110, 94], fA: [113, 123], fT: [127, 127] })] },
    // Sentadilla cosaca (vista frontal): baja a un lado con la otra pierna estirada
    cossack: { dur: 4400, front: true, hl: [["fH", "fK"], ["nH", "nK"]], poses: [
      P({ H: [84, 52], N: [84, 64], P: [82, 104], nH: [76, 106], fH: [88, 106], nE: [72, 82], nW: [84, 78], fE: [96, 82], fW: [84, 78], nK: [58, 98], nA: [60, 124], fK: [114, 114], fA: [142, 122] }),
      P({ H: [100, 26], N: [100, 39], P: [100, 80], nH: [93, 82], fH: [107, 82], nE: [88, 58], nW: [100, 54], fE: [112, 58], fW: [100, 54], nK: [78, 104], nA: [62, 124], fK: [122, 104], fA: [138, 124] }),
      P({ H: [116, 52], N: [116, 64], P: [118, 104], nH: [112, 106], fH: [124, 106], nE: [104, 82], nW: [116, 78], fE: [128, 82], fW: [116, 78], nK: [86, 114], nA: [58, 122], fK: [142, 98], fA: [140, 124] }),
      P({ H: [100, 26], N: [100, 39], P: [100, 80], nH: [93, 82], fH: [107, 82], nE: [88, 58], nW: [100, 54], fE: [112, 58], fW: [100, 54], nK: [78, 104], nA: [62, 124], fK: [122, 104], fA: [138, 124] })] },
    // Paloma: pierna delantera cruzada, la de atrás estirada; luego inclinarse adelante
    pigeon: { dur: 4400, hl: [{ pt: "P", r: 12 }], poses: [
      P({ H: [106, 56], N: [104, 69], P: [100, 110], nE: [109, 93], nW: [116, 120], fE: [112, 92], fW: [119, 119], nK: [128, 121], nA: [100, 126], nT: [92, 127], fK: [66, 124], fA: [34, 125], fT: [24, 127] }),
      P({ H: [152, 108], N: [140, 102], P: [100, 112], nE: [152, 118], nW: [170, 123], fE: [155, 117], fW: [173, 122], nK: [128, 121], nA: [100, 126], nT: [92, 127], fK: [66, 124], fA: [34, 125], fT: [24, 127] })] },
    // Perro boca abajo alternando talones (gemelos)
    calf_alt: { dur: 2600, hl: [["nK", "nA"], ["fK", "fA"]], poses: [
      P({ H: [66, 104], N: [74, 92], P: [110, 64], nE: [62, 109], nW: [50, 126], fE: [65, 108], fW: [53, 125], nK: [128, 94], nA: [146, 120], nT: [136, 128], fK: [122, 101], fA: [143, 113], fT: [138, 127] }),
      P({ H: [66, 104], N: [74, 92], P: [110, 64], nE: [62, 109], nW: [50, 126], fE: [65, 108], fW: [53, 125], nK: [119, 100], nA: [140, 114], nT: [135, 128], fK: [131, 93], fA: [149, 119], fT: [139, 127] })] },
    // Balanceo de pierna adelante-atrás (mano en la pared)
    leg_front: { dur: 1600, wall: 152, hl: [["P", "nK"]], poses: [
      P({ H: [100, 22], N: [100, 35], P: [100, 77], nE: [124, 48], nW: [149, 52], fE: [92, 56], fW: [96, 76], nK: [123, 99], nA: [142, 115], nT: [151, 110], fK: [100, 101], fA: [100, 124], fT: [111, 127] }),
      P({ H: [102, 22], N: [101, 35], P: [99, 77], nE: [124, 48], nW: [149, 52], fE: [92, 56], fW: [96, 76], nK: [86, 102], nA: [72, 122], nT: [66, 127], fK: [100, 101], fA: [100, 124], fT: [111, 127] })] },
    // Balanceo lateral de pierna (vista frontal, manos en la pared)
    leg_side: { dur: 1600, front: true, hl: [["nH", "nK"]], poses: [
      P({ H: [100, 22], N: [100, 35], P: [100, 77], fH: [93, 79], nH: [107, 79], nE: [86, 54], nW: [86, 38], fE: [114, 54], fW: [114, 38], fK: [93, 102], fA: [93, 125], nK: [96, 101], nA: [80, 118] }),
      P({ H: [98, 22], N: [99, 35], P: [101, 77], fH: [94, 79], nH: [108, 79], nE: [86, 54], nW: [86, 38], fE: [114, 54], fW: [114, 38], fK: [93, 102], fA: [93, 125], nK: [128, 95], nA: [146, 110] })] },
  };

  const ease = (t) => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  function poseAt(f, ms) {
    const n = f.poses.length, seg = f.dur / n;
    const k = Math.floor((ms % f.dur) / seg), t = ease(((ms % f.dur) % seg) / seg);
    const a = f.poses[k], b = f.poses[(k + 1) % n], o = {};
    // Con 2 poses: ida y vuelta, con pausa en los extremos
    for (const j in a) o[j] = lerp(a[j], b[j], n === 2 ? ease(Math.min(1, t * 1.25)) : t);
    return o;
  }
  const L = (p, a, b) => (p[a] && p[b] ? `M${p[a][0].toFixed(1)} ${p[a][1].toFixed(1)}L${p[b][0].toFixed(1)} ${p[b][1].toFixed(1)}` : "");
  function draw(svg, f, ms) {
    const p = poseAt(f, ms);
    const hipN = f.front ? "nH" : "P", hipF = f.front ? "fH" : "P";
    const far = [L(p, "N", "fE"), L(p, "fE", "fW"), L(p, hipF, "fK"), L(p, "fK", "fA"), L(p, "fA", "fT")].join("");
    const near = [L(p, "N", "P"), f.front ? L(p, "nH", "fH") : "", L(p, "N", "nE"), L(p, "nE", "nW"), L(p, hipN, "nK"), L(p, "nK", "nA"), L(p, "nA", "nT")].join("");
    const hl = f.hl.map((h) => (Array.isArray(h) ? L(p, h[0], h[1]) : "")).join("");
    const dots = f.hl.filter((h) => !Array.isArray(h)).map((h) => `<circle cx="${p[h.pt][0]}" cy="${p[h.pt][1]}" r="${h.r}"/>`).join("");
    svg.querySelector(".f-far").setAttribute("d", far);
    svg.querySelector(".f-near").setAttribute("d", near);
    svg.querySelector(".f-hl").setAttribute("d", hl);
    svg.querySelector(".f-dot").innerHTML = dots;
    const h = svg.querySelector(".f-head"); h.setAttribute("cx", p.H[0]); h.setAttribute("cy", p.H[1]);
  }
  function svg(id) {
    const f = FIGS[id]; if (!f) return "";
    return `<svg class="fig" data-fig="${id}" viewBox="0 0 200 140" role="img" aria-label="Animación del ejercicio">
      <line class="f-ground" x1="8" y1="129" x2="192" y2="129"/>${f.wall ? `<line class="f-ground" x1="${f.wall}" y1="10" x2="${f.wall}" y2="129"/>` : ""}
      <g class="f-dot"></g><path class="f-far"/><path class="f-hl"/><path class="f-near"/><circle class="f-head" r="9"/></svg>`;
  }
  let raf = 0;
  function loop(ts) {
    const els = document.querySelectorAll("svg.fig[data-fig]");
    if (!els.length) { raf = 0; return; }
    els.forEach((el) => draw(el, FIGS[el.dataset.fig], ts));
    raf = requestAnimationFrame(loop);
  }
  const start = () => { if (!raf) raf = requestAnimationFrame(loop); };
  return { svg, start, has: (id) => !!FIGS[id], drawAt: (el, id, ms) => draw(el, FIGS[id], ms), dur: (id) => FIGS[id].dur, n: (id) => FIGS[id].poses.length };
})();
