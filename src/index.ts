import { ThreeViz } from './helpers';
import * as THREE from 'three';
import { encode, decode } from 'messagepack';

let padding = 20;
let winWidth = window.innerWidth;
let winHeight = window.innerHeight;
let scn = new ThreeViz(75, window.innerWidth - padding, window.innerHeight - padding)

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
let port = urlParams.get('port')
if (port == null) {
    port = '8765'
}

let host = urlParams.get('host')
if (host == null) {
    host = "localhost";
}
else {
    host = window.location.host;
    host = host.split(":")[0];
}

function startWebsocket() {
    let ws: WebSocket | null

    ws = new WebSocket('ws://' + host + ":" + port + '/ws')

    ws.onclose = function() {
        ws = null
        setTimeout(startWebsocket, 1250)
    }

    ws.onmessage = function(ev) {
        ev.data.arrayBuffer().then(
            function(val: any) {
                let data: any = decode(val);
                if (data.type == "clear") {
                    scn.clear_all_objects();
                }
                if (data.type == "delete") {
                    scn.delete_object(data.label);
                }
                if (data.type == "move_camera") {
                    scn.move_camera(data.x, data.y, data.z, data.lx, data.ly, data.lz);
                }
                if (data.type == "axes") {
                    scn.add_axes(data.label, data.position, data.orientation, data.size);
                } else if (data.type == "axes_list") {
                    for (var i = 0; i < data.elements.length; i++) {
                        var el = data.elements[i];
                        scn.add_axes(el.label, el.position, el.orientation, el.size);
                    }
                } else if (data.type == "pointcloud") {
                    scn.add_pointcloud(data.label, data.position, data.orientation, data.color, data.arrs, data.opacity, data.size);
                } else if (data.type == "cubecloud") {
                    scn.add_cube_cloud(data.label, data.position, data.orientation, data.color, data.xarr, data.yarr, data.zarr, data.opacity, data.size);
                } else if (data.type == "line") {
                    scn.add_line(data.label, data.positions, data.color, data.thickness, data.opacity);
                } else if (data.type == "plane") {
                    scn.add_plane(data.label, data.position, data.orientation, data.scale_x, data.scale_y);
                } else if (data.type == "plane_tex") {
                    scn.add_plane_texture(data.label, data.uri, data.position, data.orientation, data.scale_x, data.scale_y, data.opacity);
                }

            }
        )
    };
}

console.log(scn)

// add axis to the scene
let axis = new THREE.AxesHelper(10)

document.body.appendChild(scn.renderer.domElement)

function animate() {
    setTimeout(function() {
        requestAnimationFrame(animate);
    }, 1000 / 60);
    scn.render();
    if (winWidth != window.innerWidth || winHeight != window.innerHeight) {
        winWidth = window.innerWidth;
        winHeight = window.innerHeight;
        scn.update_size(winWidth - padding, winHeight - padding);
    }
}

startWebsocket()
animate()
