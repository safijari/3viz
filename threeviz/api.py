from threeviz import send_command
from threeviz.helpers import pointcloud_cmd, transform_to_cmd, points_to_line_cmd

# TODO allow for offset transform?
def plot_3d(x, y, z, label, color='red', opacity=0.5, size=0.1):
    try:
        _ = len(x)
    except TypeError:
        x = [x]
        y = [y]
        z = [z]
    send_command(pointcloud_cmd(x, y, z, label, color, opacity, size))


def plot_pose(pose, label, size=0.1):
    send_command(transform_to_cmd(pose, label, size))


def plot_line_seg(x1, y1, z1, x2, y2, z2, label, color='black', opacity=0.5, size=0.01):
    send_command(points_to_line_cmd([x1, y1, z1, x2, y2, z2], label, color, opacity, size))


def plot_cube_cloud(x, y, z, label, color="blue", opacity=0.5, size=0.01):
    send_command({"type": "cubecloud", "xarr": x, "yarr": y, "zarr": z, "color": color, "opacity": opacity, "size": size})