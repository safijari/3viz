import signal

from tornado import websocket, web, ioloop
from threading import Thread, Lock
import time
import asyncio
import msgpack

from tornado.log import enable_pretty_logging
enable_pretty_logging()

clients_lock = Lock()

state = {'clients': []}


class IndexHandler(web.RequestHandler):
    def get(self):
        with open('index.html') as ff:
            self.write(ff.read())


class SocketHandler(websocket.WebSocketHandler):
    def check_origin(self, origin):
        return True

    def open(self):
        with clients_lock:
            if self not in state['clients']:
                state['clients'].append(self)

    def on_close(self):
        with clients_lock:
            if self in state['clients']:
                state['clients'].remove(self)


def main(loop):
    with clients_lock:
        asyncio.set_event_loop(loop)

        app = web.Application(
            [
                ('/', IndexHandler),
                ('/ws', SocketHandler),
        #('/api', ApiHandler)
            ],
            debug=False)
        app.listen(8765)
        print('starting')

    ioloop.IOLoop.current().start()


def send_command(cmd):
    if not send_command.thread:
        send_command.loop = asyncio.new_event_loop()
        send_command.thread = Thread(target=main, args=(send_command.loop, ))
        send_command.thread.daemon = True
        send_command.thread.start()

        while True:
            with clients_lock:
                if len(state['clients']) > 0:
                    break
            time.sleep(0.2)

        time.sleep(0.25)

    with clients_lock:
        for client in state['clients']:
            print("writing")
            client.write_message(msgpack.packb(cmd), binary=True)


def sig_handler(sig, frame):
    try:
        send_command.loop.stop()
    except Exception:
        pass


send_command.thread = None

# assumes we started from a main thread
signal.signal(signal.SIGINT, sig_handler)
