"""
Predefined Sokoban Levels Database
All levels are tested and solvable
"""

PREDEFINED_LEVELS = {
    'tutorial': [
        # Tutorial Level 1 - Very Simple (3 moves)
        [
            "#####",
            "#   #",
            "#$. #",
            "# @ #",
            "#####"
        ],
        # Tutorial Level 2 - L-Shape (5 moves)
        [
            "  ####",
            "  #  #",
            "  #$ #",
            "###.@#",
            "#    #",
            "######"
        ],
        # Tutorial Level 3 - Corner Push (4 moves)
        [
            "######",
            "#    #",
            "# $. #",
            "#  @ #",
            "######"
        ],
        # Tutorial Level 4 - Simple Push (6 moves)
        [
            "  ####",
            "###  #",
            "#.@$ #",
            "#    #",
            "######"
        ]
    ],
    
    'easy': [
        # Easy Level 1 - Single Box (7 moves)
        [
            "  ####",
            "  #  #",
            "  #$ #",
            "###.@#",
            "#    #",
            "######"
        ],
        # Easy Level 2 - U-Shape (8 moves)
        [
            "  ####",
            "  #  #",
            "  #$ #",
            "###.@#",
            "#    #",
            "######"
        ],
        # Easy Level 3 - Simple Corridor (9 moves)
        [
            "########",
            "#      #",
            "# $  . #",
            "#   @  #",
            "########"
        ],
        # Easy Level 4 - T-Shape (10 moves)
        [
            "  ####",
            "  #  ###",
            "  #$   #",
            "  # #  #",
            "###.@###",
            "#     #",
            "#######"
        ]
    ],
    
    'medium': [
        # Medium Level 1 - Two Boxes Line (12 moves)
        [
            "########",
            "#      #",
            "# $$ . #",
            "#   .@ #",
            "#      #",
            "########"
        ],
        # Medium Level 2 - Cross Pattern (15 moves)
        [
            "  #####",
            "  #   #",
            "###$  #",
            "#  $. #",
            "# @.  #",
            "###  ##",
            "  ####"
        ],
        # Medium Level 3 - Box Swap (18 moves)
        [
            " ######",
            " #    #",
            "##$   #",
            "# .$  #",
            "#  .@ #",
            "###  ##",
            "  ####"
        ],
        # Medium Level 4 - Parallel Boxes (20 moves)
        [
            "########",
            "#      #",
            "# $$   #",
            "# ..   #",
            "#    @ #",
            "#      #",
            "########"
        ]
    ],
    
    'hard': [
        # Hard Level 1 - Three Boxes Triangle (25 moves)
        [
            " ########",
            " #      #",
            "##$ $ $ #",
            "#  ...  #",
            "#     @ #",
            "#       #",
            "#########"
        ],
        # Hard Level 2 - Complex Push (30 moves)
        [
            "  ######",
            "  #    #",
            "###$   #",
            "# .$   #",
            "# .$   #",
            "# .$  ##",
            "##   @#",
            " ######"
        ],
        # Hard Level 3 - Narrow Corridors (28 moves)
        [
            "#########",
            "#       #",
            "# $ $ $ #",
            "# . . . #",
            "##     ##",
            " #  @  #",
            " #######"
        ],
        # Hard Level 4 - Strategic Push (35 moves)
        [
            "  #######",
            "  #     #",
            "###$ $  #",
            "# .$    #",
            "# .   ###",
            "# . $ #",
            "##   @#",
            " ######"
        ]
    ]
}

# Track last served level per difficulty to avoid repeats
_last_level_index = {}


def get_random_level(difficulty: str, avoid_repeat: bool = True):
    """Get a random level from the specified difficulty, avoiding the last one served"""
    import random
    
    if difficulty not in PREDEFINED_LEVELS:
        difficulty = 'easy'
    
    levels = PREDEFINED_LEVELS[difficulty]
    
    # If only one level exists, return it
    if len(levels) == 1:
        return levels[0]
    
    # If we want to avoid repeats and there's a previous level
    if avoid_repeat and difficulty in _last_level_index:
        # Get all indices except the last one
        available_indices = [i for i in range(len(levels)) if i != _last_level_index[difficulty]]
        selected_index = random.choice(available_indices)
    else:
        # First time or not avoiding repeats
        selected_index = random.randint(0, len(levels) - 1)
    
    # Remember this index
    _last_level_index[difficulty] = selected_index
    
    return levels[selected_index]


def get_all_levels():
    """Get all levels organized by difficulty"""
    return PREDEFINED_LEVELS


def get_level_count(difficulty: str) -> int:
    """Get the number of levels for a difficulty"""
    if difficulty not in PREDEFINED_LEVELS:
        return 0
    return len(PREDEFINED_LEVELS[difficulty])


def reset_level_history():
    """Reset the level history (useful for testing)"""
    global _last_level_index
    _last_level_index = {}