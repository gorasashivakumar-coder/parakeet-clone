from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import json
from services.llm_service import llm_service

load_dotenv()

app = FastAPI(title="Parakeet AI Clone Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load resume context
try:
    with open("resume.txt", "r") as f:
        RESUME_CONTEXT = f.read()
except FileNotFoundError:
    RESUME_CONTEXT = "No resume context provided."

@app.get("/")
def read_root():
    return {"message": "Parakeet AI Clone Backend is running"}



@app.websocket("/ws/interview")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    conversation_log = []
    
    try:
        while True:
            data = await websocket.receive_text()
            # parse json
            try:
                message = json.loads(data)
                question = message.get("payload", "")
                image_data = message.get("image", None) # Base64 string
                type_ = message.get("type", "question")
            except:
                question = data
                image_data = None
            
            if question or image_data:
                print(f"Received question: {question} (Image: {'Yes' if image_data else 'No'})")
                conversation_log.append(f"Interviewer: {question}")
                
                # Generate answer using LLM service
                answer = llm_service.generate_answer(question, RESUME_CONTEXT, image_data)
                
                conversation_log.append(f"Interviewee: {answer}")
                
                # Send back the answer
                # In a real app, successful streaming would involve sending chunks here
                # consistently. For now, we send the full text or simulate chunks.
                await websocket.send_text(answer)
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"Error: {e}")
        try:
            await websocket.close()
        except:
            pass
    finally:
        if conversation_log:
            try:
                import datetime
                if not os.path.exists("transcripts"):
                    os.makedirs("transcripts")
                
                timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"transcripts/transcript_{timestamp}.txt"
                
                with open(filename, "w") as f:
                    f.write("\n\n".join(conversation_log))
                print(f"Transcript saved to {filename}")
            except Exception as e:
                print(f"Error saving transcript: {e}")
