import signal

from tornado import websocket, web, ioloop
from threading import Thread, Lock
import time
import os
try:
    import asyncio
    aio = True
except ImportError:
    aio = False

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
    port = 8765
    if 'THREEVIZ_PORT' in os.environ:
        try:
            port = int(os.environ['THREEVIZ_PORT'])
            # print(f"Setting threeviz port to user supplied {port}")
            # print("Please ensure the client uses the same port.")
        except Exception:
            # print(f"{os.environ['THREEVIZ_PORT']} is not a valid port.")
            print('shit')
    with clients_lock:
        if aio:
            asyncio.set_event_loop(loop)
        app = web.Application(
            [
                ('/', IndexHandler),
                ('/ws', SocketHandler),
        #('/api', ApiHandler)
            ],
            debug=False)
        app.listen(port)
        print('starting')

    ioloop.IOLoop.current().start()


def send_command(cmd):
    if not send_command.thread:
        if aio:
            send_command.loop = asyncio.new_event_loop()
        else:
            send_command.loop = ioloop.IOLoop.instance()
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
            client.write_message(msgpack.packb(cmd, use_bin_type=False), binary=True)


def sig_handler(sig, frame):
    try:
        send_command.loop.stop()
    except Exception:
        pass


send_command.thread = None

signal.signal(signal.SIGINT, sig_handler)
