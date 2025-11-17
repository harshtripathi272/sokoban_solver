import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, SkipForward, Zap, Brain, Layers, Server } from 'lucide-react';
import './App.css';

const SokobanFrontend = () => {
  const API_URL = 'http://localhost:5000/api';
  
  const levels = [
    {
      name: "Tutorial",
      id: "tutorial",
      map: [
        "  ####  ",
        "  #  ###",
        "  #$   #",
        "  # # @#",
        "###. ###",
        "#   ##  ",
        "########"
      ]
    },
    {
      name: "Easy",
      id: "easy",
      map: [
        "######",
        "#   #",
        "# $ @ #",
        "# .   #",
        "#######"
      ]
    },
    {
      name: "Medium",
      id: "medium",
      map: [
        "########",
        "#      #",
        "# $$ @ #",
        "# ..   #",
        "##      #",
        "########",
        
      ]
    },
    {
      name: "Hard",
      id: "hard",
      map: [
        "#########",
        "#       #",
        "# $$$ @ #",
        "# ...   #",
        "#       #",
        "#########",
        
      ]
    }
  ];

  const [currentLevel, setCurrentLevel] = useState(0);
  const [gameState, setGameState] = useState(null);
  const [solution, setSolution] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [algorithm, setAlgorithm] = useState('astar');
  const [solving, setSolving] = useState(false);
  const [stats, setStats] = useState(null);
  const [apiStatus, setApiStatus] = useState('checking');
  const animationRef = useRef(null);

  useEffect(() => {
    checkApiHealth();
    initializeGame(levels[currentLevel].map);
  }, [currentLevel]);

  useEffect(() => {
    if (isPlaying && solution && solution.length > 0 && currentStep < solution.length) {
      animationRef.current = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 300);
    } else if (solution && currentStep >= solution.length) {
      setIsPlaying(false);
    }
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [isPlaying, currentStep, solution]);

  const checkApiHealth = async () => {
    try {
      const response = await fetch(`${API_URL}/health`);
      if (response.ok) {
        setApiStatus('connected');
      } else {
        setApiStatus('error');
      }
    } catch (error) {
      setApiStatus('disconnected');
    }
  };

  const initializeGame = (map) => {
    const state = parseMap(map);
    setGameState(state);
    setSolution(null);
    setCurrentStep(0);
    setIsPlaying(false);
    setStats(null);
  };

  const parseMap = (map) => {
    let player = null;
    const boxes = [];
    const goals = [];
    const walls = new Set();
    
    map.forEach((row, y) => {
      [...row].forEach((cell, x) => {
        const pos = `${x},${y}`;
        if (cell === '@' || cell === '+') player = { x, y };
        if (cell === '$' || cell === '*') boxes.push({ x, y, id: boxes.length });
        if (cell === '.' || cell === '*' || cell === '+') goals.push({ x, y });
        if (cell === '#') walls.add(pos);
      });
    });
    
    return { player, boxes, goals, walls, width: map[0].length, height: map.length, map };
  };

  const getCurrentState = () => {
    if (!gameState) return null;
    if (!solution || solution.length === 0 || currentStep === 0) return gameState;
    
    try {
      let state = gameState;
      for (let i = 0; i < currentStep && i < solution.length; i++) {
        state = applyMove(state, solution[i]);
      }
      return state;
    } catch (error) {
      console.error('Error in getCurrentState:', error);
      return gameState;
    }
  };

  const applyMove = (state, move) => {
    // Deep clone the state properly
    const newState = {
      player: { x: state.player.x, y: state.player.y },
      boxes: state.boxes.map(b => ({ x: b.x, y: b.y, id: b.id })),
      goals: state.goals.map(g => ({ x: g.x, y: g.y })),
      walls: state.walls, // Keep reference to the same Set
      width: state.width,
      height: state.height,
      map: state.map
    };
    
    const { x, y } = newState.player;
    const dirs = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
    const [dx, dy] = dirs[move];
    const newX = x + dx;
    const newY = y + dy;
    
    newState.player = { x: newX, y: newY };
    
    const boxIndex = newState.boxes.findIndex(b => b.x === newX && b.y === newY);
    if (boxIndex !== -1) {
      newState.boxes[boxIndex] = { 
        x: newX + dx, 
        y: newY + dy, 
        id: newState.boxes[boxIndex].id 
      };
    }
    
    return newState;
  };

  const isGoal = (state) => {
    if (!state) return false;
    return state.boxes.every(box => 
      state.goals.some(goal => goal.x === box.x && goal.y === box.y)
    );
  };

  const solveWithAPI = async () => {
    if (apiStatus !== 'connected') {
      setStats({ error: 'API server is not running. Please start the Flask server.' });
      return;
    }

    setSolving(true);
    setIsPlaying(false);
    setCurrentStep(0);
    setStats(null);

    try {
      const response = await fetch(`${API_URL}/solve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          map: gameState.map,
          algorithm: algorithm
        })
      });

      const result = await response.json();

      if (result.success) {
        setSolution(result.path);
        setStats({
          moves: result.path.length,
          nodesExplored: result.nodes_explored,
          time: (result.time * 1000).toFixed(2),
          algorithm: result.algorithm
        });
      } else {
        setSolution(null);
        setStats({ error: result.error || 'Failed to solve puzzle' });
      }
    } catch (error) {
      setSolution(null);
      setStats({ error: `API Error: ${error.message}. Make sure Flask server is running.` });
    }

    setSolving(false);
  };

  const renderCell = (x, y, state) => {
    if (!state) return <div className="game-cell cell-floor"></div>;
    
    const pos = `${x},${y}`;
    const isWall = state.walls.has(pos);
    const isPlayer = state.player.x === x && state.player.y === y;
    const box = state.boxes.find(b => b.x === x && b.y === y);
    const isGoalPos = state.goals.some(g => g.x === x && g.y === y);
    
    let cellClass = "game-cell";
    let content = '';
    
    if (isWall) {
      cellClass += " cell-wall";
    } else if (isPlayer) {
      cellClass += isGoalPos ? " cell-player-on-goal" : " cell-player";
      content = "🤖";
    } else if (box) {
      cellClass += isGoalPos ? " cell-box-on-goal" : " cell-box";
      content = "📦";
    } else if (isGoalPos) {
      cellClass += " cell-goal";
      content = "🎯";
    } else {
      cellClass += " cell-floor";
    }
    
    return <div key={`${x}-${y}`} className={cellClass}>{content}</div>;
  };

  const state = getCurrentState();

  if (!gameState) {
    return (
      <div className="app-container" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh'}}>
        <div style={{fontSize: '1.5rem', color: '#6b7280'}}>Loading game...</div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div style={{maxWidth: '1200px', margin: '0 auto'}}>
        {/* Header */}
        <div className="text-center mb-8">
          <h1 style={{fontSize: '3rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem'}}>
            🎮 Sokoban AI Solver
          </h1>
          <p style={{color: '#6b7280', fontSize: '1.125rem'}}>Python Backend + React Frontend</p>
          
          {/* API Status */}
          <div className={`api-status api-status-${apiStatus}`}>
            <Server size={16} />
            {apiStatus === 'connected' && <span>✓ API Connected</span>}
            {apiStatus === 'disconnected' && <span>✗ API Disconnected - Start Flask server</span>}
            {apiStatus === 'checking' && <span>Checking API...</span>}
          </div>
        </div>

        {/* Main Grid */}
        <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem'}}>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem'}}>
            
            {/* Game Board Section */}
            <div className="card" style={{gridColumn: 'span 2'}}>
              <div className="mb-4" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <h2 className="text-2xl font-bold">Level: {levels[currentLevel].name}</h2>
                {isGoal(state) && (
                  <div className="success-message">🎉 Solved!</div>
                )}
              </div>
              
              {/* Game Board */}
              <div className="mb-6" style={{display: 'flex', justifyContent: 'center'}}>
                <div className="game-board">
                  {Array.from({ length: state.height }).map((_, y) => (
                    <div key={y} className="game-row">
                      {Array.from({ length: state.width }).map((_, x) => renderCell(x, y, state))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Control Buttons */}
              <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center'}}>
                <button
                  onClick={solveWithAPI}
                  disabled={solving || apiStatus !== 'connected'}
                  className="btn btn-primary"
                >
                  <Zap size={20} />
                  {solving ? "Solving..." : "Solve with Python AI"}
                </button>
                
                {solution && (
                  <>
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="btn btn-success"
                    >
                      {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                      {isPlaying ? "Pause" : "Play"}
                    </button>
                    
                    <button
                      onClick={() => setCurrentStep(0)}
                      className="btn btn-warning"
                    >
                      <RotateCcw size={20} />
                      Reset
                    </button>
                    
                    <button
                      onClick={() => setCurrentStep(solution.length)}
                      className="btn btn-secondary"
                    >
                      <SkipForward size={20} />
                      End
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Algorithm Selection */}
            <div className="card">
              <h3 className="text-xl font-bold mb-4" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <Brain size={24} />
                Algorithm
              </h3>
              <div className="radio-group">
                {[
                  { value: 'astar', label: 'A* (Best)', desc: 'Optimal & Fast' },
                  { value: 'bfs', label: 'BFS', desc: 'Guarantees shortest' },
                  { value: 'dfs', label: 'DFS', desc: 'Memory efficient' }
                ].map(algo => (
                  <label key={algo.value} className="radio-option">
                    <input
                      type="radio"
                      value={algo.value}
                      checked={algorithm === algo.value}
                      onChange={(e) => setAlgorithm(e.target.value)}
                    />
                    <div className="radio-label">
                      <span className="radio-title">{algo.label}</span>
                      <span className="radio-description">{algo.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Level Selection */}
            <div className="card">
              <h3 className="text-xl font-bold mb-4" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <Layers size={24} />
                Levels
              </h3>
              <div className="level-grid">
                {levels.map((level, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentLevel(idx)}
                    className={currentLevel === idx ? 'level-btn level-btn-active' : 'level-btn level-btn-inactive'}
                  >
                    {level.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Statistics */}
            {stats && (
              <div className="card">
                <h3 className="text-xl font-bold mb-4">📊 Statistics</h3>
                {stats.error ? (
                  <p className="error-message">{stats.error}</p>
                ) : (
                  <div className="stats-grid">
                    <div className="stat-row">
                      <span className="stat-label">Algorithm:</span>
                      <span className="stat-value">{stats.algorithm}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Solution Length:</span>
                      <span className="stat-value">{stats.moves} moves</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Nodes Explored:</span>
                      <span className="stat-value">{stats.nodesExplored}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Time:</span>
                      <span className="stat-value">{stats.time}ms</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Solution Progress */}
            {solution && (
              <div className="card">
                <h3 className="text-xl font-bold mb-4">Solution Progress</h3>
                <div className="progress-container">
                  <div className="progress-info">
                    <span>Step {currentStep} / {solution.length}</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${(currentStep / solution.length) * 100}%` }}
                    />
                  </div>
                </div>
                {currentStep > 0 && (
                  <div className="move-sequence">
                    <div className="move-sequence-label">Move sequence:</div>
                    <div className="move-sequence-text">
                      {solution.slice(Math.max(0, currentStep - 10), currentStep).join(' → ')}
                      {currentStep < solution.length && (
                        <span className="move-current"> → {solution[currentStep]}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="card mt-8">
          <h3 className="text-xl font-bold mb-4">Legend</h3>
          <div className="legend-grid">
            <div className="legend-item">
              <span className="legend-icon">🤖</span>
              <span className="legend-text">Player</span>
            </div>
            <div className="legend-item">
              <span className="legend-icon">📦</span>
              <span className="legend-text">Box</span>
            </div>
            <div className="legend-item">
              <span className="legend-icon">🎯</span>
              <span className="legend-text">Goal</span>
            </div>
            <div className="legend-item">
              <div className="legend-box" style={{backgroundColor: '#1f2937'}}></div>
              <span className="legend-text">Wall</span>
            </div>
            <div className="legend-item">
              <div className="legend-box" style={{backgroundColor: '#4ade80'}}></div>
              <span className="legend-text">Box on Goal</span>
            </div>
          </div>
        </div>

        {/* Setup Instructions */}
        <div className="card mt-8">
          <h3 className="text-xl font-bold mb-4">🔧 Setup Instructions</h3>
          <div className="setup-grid">
            <div className="setup-card">
              <h4 className="setup-title">Backend (Python):</h4>
              <pre className="setup-code">pip install flask flask-cors
python app.py</pre>
            </div>
            <div className="setup-card">
              <h4 className="setup-title">Frontend (React):</h4>
              <pre className="setup-code">npm install lucide-react
npm start</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SokobanFrontend;