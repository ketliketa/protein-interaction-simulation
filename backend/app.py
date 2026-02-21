from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from fetch_structures import get_protein_structure_and_info
from docking import simulate_docking
import os

app = Flask(__name__)
CORS(app)

@app.route("/protein", methods=["POST"])
def get_protein():
    data = request.get_json()
    name = data.get("protein")

    if not name:
        return jsonify({"error": "Emri i proteinës mungon"}), 400

    try:
        result = get_protein_structure_and_info(name)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/dock", methods=["POST"])
def dock_proteins():
    data = request.get_json()
    file1 = data.get("file1")
    file2 = data.get("file2")

    if not file1 or not file2:
        return jsonify({"error": "Skedarët mungojnë"}), 400

    try:
        result = simulate_docking(file1, file2)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/static/<path:filename>")
def static_files(filename):
    return send_from_directory(os.path.join("models"), filename)

if __name__ == "__main__":
    app.run(debug=True)
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from fetch_structures import get_protein_structure_and_info
from docking import simulate_docking
import os

app = Flask(__name__)
CORS(app)

@app.route("/protein", methods=["POST"])
def get_protein():
    data = request.get_json()
    name = data.get("protein")

    if not name:
        return jsonify({"error": "Emri i proteinës mungon"}), 400

    try:
        result = get_protein_structure_and_info(name)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/dock", methods=["POST"])
def dock_proteins():
    data = request.get_json()
    file1 = data.get("file1")
    file2 = data.get("file2")

    if not file1 or not file2:
        return jsonify({"error": "Skedarët mungojnë"}), 400

    try:
        result = simulate_docking(file1, file2)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/static/<path:filename>")
def static_files(filename):
    return send_from_directory(os.path.join("models"), filename)

if __name__ == "__main__":
    app.run(debug=True)
