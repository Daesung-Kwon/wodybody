import os
import sys
import tempfile
from pathlib import Path

os.environ['FLASK_ENV'] = 'testing'
os.environ['SECRET_KEY'] = 'test-secret-key-for-pytest-only'
os.environ.pop('RAILWAY_ENVIRONMENT', None)

_fd, _db_path = tempfile.mkstemp(suffix='.db')
os.close(_fd)
os.environ['DATABASE_URL'] = 'sqlite:///' + _db_path

BACKEND_ROOT = str(Path(__file__).resolve().parents[1])
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

import pytest  # noqa: E402

from app import app  # noqa: E402
from config.database import db  # noqa: E402
from models.user import Users  # noqa: E402


@pytest.fixture
def client():
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ['DATABASE_URL']
    with app.app_context():
        db.drop_all()
        db.create_all()
        user = Users(email='tester@example.com', name='Tester')
        user.set_password('secret123')
        db.session.add(user)
        db.session.commit()
    with app.test_client() as c:
        yield c
    with app.app_context():
        db.session.remove()
        db.drop_all()


@pytest.fixture
def user_id():
    with app.app_context():
        user = Users.query.filter_by(email='tester@example.com').first()
        return user.id
