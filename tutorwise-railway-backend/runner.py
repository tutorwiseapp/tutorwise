import uvicorn
import os

if __name__ == "__main__":
    try:
        # Railway provides the port as an environment variable.
        # We default to 8000 if it's not set (for local development).
        port = int(os.environ.get("PORT", 8000))
        uvicorn.run("main:app", host="0.0.0.0", port=port)
    except Exception as e:
        print(f"Failed to start server: {e}")
        exit(1)