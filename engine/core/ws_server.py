import asyncio
import json
import threading
import datetime
import websockets

class WebSocketServer:
    def __init__(self, host="localhost", port=8765):
        self.host = host
        self.port = port
        self.clients = set()
        self.loop = None
        self.thread = None
        self.current_state = "idle"
        self.on_command_received = None
        self.on_speak_received = None

    def start(self):
        """Starts the WebSocket server in a background thread."""
        self.thread = threading.Thread(target=self._run_server, daemon=True)
        self.thread.start()

    def _run_server(self):
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)
        
        async def handler(websocket, *args, **kwargs):
            self.clients.add(websocket)
            try:
                # Send the current state immediately on connection
                await websocket.send(json.dumps({"type": "state", "value": self.current_state}))
                async for message in websocket:
                    try:
                        data = json.loads(message)
                        if data.get("type") == "command" and self.on_command_received:
                            self.on_command_received(data.get("value"))
                        elif data.get("type") == "speak" and self.on_speak_received:
                            self.on_speak_received(data.get("value"))
                    except Exception as parse_err:
                        print(f"[WebSocket] Error parsing message: {parse_err}")
            except websockets.exceptions.ConnectionClosed:
                pass
            finally:
                self.clients.remove(websocket)

        async def main_server():
            # Start the server within the running event loop
            async with websockets.serve(handler, self.host, self.port):
                print(f"[WebSocket] Server running on ws://{self.host}:{self.port}")
                # Run forever
                await asyncio.Future()

        try:
            self.loop.run_until_complete(main_server())
        except Exception as e:
            print(f"[WebSocket Error] Server failed: {e}")

    def broadcast(self, data: dict):
        """Broadcasts a dict to all connected WebSocket clients thread-safely."""
        if not self.loop or not self.loop.is_running():
            return
        
        message = json.dumps(data)
        asyncio.run_coroutine_threadsafe(self._send_to_all(message), self.loop)

    async def _send_to_all(self, message):
        if self.clients:
            await asyncio.gather(*[client.send(message) for client in self.clients], return_exceptions=True)

    def set_state(self, state):
        """Sets the state and broadcasts it to all clients."""
        self.current_state = state
        self.broadcast({"type": "state", "value": state})

    def log_activity(self, transcript, action, param, status):
        """Broadcasts action execution status details to update dashboard feeds."""
        self.broadcast({
            "type": "activity",
            "transcript": transcript,
            "action": action,
            "param": param,
            "status": status,
            "timestamp": datetime.datetime.now().strftime("%H:%M:%S")
        })
