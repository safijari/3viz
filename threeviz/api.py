from threeviz import send_command
from threeviz.helpers import (
    pointcloud_cmd,
    transform_to_cmd,
    points_to_line_cmd,
    image_to_uri,
)
import numpy as np

# TODO allow for offset transform?
def plot_3d(x, y, z, label, color="red", opacity=0.5, size=0.1):
    try:
        _ = len(x)
    except TypeError:
        x = [x]
        y = [y]
        z = [z]
    send_command(pointcloud_cmd(x, y, z, label, color, opacity, size))


def plot_pose(pose, label, size=0.1):
    send_command(transform_to_cmd(pose, label, size))


def plot_plane(pose, label, color="blue", scale=(1, 1)):
    cmd = transform_to_cmd(pose, label, 1.0)
    cmd["type"] = "plane"
    cmd["scale_x"] = scale[0]
    cmd["scale_y"] = scale[1]
    cmd["color"] = "color"
    send_command(cmd)


def plot_plane_tex(pose, label, image, already_encoded=False, scale=(1, 1)):
    cmd = transform_to_cmd(pose, label, 1.0)
    cmd["type"] = "plane_tex"
    if not already_encoded:
        cmd["uri"] = image_to_uri(image)
    else:
        cmd["uri"] = image
    cmd["scale_x"] = scale[0]
    cmd["scale_y"] = scale[1]
    send_command(cmd)


def plot_line_seg(x1, y1, z1, x2, y2, z2, label, color="black", opacity=0.5, size=0.01):
    send_command(
        points_to_line_cmd([x1, y1, z1, x2, y2, z2], label, color, opacity, size)
    )


def plot_cube_cloud(x, y, z, label, color="blue", opacity=0.5, size=0.01):
    if isinstance(x, np.ndarray):
        x = x.tolist()
    if isinstance(y, np.ndarray):
        y = y.tolist()
    if isinstance(z, np.ndarray):
        z = z.tolist()
    send_command(
        {
            "type": "cubecloud",
            "xarr": x,
            "yarr": y,
            "zarr": z,
            "color": color,
            "opacity": opacity,
            "size": size,
        }
    )

def update_properties(label, pose):
    cmd = transform_to_cmd(pose, label)
    cmd["type"] = "update"
    send_command(cmd)


def clear_all():
    send_command({"type": "clear"})


def delete(label):
    send_command({"type": "delete", "label": label})


def move_camera(x, xl):
    send_command(
        {
            "type": "move_camera",
            "x": x.x,
            "y": x.y,
            "z": x.z,
            "lx": xl.x,
            "ly": xl.y,
            "lz": xl.z,
        }
    )
