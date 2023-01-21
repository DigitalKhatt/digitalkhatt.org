
import quranService from './quranservice.service.js'

class DFTextComponent extends HTMLElement {
  quranShaper;
  quranService;
  text;  
  ctx;
  outputScale;
  defaultSize = (1000 / 4600) * 72.0 // 15.65 pt = 20.869 px
  fontExpansion = false;
  tajweed = false;
  just = true;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.shadow.innerHTML = `
          <style media="screen">
            :host {             
              display: inline-block;
            }
          </style>
          <canvas></canvas>
        `;
    this.quranService = quranService;
    this.text = this.textContent;
  }

  connectedCallback() {
    this.canvas = this.shadow.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');

    this.just = this.hasAttribute("just")
      ? (this.getAttribute("just") === 'false' ? false : true)
      : true;

    this.fontExpansion = this.hasAttribute("expansion")
      ? (this.getAttribute("expansion") === 'false' ? false : true)
      : false;

    this.tajweed = this.hasAttribute("tajweed")
      ? (this.getAttribute("tajweed") === 'false' ? false : true)
      : false;

    this.quranService.promise.then((respone) => {
      this.quranShaper = respone;

      this.outputScale = window.devicePixelRatio;

      this.drawText();

    });

  }

  drawText() {

    const computedStyle = window.getComputedStyle(this)

    const fontSizeStyle = computedStyle.fontSize
    const fontSize = parseFloat(fontSizeStyle) 
    const scale = fontSize / this.defaultSize; // take into account the 96/72 difference

    const widthStyle = this.style.width

    const displayStyle = computedStyle.display
    const directiontyle = computedStyle.direction

    let autoWidth = displayStyle === "inline" || !widthStyle;

    let width;

    if (autoWidth) {
      const qswidth = this.quranShaper.shapeText(this.text, 0, scale, false, false, false, this.ctx);
      width = qswidth * scale;
    } else {
      width = this.offsetWidth;
    }

    const height = fontSize * 1.8 

    this.style.width = width + "px";
    this.style.height = height + "px";

    const canvas = this.ctx.canvas;

    const canvasWidth = width + (2 * this.defaultSize * scale)

    canvas.style.width = canvasWidth + "px";
    if (directiontyle == 'rtl') {
      canvas.style.marginRight = - this.defaultSize * scale + "px";
    } else {
      canvas.style.marginLeft = - this.defaultSize * scale + "px";
    }
    
    canvas.style.height = height + "px";

    canvas.width = canvasWidth * this.outputScale;
    canvas.height = height * this.outputScale;

    const totalscale = this.outputScale * scale;
    this.ctx.transform(totalscale, 0, 0, totalscale, canvas.width - (this.defaultSize * scale * this.outputScale), canvas.height * 2 / 3);

    this.quranService.clearCanvas(this.ctx);

    let wd;
    if (autoWidth) {
      wd = 0;
    } else {
      wd = width / (scale);
    }

    this.quranShaper.shapeText(this.text, wd, scale, this.just, this.tajweed, this.fontExpansion, this.ctx);

  }
}

customElements.define('dk-text', DFTextComponent);

export default DFTextComponent 
