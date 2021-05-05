heroku-server:
	heroku local

dev: export FLASK_ENV=development
dev:
	python bin/herokuapp.py

experiment-scaleup:
	heroku ps:scale --app cocosci-optdisco web=1:Hobby
experiment-scaledown:
	heroku ps:scale --app cocosci-optdisco web=0:Free
