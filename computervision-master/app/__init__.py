from flask import Flask

from .config import Config
from .routes import main
from .storage import init_db


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)
    app.register_blueprint(main)
    if app.config.get("STORE_PREDICTIONS"):
        try:
            init_db(app.config["PREDICTIONS_DB"])
        except Exception:
            app.logger.exception("Failed to initialize prediction storage.")
    return app
