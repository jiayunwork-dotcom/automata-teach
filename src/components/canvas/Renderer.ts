import type { Automaton, State, Transition, ViewTransform, ExecutionStep } from '../../engine/types';
import { STATE_RADIUS } from '../../engine/types';
import { getStateById, countTransitionsBetween } from '../../engine/utils';

export interface RenderOptions {
  hoveredStateId: string | null;
  hoveredTransitionId: string | null;
  selectedStateId: string | null;
  selectedTransitionId: string | null;
  activeStates: string[];
  flashingTransitionIds: string[];
  executionMode: 'DFA' | 'NFA';
  animationProgress: number;
  drawingTransition?: { fromStateId: string; mouseX: number; mouseY: number } | null;
  highlightStates?: string[];
  highlightColor?: string;
  dimUnreachable?: boolean;
  unreachableStates?: string[];
}

const COLORS = {
  background: '#0f172a',
  grid: '#1e293b',
  gridMajor: '#334155',
  stateFill: '#1e293b',
  stateStroke: '#64748b',
  stateText: '#f1f5f9',
  startStateStroke: '#10b981',
  acceptStateStroke: '#ef4444',
  activeState: '#06b6d4',
  hoverStroke: '#fbbf24',
  selectedStroke: '#fbbf24',
  transition: '#94a3b8',
  transitionText: '#e2e8f0',
  flashTransition: '#06b6d4',
  epsilon: '#a78bfa',
};

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  setSize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  render(
    automaton: Automaton,
    view: ViewTransform,
    options: RenderOptions
  ) {
    const ctx = this.ctx;
    const { width, height } = this;

    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2 + view.offsetX, height / 2 + view.offsetY);
    ctx.scale(view.scale, view.scale);

    this.drawGrid(view.scale);
    this.drawTransitions(automaton, options);
    this.drawStates(automaton, options);

    if (options.drawingTransition) {
      this.drawDrawingTransition(automaton, options.drawingTransition);
    }

    ctx.restore();
  }

  private drawGrid(scale: number) {
    const ctx = this.ctx;
    const gridSize = 50;
    const majorEvery = 5;

    const viewLeft = -this.width / 2 - 2000;
    const viewRight = this.width / 2 + 2000;
    const viewTop = -this.height / 2 - 2000;
    const viewBottom = this.height / 2 + 2000;

    ctx.lineWidth = 1 / scale;

    for (let x = Math.floor(viewLeft / gridSize) * gridSize; x <= viewRight; x += gridSize) {
      const isMajor = (x / gridSize) % majorEvery === 0;
      ctx.strokeStyle = isMajor ? COLORS.gridMajor : COLORS.grid;
      ctx.beginPath();
      ctx.moveTo(x, viewTop);
      ctx.lineTo(x, viewBottom);
      ctx.stroke();
    }

    for (let y = Math.floor(viewTop / gridSize) * gridSize; y <= viewBottom; y += gridSize) {
      const isMajor = (y / gridSize) % majorEvery === 0;
      ctx.strokeStyle = isMajor ? COLORS.gridMajor : COLORS.grid;
      ctx.beginPath();
      ctx.moveTo(viewLeft, y);
      ctx.lineTo(viewRight, y);
      ctx.stroke();
    }
  }

  private drawStates(automaton: Automaton, options: RenderOptions) {
    for (const state of automaton.states) {
      this.drawState(state, options);
    }
  }

  private drawState(state: State, options: RenderOptions) {
    const ctx = this.ctx;
    const { x, y } = state;
    const r = STATE_RADIUS;

    const isActive = options.activeStates.includes(state.id);
    const isHovered = options.hoveredStateId === state.id;
    const isSelected = options.selectedStateId === state.id;
    const isHighlighted = options.highlightStates?.includes(state.id);
    const isUnreachable = options.dimUnreachable && options.unreachableStates?.includes(state.id);

    let fillColor = COLORS.stateFill;
    let strokeColor = COLORS.stateStroke;
    let strokeWidth = 2;

    if (state.isStart) {
      strokeColor = COLORS.startStateStroke;
      strokeWidth = 3;
    }
    if (state.isAccept) {
      strokeColor = COLORS.acceptStateStroke;
      strokeWidth = 3;
    }
    if (isActive) {
      const pulse = 1 + 0.05 * Math.sin(Date.now() / 200);
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(pulse, pulse);
      ctx.translate(-x, -y);
      strokeColor = COLORS.activeState;
      strokeWidth = 4;
      fillColor = '#164e63';
    }
    if (isHovered) {
      strokeColor = COLORS.hoverStroke;
      strokeWidth = 3;
    }
    if (isSelected) {
      strokeColor = COLORS.selectedStroke;
      strokeWidth = 4;
    }
    if (isHighlighted && options.highlightColor) {
      strokeColor = options.highlightColor;
      strokeWidth = 3;
    }
    if (isUnreachable) {
      fillColor = '#1e293b';
      strokeColor = '#334155';
    }

    if (isUnreachable) {
      ctx.globalAlpha = 0.4;
    }

    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (state.isAccept) {
      ctx.beginPath();
      ctx.arc(x, y, r - 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (state.isStart) {
      const arrowX = x - r - 30;
      const arrowY = y;
      ctx.strokeStyle = COLORS.startStateStroke;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(arrowX - 15, arrowY);
      ctx.lineTo(arrowX, arrowY);
      ctx.stroke();

      ctx.fillStyle = COLORS.startStateStroke;
      ctx.beginPath();
      ctx.moveTo(arrowX, arrowY - 5);
      ctx.lineTo(arrowX + 6, arrowY);
      ctx.lineTo(arrowX, arrowY + 5);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = isUnreachable ? '#64748b' : COLORS.stateText;
    ctx.font = 'bold 16px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.label, x, y);

    if (isUnreachable) {
      ctx.globalAlpha = 1;
    }

    if (isActive && options.executionMode === 'DFA') {
      ctx.restore();
    }
  }

  private drawTransitions(automaton: Automaton, options: RenderOptions) {
    for (const t of automaton.transitions) {
      this.drawTransition(automaton, t, options);
    }
  }

  private drawTransition(
    automaton: Automaton,
    t: Transition,
    options: RenderOptions
  ) {
    const ctx = this.ctx;
    const fromState = getStateById(automaton, t.from);
    const toState = getStateById(automaton, t.to);
    if (!fromState || !toState) return;

    const isFlashing = options.flashingTransitionIds.includes(t.id);
    const isHovered = options.hoveredTransitionId === t.id;
    const isSelected = options.selectedTransitionId === t.id;
    const isEpsilon = t.symbols.includes('ε');

    let strokeColor = COLORS.transition;
    let strokeWidth = 1.5;

    if (isFlashing) {
      const flash = 0.5 + 0.5 * Math.sin(Date.now() / 100);
      strokeColor = COLORS.flashTransition;
      strokeWidth = 3 + flash * 2;
    }
    if (isHovered) {
      strokeColor = COLORS.hoverStroke;
      strokeWidth = 2.5;
    }
    if (isSelected) {
      strokeColor = COLORS.selectedStroke;
      strokeWidth = 3;
    }
    if (isEpsilon && !isFlashing) {
      strokeColor = COLORS.epsilon;
    }

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.fillStyle = strokeColor;

    if (t.from === t.to) {
      this.drawSelfLoop(fromState, t, strokeColor);
    } else {
      this.drawEdge(automaton, fromState, toState, t, strokeColor);
    }
  }

  private drawSelfLoop(state: State, t: Transition, color: string) {
    const ctx = this.ctx;
    const r = STATE_RADIUS;
    const loopRadius = 25;
    const loopOffset = 15;

    const cx = state.x;
    const cy = state.y - r - loopOffset;

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.arc(cx, cy, loopRadius, 0.3 * Math.PI, 0.7 * Math.PI, true);
    ctx.stroke();

    const startAngle = 0.3 * Math.PI;
    const endAngle = 0.7 * Math.PI;
    const exitX = cx + loopRadius * Math.cos(startAngle);
    const exitY = cy + loopRadius * Math.sin(startAngle);

    const angle = startAngle + Math.PI / 2 - 0.3;
    const arrowSize = 8;
    ctx.beginPath();
    ctx.moveTo(exitX, exitY);
    ctx.lineTo(
      exitX - arrowSize * Math.cos(angle - Math.PI / 6),
      exitY - arrowSize * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      exitX - arrowSize * Math.cos(angle + Math.PI / 6),
      exitY - arrowSize * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();

    const labelX = cx;
    const labelY = cy - loopRadius - 8;
    this.drawTransitionLabel(labelX, labelY, t.symbols, color);
  }

  private drawEdge(
    automaton: Automaton,
    from: State,
    to: State,
    t: Transition,
    color: string
  ) {
    const ctx = this.ctx;
    const r = STATE_RADIUS;

    const count = countTransitionsBetween(automaton, t.from, t.to);
    const reverseCount = countTransitionsBetween(automaton, t.to, t.from);
    const hasReverse = reverseCount > 0;

    let index = 0;
    let i = 0;
    for (const trans of automaton.transitions) {
      if (trans.from === t.from && trans.to === t.to) {
        if (trans.id === t.id) {
          index = i;
          break;
        }
        i++;
      }
    }

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / dist;
    const ny = dy / dist;

    const perpX = -ny;
    const perpY = nx;

    let offset = 0;
    if (hasReverse) {
      offset = 15;
    } else if (count > 1) {
      offset = (index - (count - 1) / 2) * 20;
    }

    const startX = from.x + nx * r + perpX * offset;
    const startY = from.y + ny * r + perpY * offset;
    const endX = to.x - nx * r + perpX * offset;
    const endY = to.y - ny * r + perpY * offset;

    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;

    if (hasReverse || count > 1) {
      const controlX = midX + perpX * 30;
      const controlY = midY + perpY * 30;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(controlX, controlY, endX, endY);
      ctx.stroke();

      const angle = Math.atan2(endY - controlY, endX - controlX);
      this.drawArrowHead(endX, endY, angle, color);

      const labelX = controlX + perpX * 10;
      const labelY = controlY + perpY * 10 - 10;
      this.drawTransitionLabel(labelX, labelY, t.symbols, color);
    } else {
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      const angle = Math.atan2(endY - startY, endX - startX);
      this.drawArrowHead(endX, endY, angle, color);

      const labelX = midX - perpX * 8;
      const labelY = midY - perpY * 8 - 10;
      this.drawTransitionLabel(labelX, labelY, t.symbols, color);
    }
  }

  private drawArrowHead(x: number, y: number, angle: number, color: string) {
    const ctx = this.ctx;
    const arrowSize = 10;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(
      x - arrowSize * Math.cos(angle - Math.PI / 6),
      y - arrowSize * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      x - arrowSize * Math.cos(angle + Math.PI / 6),
      y - arrowSize * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
  }

  private drawTransitionLabel(
    x: number,
    y: number,
    symbols: string[],
    color: string
  ) {
    const ctx = this.ctx;
    const text = symbols.join(',');

    ctx.font = '13px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const paddingX = 6;
    const paddingY = 3;
    const textWidth = ctx.measureText(text).width;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(
      x - textWidth / 2 - paddingX,
      y - 8 - paddingY,
      textWidth + paddingX * 2,
      16 + paddingY * 2
    );

    ctx.fillStyle = color;
    ctx.fillText(text, x, y - 8);
  }

  private drawDrawingTransition(
    automaton: Automaton,
    drawing: { fromStateId: string; mouseX: number; mouseY: number }
  ) {
    const ctx = this.ctx;
    const fromState = getStateById(automaton, drawing.fromStateId);
    if (!fromState) return;

    const r = STATE_RADIUS;
    const dx = drawing.mouseX - fromState.x;
    const dy = drawing.mouseY - fromState.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < r) return;

    const nx = dx / dist;
    const ny = dy / dist;

    const startX = fromState.x + nx * r;
    const startY = fromState.y + ny * r;

    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(drawing.mouseX, drawing.mouseY);
    ctx.stroke();

    ctx.setLineDash([]);

    const angle = Math.atan2(drawing.mouseY - startY, drawing.mouseX - startX);
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(drawing.mouseX, drawing.mouseY);
    ctx.lineTo(
      drawing.mouseX - 10 * Math.cos(angle - Math.PI / 6),
      drawing.mouseY - 10 * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      drawing.mouseX - 10 * Math.cos(angle + Math.PI / 6),
      drawing.mouseY - 10 * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
  }

  public getStateAtPosition(
    automaton: Automaton,
    worldX: number,
    worldY: number
  ): State | null {
    for (let i = automaton.states.length - 1; i >= 0; i--) {
      const s = automaton.states[i];
      const dx = worldX - s.x;
      const dy = worldY - s.y;
      if (dx * dx + dy * dy <= STATE_RADIUS * STATE_RADIUS) {
        return s;
      }
    }
    return null;
  }

  public getTransitionAtPosition(
    automaton: Automaton,
    worldX: number,
    worldY: number
  ): Transition | null {
    const hitDistance = 8;

    for (let i = automaton.transitions.length - 1; i >= 0; i--) {
      const t = automaton.transitions[i];
      const from = getStateById(automaton, t.from);
      const to = getStateById(automaton, t.to);
      if (!from || !to) continue;

      if (t.from === t.to) {
        const loopRadius = 25;
        const loopOffset = 15;
        const cx = from.x;
        const cy = from.y - STATE_RADIUS - loopOffset;
        const dist = Math.sqrt((worldX - cx) ** 2 + (worldY - cy) ** 2);
        if (Math.abs(dist - loopRadius) < hitDistance + 5) {
          return t;
        }
      } else {
        const count = countTransitionsBetween(automaton, t.from, t.to);
        const reverseCount = countTransitionsBetween(automaton, t.to, t.from);
        const hasReverse = reverseCount > 0;

        let index = 0;
        let idx = 0;
        for (const trans of automaton.transitions) {
          if (trans.from === t.from && trans.to === t.to) {
            if (trans.id === t.id) {
              index = idx;
              break;
            }
            idx++;
          }
        }

        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const nx = dx / dist;
        const ny = dy / dist;
        const perpX = -ny;
        const perpY = nx;

        let offset = 0;
        if (hasReverse) {
          offset = 15;
        } else if (count > 1) {
          offset = (index - (count - 1) / 2) * 20;
        }

        const r = STATE_RADIUS;
        const startX = from.x + nx * r + perpX * offset;
        const startY = from.y + ny * r + perpY * offset;
        const endX = to.x - nx * r + perpX * offset;
        const endY = to.y - ny * r + perpY * offset;

        if (hasReverse || count > 1) {
          const midX = (startX + endX) / 2;
          const midY = (startY + endY) / 2;
          const controlX = midX + perpX * 30;
          const controlY = midY + perpY * 30;

          if (
            this.isPointNearQuadraticCurve(
              worldX,
              worldY,
              startX,
              startY,
              controlX,
              controlY,
              endX,
              endY,
              hitDistance
            )
          ) {
            return t;
          }
        } else {
          const lineDist = this.pointToLineDistance(
            worldX,
            worldY,
            startX,
            startY,
            endX,
            endY
          );
          if (lineDist < hitDistance) {
            return t;
          }
        }
      }
    }
    return null;
  }

  private pointToLineDistance(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    return Math.sqrt((px - xx) ** 2 + (py - yy) ** 2);
  }

  private isPointNearQuadraticCurve(
    px: number,
    py: number,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    threshold: number
  ): boolean {
    const steps = 20;
    let minDist = Infinity;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const mt = 1 - t;
      const x = mt * mt * x0 + 2 * mt * t * x1 + t * t * x2;
      const y = mt * mt * y0 + 2 * mt * t * y1 + t * t * y2;
      const dist = Math.sqrt((px - x) ** 2 + (py - y) ** 2);
      if (dist < minDist) minDist = dist;
    }
    return minDist < threshold;
  }
}
