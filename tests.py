import cv2
import numpy as np
from tiny_tf.tf import Transform
from tiny_tf.transformations import euler_from_quaternion
from mp_slam import MPScanMatcher
from tornado_server import send_command
import time
import json



def pose_to_cmd(i, label):
    p = i['pose']['pose']['position']
    p['z'] = 0
    q = i['pose']['pose']['orientation']
    return {'type': 'axes', 'position': p, 'orientation': q, 'label': str(label), 'size': 0.25}


def pose2d_to_cmd(i, label):
    t = Transform.from_pose2d(i)
    return {
        'type': 'axes',
        'position': {
            'x': t.x,
            'y': t.y,
            'z': t.z
        },
        'orientation': {
            'x': t.qx,
            'y': t.qy,
            'z': t.qz,
            'w': t.qw
        },
        'label': str(label),
        'size': 0.25
    }




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
    return {'x': list(xvals[ranges > 0]), 'y': list(yvals[ranges > 0]), 'z': list(xvals[ranges > 0] * 0)}


def scan_to_cmd(i, label):
    return {
        'type': 'pointcloud',
        'label': str(label),
        'arrs': project_laser(i, 0, 0, 0),
        'opacity': 1.0,
        'color': '#ff0000'
    }



def pose_from_data(d):
    p = d['pose']['pose']['pose']['position']
    q = d['pose']['pose']['pose']['orientation']
    return p['x'], p['y'], euler_from_quaternion((q['x'], q['y'], q['z'], q['w']))[-1]


def scan_from_data(d):
    return [r if isinstance(r, float) else 0.0 for r in d['scan']['ranges'][::-1]]


def lrs_from_data(mw, d, fu=0):
    x, y, yaw = pose_from_data(d)
    ranges = scan_from_data(d)
    return mw.make_scan(ranges, x, y, yaw + fu)


def pc_to_cmd(i, label):
    return {'type': 'pointcloud', 'label': str(label), 'arrs': i, 'opacity': 1.0, 'color': '#ff0000'}


def send_test_pointclouds():
    im = cv2.imread('./depth_test.png', cv2.CV_16U)
    p = depth_projection(im, 0.9, 1.20, 0.49, 0.49)

    for i in range(500):
        m = (i % 2) + 1
        pp = pc_to_cmd(p, 'd')
        pp['position'] = {'x': 0, 'y': 0, 'z': m}
        send_command(pp)
        time.sleep(0.1)


def send_test_data():
    with open('/home/jari/Dropbox/simbe_notebooks/mpslam-testing/tarjan_office.json') as ff:
        scans = json.loads(ff.read())

    mpm = MPScanMatcher(0.00436332309619, -2.35619449615, 2.35619449615)

    l2s = []
    last = None
    for jj, d in enumerate(scans[::5]):

        x, y, t = pose_from_data(d)
        scan = d['scan']

        mpm.process_scan(scan, x, y, t)

        p = pose2d_to_cmd(mpm.recent_scans[-1].corrected_pose, 'cloud_center')
        send_command(p)
        c = scan_to_cmd(d['scan'], 'cloud')
        c['position'] = p['position']
        c['orientation'] = p['orientation']
        l2s.append(c)

        if last:
            last['opacity'] = 0.1
            last['color'] = '#000000'
            send_command(last)

        send_command(c)
        last = c
        time.sleep(0.01)


def depth_projection(im, fx, fy, cx, cy):
    im = (im / 1000.0).astype('float32').T
    xx, yy = np.meshgrid(np.arange(im.shape[0]), np.arange(im.shape[1]))
    h, w = im.shape
    xt = (xx - cx * w).T * im / fx / w
    yt = (yy - cy * h).T * im / fy / h
    im_flat = np.ndarray.flatten(im)
    not_zero_indices = np.where(im_flat != 0)[0]
    xt_flat = np.ndarray.flatten(xt)[not_zero_indices] * 10
    yt_flat = np.ndarray.flatten(yt)[not_zero_indices] * 10
    im_flat = im_flat[not_zero_indices] * 10
    one = np.ndarray.flatten(np.ones(im_flat.shape))
    # stack = np.stack((xt_flat,yt_flat,im_flat,one), axis = -1)
    return {'x': xt_flat.tolist()[::10], 'y': yt_flat.tolist()[::10], 'z': im_flat.tolist()[::10]}


if __name__ == '__main__':
    try:
        send_test_data()
        # send_test_pointclouds()
        time.sleep(5)
    except KeyboardInterrupt:
        send_command.loop.stop()
