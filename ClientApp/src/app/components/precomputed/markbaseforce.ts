import constant from "./constant";

export default function () {
  var strength = constant(1),
    nodes,
    strengths,
    xz,
    x = constant(0)
    ;
  function force(alpha) {
    for (var i = 0, n = nodes.length, node; i < n; ++i) {
      node = nodes[i];
      if (node.isMark) {
        const baseNode = node.baseNode;
        const targetPosX = baseNode.x + baseNode.vx + (node.posX - baseNode.posX);
        const targetPosY = baseNode.y + baseNode.vy + (node.posY - baseNode.posY);
        node.vx += (targetPosX - node.x) * strengths[i] * alpha;
        node.vy += (targetPosY - node.y) * strengths[i] * alpha;        
      }

      //node.vx += (xz[i] - node.x) * strengths[i] * alpha;
    }
  }

  function initialize() {
    if (!nodes) return;
    var i, n = nodes.length;
    strengths = new Array(n);
    xz = new Array(n);
    for (i = 0; i < n; ++i) {
      strengths[i] = isNaN(xz[i] = +x(nodes[i], i, nodes)) ? 0 : +strength(nodes[i], i, nodes);
    }
  }

  force.initialize = function (_) {
    nodes = _;
    initialize();
  };

  force.strength = function (_, index, nodes) {
    return arguments.length ? (strength = typeof _ === "function" ? _ : constant(+_), initialize(), force) : strength;
  };

  force.x = function (_) {
    return arguments.length ? (x = typeof _ === "function" ? _ : constant(+_), initialize(), force) : x;
  };

  return force;
}
