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
                    "content": "You are an expert technical interview assistant helping a candidate. Analyze the screen content (code/diagrams) and the question. Provide a direct, professional answer that the candidate can speak to the interviewer. Do not explain what you are doing. Be concise."
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
                {"role": "system", "content": "You are an expert technical interview assistant. The user is a candidate in an interview. The input is a question asked by the interviewer. Provide a direct, professional, first-person answer that the candidate can immediately speak. Do not use phrases like 'Here is an answer' or 'You can say'. Just give the answer. Keep it concise."},
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
