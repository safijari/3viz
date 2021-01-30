# import cv2
# import numpy as np
# from tiny_tf.tf import Transform
# from tiny_tf.transformations import euler_from_quaternion
# from mp_slam.scanmatching import MPScanMatcher
# from tornado_server import send_command
# import time
# import json





# def scan_from_data(d):
#     return [r if isinstance(r, float) else 0.0 for r in d['scan']['ranges'][::-1]]


# def lrs_from_data(mw, d, fu=0):
#     x, y, yaw = pose_from_data(d)
#     ranges = scan_from_data(d)
#     return mw.make_scan(ranges, x, y, yaw + fu)


# def pc_to_cmd(i, label):
#     return {'type': 'pointcloud', 'label': str(label), 'arrs': i, 'opacity': 1.0, 'color': '#ff0000'}


# def send_test_pointclouds():
#     im = cv2.imread('./depth_test.png', cv2.CV_16U)
#     p = depth_projection(im, 0.9, 1.20, 0.49, 0.49)

#     for i in range(500):
#         m = (i % 2) + 1
#         pp = pc_to_cmd(p, 'd')
#         pp['position'] = {'x': 0, 'y': 0, 'z': m}
#         send_command(pp)
#         time.sleep(0.1)


# def send_test_data():
#     with open('/home/jari/Dropbox/simbe_notebooks/mpslam-testing/tarjan_office.json') as ff:
#         scans = json.loads(ff.read())

#     mpm = MPScanMatcher(0.00436332309619, -2.35619449615, 2.35619449615)

#     l2s = []

#     line_points = []
#     line_points_flat = []

#     for jj, d in enumerate(scans[::150]):

#         x, y, t = pose_from_data(d)
#         scan = d['scan']

#         mpm.process_scan(scan, x, y, t)

#         _p = mpm.recent_scans[-1].corrected_pose
#         p = pose2d_to_cmd(mpm.recent_scans[-1].corrected_pose, 'cloud_center' + str(jj))
#         line_points.append(p['position'])
#         line_points_flat.extend([_p.x, _p.y, 0])

#         send_command(p)
#         # c = scan_to_cmd(d['scan'], 'cloud'+str(jj))
#         c = scan_to_cmd(d['scan'], 'cloud')
#         c['position'] = p['position']
#         c['orientation'] = p['orientation']
#         l2s.append(c)

#         #     last['opacity'] = 0.1
#         #     last['color'] = '#000000'
#         #     send_command(last)

#         # if len(line_points) > 1:
#             # send_command(points_to_line_cmd(line_points, 'linee'))
#         send_command({'label': 'linee', 'type': 'line', 'positions': line_points_flat})
#         send_command(c)
#         time.sleep(0.01)


# def depth_projection(im, fx, fy, cx, cy):
#     im = (im / 1000.0).astype('float32').T
#     xx, yy = np.meshgrid(np.arange(im.shape[0]), np.arange(im.shape[1]))
#     h, w = im.shape
#     xt = (xx - cx * w).T * im / fx / w
#     yt = (yy - cy * h).T * im / fy / h
#     im_flat = np.ndarray.flatten(im)
#     not_zero_indices = np.where(im_flat != 0)[0]
#     xt_flat = np.ndarray.flatten(xt)[not_zero_indices] * 10
#     yt_flat = np.ndarray.flatten(yt)[not_zero_indices] * 10
#     im_flat = im_flat[not_zero_indices] * 10
#     one = np.ndarray.flatten(np.ones(im_flat.shape))
#     # stack = np.stack((xt_flat,yt_flat,im_flat,one), axis = -1)
#     return {'x': xt_flat.tolist()[::10], 'y': yt_flat.tolist()[::10], 'z': im_flat.tolist()[::10]}


# if __name__ == '__main__':
#     try:
#         send_test_data()
#         # send_test_pointclouds()
#         time.sleep(5)
#     except KeyboardInterrupt:
#         send_command.loop.stop()

from threeviz.api import plot_3d
from random import random
import time

for ii in range(10):
    _f = lambda: [random() for i in range(100)]
    plot_3d(_f(), _f(), _f(), "test")
    time.sleep(0.1)
