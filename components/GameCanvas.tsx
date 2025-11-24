import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  INITIAL_GRAVITY,
  JUMP_STRENGTH,
  AIR_RESISTANCE,
  BASE_PIPE_SPEED,
  SPEED_INCREASE_RATE,
  SPEED_INCREASE_INTERVAL,
  BIRD_RADIUS,
  BIRD_X_POSITION,
  PIPE_WIDTH,
  MIN_PIPE_GAP,
  MAX_PIPE_GAP,
  PIPE_SPAWN_DISTANCE,
  GROUND_HEIGHT,
  COLOR_SKY,
  COLOR_BIRD,
  COLOR_BIRD_BORDER,
  COLOR_PIPE,
  COLOR_PIPE_BORDER,
  COLOR_GROUND,
  COLOR_GROUND_BORDER,
  STORAGE_HIGH_SCORE
} from '../constants';
import { GameState, Bird, Pipe } from '../types';
import { audioService } from '../services/audioService';

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Responsive State
  const [canvasSize, setCanvasSize] = useState({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
  const [scaleFactor, setScaleFactor] = useState(1);

  // Game State Refs (Mutable for performance in Loop)
  const gameState = useRef<GameState>(GameState.START);
  const bird = useRef<Bird>({ y: CANVAS_HEIGHT / 2, velocity: 0, rotation: 0 });
  const pipes = useRef<Pipe[]>([]);
  const score = useRef<number>(0);
  const currentSpeed = useRef<number>(BASE_PIPE_SPEED);
  const groundOffset = useRef<number>(0);
  const lastPipeX = useRef<number>(0);

  // UI State (Triggers re-renders)
  const [displayScore, setDisplayScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [currentGameState, setCurrentGameState] = useState<GameState>(GameState.START);

  // Load High Score
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_HIGH_SCORE);
    if (stored) setHighScore(parseInt(stored, 10));
  }, []);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      const margin = 0.9;
      const aspect = CANVAS_WIDTH / CANVAS_HEIGHT;
      let w = window.innerWidth * margin;
      let h = window.innerHeight * margin;

      if (w / h > aspect) {
        // Window is wider than game aspect -> limit by height
        w = h * aspect;
      } else {
        // Window is taller than game aspect -> limit by width
        h = w / aspect;
      }
      
      const newWidth = Math.floor(w);
      const newHeight = Math.floor(h);
      
      setCanvasSize({ width: newWidth, height: newHeight });
      setScaleFactor(newWidth / CANVAS_WIDTH);
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const spawnPipe = (startX: number) => {
    const gap = Math.floor(Math.random() * (MAX_PIPE_GAP - MIN_PIPE_GAP + 1)) + MIN_PIPE_GAP;
    const minPipeHeight = 50;
    const maxPipeHeight = CANVAS_HEIGHT - GROUND_HEIGHT - gap - minPipeHeight;
    const actualMaxHeight = Math.max(minPipeHeight, maxPipeHeight);
    const topHeight = Math.floor(Math.random() * (actualMaxHeight - minPipeHeight + 1)) + minPipeHeight;
    
    pipes.current.push({
      x: startX,
      topHeight: topHeight,
      passed: false,
      gap: gap
    });
    lastPipeX.current = startX;
  };

  const resetGame = () => {
    bird.current = { y: CANVAS_HEIGHT / 2, velocity: 0, rotation: 0 };
    pipes.current = [];
    score.current = 0;
    currentSpeed.current = BASE_PIPE_SPEED;
    setDisplayScore(0);
    gameState.current = GameState.START;
    setCurrentGameState(GameState.START);
    lastPipeX.current = CANVAS_WIDTH + 200;
  };

  const startGame = () => {
    gameState.current = GameState.PLAYING;
    setCurrentGameState(GameState.PLAYING);
    spawnPipe(CANVAS_WIDTH + 100);
    audioService.playJump();
    jump();
  };

  const jump = () => {
    bird.current.velocity = JUMP_STRENGTH;
    audioService.playJump();
  };

  const gameOver = () => {
    gameState.current = GameState.GAME_OVER;
    setCurrentGameState(GameState.GAME_OVER);
    audioService.playCrash();
    
    if (score.current > highScore) {
      setHighScore(score.current);
      localStorage.setItem(STORAGE_HIGH_SCORE, score.current.toString());
    }
  };

  const updatePhysics = () => {
    if (gameState.current !== GameState.PLAYING) {
      if (gameState.current === GameState.START) {
        const time = Date.now() / 300;
        bird.current.y = CANVAS_HEIGHT / 2 + Math.sin(time) * 10;
        bird.current.rotation = 0;
        groundOffset.current = (groundOffset.current + BASE_PIPE_SPEED) % 20;
      }
      return;
    }

    bird.current.velocity += INITIAL_GRAVITY;
    bird.current.velocity *= AIR_RESISTANCE;
    bird.current.y += bird.current.velocity;
    
    bird.current.rotation = Math.min(
      Math.PI / 2, 
      Math.max(-Math.PI / 4, bird.current.velocity * 0.05)
    );

    if (bird.current.y + BIRD_RADIUS >= CANVAS_HEIGHT - GROUND_HEIGHT) {
      bird.current.y = CANVAS_HEIGHT - GROUND_HEIGHT - BIRD_RADIUS;
      gameOver();
      return;
    }

    if (bird.current.y - BIRD_RADIUS <= 0) {
      bird.current.y = BIRD_RADIUS;
      bird.current.velocity = 0;
    }

    const birdLeft = BIRD_X_POSITION - BIRD_RADIUS + 4;
    const birdRight = BIRD_X_POSITION + BIRD_RADIUS - 4;
    const birdTop = bird.current.y - BIRD_RADIUS + 4;
    const birdBottom = bird.current.y + BIRD_RADIUS - 4;

    for (let i = pipes.current.length - 1; i >= 0; i--) {
      const p = pipes.current[i];
      p.x -= currentSpeed.current;

      const pipeLeft = p.x;
      const pipeRight = p.x + PIPE_WIDTH;

      if (birdRight > pipeLeft && birdLeft < pipeRight) {
        if (birdTop < p.topHeight || birdBottom > p.topHeight + p.gap) {
          gameOver();
          return;
        }
      }

      if (!p.passed && birdLeft > pipeRight) {
        p.passed = true;
        score.current += 1;
        setDisplayScore(score.current);
        audioService.playScore();

        if (score.current > 0 && score.current % SPEED_INCREASE_INTERVAL === 0) {
          currentSpeed.current += SPEED_INCREASE_RATE;
        }
      }

      if (p.x + PIPE_WIDTH < 0) {
        pipes.current.splice(i, 1);
      }
    }

    if (pipes.current.length === 0 || CANVAS_WIDTH - lastPipeX.current >= PIPE_SPAWN_DISTANCE) {
       const spawnX = lastPipeX.current + PIPE_SPAWN_DISTANCE;
       spawnPipe(spawnX);
    }

    groundOffset.current = (groundOffset.current + currentSpeed.current) % 20;
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    // Scaling Magic: Reset transform then scale to fit current canvas size
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset
    ctx.scale(canvasSize.width / CANVAS_WIDTH, canvasSize.height / CANVAS_HEIGHT);

    // 1. Sky
    ctx.fillStyle = COLOR_SKY;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 2. Pipes
    pipes.current.forEach(p => {
      ctx.fillStyle = COLOR_PIPE;
      ctx.fillRect(p.x, 0, PIPE_WIDTH, p.topHeight);
      ctx.strokeStyle = COLOR_PIPE_BORDER;
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x, 0, PIPE_WIDTH, p.topHeight);
      
      ctx.fillStyle = COLOR_PIPE_BORDER;
      ctx.fillRect(p.x - 2, p.topHeight - 20, PIPE_WIDTH + 4, 20);

      const bottomPipeY = p.topHeight + p.gap;
      const bottomPipeHeight = CANVAS_HEIGHT - GROUND_HEIGHT - bottomPipeY;
      
      if (bottomPipeHeight > 0) {
        ctx.fillStyle = COLOR_PIPE;
        ctx.fillRect(p.x, bottomPipeY, PIPE_WIDTH, bottomPipeHeight);
        ctx.strokeRect(p.x, bottomPipeY, PIPE_WIDTH, bottomPipeHeight);

        ctx.fillStyle = COLOR_PIPE_BORDER;
        ctx.fillRect(p.x - 2, bottomPipeY, PIPE_WIDTH + 4, 20);
      }
    });

    // 3. Ground
    ctx.fillStyle = COLOR_GROUND;
    ctx.fillRect(0, CANVAS_HEIGHT - GROUND_HEIGHT, CANVAS_WIDTH, GROUND_HEIGHT);
    ctx.fillStyle = COLOR_GROUND_BORDER;
    ctx.fillRect(0, CANVAS_HEIGHT - GROUND_HEIGHT, CANVAS_WIDTH, 4);
    
    ctx.strokeStyle = '#c4c88a';
    ctx.beginPath();
    for(let i = -20; i < CANVAS_WIDTH; i+=20) {
        ctx.moveTo(i - groundOffset.current, CANVAS_HEIGHT - GROUND_HEIGHT);
        ctx.lineTo(i - groundOffset.current + 10, CANVAS_HEIGHT);
    }
    ctx.stroke();


    // 4. Bird
    ctx.save();
    ctx.translate(BIRD_X_POSITION, bird.current.y);
    ctx.rotate(bird.current.rotation);
    
    ctx.beginPath();
    ctx.arc(0, 0, BIRD_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = COLOR_BIRD;
    ctx.fill();
    ctx.strokeStyle = COLOR_BIRD_BORDER;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(8, -8, 6, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(10, -8, 2, 0, Math.PI * 2);
    ctx.fillStyle = 'black';
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(-5, 5, 10, 6, 0.2, 0, Math.PI * 2);
    ctx.fillStyle = '#fce7b0';
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  };

  // Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use alpha: false for slight perf boost and to match sharp pixel look if needed
    // ctx.imageSmoothingEnabled = false; // Optional: for pixel art style, but we use vector shapes

    let animationFrameId: number;

    const render = () => {
      updatePhysics();
      draw(ctx);
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [canvasSize]); // Re-init loop if canvas resizes (though not strictly necessary if context persists, safer for scaling)

  // Input Handling
  const handleInput = useCallback((e: React.KeyboardEvent | React.MouseEvent | React.TouchEvent | KeyboardEvent) => {
    // If clicking a button, don't trigger game jump unless necessary
    // But for this game, any click restarts or jumps
    if (e.type === 'touchstart') {
       // e.preventDefault(); // Handled by CSS
    }

    if (gameState.current === GameState.START) {
      startGame();
    } else if (gameState.current === GameState.PLAYING) {
      jump();
    } else if (gameState.current === GameState.GAME_OVER) {
      resetGame();
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleInput(e);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleInput]);

  return (
    <div 
      ref={containerRef}
      className="relative group select-none outline-none shadow-2xl rounded-lg overflow-hidden" 
      tabIndex={0} 
      onClick={handleInput as any}
      onTouchStart={handleInput as any}
      style={{
        width: canvasSize.width,
        height: canvasSize.height
      }}
    >
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="block bg-sky-300 cursor-pointer touch-none"
        style={{ width: '100%', height: '100%' }}
      />
      
      {/* UI Layer - Scaled to match canvas size */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
            transform: `scale(${scaleFactor})`,
            transformOrigin: 'top left',
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT
        }}
      >
        <div className="absolute top-8 left-0 w-full text-center pointer-events-none">
            <span className="text-4xl font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] stroke-black" style={{WebkitTextStroke: '2px black'}}>
            {displayScore}
            </span>
        </div>

        {currentGameState === GameState.START && (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg pointer-events-none">
            <div className="bg-white/90 p-6 rounded-xl shadow-lg text-center animate-bounce">
                <h1 className="text-3xl font-bold text-slate-800 mb-2">Get Ready!</h1>
                <p className="text-slate-600 mb-4">Tap, Click, or Space</p>
                <div className="w-16 h-16 bg-amber-400 rounded-full mx-auto border-4 border-amber-700 flex items-center justify-center">
                    <div className="w-4 h-4 bg-white rounded-full translate-x-2 -translate-y-2 relative">
                        <div className="absolute w-1 h-1 bg-black rounded-full top-1 right-1"></div>
                    </div>
                </div>
            </div>
            </div>
        )}

        {currentGameState === GameState.GAME_OVER && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
            <div className="bg-[#ded895] border-4 border-[#543847] p-8 rounded-lg shadow-xl text-center w-64 pointer-events-auto cursor-default">
                <h2 className="text-3xl font-black text-[#e08028] mb-6 drop-shadow-sm" style={{WebkitTextStroke: '1px black'}}>GAME OVER</h2>
                
                <div className="flex justify-between mb-2">
                    <span className="text-[#e08028] font-bold">Score</span>
                    <span className="text-white font-bold text-xl drop-shadow-md stroke-black">{displayScore}</span>
                </div>
                <div className="flex justify-between mb-6 border-b-2 border-[#a59d65] pb-2">
                    <span className="text-[#e08028] font-bold">Best</span>
                    <span className="text-white font-bold text-xl drop-shadow-md stroke-black">{highScore}</span>
                </div>

                <button className="bg-[#56b0ca] hover:bg-[#70c5ce] text-white font-bold py-2 px-6 rounded-full border-2 border-white shadow-[0_4px_0_rgb(0,0,0,0.2)] active:shadow-none active:translate-y-1 transition-all">
                    RESTART
                </button>
            </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default GameCanvas;