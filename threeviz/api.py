from threeviz import send_command
from threeviz.helpers import pose_to_cmd, pointcloud_cmd

# TODO allow for offset transform?
def plot_3d(x, y, z, label, color='red', opacity=0.5, size=0.1):
    try:
        _ = len(x)
    except TypeError:
        x = [x]
        y = [y]
        z = [z]
    send_command(pointcloud_cmd(x, y, z, label, color, opacity, size))
