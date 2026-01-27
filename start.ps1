# Start Backend
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command & {cd backend; pip install -r requirements.txt; uvicorn app.main:app --reload}"

# Start Frontend
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command & {cd frontend; npm install; npm run dev}"
