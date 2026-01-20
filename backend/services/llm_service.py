from openai import OpenAI
import os

class LLMService:
    def __init__(self):
        # We will initialize the client later when the API key is available
        self.client = None
    
    def _get_client(self):
        if not self.client:
            api_key = os.getenv("GROQ_API_KEY")
            if api_key:
                self.client = OpenAI(
                    api_key=api_key,
                    base_url="https://api.groq.com/openai/v1"
                )
        return self.client

    def generate_answer(self, question: str, context: str = "", image_data: str = None) -> str:
        client = self._get_client()
        if not client:
            return "Error: GROQ_API_KEY not set."

        if image_data:
            # Multi-modal input (Text + Image)
            messages = [
                {
                    "role": "system", 
                    "content": "You are a fast, helpful interview assistant. You can see the user's screen. If code is visible, analyze it. Keep answers concise (under 2 sentences if possible) and confident."
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": f"Context: {context}\n\nQuestion: {question}"},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_data}"
                            }
                        }
                    ]
                }
            ]
            model = "llama-3.2-11b-vision-preview" 
        else:
            # Text-only input
            messages = [
                {"role": "system", "content": "You are a helpful interview assistant. Keep answers concise, confident, and to the point. Use bullet points where appropriate."},
                {"role": "user", "content": f"Context: {context}\n\nQuestion: {question}"}
            ]
            model = "llama-3.1-8b-instant"
        
        try:
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                stream=True 
            )
            # For now, just return full text for simplicity, or handle stream
            full_response = ""
            for chunk in response:
                if chunk.choices[0].delta.content:
                    full_response += chunk.choices[0].delta.content
            return full_response
        except Exception as e:
            print(f"LLM Error: {str(e)}") # Debug log
            return f"Error generating answer: {str(e)}"

llm_service = LLMService()
