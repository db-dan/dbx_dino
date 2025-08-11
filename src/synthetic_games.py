# Databricks notebook source
import random
import json
import uuid
import time
import pyspark.sql.functions as F
import numpy as np
from datetime import datetime
from pyspark.sql.types import *

# COMMAND ----------

dbutils.widgets.text("num_games", "10", "Number of games")

# COMMAND ----------

volume_path = "/Volumes/workspace/dino_game/games/"
num_games = dbutils.widgets.get("num_games")

if not volume_path or not num_games:
    raise ValueError("Both 'volume_path' and 'num_games' must be provided.")

try:
    num_games = int(num_games)
except ValueError:
    raise ValueError("num_games must be an integer.")

# COMMAND ----------

# Observed frequencies and stats
OBSTACLE_KILLED_WEIGHTS = {
    "cactus_standard": 0.3,
    "cactus_tall": 0.2,
    "cactus_wide": 0.15,
    "cactus_tall_wide": 0.1,
    "bird_low": 0.1,
    "bird_mid": 0.1,
    "bird_high": 0.05,
}

mean_score = 330
std_dev_score = 290

# COMMAND ----------

def generate_username():
    adjectives = ['Swift', 'Brave', 'Clever', 'Mighty', 'Sneaky', 'Fierce', 'Quick', 'Nimble']
    nouns = ['Robot', 'Drone', 'Cyborg', 'Automaton', 'AI']
    return random.choice(adjectives) + random.choice(nouns)

OBSTACLES_VARIANTS = [
    'cactus_standard',
    'cactus_tall',
    'cactus_wide',
    'cactus_tall_wide',
    'bird_low',
    'bird_mid',
    'bird_high'
]

total_weight = sum(OBSTACLE_KILLED_WEIGHTS.values())
for k in OBSTACLE_KILLED_WEIGHTS:
    OBSTACLE_KILLED_WEIGHTS[k] /= total_weight

def generate_synthetic_game_data(mean_score=600, std_dev_score=100):
    game_data_list = []

    scores = np.random.normal(loc=mean_score, scale=std_dev_score, size=1)
    scores = [max(0, int(score)) for score in scores]

    for score in scores:
        # Generate obstacles passed based on the score
        avg_obstacle_per_score = 0.1
        total_obstacles = int(score * avg_obstacle_per_score)
        
        # Distribute obstacles passed among variants
        obstacles_passed = {}
        for variant in OBSTACLES_VARIANTS:
            obstacles_passed[variant] = np.random.poisson(lam=total_obstacles / len(OBSTACLES_VARIANTS))
        
        # Select the obstacle that killed the player based on weights
        obstacle_variants = list(OBSTACLE_KILLED_WEIGHTS.keys())
        obstacle_weights = list(OBSTACLE_KILLED_WEIGHTS.values())
        obstacle_that_killed = random.choices(obstacle_variants, weights=obstacle_weights, k=1)[0]
        
        game_data = {
            'score': score,
            'username': generate_username(),
            'gameID': f"{random.randint(1000, 9999)}-{random.randint(1000, 9999)}-{random.randint(1000, 9999)}-{random.randint(1000, 9999)}",
            'timestamp': datetime.now().isoformat(),
            'obstaclesPassed': obstacles_passed,
            'obstacleThatKilled': obstacle_that_killed
        }

    return game_data

# COMMAND ----------

for i in range(1, num_games + 1):
    data = generate_synthetic_game_data(mean_score, std_dev_score)
    username = data.get("username", "anonymous")
    game_id = data.get("gameID", "unknown_game")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_name = f"{username}_{game_id}_{timestamp}.json"
    file_path = f"{volume_path}{file_name}.json"
    with open(file_path, 'w') as f:
        json.dump(data, f,indent=4)
    print(f"Game data written to {file_path}")
    time.sleep(10)