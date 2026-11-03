#!/usr/bin/env python3
"""NONZERO CDP renderer probe. 0=healthy, 1=renderer unhealthy, 2=configuration/protocol, 3=timeout, 4=endpoint unavailable.
Loopback only; never mutates the page. Config and network failures are distinguishable.
"""
import base64, json, os, socket, struct, sys, time, urllib.error, urllib.request
from urllib.parse import urlparse
PORT=int(os.environ.get('NZ_CDP_PORT','9223'))
HOST='127.0.0.1'
class ProtocolError(Exception):pass
class RendererFailure(Exception):pass
def recv_exact(sock,n,deadline,initial=b''):
    buf=bytearray(initial)
    while len(buf)<n:
        remaining=deadline-time.monotonic()
        if remaining<=0:raise TimeoutError('CDP read timed out')
        sock.settimeout(min(remaining,1.0))
        try: chunk=sock.recv(min(4096,n-len(buf)))
        except socket.timeout:continue
        if not chunk:raise RendererFailure('CDP websocket closed')
        buf.extend(chunk)
    return bytes(buf[:n]),bytes(buf[n:])
def run():
    try:
        with urllib.request.urlopen(f'http://{HOST}:{PORT}/json/list',timeout=2) as response:
            if response.status!=200:raise ProtocolError('CDP list status')
            pages=json.load(response)
    except (urllib.error.HTTPError,ValueError,TypeError) as e:raise ProtocolError(str(e))
    except (socket.timeout,TimeoutError) as e:raise TimeoutError(str(e))
    except (urllib.error.URLError,ConnectionError,OSError) as e:
        if isinstance(getattr(e,'reason',None),TimeoutError):raise TimeoutError(str(e))
        raise ConnectionError(str(e))
    if not isinstance(pages,list):raise ProtocolError('invalid page list')
    targets=[p for p in pages if isinstance(p,dict) and p.get('type')=='page' and '127.0.0.1:8787' in p.get('url','')]
    if not targets:raise RendererFailure('NONZERO tab missing')
    target=targets[0]; ws=urlparse(target.get('webSocketDebuggerUrl',''))
    if ws.scheme!='ws' or ws.hostname not in ('localhost',HOST) or ws.port!=PORT or not ws.path:raise ProtocolError('invalid CDP websocket target')
    try:s=socket.create_connection((HOST,PORT),timeout=2)
    except socket.timeout:raise TimeoutError('CDP connection timed out')
    except OSError as e:raise ConnectionError(str(e))
    with s:
        s.settimeout(2)
        key=base64.b64encode(os.urandom(16)).decode()
        request=(f'GET {ws.path} HTTP/1.1\r\nHost: {HOST}:{PORT}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nOrigin: http://127.0.0.1:{PORT}\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n').encode()
        try:s.sendall(request)
        except socket.timeout:raise TimeoutError('CDP handshake timed out')
        buf=b''; deadline=time.monotonic()+3
        while b'\r\n\r\n' not in buf:
            if len(buf)>8192:raise ProtocolError('oversized handshake')
            chunk,remaining=recv_exact(s,1,deadline)
            buf+=chunk
        first,buf=buf.split(b'\r\n\r\n',1)
        if b' 101 ' not in first.split(b'\r\n',1)[0]:raise ProtocolError('CDP handshake rejected')
        payload=json.dumps({'id':712,'method':'Runtime.evaluate','params':{'expression':'1+1','returnByValue':True,'awaitPromise':False}}).encode()
        mask=os.urandom(4);n=len(payload)
        header=bytes([0x81,0x80|n]) if n<126 else bytes([0x81,0xfe])+struct.pack('!H',n)
        try:s.sendall(header+mask+bytes(b^mask[i%4] for i,b in enumerate(payload)))
        except socket.timeout:raise TimeoutError('CDP write timed out')
        deadline=time.monotonic()+3
        while time.monotonic()<deadline:
            h,buf=recv_exact(s,2,deadline,buf);opcode=h[0]&15;n=h[1]&127
            if n==126:b,buf=recv_exact(s,2,deadline,buf);n=struct.unpack('!H',b)[0]
            elif n==127:b,buf=recv_exact(s,8,deadline,buf);n=struct.unpack('!Q',b)[0]
            if n>1000000:raise ProtocolError('oversized CDP frame')
            if h[1]&128:m,buf=recv_exact(s,4,deadline,buf)
            else:m=None
            body,buf=recv_exact(s,n,deadline,buf)
            if m:body=bytes(b^m[i%4] for i,b in enumerate(body))
            if opcode==8:raise RendererFailure('CDP tab closed')
            if opcode!=1:continue
            try:obj=json.loads(body)
            except (ValueError,TypeError):raise ProtocolError('malformed CDP JSON')
            if obj.get('id')==712:
                if obj.get('error'):raise RendererFailure('CDP evaluation error')
                result=obj.get('result',{}).get('result',{})
                if result.get('value')==2:return
                raise RendererFailure('CDP evaluation incorrect')
        raise TimeoutError('CDP evaluation timed out')
if __name__=='__main__':
    try:run();sys.exit(0)
    except RendererFailure:sys.exit(1)
    except ProtocolError:sys.exit(2)
    except (TimeoutError,socket.timeout):sys.exit(3)
    except (ConnectionError,OSError,urllib.error.URLError):sys.exit(4)
