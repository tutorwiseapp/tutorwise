from vertexai import init
from vertexai.preview.generative_models import GenerativeModel

init(project="tutorwise-472312", location="us-central1")

# Use the latest available 2.5 model
model = GenerativeModel("gemini-2.5-pro")

response = model.generate_content("Explain async/await in Python.")
print(response.text)
