import * as tj from 'three'

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

class ThreeViz {
    scene: tj.Scene = new tj.Scene()
    renderer: tj.Renderer = new tj.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    grid: tj.GridHelper = new tj.GridHelper(10, 10)

    camera: tj.PerspectiveCamera
    objects: Record<string, tj.Object3D> = {}

    constructor(fov: number, ratio: number) {
        this.camera = new tj.PerspectiveCamera(fov, ratio, 0.1, 1000);
        this.scene.background = new tj.Color(0xf0f0f0)

        this.set_up(this.camera)
        this.set_up(this.grid)
    }

    render() { this.renderer.render(this.scene, this.camera) }

    set_up(obj: tj.Object3D) { obj.up = new tj.Vector3(0, 0, 1) }

    set_orientation(obj: tj.Object3D, x: number, y: number, z: number, w: number | null = null) {
        if (w != null) {
            obj.setRotationFromQuaternion(new tj.Quaternion(x, y, z, w))
        } else {
            obj.setRotationFromEuler(new tj.Euler(x, y, z))
        }
    }

    set_position(obj: tj.Object3D, x: number, y: number, z: number) {
        obj.position = new tj.Vector3(x, y, z)
    }

    set_scale(obj: tj.Object3D, x: number, y: number, z: number) { obj.scale = new tj.Vector3(x, y, z) }

    _set_position_orientation_if_provided(obj: tj.Object3D, position: Position | null, orientation: Orientation | null) {
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
