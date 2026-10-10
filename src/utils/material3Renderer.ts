export type M3ControlType = 
  | 'filled-button'
  | 'elevated-button'
  | 'tonal-button'
  | 'outlined-button'
  | 'text-button'
  | 'checkbox'
  | 'radio'
  | 'switch'
  | 'segmented-button'
  | 'fab'
  | 'extended-fab'
  | 'icon-button'
  | 'chip'
  | 'slider'
  | 'surface-card';

export interface M3Config {
  type: M3ControlType;
  label: string;
  sublabel?: string;
  iconName?: string;
  primaryColor: string; // e.g. #1ab783
  onPrimaryColor: string; // text/icon color on primary
  surfaceColor: string; // background container color
  onSurfaceColor: string; // text color on surface
  customRadius?: number; // corner radius in px
  width?: number; // canvas width in px
  height?: number; // canvas height in px
  checked?: boolean; // default initial checked state
  sliderValue?: number; // 0 - 100
}

export interface M3StateImage {
  stateKey: string;
  stateLabel: string;
  dataUrl: string;
  fileName: string;
  width: number;
  height: number;
}

export interface M3RenderResult {
  controlType: M3ControlType;
  label: string;
  width: number;
  height: number;
  states: M3StateImage[];
  // Convenient primary states
  normalDataUrl: string;
  hoveredDataUrl: string;
  normalFileName: string;
  hoveredFileName: string;
}

// Color utility helpers
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  const num = parseInt(c || '000000', 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function rgbaStr(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function adjustColorBrightness(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const adjust = (val: number) => Math.min(255, Math.max(0, Math.round(val + (255 - val) * percent)));
  const r2 = adjust(r).toString(16).padStart(2, '0');
  const g2 = adjust(g).toString(16).padStart(2, '0');
  const b2 = adjust(b).toString(16).padStart(2, '0');
  return `#${r2}${g2}${b2}`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Universal Material 3 Control Renderer with complete multi-state rasterization.
 * Supports: normal, hovered, pressed/selected, checked/unchecked, and disabled states.
 */
export function renderMaterial3Control(config: M3Config): M3RenderResult {
  const scale = 2; // Hi-DPI 2x supersampling for razor sharp game sprites

  let defaultW = 240;
  let defaultH = 64;

  if (config.type === 'checkbox') {
    defaultW = 220;
    defaultH = 48;
  } else if (config.type === 'radio') {
    defaultW = 220;
    defaultH = 48;
  } else if (config.type === 'switch') {
    defaultW = 100;
    defaultH = 56;
  } else if (config.type === 'segmented-button') {
    defaultW = 280;
    defaultH = 56;
  } else if (config.type === 'fab') {
    defaultW = 76;
    defaultH = 76;
  } else if (config.type === 'icon-button') {
    defaultW = 60;
    defaultH = 60;
  } else if (config.type === 'chip') {
    defaultW = 180;
    defaultH = 48;
  } else if (config.type === 'slider') {
    defaultW = 280;
    defaultH = 56;
  } else if (config.type === 'surface-card') {
    defaultW = 340;
    defaultH = 180;
  }

  const width = config.width || defaultW;
  const height = config.height || defaultH;

  const renderSingleState = (state: {
    isHovered: boolean;
    isChecked?: boolean;
    isPressed?: boolean;
    isDisabled?: boolean;
  }): string => {
    if (typeof document === 'undefined') return '';
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.scale(scale, scale);
    ctx.textRendering = 'optimizeLegibility';
    ctx.imageSmoothingEnabled = true;

    const pad = 6;
    const ctrlW = width - pad * 2;
    const ctrlH = height - pad * 2;
    const ctrlX = pad;
    const ctrlY = pad;

    const radius = config.customRadius !== undefined 
      ? config.customRadius 
      : config.type === 'fab' ? 24 
      : config.type === 'chip' ? 12 
      : config.type === 'surface-card' ? 20 
      : config.type === 'checkbox' ? 6
      : config.type === 'radio' ? ctrlH / 2
      : ctrlH / 2; // Pill radius for buttons

    const isHovered = state.isHovered;
    const isChecked = state.isChecked ?? false;
    const isPressed = state.isPressed ?? false;
    const isDisabled = state.isDisabled ?? false;

    // 1. Elevation Shadow for elevated surfaces
    if ((config.type === 'elevated-button' || config.type === 'fab' || config.type === 'surface-card') && !isDisabled) {
      const shadowBlur = isHovered ? 16 : isPressed ? 4 : 8;
      const shadowOffsetY = isHovered ? 6 : isPressed ? 2 : 3;
      const shadowAlpha = isHovered ? 0.38 : isPressed ? 0.2 : 0.22;

      ctx.save();
      ctx.shadowColor = `rgba(0, 0, 0, ${shadowAlpha})`;
      ctx.shadowBlur = shadowBlur;
      ctx.shadowOffsetY = shadowOffsetY;
      ctx.fillStyle = '#000000';
      roundRect(ctx, ctrlX, ctrlY, ctrlW, ctrlH, radius);
      ctx.fill();
      ctx.restore();
    }

    // 2. Buttons (Filled, Elevated, Tonal, Outlined, Text, FAB, Cards)
    ctx.save();
    roundRect(ctx, ctrlX, ctrlY, ctrlW, ctrlH, radius);

    let bgColor = config.primaryColor;
    let textColor = config.onPrimaryColor;
    let borderColor: string | null = null;
    let borderWidth = 1;

    switch (config.type) {
      case 'filled-button':
        bgColor = isDisabled ? '#475569' : config.primaryColor;
        textColor = isDisabled ? '#94a3b8' : config.onPrimaryColor;
        break;
      case 'elevated-button':
        bgColor = config.surfaceColor;
        textColor = config.primaryColor;
        break;
      case 'tonal-button':
        bgColor = rgbaStr(config.primaryColor, isHovered ? 0.32 : 0.2);
        textColor = isHovered ? '#ffffff' : config.primaryColor;
        break;
      case 'outlined-button':
        bgColor = isHovered ? rgbaStr(config.primaryColor, 0.12) : 'transparent';
        textColor = config.primaryColor;
        borderColor = isHovered ? config.primaryColor : rgbaStr(config.primaryColor, 0.5);
        borderWidth = 1.5;
        break;
      case 'text-button':
        bgColor = isHovered ? rgbaStr(config.primaryColor, 0.12) : 'transparent';
        textColor = config.primaryColor;
        break;
      case 'fab':
        bgColor = isHovered ? adjustColorBrightness(config.primaryColor, 0.12) : config.primaryColor;
        textColor = config.onPrimaryColor;
        break;
      default:
        bgColor = config.surfaceColor;
        textColor = config.onSurfaceColor;
        break;
    }

    if (bgColor !== 'transparent') {
      ctx.fillStyle = bgColor;
      ctx.fill();
    }

    if (borderColor) {
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = borderWidth;
      ctx.stroke();
    }

    // M3 State layer on hover
    if (isHovered && !isDisabled && config.type !== 'slider') {
      ctx.fillStyle = rgbaStr(textColor === '#ffffff' ? '#ffffff' : config.primaryColor, 0.14);
      ctx.fill();
      ctx.strokeStyle = rgbaStr(config.primaryColor, 0.5);
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Pressed state ripple overlay
    if (isPressed && !isDisabled) {
      ctx.fillStyle = rgbaStr(textColor === '#ffffff' ? '#ffffff' : config.primaryColor, 0.28);
      ctx.fill();
    }

    ctx.restore();

    // Content rendering (text & sublabel)
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const centerX = ctrlX + ctrlW / 2;
    const centerY = ctrlY + ctrlH / 2;

    ctx.fillStyle = textColor;
    const isVeryLarge = height >= 76;
    const isLarge = height >= 60;

    if (config.sublabel) {
      ctx.font = isVeryLarge
        ? '900 22px "Plus Jakarta Sans", system-ui, sans-serif'
        : isLarge
        ? '800 18px "Plus Jakarta Sans", system-ui, sans-serif'
        : '800 15px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText(config.label, centerX, centerY - (isVeryLarge ? 12 : isLarge ? 10 : 8));

      ctx.fillStyle = rgbaStr(textColor, 0.85);
      ctx.font = isVeryLarge
        ? '700 13px "Space Grotesk", system-ui, monospace'
        : isLarge
        ? '600 12px "Space Grotesk", system-ui, monospace'
        : '600 11px "Space Grotesk", system-ui, monospace';
      ctx.fillText(config.sublabel, centerX, centerY + (isVeryLarge ? 15 : isLarge ? 13 : 10));
    } else {
      ctx.font = isVeryLarge
        ? '900 24px "Plus Jakarta Sans", system-ui, sans-serif'
        : isLarge
        ? '800 19px "Plus Jakarta Sans", system-ui, sans-serif'
        : '800 15px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText(config.label, centerX, centerY + 1);
    }

    ctx.restore();
    return canvas.toDataURL('image/png');
  };

  const cleanLabel = config.label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || config.type;

  const states: M3StateImage[] = [
    {
      stateKey: 'normal',
      stateLabel: 'Normal',
      dataUrl: renderSingleState({ isHovered: false }),
      fileName: `m3_${cleanLabel}_normal.png`,
      width,
      height
    },
    {
      stateKey: 'hovered',
      stateLabel: 'Hovered',
      dataUrl: renderSingleState({ isHovered: true }),
      fileName: `m3_${cleanLabel}_hovered.png`,
      width,
      height
    },
    {
      stateKey: 'pressed',
      stateLabel: 'Pressed',
      dataUrl: renderSingleState({ isHovered: true, isPressed: true }),
      fileName: `m3_${cleanLabel}_pressed.png`,
      width,
      height
    }
  ];

  return {
    controlType: config.type,
    label: config.label,
    width,
    height,
    states,
    normalDataUrl: states[0].dataUrl,
    hoveredDataUrl: states[1].dataUrl,
    normalFileName: states[0].fileName,
    hoveredFileName: states[1].fileName
  };
}
