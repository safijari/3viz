import { ThreeViz } from './helpers';
import * as THREE from 'three';
import { encode, decode } from 'messagepack';

let scn = new ThreeViz(75, window.innerWidth, window.innerHeight)

const queryString = window.location.search;
console.log(queryString)
const urlParams = new URLSearchParams(queryString);

let port = urlParams.get('port')
if (port == null) {
    port = '8765'
}


function startWebsocket() {
    let ws: WebSocket | null

    ws = new WebSocket('ws://localhost:'+port+'/ws')

    ws.onclose = function(){
        ws = null
        setTimeout(startWebsocket, 1250)
    }

    ws.onmessage = function(ev){
        ev.data.arrayBuffer().then(
            function (val: any) {
                let data:any = decode(val);
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
    setTimeout( function() {
        requestAnimationFrame( animate );
    }, 1000 / 60 );
    scn.render();
}

startWebsocket()
animate()
