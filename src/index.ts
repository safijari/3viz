import { ThreeViz } from './helpers';
import * as THREE from 'three';
import { encode, decode } from 'messagepack';

let padding = 20;
let winWidth = window.innerWidth;
let winHeight = window.innerHeight;
let scn = new ThreeViz(75, window.innerWidth - padding, window.innerHeight - padding - 30)

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

function process_cmd(data: any) {
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
        scn.add_pointcloud(data.label, data.position, data.orientation, data.arrs, data.color, data.opacity, data.size);
    } else if (data.type == "pointcloud_with_per_point_color") {
        scn.add_pointcloud_with_per_point_color(data.label, data.position, data.orientation, data.arrs, data.color_arrs, data.opacity, data.size);
    } else if (data.type == "cubecloud") {
        scn.add_cube_cloud(data.label, data.position, data.orientation, data.color, data.xarr, data.yarr, data.zarr, data.opacity, data.size);
    } else if (data.type == "line") {
        scn.add_line(data.label, data.position, data.orientation, data.positions, data.color, data.thickness, data.opacity);
    } else if (data.type == "plane") {
        scn.add_plane(data.label, data.position, data.orientation, data.scale_x, data.scale_y);
    } else if (data.type == "cylinder") {
        scn.add_cylinder(data.label, data.position, data.orientation,
            data.color, data.opacity, data.radius, data.height);
    } else if (data.type == "plane_tex") {
        scn.add_plane_texture(data.label, data.uri, data.position, data.orientation, data.scale_x, data.scale_y, data.opacity);
    } else if (data.type == "text") {
        scn.add_text(data.label, data.position, data.orientation, data.color, data.scale_x, data.scale_y, data.opacity, data.text);
    }
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
                process_cmd(data);
            }
        )
    };
}

console.log(scn)

const raycaster = new THREE.Raycaster();
raycaster.params!.Points!.threshold = 0.1;
raycaster.params!.Line!.threshold = 0.1;
raycaster.params!.Mesh!.threshold = 0.1;
console.log(raycaster);
const pointer = new THREE.Vector2();
const wpointer = new THREE.Vector2();

const infodiv = document.createElement("div");
infodiv.innerHTML = "hey";
infodiv.setAttribute("id", "infodiv")

infodiv.style.top = "-1000px"
infodiv.style.left = "-1000px"

const fileinput = document.createElement("input");
fileinput.type = "file"

fileinput.addEventListener('change', function(e: Event) {
    (<HTMLInputElement>(e.target)).files![0]!.text().then(function(v) {
        let res = JSON.parse(v);
        res.forEach(process_cmd);
        (<HTMLInputElement>(e.target)).value = "";
    });
});

document.body.appendChild(infodiv);

document.body.appendChild(scn.renderer.domElement)

document.body.appendChild(fileinput);

let last_obj_hovered: any = null;

function animate() {
    setTimeout(function() {
        requestAnimationFrame(animate);
    }, 1000 / 60);

    if (wpointer.x > 0 && wpointer.y > 0) {
        raycaster.setFromCamera(pointer, scn.camera);
        const intersects = raycaster.intersectObjects(scn.scene.children, true);

        var lehtml = "";

        // console.log(intersects);

        infodiv.style.visibility = "hidden";
        for (let i = 0; i < intersects.length; i++) {
            var intr = intersects[i];
            if (intr.object.name == "root" || intr.object.name == "rootgrid") {
                continue;
            }
            // console.log(intr.object.name);
            // console.log(intr);
            infodiv.style.top = (wpointer.y + 10) + "px";
            infodiv.style.left = (wpointer.x + 10) + "px";
            if (!lehtml.includes(intr.object.name)) {
                lehtml += intr.object.name + "<br/>";
            }
            infodiv.style.visibility = "visible";
            last_obj_hovered = intr;
            break;
        }
        infodiv.innerHTML = lehtml;
        wpointer.x = -1;
        wpointer.y = -1;

    }

    scn.render();
    if (winWidth != window.innerWidth || winHeight != window.innerHeight) {
        winWidth = window.innerWidth;
        winHeight = window.innerHeight;
        scn.update_size(winWidth - padding, winHeight - padding - 30);
    }
}


function onPointerMove(event: MouseEvent) {
    wpointer.x = event.clientX;
    wpointer.y = event.clientY;
    pointer.x = (event.clientX / (window.innerWidth - padding)) * 2 - 1;
    pointer.y = - (event.clientY / (window.innerHeight - padding - 30)) * 2 + 1;
}

function onKeyDown(event: KeyboardEvent) {
    if (event.key.toLowerCase() == "f") {
        scn.controls.target.copy(last_obj_hovered.point);
        var p = last_obj_hovered.point;
        var dir = new THREE.Vector3();
        dir.subVectors(scn.camera.position, p).normalize();
        scn.camera.position.set(p.x + dir.x * 5, p.y + dir.y * 5, p.z + dir.z * 5);
        scn.controls.update();
    }
}

window.addEventListener('pointermove', onPointerMove);
window.addEventListener('keydown', onKeyDown);

startWebsocket()
animate()

// setTimeout(() => { scn.add_text("testtext", null, null, "red", 1, 1, 1.0, "testtest"); }, 1000)


