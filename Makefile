heroku-server:
	heroku local

dev: export FLASK_ENV=development
dev:
	python herokuapp.py
