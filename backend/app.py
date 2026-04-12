from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import os
import sys

# Add the root directory to sys.path to import the blockchain module
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from blockchain.core import Blockchain

app = Flask(__name__, static_folder='../frontend', static_url_path='')
CORS(app)

# Database Configuration
db_path = os.path.join(os.path.dirname(__file__), '../database/water_system.db')
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'aqua-blockchain-secret'

db = SQLAlchemy(app)

# Blockchain Instance
water_blockchain = Blockchain()

# Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    role = db.Column(db.String(20), default='consumer') # 'admin' or 'consumer'
    daily_limit = db.Column(db.Float, default=500.0) # Liters

class WaterRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    usage = db.Column(db.Float, nullable=False)
    timestamp = db.Column(db.DateTime, server_default=db.func.now())
    block_hash = db.Column(db.String(64), nullable=True)

# Initialize Database
with app.app_context():
    db.create_all()
    # Create default admin if not exists
    if not User.query.filter_by(username='admin').first():
        admin = User(username='admin', password='admin_password', role='admin')
        db.session.add(admin)
        db.session.commit()

# Routes
@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    if User.query.filter_by(username=data['username']).first():
        return jsonify({"error": "User already exists"}), 400
    
    new_user = User(
        username=data['username'], 
        password=data['password'], 
        role=data.get('role', 'consumer')
    )
    db.session.add(new_user)
    db.session.commit()
    return jsonify({"message": "User registered successfully"}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(username=data['username'], password=data['password']).first()
    if user:
        return jsonify({
            "id": user.id,
            "username": user.username,
            "role": user.role,
            "daily_limit": user.daily_limit
        }), 200
    return jsonify({"error": "Invalid credentials"}), 401

@app.route('/api/submit_usage', methods=['POST'])
def submit_usage():
    data = request.json
    user_id = data['user_id']
    usage = float(data['usage'])
    
    # 1. Add to Blockchain
    new_block = water_blockchain.add_block(user_id, usage)
    
    # 2. Add to Database
    record = WaterRecord(user_id=user_id, usage=usage, block_hash=new_block.hash)
    db.session.add(record)
    db.session.commit()
    
    return jsonify({
        "message": "Usage recorded and mined into blockchain!",
        "block": vars(new_block),
        "over_limit": usage > User.query.get(user_id).daily_limit
    }), 201

@app.route('/api/history/<int:user_id>', methods=['GET'])
def get_user_history(user_id):
    records = WaterRecord.query.filter_by(user_id=user_id).order_by(WaterRecord.timestamp.desc()).all()
    history = []
    for r in records:
        history.append({
            "usage": r.usage,
            "timestamp": r.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            "hash": r.block_hash
        })
    return jsonify(history), 200

@app.route('/api/blockchain', methods=['GET'])
def get_chain():
    return jsonify({
        "length": len(water_blockchain.chain),
        "chain": water_blockchain.to_dict(),
        "is_valid": water_blockchain.is_chain_valid()
    }), 200

@app.route('/api/admin/stats', methods=['GET'])
def get_admin_stats():
    users = User.query.filter_by(role='consumer').all()
    stats = []
    for u in users:
        records = WaterRecord.query.filter_by(user_id=u.id).all()
        total_usage = sum(r.usage for r in records)
        stats.append({
            "username": u.username,
            "total_usage": total_usage,
            "record_count": len(records)
        })
    return jsonify(stats), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)
