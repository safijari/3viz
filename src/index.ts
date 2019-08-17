import { ThreeViz } from './helpers';
import * as THREE from 'three';

let scn = new ThreeViz(75, window.innerWidth, window.innerHeight)

console.log(scn)

// add axis to the scene
let axis = new THREE.AxesHelper(10)

document.body.appendChild(scn.renderer.domElement)

function animate(): void {
    requestAnimationFrame(animate)
    scn.render()
}

animate()
