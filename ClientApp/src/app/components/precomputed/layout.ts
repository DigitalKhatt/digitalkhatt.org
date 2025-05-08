import * as d3Force from "d3-force"
import markbaseforce from "./markbaseforce"
import baseForce from "./baseforce"

const PAGE_WIDTH = 17000;
const MARGIN = 300;
const LINE_WIDTH = PAGE_WIDTH - 2 * MARGIN;
const INTERLINE = 1800

export class LayoutService {
  public glyphs;
  public pages;
  public classes;
  private simInfo = [];

  constructor(layout) {
    this.glyphs = layout.glyphs;
    this.pages = layout.pages;
    this.classes = layout.classes;
    for (let classs in this.classes) {
      for (let code of this.classes[classs]) {
        const classes = this.glyphs[code].classes || {};
        classes[classs] = true;
        this.glyphs[code].classes = classes;
      }
    }
    let nbGlyphs = 0;
    for (let page of this.pages) {
      for (let line of page.lines) {
        for (let glyph of line.glyphs) {
          nbGlyphs++;
        }
      }
    }
    console.log(`nbGlyphs=${nbGlyphs} size=${nbGlyphs * 8 * 4 / 1024 / 1024}MB`);
  }

  initSimulation(pageIndex) {
    this.simInfo[pageIndex] = {};
  }

  simulatePage(pageIndex) {
    let simInfo = this.simInfo[pageIndex];
    const pageNodes = simInfo.nodes;
    const simulation = d3Force.forceSimulation(pageNodes)

    simulation.force("baseForce", baseForce());

    simulation.force("marktobase", markbaseforce());

    simulation.on("tick", () => {
      for (let i = 0; i < pageNodes.length; i++) {
        const node = pageNodes[i];
        if (!isNaN(node.x) && !isNaN(node.y)) {
          node.path.setAttribute("transform", "translate(" + node.x + " " + node.y + ")");
        } else {
          console.log(`pageIndex=${pageIndex}`)
        }
      }
      //for (let i = 0; i < 100000000; i++);
    });
  }

  generateLine(lineElem, pageIndex, lineIndex, glyphScale, margin) {

    const glyphs = this.glyphs;
    const pages = this.pages;

    let pageNodes = this.simInfo[pageIndex].nodes || [];
    this.simInfo[pageIndex].nodes = pageNodes;


    const linelayout = pages[pageIndex].lines[lineIndex];

    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute('shape-rendering', 'geometricPrecision');
    svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");

    const lineGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    svg.appendChild(lineGroup);

    let currentBase;

    let currentxPos = -linelayout.x;
    for (let glyphIndex = 0; glyphIndex < linelayout.glyphs.length; glyphIndex++) {
      const glyph = linelayout.glyphs[glyphIndex];
      currentxPos -= glyph.x_advance || 0;
      const pathString = this.getGlyphSvg(glyphs, glyph.codepoint, glyph.lefttatweel, glyph.righttatweel);
      let newpath = document.createElementNS('http://www.w3.org/2000/svg', "path");
      newpath.setAttribute("d", pathString);

      const posX = currentxPos + (glyph.x_offset || 0);
      const posY = glyph.y_offset || 0;


      if (glyphs[glyph.codepoint].classes.marks) {
        const markNode = { isMark: true, x: 0, y: 0, posX, posY, path: newpath, baseNode: currentBase, x_offset: glyph.x_offset || 0, y_offset: glyph.y_offset || 0 };
        pageNodes.push(markNode);
      } else {
        if (glyphs[glyph.codepoint].name !== "space") {
          //currentBase = { pageIndex, lineIndex, glyphIndex, posX, posY }
        }
        const baseNode = {
          x: 0, y: 0, posX, posY, path: newpath
        }
        pageNodes.push(baseNode);
        currentBase = baseNode;
        //newpath.setAttribute("transform", "translate(" + posX + " " + posY + ")");
      }

      //newpath.setAttribute("transform", "translate(" + (currentxPos + (glyph.x_offset || 0)) + " " + (glyph.y_offset || 0) + ")");

      lineGroup.appendChild(newpath)
    }

    const xScale = linelayout.xscale || 1;

    const yScale = 1;

    lineGroup.setAttribute("transform", "scale(" + glyphScale * xScale + "," + -glyphScale * yScale + ")");
    const lineWidth = -glyphScale * xScale * currentxPos
    const x = lineWidth * 1.2
    let width = x + margin;
    const height = lineElem.clientHeight * 2

    svg.setAttribute('viewBox', `${-x} ${-height / 2} ${width} ${height}`)
    svg.setAttribute('width', width.toString());
    svg.setAttribute('height', height.toString());
    svg.style.position = "relative"
    svg.style.right = -margin + "px";
    svg.style.top = -lineElem.clientHeight / 2 + "px";

    lineElem.appendChild(svg);
  }
  getGlyphSvg(glyphs: any[], codepoint: number, lefttatweel: number, righttatweel: number) {

    let svg: string = "";

    const glyphInfo = glyphs[codepoint];
    const limits = glyphInfo.limits || [0, 0, 0, 0];
    if (lefttatweel < limits[0]) {
      lefttatweel = limits[0];
    }
    if (lefttatweel > limits[1]) {
      lefttatweel = limits[1];
    }
    if (righttatweel < limits[2]) {
      righttatweel = limits[2];
    }
    if (righttatweel > limits[3]) {
      righttatweel = limits[3];
    }

    let leftScalar = 0;
    if (lefttatweel < 0) {
      leftScalar = lefttatweel / limits[0];
    } else if (lefttatweel > 0) {
      leftScalar = lefttatweel / limits[1];
    }
    let rightScalar = 0;
    if (righttatweel < 0) {
      rightScalar = righttatweel / limits[2];
    } else if (righttatweel > 0) {
      rightScalar = righttatweel / limits[3];
    }

    function interpolate(value, i, j, k) {
      let interpolatedValue = value;
      if (lefttatweel < 0) {
        interpolatedValue += (glyphInfo.minLeft[i].path[j][k] - value) * leftScalar;
      } else if (lefttatweel > 0) {
        interpolatedValue += (glyphInfo.maxLeft[i].path[j][k] - value) * leftScalar;
      }
      if (righttatweel < 0) {
        interpolatedValue += (glyphInfo.minRight[i].path[j][k] - value) * rightScalar;
      } else if (righttatweel > 0) {
        interpolatedValue += (glyphInfo.maxRight[i].path[j][k] - value) * rightScalar;
      }

      return interpolatedValue;

    }

    let pathd: string = "";
    for (let i = 0; i < glyphInfo.default.length; i++) {
      const defaultPath = glyphInfo.default[i];
      /*const withColor = defaultPath.color && (defaultPath.color[0] !== 0 || defaultPath.color[1] !== 0 || defaultPath.color[2] !== 0);
      if (withColor && i > 0) {
        svg += `<path d=${pathd} />`;
        pathd = "";
      }*/
      for (let j = 0; j < defaultPath.path.length; j++) {
        const element = defaultPath.path[j];
        if (element.length === 2) {
          pathd += `M${interpolate(element[0], i, j, 0)} ${interpolate(element[1], i, j, 1)}`;
          //ctx.moveTo(interpolate(element[0], i, j, 0), interpolate(element[1], i, j, 1));
        } else if (element.length === 6) {
          pathd += `C${interpolate(element[0], i, j, 0)} ${interpolate(element[1], i, j, 1)},${interpolate(element[2], i, j, 2)} ${interpolate(element[3], i, j, 3)},${interpolate(element[4], i, j, 4)} ${interpolate(element[5], i, j, 5)}`;
        }
      }

      /*if (withColor) {
        const color = defaultPath.color || [0, 0, 0];        
        const style = "rgb(" + color[0] + "," + color[1] + "," + color[2] + ")";
        svg += `<path d=${pathd} fill=${style}/>`;        
        pathd = "";
      }*/
    }
    //svg += `<path d=${pathd} />`;

    return pathd;
  }
}
