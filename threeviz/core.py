import signal
import asyncio
from tornado import websocket, web, ioloop, httpserver
import traceback
from threading import Thread, Lock
from queue import Queue
import time
import os
import pathlib
from tiny_tf.tf import Transform
import numpy as np
import itertools
import json

from threeviz.helpers import (
    pointcloud_cmd,
    transform_to_cmd,
    points_to_line_cmd,
    image_to_uri,
)

import msgpack
import socket
from tornado.log import enable_pretty_logging

enable_pretty_logging()


def get_ephemeral_port():
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(("", 0))
    addr = s.getsockname()
    s.close()
    return addr[1]


class IndexHandler(web.RequestHandler):
    def get(self):
        folder = pathlib.Path(__file__).parent.absolute()
        with open(os.path.join(folder, "../deploy/threeviz/index.html")) as ff:
            self.write(ff.read())


class JSHandler(web.RequestHandler):
    def get(self):
        folder = pathlib.Path(__file__).parent.absolute()
        with open(os.path.join(folder, "../deploy/threeviz/index.js")) as ff:
            self.write(ff.read())


class SocketHandler(websocket.WebSocketHandler):
    def initialize(self, clients_lock, clients):
        self.clients_lock = clients_lock
        self.clients = clients

    def check_origin(self, origin):
        return True

    def open(self):
        with self.clients_lock:
            if self not in self.clients:
                self.clients.append(self)

    def on_close(self):
        with self.clients_lock:
            if self in self.clients:
                self.clients.remove(self)


class CommandSender:
    def __init__(self, port=None, wait=True, debug=False):
        if port is None:
            port = get_ephemeral_port()
        self.port = port
        self.clients_lock = Lock()
        self.clients = []
        self.debug = debug
        self.queue = Queue()
        self.loop = None
        self.should_wait = wait

        self.thread = Thread(target=self._main)
        self.thread.daemon = True
        self.thread.start()
        self.queue.get()
        self.recording = []
        self.do_recording = False

    def start_recording(self):
        self.do_recording = True

    def stop_recording(self):
        self.do_recording = False

    def flush_recording(self):
        ret = self.recording
        self.recording = []
        return ret

    def stop_and_flush_recording(self):
        self.stop_recording()
        return self.flush_recording()

    def _main(self):
        app = web.Application(
            [
                ("/", IndexHandler),
                ("/index.js", JSHandler),
                (
                    "/ws",
                    SocketHandler,
                    {"clients_lock": self.clients_lock, "clients": self.clients},
                ),
            ],
            debug=self.debug,
        )
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)
        self.app = app
        self.server = app.listen(self.port)
        self.queue.put(True)
        ioloop.IOLoop.current().start()

    def send(self, cmd):
        if self.do_recording:
            self.recording.append(json.loads(json.dumps(cmd)))
        if self.should_wait:
            while True:
                if len(self.clients) > 0:
                    break
                time.sleep(0.2)

        with self.clients_lock:
            for client in self.clients:
                client.write_message(
                    msgpack.packb(cmd, use_bin_type=False), binary=True
                )

    def shutdown(self):
        self.server.stop()

    def __del__(self):
        self.shutdown()
        time.sleep(0.1)

        try:
            self.loop.stop()
        except Exception:
            traceback.print_exc()

    def _delete(self):
        self.__del__()

    def plot_3d(self, x, y, z, label, color="red", opacity=0.5, size=0.1):
        try:
            _ = len(x)
        except TypeError:
            x = [x]
            y = [y]
            z = [z]
        cmd = pointcloud_cmd(x, y, z, label, color, opacity, size)
        self.send(cmd)
        return cmd

    def plot_pose(self, pose, label, size=0.1):
        cmd = transform_to_cmd(pose, label, size)
        self.send(cmd)
        return cmd

    def plot_plane(self, pose, label, color="blue", scale=(1, 1)):
        cmd = transform_to_cmd(pose, label, 1.0)
        cmd["type"] = "plane"
        cmd["scale_x"] = scale[0]
        cmd["scale_y"] = scale[1]
        cmd["color"] = color
        self.send(cmd)
        return cmd

    def plot_text(self, pose, label, text, color="red", scale=(1, 1), opacity=1):
        cmd = transform_to_cmd(pose + Transform.from_euler_deg(roll=90), label, 1.0)
        cmd["type"] = "text"
        if isinstance(scale, tuple):
            sx, sy = scale
        else:
            sx = scale
            sy = scale
        cmd["scale_x"] = sx
        cmd["scale_y"] = sy
        cmd["color"] = color
        cmd["opacity"] = opacity
        cmd["text"] = text
        self.send(cmd)
        return cmd

    def plot_cylinder(self, pose, label, color="blue", radius=1, height=1, opacity=1):
        cmd = transform_to_cmd(pose, label, 1.0)
        cmd["type"] = "cylinder"
        cmd["radius"] = radius
        cmd["color"] = color
        cmd["height"] = height
        cmd["opacity"] = opacity
        self.send(cmd)
        return cmd

    def plot_obj(self, pose, label, data, texture=None):
        cmd = transform_to_cmd(pose, label, 1.0)
        cmd.update({"data": data, "type": "obj"})
        if texture is not None:
            cmd["uri"] = image_to_uri(texture)
        self.send(cmd)
        return cmd

    def plot_plane_tex(
        self,
        pose,
        label,
        image,
        already_encoded=False,
        scale=None,
        opacity=1.0,
        pixel_to_meters=0.1,
    ):
        if scale is None:
            h, w = image.shape[:2]
            sw = w * pixel_to_meters
            sh = h * pixel_to_meters
        else:
            sw, sh = scale
        cmd = transform_to_cmd(pose, label, 1.0)
        cmd["type"] = "plane_tex"
        if not already_encoded:
            cmd["uri"] = image_to_uri(image)
        else:
            cmd["uri"] = image
        cmd["scale_x"] = sw
        cmd["scale_y"] = sh
        cmd["opacity"] = opacity
        self.send(cmd)
        return cmd

    def plot_line_seg(
        self,
        x1,
        y1,
        z1,
        x2,
        y2,
        z2,
        label,
        color="black",
        opacity=0.5,
        size=0.01,
        pose=None,
    ):
        cmd = points_to_line_cmd(
            [x1, y1, z1, x2, y2, z2], label, color, opacity, size, pose=pose
        )
        self.send(cmd)
        return cmd

    def plot_polygon(
        self,
        points,
        label,
        color="black",
        opacity=0.5,
        size=0.01,
        one_point_per_element=True,
        **kwargs
    ):
        if not one_point_per_element:
            points = zip(points)
        points = list(itertools.chain(*points))
        cmd = points_to_line_cmd(points, label, color, opacity, size, **kwargs)
        self.send(cmd)
        return cmd

    def plot_cube_cloud(self, x, y, z, label, color="blue", opacity=0.5, size=0.01):
        if isinstance(x, np.ndarray):
            x = x.tolist()
        if isinstance(y, np.ndarray):
            y = y.tolist()
        if isinstance(z, np.ndarray):
            z = z.tolist()
        cmd = {
            "type": "cubecloud",
            "xarr": x,
            "yarr": y,
            "zarr": z,
            "color": color,
            "opacity": opacity,
            "size": size,
        }
        self.send(cmd)
        return cmd

    def update_properties(self, label, pose):
        cmd = transform_to_cmd(pose, label)
        cmd["type"] = "update"
        self.send(cmd)
        return cmd

    def clear_all(self):
        cmd = {"type": "clear"}
        self.send(cmd)
        return cmd

    def delete(self, label):
        cmd = {"type": "delete", "label": label}
        self.send(cmd)
        return cmd

    def move_camera(self, x, xl):
        cmd = {
            "type": "move_camera",
            "x": x.x,
            "y": x.y,
            "z": x.z,
            "lx": xl.x,
            "ly": xl.y,
            "lz": xl.z,
        }
        self.send(cmd)
        return cmd


ThreeViz = CommandSender


def ThreeVizIPython(port=None, wait=False):
    from IPython.display import IFrame, display, clear_output

    if port is None:
        port = get_ephemeral_port()

    clear_output()
    try:
        d = ThreeVizIPython.d
    except Exception:
        ThreeVizIPython.d = {}
        d = ThreeVizIPython.d

    if port in d:
        d[port]._delete()

    viz = ThreeViz(port, wait=wait)
    time.sleep(1)
    display(
        IFrame(
            "https://safijari.github.io/threeviz?port=" + str(port),
            width=640,
            height=480,
        )
    )

    d[port] = viz

    return viz


def ThreeVizStreamlit(port=None, wait=False):
    import asyncio

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    import streamlit.components as components

    if port is None:
        port = get_ephemeral_port()

    try:
        d = ThreeVizStreamlit.d
    except Exception:
        import asyncio

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        ThreeVizStreamlit.d = {}
        d = ThreeVizStreamlit.d

    if port in d:
        d[port]._delete()

    viz = ThreeViz(port, wait=wait)
    time.sleep(1)

    components.v1.iframe(
        "https://safijari.github.io/threeviz?port=" + str(port), width=640, height=480
    )

    d[port] = viz

    return viz
