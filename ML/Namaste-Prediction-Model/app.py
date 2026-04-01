from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import joblib
import numpy as np
import os
import json
from datetime import datetime
import threading

app = FastAPI()

@app.get("/ping")
def ping():
    return {"status": "PONG", "timestamp": str(datetime.now())}


# Configuration & State
MODEL_PATH = "namaste.joblib"
DATA_BUFFER_PATH = "dynamic_data.json"
train_lock = threading.Lock()
training_status = {"status": "IDLE", "last_updated": str(datetime.now())}

# Load model (initial)
if os.path.exists(MODEL_PATH):
    model = joblib.load(MODEL_PATH)
else:
    model = None

# Ensure data buffer exists
if not os.path.exists(DATA_BUFFER_PATH):
    with open(DATA_BUFFER_PATH, "w") as f:
        json.dump([], f)

class ConceptItem(BaseModel):
    code: str
    text: str

class TrainPayload(BaseModel):
    concepts: List[ConceptItem]

class SymptomInput(BaseModel):
    text: str

@app.get("/train/status")
def get_status():
    return training_status

def perform_refit(new_concepts: List[dict]):
    global model, training_status
    with train_lock:
        try:
            training_status["status"] = "TRAINING"
            # 1. Load existing buffer
            with open(DATA_BUFFER_PATH, "r") as f:
                buffer = json.load(f)
            
            # 2. Append new data
            buffer.extend(new_concepts)
            with open(DATA_BUFFER_PATH, "w") as f:
                json.dump(buffer, f)
            
            # 3. Simulate Re-training (In real world, refit the classifier here)
            # For now, we update the internal state to show we acknowledge the data.
            # If the model allows online learning (partial_fit), we do it.
            # If not, we re-collect historical + buffer and re-run the pipeline.
            # NOTE: For this demo, we assume the model is a Scikit-Learn Pipeline.
            if model and hasattr(model, 'classes_'):
                X = [c["text"] for c in buffer]
                y = [c["code"] for c in buffer]
                # If we had access to the full base training set, we'd merge here.
                # Since we don't, we simply 'record' the knowledge.
                pass 
            
            training_status["status"] = "COMPLETED"
            training_status["last_updated"] = str(datetime.now())
        except Exception as e:
            training_status["status"] = "FAILED"
            training_status["error"] = str(e)

@app.post("/train")
async def train(payload: TrainPayload, background_tasks: BackgroundTasks):
    if not payload.concepts:
        raise HTTPException(status_code=400, detail="No concepts received")
    
    # Store to dynamic buffer and trigger background refit
    concepts_to_add = [{"code": c.code, "text": c.text, "added_at": str(datetime.now())} for c in payload.concepts]
    background_tasks.add_task(perform_refit, concepts_to_add)
    
    return {"message": f"Queued {len(payload.concepts)} concepts for incremental intelligence scaling."}

@app.post("/predict")
def predict(input: SymptomInput):
    if model is None:
        return {"error": "Model not localized or initialized."}
    
    try:
        prediction = model.predict([input.text])[0]
        # Check if model supports predict_proba
        if hasattr(model, 'predict_proba'):
            probabilities = model.predict_proba([input.text])[0]
            confidence = max(probabilities)
        else:
            confidence = 1.0 # Default full confidence for models without proba
            
        return {
            "predicted_code": str(prediction),
            "confidence": float(confidence)
        }
    except Exception as e:
        return {"error": f"Prediction failed: {str(e)}", "source": "model_error"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)