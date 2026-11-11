import copy
import importlib.util
import json
import math
import pathlib
import random
import sys
import threading
import unittest
import urllib.error
import urllib.request
from functools import partial
from http.server import ThreadingHTTPServer

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import server
spec = importlib.util.spec_from_file_location('bridge_math', ROOT / 'unreal/bridge_math.py')
bm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bm)

PART = {'id':'head','p':[1,2,3],'q':[0,0,0,1],'s':[1.2,1.2,1.2],
        'color':'#edbd86','visible':True}
FRAME = {'version':1,'time':1.25,'animation':'wave','parts':[PART]}


class CoordinateTests(unittest.TestCase):
    def test_units_and_origin(self):
        p,q,s = bm.convert(PART, (100,200,300))
        self.assertEqual(p,(205,235,370))
        self.assertEqual(q,(0,0,0,1))
        self.assertEqual(s,(.42,.42,.42))

    def test_quaternion_conversion_commutes_with_basis_change(self):
        rng=random.Random(7)
        for _ in range(120):
            q=[rng.uniform(-1,1) for _ in range(4)]
            length=math.sqrt(sum(x*x for x in q));q=[x/length for x in q]
            v=[rng.uniform(-4,4) for _ in range(3)]
            rotated=bm.rotate(q,v)
            mapped=(rotated[2],rotated[0],rotated[1])
            actual=bm.rotate((q[2],q[0],q[1],q[3]),(v[2],v[0],v[1]))
            for a,b in zip(mapped,actual):self.assertAlmostEqual(a,b,places=10)

    def test_anchor_rotation(self):
        q=(0,0,math.sin(math.pi/4),math.cos(math.pi/4))
        p,_,_=bm.convert(PART,(10,20,30),q)
        for a,b in zip(p,(-25,125,100)):self.assertAlmostEqual(a,b)

    def test_srgb(self):
        self.assertEqual(bm.linear_color('#ffffff'),(1,1,1))
        self.assertAlmostEqual(bm.linear_color('#808080')[0],.2158605,places=6)


class ProtocolTests(unittest.TestCase):
    def test_valid(self):self.assertEqual(server.validate_frame(FRAME),FRAME)

    def test_bad_vectors_and_duplicate_ids(self):
        for field,value in [('p',[1,float('nan'),3]),('q',[0,0,0,0]),('s',[-1,1,1]),('visible','yes'),('id','../head')]:
            data=copy.deepcopy(FRAME);data['parts'][0][field]=value
            with self.assertRaises(ValueError):server.validate_frame(data)
        data=copy.deepcopy(FRAME);data['parts']*=2
        with self.assertRaises(ValueError):server.validate_frame(data)


class RelayTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.http=ThreadingHTTPServer(('127.0.0.1',0),partial(server.Handler,directory=str(ROOT/'web')))
        cls.base='http://127.0.0.1:'+str(cls.http.server_port)
        cls.thread=threading.Thread(target=cls.http.serve_forever,daemon=True);cls.thread.start()
        cls.client=urllib.request.build_opener(urllib.request.ProxyHandler({}))

    @classmethod
    def tearDownClass(cls):cls.http.shutdown();cls.http.server_close();cls.thread.join()

    def request(self,path,data=None,headers=None):
        h={'Content-Type':'application/json',**(headers or {})}
        req=urllib.request.Request(self.base+path,data=json.dumps(data).encode() if data is not None else None,headers=h)
        with self.client.open(req) as r:return json.load(r)

    def test_roundtrip_and_receiver_ack(self):
        ack=self.request('/api/frame',FRAME)
        received=self.request('/api/frame')
        self.assertEqual(received['frame'],FRAME);self.assertEqual(received['seq'],ack['seq'])
        self.request('/api/ue-status',{'applied_seq':ack['seq'],'parts':1,'error':''})
        status=self.request('/api/status')
        self.assertTrue(status['unreal_live']);self.assertEqual(status['applied_seq'],ack['seq'])

    def test_rejects_foreign_origin(self):
        with self.assertRaises(urllib.error.HTTPError) as ctx:self.request('/api/frame',FRAME,{'Origin':'https://example.com'})
        self.assertEqual(ctx.exception.code,403)

    def test_rejects_bad_frame(self):
        with self.assertRaises(urllib.error.HTTPError) as ctx:self.request('/api/frame',{'version':999})
        self.assertEqual(ctx.exception.code,400)

    def test_setup_command_points_to_script(self):
        command=self.request('/api/setup')['command']
        self.assertIn('blocklink_unreal.py',command);compile(command,'<setup>','exec')

    def test_no_serving_private_files(self):
        with self.assertRaises(urllib.error.HTTPError) as ctx:self.request('/server.py')
        self.assertEqual(ctx.exception.code,404)


if __name__=='__main__':unittest.main()
