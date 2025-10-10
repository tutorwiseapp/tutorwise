from vertexai.preview.generative_models import GenerativeModel
import vertexai

vertexai.init(project="tutorwise-472312", location="us-central1")
model = GenerativeModel("gemini-1.5-flash")
print(model.generate_content("Say hello from Vertex AI!").text)

