cd main-service

python -m venv venv

pip install -r requirements.txt

# start backend

python -m app.main --reload

#for frontend
cd frontend
npm install
npm run web