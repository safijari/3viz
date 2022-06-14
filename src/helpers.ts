import * as THREE from 'three';
import * as dat from 'dat.gui';
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
    ray_caster: THREE.Raycaster = new THREE.Raycaster()
    gui: dat.GUI = new dat.GUI({ autoPlace: true })
    renderer: THREE.Renderer = new THREE.WebGLRenderer()
    grid: THREE.GridHelper = new THREE.GridHelper(10, 10)

    camera: THREE.PerspectiveCamera
    controls: OrbitControls
    objects: Record<string, THREE.Object3D>
    light: THREE.AmbientLight;

    loader = new THREE.TextureLoader();

    settings = { fov: 75, status: "none", default_cam: () => { this.set_default_position(); }, clear_all: () => { this.clear_all_objects(); } };

    constructor(fov: number, width: number, height: number) {
        this.camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 1000);
        this.light = new THREE.AmbientLight(0x404040); // soft white light
        this.light.intensity = 10;
        this.scene.add(this.light);

        this.scene.background = new THREE.Color(0xf0f0f0)
        this.objects = {}

        this.renderer.setSize(width, height);

        this.set_up(this.camera)
        this.set_up(this.grid)
	this.grid.name = "rootgrid";

        this.set_orientation(this.grid, THREE.MathUtils.degToRad(90), 0, 0)

        this.scene.add(this.grid)

        let gridmat = this._get_first_mat(this.grid)

        gridmat.opacity = 0.25;
        gridmat.transparent = true;

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.set_default_position();
        this.reload_camera_posision();

        this.controls.addEventListener("change", () => { sessionStorage.setItem("camera_position", JSON.stringify(this.camera.position)); sessionStorage.setItem("camera_quat", JSON.stringify(this.camera.quaternion)) });

        this.add_axes('root', null, null, 0.2)

        this.gui.add(this.settings, "status");
        this.gui.add(this.settings, "fov", 50, 100).onChange((v) => { this.camera.fov = v; this.camera.updateProjectionMatrix(); });
        this.gui.add(this.settings, "default_cam");
        this.gui.add(this.settings, "clear_all");
    }

    move_camera(x: number, y: number, z: number, lx: number, ly: number, lz: number) {
        this.camera.position.x = x;
        this.camera.position.y = y;
        this.camera.position.z = z;
        this.camera.lookAt(lx, ly, lz);
        this.controls.target = new THREE.Vector3(lx, ly, lz);
        this.camera.updateProjectionMatrix();
    }

    set_default_position() {
        this.move_camera(5, 5, 5, 0, 0, 0);
    }

    reload_camera_posision() {
        var pos_str = sessionStorage.getItem("camera_position");
        if (pos_str == null) {
            return
        }
        var pos = JSON.parse(pos_str);
        this.camera.position.x = pos.x;
        this.camera.position.y = pos.y;
        this.camera.position.z = pos.z;

        var pos_str = sessionStorage.getItem("camera_quat");
        if (pos_str == null) {
            return
        }
        var pos = JSON.parse(pos_str);
        this.camera.quaternion.x = pos._x;
        this.camera.quaternion.y = pos._y;
        this.camera.quaternion.z = pos._z;
        this.camera.quaternion.w = pos._w;
    }

    update_size(width: number, height: number) {
        this.renderer.setSize(width, height);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
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

    _add_obj(obj: THREE.Object3D, label: string) {
        this.set_up(obj)
        this.objects[label] = obj
        this.scene.add(obj)
	obj.name = label;
    }

    add_cube_cloud(label: string, position: Position | null, orientation: Orientation | null, color: string = "#ff0000", xarr: number[], yarr: number[], zarr: number[], opacity: number = 1.0, point_size: number = 0.1) {
        let geometry = new THREE.BoxBufferGeometry(point_size, point_size, point_size)
        var wireframe = new THREE.WireframeGeometry(geometry);
        let material = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: opacity })

        var group = new THREE.Group()

        for (var i = 0; i < xarr.length; i++) {
            var cube = new THREE.Mesh(geometry, material)
	    cube.name = label;
            cube.position.set(xarr[i], yarr[i], zarr[i])
            group.add(cube)
        }

        this._add_obj(group, label)
	group.name = label;

        this._set_position_orientation_if_provided(group, position, orientation)
    }

    delete_object(label: string) {
        var obj = <THREE.Points>this.objects[label];
        this.scene.remove(obj);
        var geom = obj.geometry;
        geom.dispose();
        delete this.objects[label];
    }

    clear_all_objects() {
        for (var label in this.objects) {
            this.delete_object(label);
        }
        this.add_axes('root', null, null, 0.2)
    }

    add_axes(label: string, position: Position | null, orientation: Orientation | null, size: number = 1.0) {
        let axes;
        if (label in this.objects) {
            axes = this.objects[label];
        } else {
            axes = new THREE.AxesHelper(1)
	    axes.name = label;
            this._add_obj(axes, label)
        }

        this.set_scale(axes, size, size, size)
        this._set_position_orientation_if_provided(axes, position, orientation)
    }

    add_plane_texture(label: string, texture_uri: string, position: Position | null, orientation: Orientation | null, scale_x: number = 1.0, scale_y: number = 1.0, opacity: number = 1.0) {
        // var uri = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg =="
        let plane;
        // var tex = THREE.ImageUtils.loadTexture(texture_uri);
	var tex = new THREE.TextureLoader().load(texture_uri);
        if (label in this.objects) {
            plane = <THREE.Mesh>this.objects[label];
        } else {
            var geom = new THREE.PlaneGeometry();
            var material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
            material.transparent = true;
            plane = new THREE.Mesh(geom, material);
            this._add_obj(plane, label);
        }
        this._set_position_orientation_if_provided(plane, position, orientation);
        var mat = <THREE.MeshBasicMaterial>plane.material;
        mat.map = tex;
        mat.opacity = opacity;
        plane.scale.set(scale_x, scale_y, 1.0);
    }

    add_plane(label: string, position: Position | null, orientation: Orientation | null, color: string = "#ff0000", scale_x: number = 1.0, scale_y: number = 1.0, opacity: number = 1.0) {
        let plane;
        if (label in this.objects) {
            plane = <THREE.Mesh>this.objects[label];
        } else {
            var geom = new THREE.PlaneGeometry();
            var material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
            plane = new THREE.Mesh(geom, material);
            this._add_obj(plane, label);
        }
        this._set_position_orientation_if_provided(plane, position, orientation);
        var mat = <THREE.MeshBasicMaterial>plane.material;
        mat.color.set(color);
        mat.opacity = opacity;
        plane.scale.set(scale_x, scale_y, 1.0);
    }

    add_pointcloud(label: string, position: Position | null, orientation: Orientation | null, point_arrays: number[], color: string = "#ff0000",  opacity: number = 1.0, point_size: number = 0.1) {
        let obj: THREE.Points;

        if (label in this.objects) {
            obj = <THREE.Points>this.objects[label]
            let geom = (<THREE.BufferGeometry>obj.geometry);
            this.scene.remove(obj);
            geom.dispose();
        }

        let mat = new THREE.PointsMaterial({
            color: new THREE.Color(color), size: point_size,
            transparent: true, opacity: opacity
        })
        let geom = new THREE.BufferGeometry()
        geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(point_arrays), 3))

        obj = new THREE.Points(geom, mat)

        this._add_obj(obj, label)

        mat.color = new THREE.Color(color)
        mat.opacity = opacity

        this._set_position_orientation_if_provided(obj, position, orientation)
    }

    add_line(label: string, position: Position | null, orientation: Orientation | null, point_arrays: number[], color: string = "#000000", thickness: number = 0.1, opacity: number = 1.0) {
        let obj: THREE.Line;
        if (label in this.objects) {
            obj = <THREE.Line>this.objects[label]
            this.scene.remove(obj);
        }

        let mat = new THREE.LineBasicMaterial({
            color: new THREE.Color(color), linewidth: thickness,
            transparent: true, opacity: opacity
        })

        let geom = new THREE.BufferGeometry()
        geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(point_arrays), 3))

        obj = new THREE.Line(geom, mat)
        this._add_obj(obj, label)

        this._set_position_orientation_if_provided(obj, position, orientation)
    }

    _snapshot() {
        let strMime = "image/png";
        return this.renderer.domElement.toDataURL(strMime);
    }
}
