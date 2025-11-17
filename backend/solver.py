"""
Sokoban Solver - AI Logic Backend
Implements BFS, DFS, and A* algorithms
"""

from collections import deque
from typing import List, Tuple, Set, Optional, Dict
import heapq
import time
import json


class SokobanState:
    """Represents a game state"""
    
    def __init__(self, player: Tuple[int, int], boxes: List[Tuple[int, int]], 
                 goals: List[Tuple[int, int]], walls: Set[Tuple[int, int]],
                 width: int, height: int):
        self.player = player
        self.boxes = tuple(sorted(boxes))  # Tuple for hashing
        self.goals = tuple(sorted(goals))
        self.walls = walls
        self.width = width
        self.height = height
    
    def __hash__(self):
        return hash((self.player, self.boxes))
    
    def __eq__(self, other):
        return self.player == other.player and self.boxes == other.boxes
    
    def is_goal(self) -> bool:
        """Check if all boxes are on goals"""
        return set(self.boxes) == set(self.goals)
    
    def copy(self):
        """Create a copy of the state"""
        return SokobanState(
            self.player,
            list(self.boxes),
            list(self.goals),
            self.walls,
            self.width,
            self.height
        )


class SokobanSolver:
    """AI Solver for Sokoban puzzles"""
    
    def __init__(self, game_map: List[str]):
        self.initial_state = self._parse_map(game_map)
        self.moves = {'U': (0, -1), 'D': (0, 1), 'L': (-1, 0), 'R': (1, 0)}
    
    def _parse_map(self, game_map: List[str]) -> SokobanState:
        """Parse the game map and extract initial state"""
        player = None
        boxes = []
        goals = []
        walls = set()
        
        height = len(game_map)
        width = max(len(row) for row in game_map)
        
        for y, row in enumerate(game_map):
            for x, cell in enumerate(row):
                if cell == '@' or cell == '+':
                    player = (x, y)
                if cell == '$' or cell == '*':
                    boxes.append((x, y))
                if cell == '.' or cell == '*' or cell == '+':
                    goals.append((x, y))
                if cell == '#':
                    walls.add((x, y))
        
        return SokobanState(player, boxes, goals, walls, width, height)
    
    def _get_valid_moves(self, state: SokobanState) -> List[str]:
        """Get all valid moves from current state"""
        valid_moves = []
        px, py = state.player
        
        for direction, (dx, dy) in self.moves.items():
            new_x, new_y = px + dx, py + dy
            
            # Check if new position is a wall
            if (new_x, new_y) in state.walls:
                continue
            
            # Check if there's a box at the new position
            if (new_x, new_y) in state.boxes:
                # Check if we can push the box
                box_new_x, box_new_y = new_x + dx, new_y + dy
                
                # Box would hit a wall or another box
                if (box_new_x, box_new_y) in state.walls or \
                   (box_new_x, box_new_y) in state.boxes:
                    continue
            
            valid_moves.append(direction)
        
        return valid_moves
    
    def _apply_move(self, state: SokobanState, move: str) -> SokobanState:
        """Apply a move and return new state"""
        dx, dy = self.moves[move]
        px, py = state.player
        new_x, new_y = px + dx, py + dy
        
        new_boxes = list(state.boxes)
        
        # Check if pushing a box
        if (new_x, new_y) in state.boxes:
            box_idx = new_boxes.index((new_x, new_y))
            new_boxes[box_idx] = (new_x + dx, new_y + dy)
        
        return SokobanState(
            (new_x, new_y),
            new_boxes,
            list(state.goals),
            state.walls,
            state.width,
            state.height
        )
    
    def _heuristic(self, state: SokobanState) -> int:
        """Manhattan distance heuristic for A*"""
        total_distance = 0
        
        for box in state.boxes:
            min_distance = float('inf')
            for goal in state.goals:
                distance = abs(box[0] - goal[0]) + abs(box[1] - goal[1])
                min_distance = min(min_distance, distance)
            total_distance += min_distance
        
        return total_distance
    
    def solve_bfs(self, max_nodes: int = 10000) -> Optional[Dict]:
        """Solve using Breadth-First Search"""
        start_time = time.time()
        
        queue = deque([(self.initial_state, [])])
        visited = {self.initial_state}
        nodes_explored = 0
        
        while queue and nodes_explored < max_nodes:
            state, path = queue.popleft()
            nodes_explored += 1
            
            if state.is_goal():
                return {
                    'success': True,
                    'path': path,
                    'nodes_explored': nodes_explored,
                    'time': time.time() - start_time,
                    'algorithm': 'BFS'
                }
            
            for move in self._get_valid_moves(state):
                new_state = self._apply_move(state, move)
                
                if new_state not in visited:
                    visited.add(new_state)
                    queue.append((new_state, path + [move]))
        
        return {
            'success': False,
            'error': 'No solution found or timeout',
            'nodes_explored': nodes_explored,
            'time': time.time() - start_time
        }
    
    def solve_dfs(self, max_nodes: int = 10000, max_depth: int = 50) -> Optional[Dict]:
        """Solve using Depth-First Search"""
        start_time = time.time()
        
        stack = [(self.initial_state, [])]
        visited = {self.initial_state}
        nodes_explored = 0
        
        while stack and nodes_explored < max_nodes:
            state, path = stack.pop()
            nodes_explored += 1
            
            if len(path) > max_depth:
                continue
            
            if state.is_goal():
                return {
                    'success': True,
                    'path': path,
                    'nodes_explored': nodes_explored,
                    'time': time.time() - start_time,
                    'algorithm': 'DFS'
                }
            
            for move in self._get_valid_moves(state):
                new_state = self._apply_move(state, move)
                
                if new_state not in visited:
                    visited.add(new_state)
                    stack.append((new_state, path + [move]))
        
        return {
            'success': False,
            'error': 'No solution found or timeout',
            'nodes_explored': nodes_explored,
            'time': time.time() - start_time
        }
    
    def solve_astar(self, max_nodes: int = 10000) -> Optional[Dict]:
        """Solve using A* Search"""
        start_time = time.time()
        
        # Priority queue: (f_score, counter, state, path, g_score)
        counter = 0
        open_set = [(self._heuristic(self.initial_state), counter, self.initial_state, [], 0)]
        visited = set()
        nodes_explored = 0
        
        while open_set and nodes_explored < max_nodes:
            f_score, _, state, path, g_score = heapq.heappop(open_set)
            
            if state in visited:
                continue
            
            visited.add(state)
            nodes_explored += 1
            
            if state.is_goal():
                return {
                    'success': True,
                    'path': path,
                    'nodes_explored': nodes_explored,
                    'time': time.time() - start_time,
                    'algorithm': 'A*'
                }
            
            for move in self._get_valid_moves(state):
                new_state = self._apply_move(state, move)
                
                if new_state not in visited:
                    new_g = g_score + 1
                    new_h = self._heuristic(new_state)
                    new_f = new_g + new_h
                    counter += 1
                    heapq.heappush(open_set, (new_f, counter, new_state, path + [move], new_g))
        
        return {
            'success': False,
            'error': 'No solution found or timeout',
            'nodes_explored': nodes_explored,
            'time': time.time() - start_time
        }
    
    def solve(self, algorithm: str = 'astar') -> Dict:
        """Solve the puzzle using the specified algorithm"""
        if algorithm.lower() == 'bfs':
            return self.solve_bfs()
        elif algorithm.lower() == 'dfs':
            return self.solve_dfs()
        elif algorithm.lower() == 'astar':
            return self.solve_astar()
        else:
            return {'success': False, 'error': f'Unknown algorithm: {algorithm}'}


# Example usage
if __name__ == '__main__':
    # Test level
    test_map = [
        "######",
        "#    #",
        "# $  #",
        "# .@ #",
        "#    #",
        "######"
    ]
    
    solver = SokobanSolver(test_map)
    
    print("Testing all algorithms:\n")
    
    for algo in ['bfs', 'dfs', 'astar']:
        print(f"\n{algo.upper()} Algorithm:")
        print("-" * 40)
        result = solver.solve(algo)
        
        if result['success']:
            print(f"✓ Solution found!")
            print(f"  Moves: {len(result['path'])}")
            print(f"  Path: {' → '.join(result['path'])}")
            print(f"  Nodes explored: {result['nodes_explored']}")
            print(f"  Time: {result['time']:.4f} seconds")
        else:
            print(f"✗ {result['error']}")
            print(f"  Nodes explored: {result['nodes_explored']}")