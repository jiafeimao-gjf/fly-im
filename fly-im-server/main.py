"""
Fly IM Server - FastAPI WebSocket IM Server
A simple IM server for the Fly channel plugin.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from connection import manager
from routes import auth_router, users_router, messages_router, rooms_router, admin_router
from websocket import router as ws_router

# Initialize database
init_db()

# Create FastAPI app
app = FastAPI(title="Fly IM Server", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(messages_router)
app.include_router(rooms_router)
app.include_router(admin_router)
app.include_router(ws_router)


# Health check
@app.get("/health")
def health_check():
    return {"status": "ok", "connections": len(manager.active_connections)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
