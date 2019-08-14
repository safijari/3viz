from tornado.log import enable_pretty_logging
enable_pretty_logging()

from tornado import websocket, web, ioloop
from threading import Thread, Lock
import signal
import time
import asyncio
import json

clients_lock = Lock()

state = {'clients': []}


class IndexHandler(web.RequestHandler):
    def get(self):
        with open('index.html') as ff:
            self.write(ff.read())

def pose_to_cmd(i, label):
    p = i['pose']['pose']['position']
    p['z'] = 0
    q = i['pose']['pose']['orientation']
    return {'type': 'axes', 'position': p, 'orientation': q, 'label': str(label), 'size': 0.25}


def send_test_data(client):
    with open('/home/jari/Dropbox/simbe_notebooks/mpslam-testing/tarjan_office.json') as ff:
        scans = json.loads(ff.read())
    running_scans = []
    for ii, scan in enumerate(scans):
        running_scans.append(scan)
        running_scans = running_scans[-10:]
        l2s = []
        for jj, d in enumerate(running_scans):
            l2s.append(pose_to_cmd(d['pose'], str(jj)))
        client.write_message({'type': 'axes_list', 'elements': l2s})
        time.sleep(0.01)


class SocketHandler(websocket.WebSocketHandler):
    def check_origin(self, origin):
        return True

    def open(self):
        with clients_lock:
            if self not in state['clients']:
                state['clients'].append(self)
                # send_test_data(self)

    def on_close(self):
        with clients_lock:
            if self in state['clients']:
                state['clients'].cl.remove(self)


def main():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    app = web.Application(
        [
            ('/', IndexHandler),
            ('/ws', SocketHandler),
    #('/api', ApiHandler)
        ],
        debug=False)
    app.listen(8888)
    # signal.signal(signal.SIGINT, sig_handler)
    print('starting')
    ioloop.IOLoop.current().start()


def send_command(cmd):
    if not send_command.thread:
        send_command.thread = Thread(target=main)
        send_command.thread.daemon = True
        send_command.thread.start()
        time.sleep(2)

    with clients_lock:
        for client in state['clients']:
            client.write_message(cmd)

send_command.thread = None

# if __name__ == '__main__':
#     main()

if __name__ == '__main__':
    t = Thread(target=main)
    t.daemon = True
    t.start()
    while True:
        print('running')
        time.sleep(1)
