# Databricks notebook source
import dlt
import pyspark.sql.functions as F
from pyspark.sql.types import StructType, StructField, StringType, IntegerType, TimestampType, MapType

# COMMAND ----------

schema = StructType([
    StructField("score", IntegerType(), True),
    StructField("username", StringType(), True),
    StructField("gameID", StringType(), True),
    StructField("timestamp", TimestampType(), True),
    StructField("obstaclesPassed", MapType(StringType(), IntegerType()), True),
    StructField("obstacleThatKilled", StringType(), True)
])

# COMMAND ----------

@dlt.table
@dlt.expect_or_drop("valid_score", "score > 0")
def games_bronze():
  return (
    spark.readStream.format("cloudFiles")
      .option("cloudFiles.format", "json")
      .schema(schema)
      .load("/Volumes/workspace/dino_game/games/")
      .withColumn("loadDatetime", F.current_timestamp())
  )

# COMMAND ----------

@dlt.table
def games_silver():
  return(
    spark.sql("""
              SELECT
              gameID AS game_id,
              username AS player,
              CAST(timestamp AS TIMESTAMP) AS game_datetime,
              CAST(obstaclesPassed.cactus_standard AS INT) AS cactus_standard,
              CAST(obstaclesPassed.cactus_tall AS INT)AS cactus_tall,
              CAST(obstaclesPassed.cactus_wide AS INT) AS cactus_wide,
              CAST(obstaclesPassed.cactus_tall_wide AS INT) AS cactus_tall_wide,
              CAST(obstaclesPassed.bird_low AS INT) AS bird_low,
              CAST(obstaclesPassed.bird_mid AS INT) AS bird_mid,
              CAST(obstaclesPassed.bird_high AS INT) AS bird_high,
              obstacleThatKilled AS obstacle_that_killed,
              score
              FROM LIVE.games_bronze
              """)
  )

# COMMAND ----------

@dlt.table
def games_leaderboard():
  return (
     spark.sql("""
               SELECT
               RANK() OVER (ORDER BY MAX(score) DESC) AS rank,
               player,
               MAX(score) AS score
               FROM LIVE.games_silver
               GROUP BY player
               LIMIT 10
               """)
  )

# COMMAND ----------

@dlt.table
def games_obstacles():
  return (spark.sql("""
                    SELECT
                    obstacle,
                    SUM(count) as total
                    FROM LIVE.games_silver
                    UNPIVOT (
                      count FOR obstacle IN (cactus_standard, cactus_tall, cactus_wide, cactus_tall_wide, bird_low, bird_mid, bird_high)
                      )
                      GROUP BY obstacle
                    """)
  )