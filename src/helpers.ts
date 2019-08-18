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

interface PointArrays {
    x: number[],
    y: number[],
    z: number[],
}

export interface BaseAction {
    kind: string,
    label: string,
    position?: Position,
    orientation?: Orientation
}

export interface AxesAction extends BaseAction {
    size?: number
}

export interface PointCloudAction extends BaseAction {
    color?: string,
    opacity?: number,
    point_size?: number
}

export type Action = AxesAction | PointCloudAction

// type ObjectT = THREE.AxesHelper | THREE.Points | THREE.Line | THREE.Line3

interface HasMaterial {
    material: THREE.Material | THREE.Material[]
}

export class ThreeViz {
    scene: THREE.Scene = new THREE.Scene()
    renderer: THREE.Renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    grid: THREE.GridHelper = new THREE.GridHelper(10, 10)

    camera: THREE.PerspectiveCamera
    controls: OrbitControls
    objects: Record<string, THREE.Object3D>

    constructor(fov: number, width: number, height: number) {
        this.camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 1000);
        this.camera.isPerspectiveCamera = true;
        this.scene.background = new THREE.Color(0xf0f0f0)
        this.objects = {}

        this.renderer.setSize(width, height);

        this.set_up(this.camera)
        this.set_up(this.grid)

        this.set_orientation(this.grid, THREE.Math.degToRad(90), 0, 0)

        this.scene.add(this.grid)

        let gridmat = this._get_first_mat(this.grid)

        gridmat.opacity = 0.25;
        gridmat.transparent = true;

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.camera.position.x = 5
        this.camera.position.y = 5
        this.camera.position.z = 5
        this.camera.lookAt(0, 0, 0)

        this.add_axes('root', null, null, 0.25)
    }

    render() { this.renderer.render(this.scene, this.camera) }

    set_up(obj: THREE.Object3D) { obj.up = new THREE.Vector3(0, 0, 1) }

    _get_first_mat(obj: HasMaterial): THREE.Material {
        let mat
        if (obj.material instanceof THREE.Material) {
            mat = obj.material
        }
        else {
            mat = obj.material[0]
        }
        return mat
    }

    _apply_xyz(prop: Position, x: number, y: number, z: number) {
        prop.x = x
        prop.y = y
        prop.z = z
    }

    set_orientation(obj: THREE.Object3D, x: number, y: number, z: number, w: number | null = null) {
        if (w != null) {
            obj.setRotationFromQuaternion(new THREE.Quaternion(x, y, z, w))
        } else {
            obj.setRotationFromEuler(new THREE.Euler(x, y, z))
        }
    }

    set_position(obj: THREE.Object3D, x: number, y: number, z: number) {
        this._apply_xyz(obj.position, x, y, z)
    }

    set_scale(obj: THREE.Object3D, x: number, y: number, z: number) {
        this._apply_xyz(obj.scale, x, y, z)
    }

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

    add_axes(label: string, position: Position | null, orientation: Orientation | null, size: number = 1.0) {
        let axes;
        if (label in this.objects) {
            axes = this.objects[label];
        } else {
            axes = new THREE.AxesHelper(1)
            this._add_obj(axes, label)
        }

        this.set_scale(axes, size, size, size)
        this._set_position_orientation_if_provided(axes, position, orientation)

        this.render()
    }

    _add_obj(obj: THREE.Object3D, label: string) {
        this.set_up(obj)
        this.objects[label] = obj
        this.scene.add(obj)
    }

    add_pointcloud(label: string, position: Position | null, orientation: Orientation | null, color: string = "#ff0000", point_arrays: number[], opacity: number = 1.0, point_size: number = 0.1) {
        let obj: THREE.Points;
        let added = false
        if (label in this.objects) {
            obj = <THREE.Points>this.objects[label]
        } else {
            let mat = new THREE.PointsMaterial({ color: new THREE.Color(color), size: point_size,
                                                 transparent: true, opacity: opacity})
            let geom = new THREE.BufferGeometry()
            geom.addAttribute('position', new THREE.BufferAttribute(new Float32Array(point_arrays), 3))

            obj = new THREE.Points(geom, mat)
            this._add_obj(obj, label)
            added = true
        }

        if (!added) {
            let geom = (<THREE.BufferGeometry>obj.geometry);

            geom.attributes.position.array = new Float32Array(point_arrays);
            (<THREE.BufferAttribute>geom.attributes.position).needsUpdate = true

            geom.computeBoundingSphere();

        }


        let mat = (<THREE.PointsMaterial>this._get_first_mat(obj))
        mat.color = new THREE.Color(color)
        mat.opacity = opacity

        this._set_position_orientation_if_provided(obj, position, orientation)

        this.render()
    }

    add_line(label: string, pos_arrays: Position[], color: string = "#000000", thickness: number = 0.1, opacity: number = 1.0) {
        let obj: THREE.Line;
        if (label in this.objects) {
            obj = <THREE.Line>this.objects[label]
        } else {
            let mat = new THREE.LineBasicMaterial({ color: new THREE.Color(color), linewidth: thickness,
                                                 transparent: true, opacity: opacity})
            let geom = new THREE.Geometry()

            obj = new THREE.Line(geom, mat)
            this._add_obj(obj, label)
        }

        let geom = <THREE.Geometry>obj.geometry;

        geom.vertices = []

        for (let pos of pos_arrays) {
            geom.vertices.push(pos as THREE.Vector3);
        }
        geom.computeBoundingSphere();
        geom.verticesNeedUpdate = true;

        let mat = (<THREE.LineBasicMaterial>this._get_first_mat(obj));
        mat.color = new THREE.Color(color);
        mat.opacity = opacity;

        this.render()
    }

    _snapshot() {
        let strMime = "image/png";
        return this.renderer.domElement.toDataURL(strMime);
    }
}
