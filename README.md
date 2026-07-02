# Sokoban AI Solver

A Sokoban puzzle solver with a Python/Flask backend and a React frontend. The backend implements BFS, DFS, and A* search to solve puzzles; the frontend lets you pick a level and algorithm and watch the solution play out on the board.

## Features

- Three search algorithms: BFS, DFS, A* (Manhattan-distance heuristic)
- 16 built-in levels across four difficulties: tutorial, easy, medium, hard
- Random level picker per difficulty (avoids repeating the last level served)
- Map validation endpoint (checks player/box/goal counts)
- React UI with step-by-step animation, play/pause, and live stats (time, nodes explored, move count)

## Project Structure

```
sokoban_solver/
├── backend/
│   ├── app.py            # Flask REST API
│   ├── solver.py         # SokobanState + SokobanSolver (BFS/DFS/A*)
│   ├── levels.py         # Predefined levels + random level picker
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.js        # Main UI component
│   │   ├── App.css
│   │   └── index.js
│   └── package.json
└── venv/                 # Python virtual environment (backend)
```

## Requirements

- Python 3.8+
- Node.js 14+ and npm

## Setup and Run

### Backend

```bash
cd backend
python -m venv venv          # if not already created
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
python app.py
```

The API starts on `http://localhost:5000`.

### Frontend

```bash
cd frontend
npm install
npm start
```

The UI starts on `http://localhost:3000` and talks to the API at `http://localhost:5000/api`.

## Map Format

Levels are lists of strings using these symbols:

| Symbol | Meaning |
|--------|---------|
| `#` | Wall |
| `@` | Player |
| `+` | Player on goal |
| `$` | Box |
| `*` | Box on goal |
| `.` | Goal |
| ` ` | Floor |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/solve` | Solve a map with `algorithm`: `bfs`, `dfs`, or `astar` |
| GET | `/api/levels` | Get all predefined levels |
| GET | `/api/levels/<difficulty>` | Get a random level for a difficulty |
| POST | `/api/validate` | Validate a map (player/box/goal counts) |
| GET | `/api/health` | Health check |

Example:

```bash
curl -X POST http://localhost:5000/api/solve \
  -H "Content-Type: application/json" \
  -d '{"map": ["#####","#   #","#$. #","# @ #","#####"], "algorithm": "astar"}'
```

Response:

```json
{
  "success": true,
  "path": ["L", "D", "D"],
  "nodes_explored": 42,
  "time": 0.045,
  "algorithm": "A*"
}
```

## Algorithms

- **A\*** — uses `f(n) = g(n) + h(n)` with a Manhattan-distance-to-nearest-goal heuristic on box positions. Optimal and fastest of the three in practice.
- **BFS** — explores level by level, guarantees the shortest path, but uses more memory.
- **DFS** — explores depth-first with a max depth of 50, low memory use, not guaranteed optimal.

All algorithms cap exploration at 10,000 nodes to avoid runaway search.

## Notes

- CORS is enabled on the Flask app so the React dev server can call it directly.
- State hashing/equality in `SokobanSolver` is based on player position and box positions (goals and walls are fixed per puzzle).
