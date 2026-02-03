#!/usr/bin/env python3
import os
import sys
import time
import random
import logging
from flask import Flask, jsonify
from datetime import datetime

app = Flask(__name__)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# Read configuration
ERROR_TYPE = os.getenv('ERROR_TYPE', 'none')
ERROR_RATE = float(os.getenv('ERROR_RATE', '0'))
CRASH_AFTER = int(os.getenv('CRASH_AFTER', '0'))
OOM_TRIGGER = os.getenv('OOM_TRIGGER', 'false').lower() == 'true'

request_count = 0
memory_leak = []

ERROR_MESSAGES = [
    'DatabaseConnectionError: Unable to connect to PostgreSQL at db:5432',
    'RedisConnectionError: Connection refused to redis:6379',
    'TimeoutException: Request to external API timed out after 30s',
    'AuthenticationError: JWT token expired or invalid',
    'PermissionDenied: Insufficient permissions to access resource',
    'FileNotFoundError: Configuration file /etc/app/config.yaml not found',
    'NetworkError: Failed to resolve DNS for api.service.local',
    'ValueError: Invalid input format in request payload',
    'KeyError: Required field "user_id" missing from request',
    'ImportError: Module "critical_dependency" not found'
]

def simulate_error():
    global request_count, memory_leak
    request_count += 1
    
    # Crash after N requests
    if CRASH_AFTER > 0 and request_count >= CRASH_AFTER:
        logging.critical(f'💥 FATAL: Crash limit reached after {request_count} requests!')
        sys.exit(1)
    
    # Memory leak simulation
    if OOM_TRIGGER:
        memory_leak.append([0] * 10000)
        if len(memory_leak) % 10 == 0:
            logging.warning(f'⚠️  Memory leak: {len(memory_leak) * 10000} items allocated')
    
    # Generate errors based on configuration
    if random.random() < ERROR_RATE:
        error_msg = random.choice(ERROR_MESSAGES)
        logging.error(f'❌ ERROR [{request_count}]: {error_msg}')
        
        if ERROR_TYPE == 'panic':
            raise Exception(error_msg)
    
    # Specific error types
    if ERROR_TYPE == 'import-error':
        logging.error('❌ ImportError: Failed to import required module "database_connector"')
    elif ERROR_TYPE == 'db-error':
        logging.error('❌ DatabaseError: Connection pool exhausted, max connections: 100')
    elif ERROR_TYPE == 'api-error':
        logging.error('❌ APIError: Upstream service returned 503 Service Unavailable')
    elif ERROR_TYPE == 'disk-full':
        logging.error('❌ IOError: [Errno 28] No space left on device: "/var/log/app.log"')

@app.route('/health')
def health():
    if ERROR_TYPE == 'unhealthy':
        return jsonify({'status': 'unhealthy', 'error': 'Service degraded'}), 500
    return jsonify({'status': 'healthy', 'requests': request_count})

@app.route('/ready')
def ready():
    if ERROR_TYPE == 'not-ready':
        return jsonify({'ready': False, 'reason': 'Dependencies unavailable'}), 503
    return jsonify({'ready': True})

@app.route('/')
def index():
    simulate_error()
    return jsonify({
        'message': 'Python service running',
        'requests': request_count,
        'error_type': ERROR_TYPE,
        'error_rate': ERROR_RATE
    })

@app.route('/metrics')
def metrics():
    return jsonify({
        'requests_total': request_count,
        'error_type': ERROR_TYPE,
        'timestamp': datetime.now().isoformat()
    })

def background_logger():
    """Periodically log status and errors"""
    while True:
        time.sleep(5)
        simulate_error()
        logging.info(f'📈 Status: {request_count} requests processed')

if __name__ == '__main__':
    logging.info('🚀 Python error generator started')
    logging.info(f'📊 Configuration:')
    logging.info(f'   ERROR_TYPE: {ERROR_TYPE}')
    logging.info(f'   ERROR_RATE: {ERROR_RATE}')
    logging.info(f'   CRASH_AFTER: {CRASH_AFTER}')
    logging.info(f'   OOM_TRIGGER: {OOM_TRIGGER}')
    
    # Start background logging
    import threading
    thread = threading.Thread(target=background_logger, daemon=True)
    thread.start()
    
    app.run(host='0.0.0.0', port=3000)