import numpy as np
from tiny_tf.tf import Transform
from tiny_tf.transformations import euler_from_quaternion
import cv2
import base64


def pose_to_cmd(i, label):
    p = i["pose"]["pose"]["position"]
    p["z"] = 0
    q = i["pose"]["pose"]["orientation"]
    return {
        "type": "axes",
        "position": p,
        "orientation": q,
        "label": str(label),
        "size": 0.25,
    }


def transform_to_cmd(t, label, size=0.25):
    return {
        "type": "axes",
        "position": {"x": t.x, "y": t.y, "z": t.z},
        "orientation": {"x": t.qx, "y": t.qy, "z": t.qz, "w": t.qw},
        "label": str(label),
        "size": size,
    }


def pose2d_to_cmd(i, label, size=0.25):
    t = Transform.from_pose2d(i)
    return transform_to_cmd(t, label, size)


def points_to_line_cmd(points, label, color, opacity, size):
    return {
        "type": "line",
        "positions": points,
        "label": str(label),
        "color": color,
        "opacity": opacity,
        "size": size,
    }


def project_laser(msg, xx, yy, rr):
    ranges = np.array(msg["ranges"], "float32")[::-1]
    ranges = np.nan_to_num(ranges)
    # ranges[np.abs(ranges) > 15] = 0
    angle_min = msg["angle_min"]
    angle_max = msg["angle_max"]
    angles = np.linspace(angle_min, angle_max, len(ranges))
    _x = ranges * np.cos(angles)
    _y = ranges * np.sin(angles)
    x, y, r = xx, yy, rr
    xvals = x + _x * np.cos(r) - _y * np.sin(r)
    yvals = y + _y * np.cos(r) + _x * np.sin(r)
    # return {'x': list(xvals[ranges > 0]), 'y': list(yvals[ranges > 0]), 'z': list(xvals[ranges > 0] * 0)}
    return list(np.vstack((xvals, yvals, xvals * 0)).T.flatten())


def scan_to_cmd(i, label):
    return {
        "type": "pointcloud",
        "label": str(label),
        "arrs": project_laser(i, 0, 0, 0),
        "opacity": 0.5,
        "color": "#000000",
        "size": 0.1,
    }


def pointcloud_cmd(x, y, z, label, color="red", opacity=0.5, size=0.1):
    return {
        "type": "pointcloud",
        "label": str(label),
        "arrs": np.vstack((x, y, z)).T.flatten().tolist(),
        "opacity": opacity,
        "color": color,
        "size": size,
    }


def pose_from_data(d):
    p = d["pose"]["pose"]["pose"]["position"]
    q = d["pose"]["pose"]["pose"]["orientation"]
    return p["x"], p["y"], euler_from_quaternion((q["x"], q["y"], q["z"], q["w"]))[-1]


def b64enc2str(inbytes: bytes) -> str:
    return base64.b64encode(inbytes).decode("ascii")


def image_base64(im, ext=".jpg"):
    return b64enc2str(cv2.imencode(ext, im)[1].tostring())


def image_to_uri(im):
    return "data:image/png;base64," + image_base64(im, ".png")