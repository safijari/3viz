import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface Position {
    x: number,
    y: number,
    z: number
}

interface Orientation {
    x: number,
    y: number,
    z: number,
    w?: number
}

export class ThreeViz {
    scene: THREE.Scene = new THREE.Scene()
    renderer: THREE.Renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    grid: THREE.GridHelper = new THREE.GridHelper(10, 10)

    camera: THREE.PerspectiveCamera
    controls: OrbitControls
    objects: Record<string, THREE.Object3D> = {}

    constructor(fov: number, width: number, height: number) {
        this.camera = new THREE.PerspectiveCamera(fov, width/height, 0.1, 1000);
        this.camera.isPerspectiveCamera = true;
        this.scene.background = new THREE.Color(0xf0f0f0)

		    this.renderer.setSize( width, height );

        this.set_up(this.camera)
        this.set_up(this.grid)

        this.set_orientation(this.grid, THREE.Math.degToRad(90), 0, 0)

        this.scene.add(this.grid)

        this.controls = new OrbitControls( this.camera, this.renderer.domElement );
        this.camera.position.x = 5
        this.camera.position.y = 5
        this.camera.position.z = 5
        this.camera.lookAt(0, 0, 0)
    }

    render() { this.renderer.render(this.scene, this.camera) }

    set_up(obj: THREE.Object3D) { obj.up = new THREE.Vector3(0, 0, 1) }

    set_orientation(obj: THREE.Object3D, x: number, y: number, z: number, w: number | null = null) {
        if (w != null) {
            obj.setRotationFromQuaternion(new THREE.Quaternion(x, y, z, w))
        } else {
            obj.setRotationFromEuler(new THREE.Euler(x, y, z))
        }
    }

    set_position(obj: THREE.Object3D, x: number, y: number, z: number) {
        obj.position = new THREE.Vector3(x, y, z)
    }

    set_scale(obj: THREE.Object3D, x: number, y: number, z: number) { obj.scale = new THREE.Vector3(x, y, z) }

    _set_position_orientation_if_provided(obj: THREE.Object3D, position: Position | null, orientation: Orientation | null) {
        let p = position
        if (p != null) {
            this.set_position(obj, p.x, p.y, p.z)
        }

        let q = orientation
        if (q != null) {
            this.set_orientation(obj, q.x, q.y, q.z, q.w)
        }
    }
}
