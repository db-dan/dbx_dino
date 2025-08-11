import traceback
from flask import Flask, request, jsonify, render_template
import os
import json
from datetime import datetime
from databricks.sdk import WorkspaceClient
from werkzeug.utils import secure_filename
from io import BytesIO

app = Flask(__name__)

w = WorkspaceClient()

@app.errorhandler(Exception)
def handle_exception(e):
    # Log full traceback to server console
    app.logger.error(f"Unhandled exception: {e}\n{traceback.format_exc()}")
    
    # Return JSON response
    return jsonify({
        "status": "error",
        "error_type": type(e).__name__,
        "message": str(e),
        "traceback": traceback.format_exc() if app.config["DEBUG"] else "hidden"
    }), 500

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/submit_game_data', methods=['POST'])
def submit_game_data():
    data = request.json

    if not data:
        return jsonify({"status": "error", "message": "No JSON data provided"}), 400

    username = data.get("username", "anonymous")
    game_id = data.get("gameID", "unknown_game")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    original_filename = f"{username}_{game_id}_{timestamp}.json"

    filename = secure_filename(original_filename)
    volume_path = "/Volumes/workspace/dino_game/games" 
    json_data = json.dumps(data, indent=4)
    file_path = os.path.join(volume_path, filename)

    try:
        file_stream = BytesIO(json_data.encode('utf-8'))
        w.files.upload(file_path, file_stream)
        return jsonify({"status": "success", "message": f"Game data uploaded as {filename}"})
    except Exception as e:
        app.logger.error(f"Error saving file {file_path}: {e}\n{traceback.format_exc()}")
        return jsonify({"status": "error", "message": f"Error saving file: {str(e)}"}), 500

if __name__ == '__main__':
    app.run()