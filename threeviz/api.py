from threeviz.core import CommandSender
from threeviz.helpers import (
    pointcloud_cmd,
    transform_to_cmd,
    points_to_line_cmd,
    image_to_uri,
)
import numpy as np
import os


sender = CommandSender(int(os.environ.get("THREEVIZ_PORT", 8765)))
plot_3d = sender.plot_3d
plot_pose = sender.plot_pose
plot_plane = sender.plot_plane
plot_cylinder = sender.plot_cylinder
plot_plane_tex = sender.plot_plane_tex
plot_line_seg = sender.plot_line_seg
plot_polygon = sender.plot_polygon
plot_cube_cloud = sender.plot_cube_cloud
plot_text = sender.plot_text
plot_obj = sender.plot_obj
update_properties = sender.update_properties
clear_all = sender.clear_all
delete = sender.delete
move_camera = sender.move_camera
start_recording = sender.start_recording
stop_recording = sender.stop_recording
stop_and_flush_recording = sender.stop_and_flush_recording
flush_recording = sender.flush_recording
