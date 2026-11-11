"""Run in UE5 Editor Python console. Editor preview only; no C++ or Remote Control required."""
import builtins
import importlib.util
import json
import pathlib
import queue
import sys
import threading
import time
import urllib.request
import unreal

# compile(..., absolute_filename, ...) also works when exec() doesn't define __file__.
SCRIPT_DIR = pathlib.Path(sys._getframe().f_code.co_filename).resolve().parent
spec = importlib.util.spec_from_file_location('blocklink_math', SCRIPT_DIR / 'bridge_math.py')
bridge_math = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bridge_math)


class BlockLinkReceiver:
    URL = 'http://127.0.0.1:8765'

    def __init__(self):
        self.stop_event = threading.Event()
        self.frames = queue.Queue(maxsize=1)
        self.lock = threading.Lock()
        self.status = {'applied_seq': 0, 'parts': 0, 'error': ''}
        self.actors = {}
        self.colors = {}
        self.materials = {}
        self.anchor = None
        self.master = None
        self.last_packet = None
        self.last_tick = 0
        self.failed = False
        self.subsystem = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
        self.world = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
        self.cube = unreal.load_asset('/Engine/BasicShapes/Cube.Cube')
        if not self.cube:
            raise RuntimeError('Engine basic Cube not found')
        self.handle = unreal.register_slate_post_tick_callback(self.tick)
        self.thread = threading.Thread(target=self.poll, daemon=True)
        self.thread.start()
        unreal.log('BlockLink: waiting for HTML. Open http://127.0.0.1:8765 and click Link Unreal.')

    def poll(self):
        # All HTTP happens here. Never access Unreal objects on this background thread.
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
        previous = -1
        heartbeat = 0
        while not self.stop_event.is_set():
            try:
                with opener.open(self.URL + '/api/frame', timeout=1) as response:
                    packet = json.load(response)
                if packet['frame'] and packet['seq'] != previous and packet['browser_age'] < 3:
                    previous = packet['seq']
                    try:
                        self.frames.get_nowait()
                    except queue.Empty:
                        pass
                    self.frames.put_nowait(packet)
                if time.monotonic() - heartbeat > 0.5:
                    with self.lock:
                        payload = json.dumps(self.status).encode()
                    req = urllib.request.Request(self.URL + '/api/ue-status', data=payload,
                                                 headers={'Content-Type': 'application/json'})
                    with opener.open(req, timeout=1) as response:
                        response.read()
                    heartbeat = time.monotonic()
            except Exception:
                self.stop_event.wait(0.4)
            self.stop_event.wait(1/30)

    def material(self, color):
        if color in self.materials:
            return self.materials[color]
        lib = unreal.MaterialEditingLibrary
        assets = unreal.AssetToolsHelpers.get_asset_tools()
        folder = '/Game/BlockLinkMVP'
        if self.master is None:
            self.master = unreal.load_asset(folder + '/M_BlockLink_v1')
            if self.master is None:
                self.master = assets.create_asset('M_BlockLink_v1', folder, unreal.Material, unreal.MaterialFactoryNew())
                param = lib.create_material_expression(self.master, unreal.MaterialExpressionVectorParameter, -300, 0)
                param.set_editor_property('parameter_name', 'Tint')
                param.set_editor_property('default_value', unreal.LinearColor(1, 1, 1, 1))
                if not lib.connect_material_property(param, '', unreal.MaterialProperty.MP_BASE_COLOR):
                    raise RuntimeError('Cannot connect character color material')
                rough = lib.create_material_expression(self.master, unreal.MaterialExpressionConstant, -300, 120)
                rough.set_editor_property('r', 0.75)
                lib.connect_material_property(rough, '', unreal.MaterialProperty.MP_ROUGHNESS)
                lib.recompile_material(self.master)
        name = 'MI_BL_' + color[1:].lower()
        instance = unreal.load_asset(folder + '/' + name)
        if instance is None:
            instance = assets.create_asset(name, folder, unreal.MaterialInstanceConstant, unreal.MaterialInstanceConstantFactoryNew())
            lib.set_material_instance_parent(instance, self.master)
            r, g, b = bridge_math.linear_color(color)
            lib.set_material_instance_vector_parameter_value(instance, 'Tint', unreal.LinearColor(r, g, b, 1))
            lib.update_material_instance(instance)
        self.materials[color] = instance
        return instance

    def ensure_anchor(self):
        if self.anchor is None:
            selected = self.subsystem.get_selected_level_actors()
            location = selected[0].get_actor_location() if selected else unreal.Vector(0, 0, 0)
            self.anchor = self.subsystem.spawn_actor_from_class(unreal.TargetPoint, location)
            self.anchor.set_actor_label('BL_Anchor_MOVE_ME')
            self.anchor.set_folder_path('BlockLink_MVP')
            self.subsystem.set_selected_level_actors([self.anchor])
            unreal.log('BlockLink: character created. Select BL_Anchor_MOVE_ME and move it onto your floor. Press F to focus.')

    def apply(self, packet):
        self.ensure_anchor()
        origin = self.anchor.get_actor_location()
        rotation = self.anchor.get_actor_rotation().quaternion()
        origin = (origin.x, origin.y, origin.z)
        rotation = (rotation.x, rotation.y, rotation.z, rotation.w)
        ids = set()
        for part in packet['frame']['parts']:
            name = part['id']
            ids.add(name)
            actor = self.actors.get(name)
            if actor is None:
                actor = self.subsystem.spawn_actor_from_class(unreal.StaticMeshActor, unreal.Vector(0, 0, 0))
                actor.set_actor_label('BL_' + name)
                actor.set_folder_path('BlockLink_MVP')
                mesh = actor.static_mesh_component
                mesh.set_mobility(unreal.ComponentMobility.MOVABLE)
                mesh.set_static_mesh(self.cube)
                mesh.set_collision_enabled(unreal.CollisionEnabled.NO_COLLISION)
                self.actors[name] = actor
            if self.colors.get(name) != part['color']:
                actor.static_mesh_component.set_material(0, self.material(part['color']))
                self.colors[name] = part['color']
            p, q, scale = bridge_math.convert(part, origin, rotation)
            transform = unreal.Transform()
            transform.translation = unreal.Vector(*p)
            transform.rotation = unreal.Quat(*q)
            transform.scale3d = unreal.Vector(*scale)
            if not self.subsystem.set_actor_transform(actor, transform):
                raise RuntimeError('Cannot set transform: ' + name)
            actor.set_is_temporarily_hidden_in_editor(not part['visible'])
            actor.set_actor_hidden_in_game(not part['visible'])
        for name in set(self.actors) - ids:
            self.subsystem.destroy_actor(self.actors.pop(name))
            self.colors.pop(name, None)
        with self.lock:
            self.status.update(applied_seq=packet['seq'], parts=len(ids), error='')

    def tick(self, delta):
        if self.failed or self.stop_event.is_set() or time.monotonic() - self.last_tick < 1/30:
            return
        self.last_tick = time.monotonic()
        try:
            current_world = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
            if current_world != self.world:
                raise RuntimeError('Level changed. Stop and run the setup command again in the new level.')
            try:
                self.last_packet = self.frames.get_nowait()
            except queue.Empty:
                pass
            if self.last_packet:
                self.apply(self.last_packet)
        except Exception as exc:
            self.failed = True
            with self.lock:
                self.status['error'] = str(exc)
            unreal.log_error('BlockLink: ' + str(exc) + ' | Fix the issue and run the setup command again.')

    def stop(self, remove=False):
        self.stop_event.set()
        if self.handle is not None:
            unreal.unregister_slate_post_tick_callback(self.handle)
            self.handle = None
        if remove:
            for actor in list(self.actors.values()) + ([self.anchor] if self.anchor else []):
                try:
                    self.subsystem.destroy_actor(actor)
                except Exception:
                    pass
            self.actors.clear()
            self.anchor = None
        unreal.log('BlockLink: stopped' + (' and removed preview actors.' if remove else '.'))


if hasattr(builtins, '_blocklink_mvp'):
    builtins._blocklink_mvp.stop(remove=True)
builtins._blocklink_mvp = BlockLinkReceiver()
