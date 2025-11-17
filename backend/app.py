"""
Flask API for Sokoban Solver
Handles HTTP requests from the React frontend
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from solver import SokobanSolver
import json

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Predefined levels
LEVELS = {
    'tutorial': [
        "  ####  ",
        "  #  ###",
        "  #$   #",
        "  # # @#",
        "###. ###",
        "#   ##  ",
        "########"
    ],
    'easy': [
        "#####",
        "#   #",
        "#$  #",
        "# .@#",
        "#####"
    ],
    'medium': [
        "  ##### ",
        "###   # ",
        "#.@$  # ",
        "### $.# ",
        "#.##$ # ",
        "# # . ##",
        "#$ *$ #",
        "#   .  #",
        "########"
    ],
    'hard': [
        "    #####",
        "    #   #",
        "    #$  #",
        "  ###  $##",
        "  #  $ $ #",
        "### # ## #",
        "#   # ## #####",
        "# $  $          #",
        "##### ### #@##  #",
        "    #     #######",
        "    #######"
    ]
}


@app.route('/api/solve', methods=['POST'])
def solve():
    """
    Solve a Sokoban puzzle
    
    Request body:
    {
        "map": ["####", "#@$#", ...],  // Game map
        "algorithm": "astar"            // bfs, dfs, or astar
    }
    
    Response:
    {
        "success": true,
        "path": ["U", "R", "D", ...],
        "nodes_explored": 123,
        "time": 0.045,
        "algorithm": "A*"
    }
    """
    try:
        data = request.json
        game_map = data.get('map')
        algorithm = data.get('algorithm', 'astar')
        
        if not game_map:
            return jsonify({
                'success': False,
                'error': 'No map provided'
            }), 400
        
        # Create solver and solve
        solver = SokobanSolver(game_map)
        result = solver.solve(algorithm)
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/levels', methods=['GET'])
def get_levels():
    """Get all predefined levels"""
    return jsonify({
        'success': True,
        'levels': LEVELS
    })


@app.route('/api/levels/<level_name>', methods=['GET'])
def get_level(level_name):
    """Get a specific level"""
    if level_name not in LEVELS:
        return jsonify({
            'success': False,
            'error': f'Level {level_name} not found'
        }), 404
    
    return jsonify({
        'success': True,
        'level': LEVELS[level_name]
    })


@app.route('/api/validate', methods=['POST'])
def validate_map():
    """
    Validate a game map
    
    Request body:
    {
        "map": ["####", "#@$#", ...]
    }
    
    Response:
    {
        "valid": true,
        "message": "Map is valid",
        "stats": {
            "boxes": 2,
            "goals": 2,
            "player": 1
        }
    }
    """
    try:
        data = request.json
        game_map = data.get('map')
        
        if not game_map:
            return jsonify({
                'valid': False,
                'message': 'No map provided'
            }), 400
        
        # Count elements
        player_count = 0
        box_count = 0
        goal_count = 0
        
        for row in game_map:
            player_count += row.count('@') + row.count('+')
            box_count += row.count('$') + row.count('*')
            goal_count += row.count('.') + row.count('*') + row.count('+')
        
        # Validation
        errors = []
        if player_count != 1:
            errors.append(f'Must have exactly 1 player (found {player_count})')
        if box_count == 0:
            errors.append('Must have at least 1 box')
        if goal_count == 0:
            errors.append('Must have at least 1 goal')
        if box_count != goal_count:
            errors.append(f'Number of boxes ({box_count}) must equal number of goals ({goal_count})')
        
        if errors:
            return jsonify({
                'valid': False,
                'message': '; '.join(errors),
                'stats': {
                    'boxes': box_count,
                    'goals': goal_count,
                    'player': player_count
                }
            })
        
        return jsonify({
            'valid': True,
            'message': 'Map is valid',
            'stats': {
                'boxes': box_count,
                'goals': goal_count,
                'player': player_count
            }
        })
    
    except Exception as e:
        return jsonify({
            'valid': False,
            'message': str(e)
        }), 500


@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'message': 'Sokoban Solver API is running'
    })


if __name__ == '__main__':
    print("\n" + "="*50)
    print("🎮 Sokoban Solver API Server")
    print("="*50)
    print("\nEndpoints:")
    print("  POST /api/solve       - Solve a puzzle")
    print("  GET  /api/levels      - Get all levels")
    print("  GET  /api/levels/<id> - Get specific level")
    print("  POST /api/validate    - Validate a map")
    print("  GET  /api/health      - Health check")
    print("\nServer starting on http://localhost:5000")
    print("="*50 + "\n")
    
    app.run(debug=True, host='0.0.0.0', port=5000)