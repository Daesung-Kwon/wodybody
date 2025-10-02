from flask import Flask, jsonify
import os

app = Flask(__name__)

@app.route('/')
def home():
    return jsonify({
        'message': 'CrossFit WOD System is running!',
        'status': 'healthy',
        'port': os.environ.get('PORT', '5001')
    })

@app.route('/api/health')
def health():
    return jsonify({
        'status': 'healthy',
        'timestamp': '2025-10-01T00:00:00Z',
        'version': '1.0.0'
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    print(f"🚀 Test app starting on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)
