function make_scene(window) {
		var _scene = new THREE.Scene();
		_scene.background = new THREE.Color( 0xf0f0f0 );
		var _camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );
    set_up(_camera);
		var _renderer = new THREE.WebGLRenderer({antialias: true, preserveDrawingBuffer: true});
		_renderer.setSize( window.innerWidth, window.innerHeight );

    var _controls = new THREE.OrbitControls( _camera, _renderer.domElement );

		var _grid = new THREE.GridHelper( 10, 10 );
    set_up(_grid);
		_grid.material.opacity = 0.25;
		_grid.material.transparent = true;
    set_orientation(_grid, THREE.Math.degToRad(90), 0, 0);
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

function set_orientation(obj, x, y, z, w=null) {
    if (w != null) {
        obj.setRotationFromQuaternion(new THREE.Quaternion(x, y, z, w));
    } else {
        obj.setRotationFromEuler(new THREE.Euler(x, y, z));
    }
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
    _set_position_orientation_if_provided(axes, position, orientation);


    render_scene(scn);
}

function _set_position_orientation_if_provided(obj, position, orientation) {
    var p = position;
    if (p != null) {
        set_position(obj, p.x, p.y, p.z);
    }

    var q = orientation;
    if (q != null) {
        set_orientation(obj, q.x, q.y, q.z, q.w);
    }
}

function _default(val, def) {
    if (val == null) {
        return def;
    } else {
        return val;
    }
}

function add_pointcloud(scn, label, arrs, position=null, orientation=null, color=null, opacity=null) {
    var obj = null;
    if (!scn.objects_map.hasOwnProperty(label)) {
        var mat = new THREE.PointsMaterial({ color: new THREE.Color(_default(color, "#ff0000")), size: 0.05, transparent: true, opacity: _default(opacity, 1.0)});
        var geom = new THREE.Geometry();
        geom.dynamic = true;
        obj = new THREE.Points(geom, mat);
        set_up(obj);
        scn.objects_map[label] = obj;
        scn.scene.add(obj);
    }
    else {
        obj = scn.objects_map[label];
    }

    obj.geometry.vertices = [];

    for (var i = 0; i < arrs.x.length; i++) {
        obj.geometry.vertices.push(new THREE.Vector3(arrs.x[i], arrs.y[i], arrs.z[i]));
    }

    if (color != null) {
        obj.material.color = new THREE.Color(color);
        obj.material.colorNeedsUpdate = true;
    }

    if (opacity != null) {
        obj.material.opacity = opacity;
        obj.material.opacityNeedsUpdate = true;
    }

    obj.geometry.verticesNeedUpdate = true;

    _set_position_orientation_if_provided(obj, position, orientation);
}

function _snapshot(scn) {
    var strMime = "image/png";
    return scn.renderer.domElement.toDataURL(strMime);
}
