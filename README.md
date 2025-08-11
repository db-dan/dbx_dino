# Dino Game

A clone of the chromium [dino game](https://en.wikipedia.org/wiki/Dinosaur_Game) deployable as a Databricks App.

## Features
- Flask app with Chromium Dino Game in vanilla js
- Deployable locally or as a Databricks app
- Save game statistics to Databricks volume, including which object killed the player
- Pipeline to process the game data
- Databricks AI/BI dashboard to analyse games and track leaderboard
- Generate synthetic game data for richer analysis

## Setup
There are a few things you'll need to tweak to get this working for you:
1. Update the [app.yml](src/app/app.yml) file to match your catalog name etc.
2. Update the [databricks.yml](databricks.yml) file match your workspace details.
3. Update the [dbx_dino.yml](resources/dbx_dino.yml) file to match your warehouse id etc.

### Local
1. Install python etc.
2. Configure Databricks SDK.
3. Set up a virtual environment of your choosing, there's a requirements.txt to help.
4. Run app.py to start the Flask app locally.
5. Play game!

### Databricks App
1. Upload this repo to your Databricks workspace.
2. Create a new Databricks App.
3. Give the service principal created by the app READ and WRITE permissions on the games volume.
4. [Deploy](https://docs.databricks.com/aws/en/dev-tools/databricks-apps/deploy#deploy-the-app) app by selecting the repo folder you created as the source code path. 
5. Refer to [this guide](https://docs.databricks.com/aws/en/dev-tools/databricks-apps/) if you get stuck.

## Deploy with Databricks Asset Bundles
0. Install UV: https://docs.astral.sh/uv/getting-started/installation/
1. Install the Databricks CLI from https://docs.databricks.com/dev-tools/cli/databricks-cli.html
2. Authenticate to your Databricks workspace, if you have not done so already:
    ```
    $ databricks configure
    ```
3. To deploy a copy of this project, type:
    ```
    $ databricks bundle deploy --target prod
    ```
    This deploys everything that's defined for this project.
4. Give the service principal created by the app READ and WRITE permissions on the games volume.
5. Run the app:
   ```
   $ databricks bundle run dino_game_app
   ```
6. Generate some synthetic games data:
   ```
   $ databricks bundle run synthetic_games_job
   ```
7. Play game!

## Roadmap
Improvements I'll likely never get around to:
- [ ] Create and publish dashboard, then update Leaderboard link in index.html
- [ ] Allow users to submit their own username
- [ ] Add global highscore to app from Leaderboard

**Disclaimer**: This repo is provided as-is, with no guarantees. Bad things can happen when you copy code from strangers on the internet. Good luck, have fun!