function make_scene(window) {
		var _scene = new THREE.Scene();
		_scene.background = new THREE.Color( 0xf0f0f0 );
		var _camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );
    set_up(_camera);
		var _renderer = new THREE.WebGLRenderer(antialias=true);
		_renderer.setSize( window.innerWidth, window.innerHeight );

    var _controls = new THREE.OrbitControls( _camera, _renderer.domElement );

		var _grid = new THREE.GridHelper( 10, 10 );
    set_up(_grid);
		_grid.material.opacity = 0.25;
		_grid.material.transparent = true;
		_scene.add( _grid );

    return {scene: _scene, camera: _camera, renderer: _renderer, controls: _controls, grid: _grid, objects_map: {}};
}

function render_scene(scn) {
    scn.renderer.render(scn.scene, scn.camera);
}

function set_up(obj) {
    obj.up.y = 0;
    obj.up.z = 1;
    obj.up.x = 0;
}

function set_scale(obj, x, y, z) {
    obj.scale.x = x;
    obj.scale.y = y;
    obj.scale.z = z;
}

function set_position(obj, x, y, z) {
    obj.position.x = x;
    obj.position.y = y;
    obj.position.z = z;
}

function mkpos(_x, _y, _z) {
    return {x: _x, y: _y, z: _z};
}

function set_orientation(obj, x, y, z, w) {
    obj.setRotationFromQuaternion(new THREE.Quaternion(x, y, z, w));
}

function add_axes(scn, size, label, position=null, orientation=null) {
    var axes = null;
    if (!scn.objects_map.hasOwnProperty(label)) {
        axes = THREE.AxisHelper(1);
        set_up(axes);
        scn.objects_map[label] = axes;
        scn.scene.add(axes);
    }
    else {
        axes = scn.objects_map[label];
    }

    set_scale(axes, size, size, size);

    var p = position;
    if (p != null) {
        set_position(axes, p.x, p.y, p.z);
    }

    var q = orientation;
    if (q != null) {
        set_orientation(axes, q.x, q.y, q.z, q.w);
    }

    render_scene(scn);
}
