from flask import Flask
import os

app = Flask(__name__)

@app.route('/')
def hello():
    return 'Hello from Railway!'

@app.route('/api/health')
def health():
    return {'status': 'ok', 'port': os.environ.get('PORT', 'unknown')}

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    print(f"Simple app starting on port {port}")
    app.run(host='0.0.0.0', port=port)
