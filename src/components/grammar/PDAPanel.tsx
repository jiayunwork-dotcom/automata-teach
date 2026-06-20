import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, StepBack, StepForward, PlayCircle, RefreshCw } from 'lucide-react';
import { useGrammarStore } from '../../stores/grammarStore';
import { formatPDATransitionLabel } from '../../engine/grammar/pda';
import type { PDATransition, PDAState, PDARunStep } from '../../engine/grammar/types';
import { EPSILON, END_MARKER } from '../../engine/grammar/types';
import { STATE_RADIUS } from '../../engine/types';

export function PDAPanel() {
  const parsedGrammar = useGrammarStore((s) => s.parsedGrammar);
  const pda = useGrammarStore((s) => s.pda);
  const buildPDA = useGrammarStore((s) => s.buildPDA);
  const pdaInput = useGrammarStore((s) => s.pdaInput);
  const setPDAInput = useGrammarStore((s) => s.setPDAInput);
  const pdaSteps = useGrammarStore((s) => s.pdaSteps);
  const pdaCurrentStep = useGrammarStore((s) => s.pdaCurrentStep);
  const pdaIsPlaying = useGrammarStore((s) => s.pdaIsPlaying);
  const pdaSpeed = useGrammarStore((s) => s.pdaSpeed);
  const runPDA = useGrammarStore((s) => s.runPDA);
  const setPDAStep = useGrammarStore((s) => s.setPDAStep);
  const setPDAPlaying = useGrammarStore((s) => s.setPDAPlaying);
  const setPDASpeed = useGrammarStore((s) => s.setPDASpeed);
  const pdaOffsetX = useGrammarStore((s) => s.pdaOffsetX);
  const pdaOffsetY = useGrammarStore((s) => s.pdaOffsetY);
  const pdaScale = useGrammarStore((s) => s.pdaScale);
  const setPDAView = useGrammarStore((s) => s.setPDAView);
  const movePDAState = useGrammarStore((s) => s.movePDAState);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const [draggingState, setDraggingState] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, origX: 0, origY: 0 });

  useEffect(() => {
    if (!pda && parsedGrammar.productions.length > 0) {
      buildPDA();
    }
  }, [parsedGrammar]);

  useEffect(() => {
    if (!pdaIsPlaying || pdaCurrentStep >= pdaSteps.length - 1) {
      if (pdaCurrentStep >= pdaSteps.length - 1) {
        setPDAPlaying(false);
      }
      return;
    }

    const stepDuration = 1200 / pdaSpeed;
    let lastTime = performance.now();
    let progress = 0;

    const tick = (now: number) => {
      const delta = now - lastTime;
      lastTime = now;
      progress += delta / stepDuration;

      if (progress >= 1) {
        progress = 0;
        if (pdaCurrentStep < pdaSteps.length - 1) {
          setPDAStep(pdaCurrentStep + 1);
        }
      }

      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [pdaIsPlaying, pdaCurrentStep, pdaSteps.length, pdaSpeed, setPDAStep, setPDAPlaying]);

  const currentStep: PDARunStep | null = pdaSteps[pdaCurrentStep] || null;

  const worldToScreen = useCallback((x: number, y: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: rect.width / 2 + pdaOffsetX + x * pdaScale,
      y: rect.height / 2 + pdaOffsetY + y * pdaScale,
    };
  }, [pdaOffsetX, pdaOffsetY, pdaScale]);

  const screenToWorld = useCallback((sx: number, sy: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (sx - rect.width / 2 - pdaOffsetX) / pdaScale,
      y: (sy - rect.height / 2 - pdaOffsetY) / pdaScale,
    };
  }, [pdaOffsetX, pdaOffsetY, pdaScale]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !pda) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const activeTransitionId = currentStep?.transitionId;
    const activeStateId = currentStep?.currentState;

    for (const t of pda.transitions) {
      drawTransition(ctx, t, pda.states, worldToScreen, t.id === activeTransitionId);
    }

    for (const s of pda.states) {
      drawState(ctx, s, worldToScreen, s.id === activeStateId);
    }
  }, [pda, pdaOffsetX, pdaOffsetY, pdaScale, currentStep, worldToScreen]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!pda) return;
    const rect = containerRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const { x: wx, y: wy } = screenToWorld(mx, my);

    for (const s of pda.states) {
      const dx = s.x - wx;
      const dy = s.y - wy;
      if (dx * dx + dy * dy <= STATE_RADIUS * STATE_RADIUS) {
        setDraggingState({ id: s.id, offsetX: dx, offsetY: dy });
        return;
      }
    }

    setIsDraggingCanvas(true);
    setDragStart({ x: mx, y: my, origX: pdaOffsetX, origY: pdaOffsetY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (draggingState) {
      const { x: wx, y: wy } = screenToWorld(mx, my);
      movePDAState(draggingState.id, wx - draggingState.offsetX, wy - draggingState.offsetY);
    } else if (isDraggingCanvas) {
      setPDAView(
        dragStart.origX + (mx - dragStart.x),
        dragStart.origY + (my - dragStart.y),
        pdaScale
      );
    }
  };

  const handleMouseUp = () => {
    setDraggingState(null);
    setIsDraggingCanvas(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(5, pdaScale * zoomFactor));
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const mouseWorldX = (mx - rect.width / 2 - pdaOffsetX) / pdaScale;
    const mouseWorldY = (my - rect.height / 2 - pdaOffsetY) / pdaScale;
    const newOffsetX = mx - rect.width / 2 - mouseWorldX * newScale;
    const newOffsetY = my - rect.height / 2 - mouseWorldY * newScale;

    setPDAView(newOffsetX, newOffsetY, newScale);
  };

  const handlePlayPause = () => {
    if (pdaSteps.length === 0) {
      runPDA();
      return;
    }
    if (pdaCurrentStep >= pdaSteps.length - 1) {
      setPDAStep(0);
    }
    setPDAPlaying(!pdaIsPlaying);
  };

  const isError = currentStep?.isError;
  const isAccept = currentStep?.isAccept;

  return (
    <div className="h-full flex flex-col bg-slate-900">
      <div className="px-4 py-3 border-b border-slate-700 bg-slate-800">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="font-semibold text-slate-200">下推自动机 (PDA)</h3>
          <button
            onClick={buildPDA}
            className="p-1.5 hover:bg-slate-700 rounded transition-colors"
            title="重新生成PDA"
          >
            <RefreshCw className="w-4 h-4 text-slate-400" />
          </button>
          <div className="flex-1" />
          <input
            type="text"
            value={pdaInput}
            onChange={(e) => setPDAInput(e.target.value)}
            placeholder="输入字符串..."
            className="w-36 px-3 py-1.5 bg-slate-900 border border-slate-600 rounded text-sm focus:outline-none focus:border-cyan-500 font-mono"
          />
          <button
            onClick={runPDA}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded text-sm font-medium transition-colors"
          >
            <PlayCircle className="w-4 h-4" />
            运行
          </button>
        </div>

        {pdaSteps.length > 0 && (
          <>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full transition-all duration-200 ${
                  isError ? 'bg-red-500' : isAccept ? 'bg-green-500' : 'bg-indigo-500'
                }`}
                style={{
                  width: `${((pdaCurrentStep + 1) / pdaSteps.length) * 100}%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>步骤 {pdaCurrentStep + 1} / {pdaSteps.length}</span>
              <span
                className={
                  isError
                    ? 'text-red-400 font-semibold'
                    : isAccept
                    ? 'text-green-400 font-semibold'
                    : ''
                }
              >
                {currentStep?.action}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={pdaSteps.length - 1}
              value={pdaCurrentStep}
              onChange={(e) => setPDAStep(parseInt(e.target.value))}
              className="w-full accent-indigo-500"
            />

            <div className="flex items-center justify-center gap-1 mt-3">
              <button
                onClick={() => setPDAStep(0)}
                className="p-2 hover:bg-slate-700 rounded transition-colors"
              >
                <SkipBack className="w-4 h-4 text-slate-300" />
              </button>
              <button
                onClick={() => setPDAStep(Math.max(0, pdaCurrentStep - 1))}
                disabled={pdaCurrentStep === 0}
                className="p-2 hover:bg-slate-700 rounded transition-colors disabled:opacity-40"
              >
                <StepBack className="w-4 h-4 text-slate-300" />
              </button>
              <button
                onClick={handlePlayPause}
                className={`p-3 rounded-full transition-colors ${
                  isError
                    ? 'bg-red-600 hover:bg-red-700'
                    : isAccept
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {pdaIsPlaying ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white" />
                )}
              </button>
              <button
                onClick={() => setPDAStep(Math.min(pdaSteps.length - 1, pdaCurrentStep + 1))}
                disabled={pdaCurrentStep >= pdaSteps.length - 1}
                className="p-2 hover:bg-slate-700 rounded transition-colors disabled:opacity-40"
              >
                <StepForward className="w-4 h-4 text-slate-300" />
              </button>
              <button
                onClick={() => setPDAStep(pdaSteps.length - 1)}
                className="p-2 hover:bg-slate-700 rounded transition-colors"
              >
                <SkipForward className="w-4 h-4 text-slate-300" />
              </button>
              <div className="ml-4 flex items-center gap-2">
                <span className="text-xs text-slate-500">速度:</span>
                <select
                  value={pdaSpeed}
                  onChange={(e) => setPDASpeed(parseFloat(e.target.value))}
                  className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={1}>1x</option>
                  <option value={2}>2x</option>
                  <option value={3}>3x</option>
                </select>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div
          ref={containerRef}
          className="flex-1 relative cursor-grab active:cursor-grabbing select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <canvas ref={canvasRef} className="w-full h-full" />

          {!pda && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500">
              请先输入文法规则以生成PDA
            </div>
          )}
        </div>

        {currentStep && pdaSteps.length > 0 && (
          <div className="w-48 border-l border-slate-700 bg-slate-800/50 flex flex-col overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-700">
              <h4 className="text-xs font-medium text-slate-400">状态</h4>
              <div className="mt-1 text-lg font-mono font-bold text-indigo-400">
                {currentStep.currentState}
              </div>
            </div>
            <div className="px-3 py-2 border-b border-slate-700">
              <h4 className="text-xs font-medium text-slate-400">剩余输入</h4>
              <div className="mt-1 font-mono text-sm text-amber-300 break-all">
                {currentStep.remainingInput || END_MARKER}
              </div>
            </div>
            <div className="flex-1 px-3 py-2 overflow-hidden flex flex-col">
              <h4 className="text-xs font-medium text-slate-400 mb-2">栈 (顶在上)</h4>
              <div className="flex-1 overflow-auto flex flex-col-reverse items-center gap-1 pb-2">
                {currentStep.stack.map((sym, i) => {
                  const fromTop = currentStep.stack.length - 1 - i;
                  return (
                    <div
                      key={i}
                      className={`w-full h-7 flex items-center justify-center font-mono text-sm rounded border transition-all ${
                        fromTop === 0
                          ? isError
                            ? 'bg-red-600 text-white border-red-400'
                            : 'bg-indigo-600 text-white border-indigo-400'
                          : sym === END_MARKER
                          ? 'bg-slate-700 text-slate-400 border-slate-600 italic'
                          : /^[A-Z]/.test(sym)
                          ? 'bg-slate-700 text-cyan-300 border-slate-600'
                          : 'bg-amber-900/40 text-amber-300 border-amber-700'
                      }`}
                    >
                      {sym}
                    </div>
                  );
                })}
                <div className="w-full h-1 bg-slate-600 rounded" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function drawState(
  ctx: CanvasRenderingContext2D,
  state: PDAState,
  worldToScreen: (x: number, y: number) => { x: number; y: number },
  isActive: boolean
) {
  const { x, y } = worldToScreen(state.x, state.y);
  const r = STATE_RADIUS;

  if (state.isStart) {
    ctx.beginPath();
    ctx.moveTo(x - r - 30, y);
    ctx.lineTo(x - r - 5, y);
    ctx.strokeStyle = isActive ? '#a78bfa' : '#94a3b8';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x - r - 5, y);
    ctx.lineTo(x - r - 12, y - 6);
    ctx.lineTo(x - r - 12, y + 6);
    ctx.closePath();
    ctx.fillStyle = isActive ? '#a78bfa' : '#94a3b8';
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = isActive ? '#4338ca' : '#1e293b';
  ctx.fill();
  ctx.strokeStyle = isActive ? '#a78bfa' : '#475569';
  ctx.lineWidth = isActive ? 3 : 2;
  ctx.stroke();

  if (state.isAccept) {
    ctx.beginPath();
    ctx.arc(x, y, r - 6, 0, Math.PI * 2);
    ctx.strokeStyle = isActive ? '#a78bfa' : '#475569';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = isActive ? '#fff' : '#e2e8f0';
  ctx.fillText(state.label, x, y);
}

function drawTransition(
  ctx: CanvasRenderingContext2D,
  t: PDATransition,
  states: PDAState[],
  worldToScreen: (x: number, y: number) => { x: number; y: number },
  isActive: boolean
) {
  const fromState = states.find((s) => s.id === t.from);
  const toState = states.find((s) => s.id === t.to);
  if (!fromState || !toState) return;

  const from = worldToScreen(fromState.x, fromState.y);
  const to = worldToScreen(toState.x, toState.y);

  if (t.from === t.to) {
    const r = STATE_RADIUS;
    const loopR = 30;
    const cx = from.x;
    const cy = from.y - r - loopR;

    ctx.beginPath();
    ctx.arc(cx, cy, loopR, 0.3, Math.PI - 0.3, true);
    ctx.strokeStyle = isActive ? '#a78bfa' : '#64748b';
    ctx.lineWidth = isActive ? 2.5 : 1.5;
    ctx.stroke();

    const arrowX = cx - loopR * Math.cos(0.3);
    const arrowY = cy + loopR * Math.sin(0.3);
    drawArrow(ctx, arrowX, arrowY, -0.7, isActive ? '#a78bfa' : '#64748b');

    const label = formatPDATransitionLabel(t);
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = isActive ? '#e9d5ff' : '#cbd5e1';
    ctx.fillText(label, cx, cy - loopR - 2);
  } else {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.1) return;

    const r = STATE_RADIUS;
    const nx = dx / dist;
    const ny = dy / dist;

    const startX = from.x + nx * r;
    const startY = from.y + ny * r;
    const endX = to.x - nx * r;
    const endY = to.y - ny * r;

    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    const perpX = -ny;
    const perpY = nx;
    const offset = 20;
    const ctrlX = midX + perpX * offset;
    const ctrlY = midY + perpY * offset;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
    ctx.strokeStyle = isActive ? '#a78bfa' : '#64748b';
    ctx.lineWidth = isActive ? 2.5 : 1.5;
    ctx.stroke();

    const angle = Math.atan2(endY - ctrlY, endX - ctrlX);
    drawArrow(ctx, endX, endY, angle, isActive ? '#a78bfa' : '#64748b');

    const label = formatPDATransitionLabel(t);
    const labelX = ctrlX + perpX * 10;
    const labelY = ctrlY + perpY * 10 - 5;

    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const metrics = ctx.measureText(label);
    const padX = 4;
    const padY = 2;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(
      labelX - metrics.width / 2 - padX,
      labelY - 8 - padY,
      metrics.width + padX * 2,
      16 + padY * 2
    );
    ctx.strokeStyle = isActive ? '#a78bfa' : '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      labelX - metrics.width / 2 - padX,
      labelY - 8 - padY,
      metrics.width + padX * 2,
      16 + padY * 2
    );

    ctx.fillStyle = isActive ? '#e9d5ff' : '#cbd5e1';
    ctx.fillText(label, labelX, labelY);
  }
}

function drawArrow(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, color: string) {
  const size = 8;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - size * Math.cos(angle - Math.PI / 6), y - size * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x - size * Math.cos(angle + Math.PI / 6), y - size * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}
