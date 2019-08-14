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
        app.listen(8888)
        print('starting')

    ioloop.IOLoop.current().start()


def send_command(cmd):
    if not send_command.thread:
        send_command.loop = asyncio.new_event_loop()
        send_command.thread = Thread(target=main, args=(send_command.loop,))
        send_command.thread.daemon = True
        send_command.thread.start()

        while True:
            with clients_lock:
                if len(state['clients']) > 0:
                    break
            time.sleep(0.2)

    with clients_lock:
        for client in state['clients']:
            # print('sending to client')
            client.write_message(cmd)

send_command.thread = None


def pose_to_cmd(i, label):
    p = i['pose']['pose']['position']
    p['z'] = 0
    q = i['pose']['pose']['orientation']
    return {'type': 'axes', 'position': p, 'orientation': q, 'label': str(label), 'size': 0.25}


import numpy as np
def project_laser(msg, xx, yy, rr):
    ranges = np.array(msg['ranges'], 'float32')[::-1]
    ranges = np.nan_to_num(ranges)
    ranges[np.abs(ranges) > 15] = 0
    angle_min = msg['angle_min']
    angle_max = msg['angle_max']
    angles = np.linspace(angle_min, angle_max, len(ranges))
    _x = ranges * np.cos(angles)
    _y = ranges * np.sin(angles)
    x, y, r = xx, yy, rr
    xvals = x + _x * np.cos(r) - _y * np.sin(r)
    yvals = y + _y * np.cos(r) + _x * np.sin(r)
    return {'x': list(xvals), 'y': list(yvals), 'z': list(xvals*0)}


def scan_to_cmd(i, label):
    return {'type': 'pointcloud', 'label': str(label), 'arrs': project_laser(i, 0, 0, 0)}


def send_test_data():
    with open('/home/jari/Dropbox/simbe_notebooks/mpslam-testing/tarjan_office.json') as ff:
        scans = json.loads(ff.read())
    l2s = []
    # for jj, d in enumerate(scans[::20]):
    #     l2s.append(pose_to_cmd(d['pose'], str(jj)))
    # send_command({'type': 'axes_list', 'elements': l2s})
    for jj, d in enumerate(scans[::20]):
        p = pose_to_cmd(d['pose'], 'cloud_center')
        send_command(p)
        c = scan_to_cmd(d['scan'], f'cloud{jj}')
        # c = scan_to_cmd(d['scan'], f'cloud')
        c['position'] = p['position']
        c['orientation'] = p['orientation']
        send_command(c)
        # if jj > 100:
        #     return
        time.sleep(0.01)


if __name__ == '__main__':
    try:
        send_test_data()
    except KeyboardInterrupt:
        send_command.loop.stop()
