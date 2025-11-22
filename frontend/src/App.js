import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, SkipForward, Zap, Brain, Layers, Server } from 'lucide-react';
import './App.css';

const API_URL = 'http://localhost:5000/api';

const SokobanFrontend = () => {
  // State Management
  const [gameState, setGameState] = useState(null);
  const [solution, setSolution] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [algorithm, setAlgorithm] = useState('astar');
  const [solving, setSolving] = useState(false);
  const [stats, setStats] = useState(null);
  const [apiStatus, setApiStatus] = useState('checking');
  const [currentDifficulty, setCurrentDifficulty] = useState('tutorial');
  const [currentLevelMap, setCurrentLevelMap] = useState(null);

  // REMOVE THE HARDCODED LEVELS ARRAY - We'll fetch from backend instead

  // Check API health on mount
  useEffect(() => {
    const checkAPI = async () => {
      try {
        const response = await fetch(`${API_URL}/health`);
        if (response.ok) {
          setApiStatus('connected');
          // Load initial level after API is connected
          loadRandomLevel('tutorial');
        } else {
          setApiStatus('disconnected');
        }
      } catch (error) {
        setApiStatus('disconnected');
      }
    };
    checkAPI();
  }, []);

  // Animation effect
  useEffect(() => {
    if (isPlaying && solution && currentStep < solution.length) {
      const timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 500);
      return () => clearTimeout(timer);
    } else if (currentStep >= solution?.length) {
      setIsPlaying(false);
    }
  }, [isPlaying, currentStep, solution]);

  // Parse game map
  const parseMap = (map) => {
    const state = {
      player: null,
      boxes: [],
      goals: [],
      walls: [],
      width: Math.max(...map.map(row => row.length)),
      height: map.length
    };

    for (let y = 0; y < map.length; y++) {
      for (let x = 0; x < map[y].length; x++) {
        const cell = map[y][x];
        if (cell === '@' || cell === '+') {
          state.player = { x, y };
        }
        if (cell === '$' || cell === '*') {
          state.boxes.push({ x, y });
        }
        if (cell === '.' || cell === '*' || cell === '+') {
          state.goals.push({ x, y });
        }
        if (cell === '#') {
          state.walls.push(`${x},${y}`);
        }
      }
    }

    return state;
  };

  // Initialize game
  const initializeGame = (map) => {
    const state = parseMap(map);
    setGameState([state]);
    setSolution(null);
    setCurrentStep(0);
    setIsPlaying(false);
    setStats(null);
    setCurrentLevelMap(map);
  };

  // Load random level from backend
  // Update the loadRandomLevel function

// Update loadRandomLevel to show level number

  const loadRandomLevel = async (difficulty) => {
    if (apiStatus !== 'connected') {
      setStats({ error: 'API server is not running. Please start the Flask server.' });
      return;
    }

    setSolving(true);

    try {
      const response = await fetch(`${API_URL}/levels/${difficulty}`);
      const result = await response.json();

      if (result.success) {
        setCurrentDifficulty(difficulty);
        initializeGame(result.level);
        
        setStats({ 
          info: `Loaded ${difficulty} level ${result.levelIndex}/${result.totalLevels}` 
        });
      } else {
        setStats({ error: result.error || 'Failed to load level' });
      }
    } catch (error) {
      setStats({ error: `API Error: ${error.message}. Make sure Flask server is running.` });
    }

    setSolving(false);
  };

  // Apply move to state
  const applyMove = (state, move) => {
    const newState = JSON.parse(JSON.stringify(state));
    const { x, y } = newState.player;
    
    const moves = {
      'U': { dx: 0, dy: -1 },
      'D': { dx: 0, dy: 1 },
      'L': { dx: -1, dy: 0 },
      'R': { dx: 1, dy: 0 }
    };

    const { dx, dy } = moves[move];
    const newX = x + dx;
    const newY = y + dy;

    // Check if pushing a box
    const boxIndex = newState.boxes.findIndex(b => b.x === newX && b.y === newY);
    if (boxIndex !== -1) {
      newState.boxes[boxIndex] = { x: newX + dx, y: newY + dy };
    }

    newState.player = { x: newX, y: newY };
    return newState;
  };

  // Get current state
  const getCurrentState = () => {
    if (!gameState || currentStep >= gameState.length) {
      return gameState?.[gameState.length - 1];
    }
    return gameState[currentStep];
  };

  // Check if goal reached
  const isGoal = (state) => {
    if (!state) return false;
    return state.boxes.every(box => 
      state.goals.some(goal => goal.x === box.x && goal.y === box.y)
    );
  };

  // Solve with API
  const solveWithAPI = async () => {
    if (apiStatus !== 'connected') {
      setStats({ error: 'API server is not running. Please start the Flask server.' });
      return;
    }

    if (!currentLevelMap) {
      setStats({ error: 'No level loaded. Please select a difficulty first.' });
      return;
    }

    setSolving(true);
    setStats(null);

    try {
      const response = await fetch(`${API_URL}/solve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          map: currentLevelMap,
          algorithm: algorithm
        })
      });

      const result = await response.json();

      if (result.success) {
        setSolution(result.path);
        setCurrentStep(0);
        
        // Build game states from solution
        const states = [gameState[0]];
        let currentState = gameState[0];
        
        for (const move of result.path) {
          currentState = applyMove(currentState, move);
          states.push(currentState);
        }
        
        setGameState(states);
        setStats({
          algorithm: result.algorithm,
          moves: result.path.length,
          nodesExplored: result.nodes_explored,
          time: (result.time * 1000).toFixed(2)
        });
      } else {
        setStats({ error: result.error || 'Failed to solve puzzle' });
      }
    } catch (error) {
      setStats({ error: `API Error: ${error.message}. Make sure Flask server is running.` });
    }

    setSolving(false);
  };

  // Render game board
  const renderGameBoard = () => {
    const state = getCurrentState();
    if (!state) return null;

    // Create a 2D grid representation
    const grid = Array(state.height).fill(null).map(() => 
      Array(state.width).fill(' ')
    );

    // Place walls
    state.walls.forEach(wallPos => {
      const [x, y] = wallPos.split(',').map(Number);
      if (y < state.height && x < state.width) {
        grid[y][x] = '#';
      }
    });

    // Place goals
    state.goals.forEach(goal => {
      if (grid[goal.y][goal.x] === ' ') {
        grid[goal.y][goal.x] = '.';
      }
    });

    // Place boxes
    state.boxes.forEach(box => {
      const isOnGoal = state.goals.some(g => g.x === box.x && g.y === box.y);
      grid[box.y][box.x] = isOnGoal ? '*' : '$';
    });

    // Place player
    const isPlayerOnGoal = state.goals.some(g => 
      g.x === state.player.x && g.y === state.player.y
    );
    grid[state.player.y][state.player.x] = isPlayerOnGoal ? '+' : '@';

    return grid;
  };

  return (
    <div className="app-container">
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '2rem'
      }}>
        {/* Header Card */}
        <div className="card" style={{gridColumn: '1 / -1'}}>
          <div style={{textAlign: 'center'}}>
            <h1 className="text-5xl font-bold mb-2" style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '0.5rem'
            }}>
              🎮 Sokoban AI Solver
            </h1>
            <p className="text-gray-600">
              Watch intelligent algorithms solve warehouse puzzles in real-time
            </p>
          </div>
        </div>

        {/* Game Board Card */}
        <div className="card" style={{gridColumn: '1 / -1'}}>
          <h3 className="text-xl font-bold mb-4 text-center">
            Game Board - {currentDifficulty.toUpperCase()}
          </h3>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '400px'
          }}>
            {renderGameBoard() ? (
              <div className="game-board">
                {renderGameBoard().map((row, y) => (
                  <div key={y} className="game-row">
                    {row.map((cell, x) => {
                      let cellClass = 'game-cell ';
                      switch(cell) {
                        case '#': cellClass += 'cell-wall'; break;
                        case '@': cellClass += 'cell-player'; break;
                        case '+': cellClass += 'cell-player-on-goal'; break;
                        case '$': cellClass += 'cell-box'; break;
                        case '*': cellClass += 'cell-box-on-goal'; break;
                        case '.': cellClass += 'cell-goal'; break;
                        default: cellClass += 'cell-floor';
                      }
                      
                      return (
                        <div key={x} className={cellClass}>
                          {cell === '@' && '🚶'}
                          {cell === '+' && '🚶'}
                          {cell === '$' && '📦'}
                          {cell === '*' && '✅'}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{textAlign: 'center', color: '#6b7280'}}>
                <p>Loading game...</p>
                <p style={{fontSize: '0.875rem', marginTop: '0.5rem'}}>
                  Click a difficulty button below to start
                </p>
              </div>
            )}
          </div>

          {/* Win Message */}
          {getCurrentState() && isGoal(getCurrentState()) && (
            <div style={{
              textAlign: 'center',
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: '#d1fae5',
              borderRadius: '0.5rem'
            }}>
              <p className="success-message">
                🎉 Puzzle Solved! All boxes on goals! 🎉
              </p>
            </div>
          )}
        </div>

        {/* Controls Card */}
        <div className="card">
          <h3 className="text-xl font-bold mb-4" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <Play size={24} />
            Controls
          </h3>
          <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
            <button 
              onClick={solveWithAPI} 
              disabled={solving || apiStatus !== 'connected' || !currentLevelMap}
              className="btn btn-primary"
            >
              {solving ? (
                <>
                  <div className="loading-spinner"></div>
                  Solving...
                </>
              ) : (
                <>
                  <Zap size={20} />
                  Solve with AI
                </>
              )}
            </button>

            {solution && solution.length > 0 && (
              <>
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="btn btn-success"
                >
                  {isPlaying ? (
                    <>
                      <Pause size={20} />
                      Pause Animation
                    </>
                  ) : (
                    <>
                      <Play size={20} />
                      Play Solution
                    </>
                  )}
                </button>

                <button 
                  onClick={() => setCurrentStep(prev => Math.min(prev + 1, solution.length))}
                  disabled={currentStep >= solution.length}
                  className="btn btn-secondary"
                >
                  <SkipForward size={20} />
                  Next Step
                </button>
              </>
            )}

            <button 
              onClick={() => loadRandomLevel(currentDifficulty)}
              className="btn btn-warning"
              disabled={apiStatus !== 'connected'}
            >
              <RotateCcw size={20} />
              New Level (Same Difficulty)
            </button>
          </div>

          {/* Progress Bar */}
          {solution && solution.length > 0 && (
            <div className="progress-container">
              <div className="progress-info">
                <span>Progress</span>
                <span>{currentStep} / {solution.length}</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{width: `${(currentStep / solution.length) * 100}%`}}
                ></div>
              </div>
              {solution && (
                <div className="move-sequence">
                  <div className="move-sequence-label">Solution Path:</div>
                  <div className="move-sequence-text">
                    {solution.map((move, i) => (
                      <span 
                        key={i}
                        className={i < currentStep ? 'move-current' : ''}
                      >
                        {move}
                      </span>
                    )).reduce((prev, curr) => [prev, ' → ', curr])}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Algorithm Selection Card */}
        <div className="card">
          <h3 className="text-xl font-bold mb-4" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <Brain size={24} />
            Algorithm
          </h3>
          <div className="radio-group">
            {[
              {value: 'astar', label: 'A* Search', desc: 'Optimal & Fast (Recommended)'},
              {value: 'bfs', label: 'BFS', desc: 'Guarantees shortest path'},
              {value: 'dfs', label: 'DFS', desc: 'Memory efficient'}
            ].map(({value, label, desc}) => (
              <label key={value} className="radio-option">
                <input
                  type="radio"
                  value={value}
                  checked={algorithm === value}
                  onChange={(e) => setAlgorithm(e.target.value)}
                />
                <div className="radio-label">
                  <span className="radio-title">{label}</span>
                  <span className="radio-description">{desc}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Level Selection Card */}
        <div className="card">
          <h3 className="text-xl font-bold mb-4" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <Layers size={24} />
            Random Levels
          </h3>
          
          <div className="mb-2">
            <p style={{fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.75rem'}}>
              🎲 Each click loads a different puzzle from the category
            </p>
          </div>

          <div className="level-grid">
            {[
              { name: 'Tutorial', id: 'tutorial', emoji: '🎓', count: 4 },
              { name: 'Easy', id: 'easy', emoji: '🟢', count: 4 },
              { name: 'Medium', id: 'medium', emoji: '🟡', count: 4 },
              { name: 'Hard', id: 'hard', emoji: '🔴', count: 4 }
            ].map((level) => (
              <button
                key={level.id}
                onClick={() => loadRandomLevel(level.id)}
                disabled={solving || apiStatus !== 'connected'}
                className={`level-btn ${currentDifficulty === level.id ? 'level-btn-active' : 'level-btn-random'}`}
              >
                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem'}}>
                  <span style={{fontSize: '1.5rem'}}>{level.emoji}</span>
                  <span style={{fontWeight: '600'}}>{level.name}</span>
                  <span style={{fontSize: '0.75rem', opacity: 0.8}}>{level.count} levels</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* API Status Card */}
        <div className="card">
          <h3 className="text-xl font-bold mb-4" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <Server size={24} />
            API Status
          </h3>
          <div className={`api-status api-status-${apiStatus}`}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: apiStatus === 'connected' ? '#10b981' : 
                             apiStatus === 'disconnected' ? '#ef4444' : '#6b7280'
            }}></div>
            <span style={{textTransform: 'capitalize'}}>{apiStatus}</span>
          </div>
          {apiStatus === 'disconnected' && (
            <div className="error-message" style={{marginTop: '1rem'}}>
              ⚠️ Flask server not running. Start it with: <code>python app.py</code>
            </div>
          )}
        </div>

        {/* Statistics Card */}
        {stats && (
          <div className="card" style={{gridColumn: '1 / -1'}}>
            <h3 className="text-xl font-bold mb-4">📊 Statistics</h3>
            {stats.error ? (
              <p className="error-message">{stats.error}</p>
            ) : stats.info ? (
              <p style={{color: '#059669', fontWeight: '500', textAlign: 'center', fontSize: '1.25rem'}}>
                ✓ {stats.info}
              </p>
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
      </div>
    </div>
  );
};

export default SokobanFrontend;